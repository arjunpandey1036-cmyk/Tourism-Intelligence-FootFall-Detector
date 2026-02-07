const CheckIn = require("../models/CheckIn");
const { haversineDistanceKm } = require("./geoUtils");

const CROWD_THRESHOLDS = {
  LOW_MAX: 20,
  MEDIUM_MAX: 50,
};

const SCENARIO_MULTIPLIERS = {
  normal: 1,
  weekend: 1.24,
  festival: 1.58,
};

function getCrowdLevel(currentVisitorCount) {
  if (currentVisitorCount <= CROWD_THRESHOLDS.LOW_MAX) return "Low";
  if (currentVisitorCount <= CROWD_THRESHOLDS.MEDIUM_MAX) return "Medium";
  return "High";
}

function normalizeScenario(scenarioInput) {
  const raw = String(scenarioInput || "normal").trim().toLowerCase();
  if (raw === "weekend") return "weekend";
  if (raw === "festival") return "festival";
  return "normal";
}

function getScenarioMultiplier(scenarioInput) {
  const scenario = normalizeScenario(scenarioInput);
  return SCENARIO_MULTIPLIERS[scenario] || SCENARIO_MULTIPLIERS.normal;
}

function hourLabel(hour24) {
  const start = hour24.toString().padStart(2, "0");
  const end = ((hour24 + 1) % 24).toString().padStart(2, "0");
  return `${start}:00-${end}:00`;
}

function calculateVisitScore(crowdLevel, currentVisitorCount) {
  const baseScore = crowdLevel === "Low" ? 90 : crowdLevel === "Medium" ? 65 : 35;
  const densityPenalty = Math.min(20, Math.floor(currentVisitorCount / 5));
  return Math.max(10, baseScore - densityPenalty);
}

function applyScenarioToCrowd(crowdMetrics, scenarioInput = "normal") {
  const scenario = normalizeScenario(scenarioInput);
  const multiplier = getScenarioMultiplier(scenario);

  if (multiplier === 1) {
    return {
      ...crowdMetrics,
      scenario,
      scenarioMultiplier: multiplier,
    };
  }

  const currentVisitors = Math.max(0, Math.round(crowdMetrics.currentVisitors * multiplier));
  const last6HoursVisitors = Math.max(0, Math.round(crowdMetrics.last6HoursVisitors * multiplier));
  const last24HoursVisitors = Math.max(0, Math.round(crowdMetrics.last24HoursVisitors * multiplier));
  const crowdLevel = getCrowdLevel(currentVisitors);
  const visitScore = calculateVisitScore(crowdLevel, currentVisitors);

  return {
    ...crowdMetrics,
    currentVisitors,
    last6HoursVisitors,
    last24HoursVisitors,
    crowdLevel,
    visitScore,
    scenario,
    scenarioMultiplier: multiplier,
  };
}

async function getPlaceCrowdMetrics(placeId, now = new Date()) {
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [lastHourCount, last6HoursCount, last24HoursCount] = await Promise.all([
    CheckIn.countDocuments({ place: placeId, createdAt: { $gte: oneHourAgo } }),
    CheckIn.countDocuments({ place: placeId, createdAt: { $gte: sixHoursAgo } }),
    CheckIn.countDocuments({ place: placeId, createdAt: { $gte: twentyFourHoursAgo } }),
  ]);

  const crowdLevel = getCrowdLevel(lastHourCount);
  const visitScore = calculateVisitScore(crowdLevel, lastHourCount);

  return {
    currentVisitors: lastHourCount,
    last6HoursVisitors: last6HoursCount,
    last24HoursVisitors: last24HoursCount,
    crowdLevel,
    visitScore,
  };
}

async function getHourlyFootfallPattern(placeId, lookbackDays = 14, now = new Date()) {
  const fromDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const rows = await CheckIn.aggregate([
    {
      $match: {
        place: placeId,
        createdAt: { $gte: fromDate, $lte: now },
      },
    },
    {
      $group: {
        _id: { $hour: "$createdAt" },
        count: { $sum: 1 },
      },
    },
  ]);

  const byHour = new Map(rows.map((item) => [item._id, item.count]));
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: hourLabel(hour),
    count: byHour.get(hour) || 0,
  }));
}

function deriveBestVisitTimes(hourlyPattern, count = 3) {
  const sorted = [...hourlyPattern].sort((a, b) => a.count - b.count || a.hour - b.hour);
  return sorted.slice(0, count).map((slot) => ({
    hour: slot.hour,
    label: slot.label,
    expectedVisitors: slot.count,
  }));
}

function getBestTimeText(bestSlots) {
  if (!bestSlots.length) {
    return "No historical data available yet.";
  }
  return bestSlots.map((slot) => slot.label).join(", ");
}

async function getPlaceBestTimeRecommendation(placeId) {
  const hourlyPattern = await getHourlyFootfallPattern(placeId);
  const bestSlots = deriveBestVisitTimes(hourlyPattern);
  return {
    bestSlots,
    recommendedTimeText: getBestTimeText(bestSlots),
    hourlyPattern,
  };
}

function getForecastConfidence(stepHours) {
  const base = 88 - stepHours * 8;
  return Math.max(58, Math.min(92, base));
}

async function getPlaceCrowdForecast(placeId, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const scenario = normalizeScenario(options.scenario);
  const scenarioMultiplier = getScenarioMultiplier(scenario);
  const hoursAheadRaw = Number(options.hoursAhead ?? 3);
  const hoursAhead = Math.max(1, Math.min(12, Number.isFinite(hoursAheadRaw) ? Math.floor(hoursAheadRaw) : 3));

  const [currentMetrics, hourlyPattern] = await Promise.all([
    getPlaceCrowdMetrics(placeId, now),
    getHourlyFootfallPattern(placeId, 21, now),
  ]);

  const byHour = new Map(hourlyPattern.map((item) => [item.hour, item.count]));
  const currentHour = now.getHours();
  const currentHourBase = Math.max(1, byHour.get(currentHour) || 1);
  const trendFactor = Math.max(0.6, Math.min(2.4, currentMetrics.currentVisitors / currentHourBase));

  const forecast = [];
  let peakSlot = null;

  for (let step = 0; step <= hoursAhead; step += 1) {
    const slotTime = new Date(now.getTime() + step * 60 * 60 * 1000);
    const hour = slotTime.getHours();
    const historicalCount = Math.max(1, byHour.get(hour) || Math.round(currentMetrics.currentVisitors * 0.72));
    const weighted = step === 0 ? currentMetrics.currentVisitors : Math.round(historicalCount * (0.56 + 0.44 * trendFactor));
    const expectedVisitors = Math.max(0, Math.round(weighted * scenarioMultiplier));
    const crowdLevel = getCrowdLevel(expectedVisitors);

    const item = {
      stepHours: step,
      label: step === 0 ? "Now" : `+${step}h`,
      hour,
      window: hourLabel(hour),
      expectedVisitors,
      crowdLevel,
      confidence: getForecastConfidence(step),
    };

    forecast.push(item);
    if (!peakSlot || item.expectedVisitors > peakSlot.expectedVisitors) {
      peakSlot = item;
    }
  }

  return {
    scenario,
    scenarioMultiplier,
    generatedAt: now.toISOString(),
    trendFactor: Number(trendFactor.toFixed(2)),
    current: applyScenarioToCrowd(currentMetrics, scenario),
    forecast,
    peakSlot,
  };
}

function findAlternativePlaces(targetPlace, places, placeStatsMap, maxDistanceKm = 5, maxResults = 3) {
  const targetLocation = targetPlace.location;
  const alternatives = [];

  for (const place of places) {
    if (String(place._id) === String(targetPlace._id)) continue;

    const stats = placeStatsMap.get(String(place._id));
    if (!stats) continue;
    if (stats.crowdLevel === "High") continue;

    const distanceKm = haversineDistanceKm(targetLocation, place.location);
    if (distanceKm > maxDistanceKm) continue;

    alternatives.push({
      placeId: place._id,
      name: place.name,
      category: place.category,
      distanceKm: Number(distanceKm.toFixed(2)),
      crowdLevel: stats.crowdLevel,
      currentVisitors: stats.currentVisitors,
    });
  }

  alternatives.sort((a, b) => {
    const crowdPriority = { Low: 1, Medium: 2, High: 3 };
    if (crowdPriority[a.crowdLevel] !== crowdPriority[b.crowdLevel]) {
      return crowdPriority[a.crowdLevel] - crowdPriority[b.crowdLevel];
    }
    return a.distanceKm - b.distanceKm;
  });

  return alternatives.slice(0, maxResults);
}

function parseHourFromSlotLabel(slotLabel) {
  const raw = String(slotLabel || "").trim();
  if (!raw) return null;
  const head = raw.split(":")[0];
  const value = Number(head);
  if (!Number.isFinite(value) || value < 0 || value > 23) return null;
  return value;
}

function toClockLabel(totalMinutes) {
  const safe = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}`;
}

function selectNextByDistance(originLocation, candidates) {
  if (!originLocation || !candidates.length) return null;

  let best = null;
  for (const candidate of candidates) {
    const distanceKm = haversineDistanceKm(originLocation, candidate.location);
    const distancePenalty = distanceKm * 2.1;
    const score = candidate.suitabilityScore - distancePenalty;
    if (!best || score > best.score) {
      best = {
        candidate,
        distanceKm,
        score,
      };
    }
  }
  return best;
}

function buildItineraryPlan(enrichedPlaces, options = {}) {
  if (!Array.isArray(enrichedPlaces) || enrichedPlaces.length === 0) {
    return {
      itinerary: [],
      summary: {
        totalPlaces: 0,
        totalDurationMinutes: 0,
        travelMinutes: 0,
        scenario: normalizeScenario(options.scenario),
      },
      alternatives: [],
    };
  }

  const maxPlacesRaw = Number(options.maxPlaces ?? 4);
  const maxPlaces = Math.max(2, Math.min(8, Number.isFinite(maxPlacesRaw) ? Math.floor(maxPlacesRaw) : 4));
  const startHourRaw = Number(options.startHour ?? 9);
  const startHour = Math.max(0, Math.min(23, Number.isFinite(startHourRaw) ? Math.floor(startHourRaw) : 9));
  const timeBudgetRaw = Number(options.timeBudgetHours ?? 6);
  const timeBudgetHours = Math.max(2, Math.min(12, Number.isFinite(timeBudgetRaw) ? timeBudgetRaw : 6));
  const budgetMinutes = Math.round(timeBudgetHours * 60);

  const candidates = [...enrichedPlaces]
    .map((entry) => {
      const crowdBonus = entry.crowd.crowdLevel === "Low" ? 30 : entry.crowd.crowdLevel === "Medium" ? 12 : -20;
      const ratingBonus = (entry.reviews.averageRating || 0) * 4.5;
      const score = crowdBonus + entry.crowd.visitScore * 0.36 + ratingBonus - entry.crowd.currentVisitors * 0.45;
      return {
        ...entry,
        suitabilityScore: Number(score.toFixed(2)),
      };
    })
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  const pool = candidates.slice(0, Math.max(maxPlaces * 3, maxPlaces));
  const chosen = [];

  let minutesCursor = startHour * 60;
  let consumedMinutes = 0;
  let travelMinutes = 0;

  while (pool.length > 0 && chosen.length < maxPlaces) {
    let pickIndex = 0;
    let travelFromPreviousKm = 0;
    let travelFromPreviousMinutes = 0;

    if (chosen.length > 0) {
      const previous = chosen[chosen.length - 1];
      const nextBest = selectNextByDistance(previous.place.location, pool);
      if (!nextBest) break;
      pickIndex = pool.findIndex((item) => String(item.id) === String(nextBest.candidate.id));
      travelFromPreviousKm = nextBest.distanceKm;
      travelFromPreviousMinutes = Math.max(6, Math.round(travelFromPreviousKm * 5.6 + 8));
    }

    const selected = pool.splice(pickIndex, 1)[0];
    if (!selected) break;

    const stayMinutes = Math.max(35, Math.min(170, Number(selected.averageVisitDurationMinutes || 70)));
    const prospectiveTotal = consumedMinutes + travelFromPreviousMinutes + stayMinutes;
    if (prospectiveTotal > budgetMinutes) {
      continue;
    }

    minutesCursor += travelFromPreviousMinutes;
    const arrivalMinutes = minutesCursor;
    const departureMinutes = arrivalMinutes + stayMinutes;

    consumedMinutes = prospectiveTotal;
    travelMinutes += travelFromPreviousMinutes;
    minutesCursor = departureMinutes;

    const recommendedStartHour =
      selected.bestTime && Array.isArray(selected.bestTime.bestSlots) && selected.bestTime.bestSlots.length > 0
        ? parseHourFromSlotLabel(selected.bestTime.bestSlots[0].label)
        : null;

    chosen.push({
      order: chosen.length + 1,
      place: {
        id: selected.id,
        name: selected.name,
        category: selected.category,
        location: selected.location,
      },
      crowd: selected.crowd,
      reviews: selected.reviews,
      bestTime: selected.bestTime,
      suitabilityScore: selected.suitabilityScore,
      timing: {
        arrivalTime: toClockLabel(arrivalMinutes),
        departureTime: toClockLabel(departureMinutes),
        stayMinutes,
        travelFromPreviousMinutes,
        travelFromPreviousKm: Number(travelFromPreviousKm.toFixed(2)),
        recommendedStartHour,
      },
    });
  }

  const alternatives = pool
    .filter((entry) => entry.crowd.crowdLevel !== "High")
    .slice(0, 4)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      category: entry.category,
      crowdLevel: entry.crowd.crowdLevel,
      currentVisitors: entry.crowd.currentVisitors,
      rating: entry.reviews.averageRating,
    }));

  const avgVisitScore =
    chosen.length > 0
      ? Number((chosen.reduce((sum, item) => sum + item.crowd.visitScore, 0) / chosen.length).toFixed(1))
      : 0;

  return {
    itinerary: chosen,
    summary: {
      totalPlaces: chosen.length,
      totalDurationMinutes: consumedMinutes,
      travelMinutes,
      avgVisitScore,
      startTime: toClockLabel(startHour * 60),
      endTime: toClockLabel(startHour * 60 + consumedMinutes),
      scenario: normalizeScenario(options.scenario),
    },
    alternatives,
  };
}

module.exports = {
  CROWD_THRESHOLDS,
  SCENARIO_MULTIPLIERS,
  normalizeScenario,
  getScenarioMultiplier,
  getCrowdLevel,
  applyScenarioToCrowd,
  getPlaceCrowdMetrics,
  getHourlyFootfallPattern,
  deriveBestVisitTimes,
  getPlaceBestTimeRecommendation,
  getPlaceCrowdForecast,
  findAlternativePlaces,
  buildItineraryPlan,
};
