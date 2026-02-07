const express = require("express");
const mongoose = require("mongoose");
const Place = require("../models/Place");
const CheckIn = require("../models/CheckIn");
const Review = require("../models/Review");
const {
  getPlaceCrowdMetrics,
  getHourlyFootfallPattern,
  deriveBestVisitTimes,
  applyScenarioToCrowd,
  normalizeScenario,
  getScenarioMultiplier,
} = require("../utils/crowdUtils");
const { getReviewSummaryMap } = require("../utils/reviewUtils");

const router = express.Router();

function waitMinutesByCrowdLevel(level) {
  if (level === "Low") return 8;
  if (level === "Medium") return 22;
  return 40;
}

async function getScenarioAwarePlaceStats(scenario) {
  const places = await Place.find({ isActive: true }).sort({ name: 1 });
  const reviewSummaryMap = await getReviewSummaryMap(places.map((place) => place._id));

  const stats = await Promise.all(
    places.map(async (place) => {
      const baseCrowd = await getPlaceCrowdMetrics(place._id);
      const crowd = applyScenarioToCrowd(baseCrowd, scenario);
      const reviews = reviewSummaryMap.get(String(place._id)) || {
        averageRating: 0,
        totalReviews: 0,
      };

      return {
        placeId: place._id,
        name: place.name,
        category: place.category,
        crowdLevel: crowd.crowdLevel,
        currentVisitors: crowd.currentVisitors,
        visitScore: crowd.visitScore,
        averageRating: reviews.averageRating,
        totalReviews: reviews.totalReviews,
      };
    })
  );

  return { places, stats };
}

function getByCrowdLevel(placeStats) {
  return {
    Low: placeStats.filter((entry) => entry.crowdLevel === "Low").length,
    Medium: placeStats.filter((entry) => entry.crowdLevel === "Medium").length,
    High: placeStats.filter((entry) => entry.crowdLevel === "High").length,
  };
}

function buildImpactMetrics(placeStats, checkInsLast24h, scenario) {
  const totalCurrentVisitors = placeStats.reduce((sum, entry) => sum + entry.currentVisitors, 0);
  const lowVisitors = placeStats
    .filter((entry) => entry.crowdLevel === "Low")
    .reduce((sum, entry) => sum + entry.currentVisitors, 0);
  const mediumVisitors = placeStats
    .filter((entry) => entry.crowdLevel === "Medium")
    .reduce((sum, entry) => sum + entry.currentVisitors, 0);
  const highVisitors = placeStats
    .filter((entry) => entry.crowdLevel === "High")
    .reduce((sum, entry) => sum + entry.currentVisitors, 0);

  const lowShare = totalCurrentVisitors > 0 ? lowVisitors / totalCurrentVisitors : 0;
  const mediumShare = totalCurrentVisitors > 0 ? mediumVisitors / totalCurrentVisitors : 0;
  const highShare = totalCurrentVisitors > 0 ? highVisitors / totalCurrentVisitors : 0;

  const potentialDiversionsFactor = Math.max(0.1, 0.48 * lowShare + 0.24 * mediumShare + 0.08 * highShare);
  const avoidedOvercrowdedSpots = Math.round(checkInsLast24h * potentialDiversionsFactor);

  const baselineWait =
    lowShare * waitMinutesByCrowdLevel("Low") +
    mediumShare * waitMinutesByCrowdLevel("Medium") +
    highShare * waitMinutesByCrowdLevel("High");

  const projectedWait = Math.max(4, baselineWait - avoidedOvercrowdedSpots * 0.12);
  const waitReductionMinutes = Math.max(0, Math.round((baselineWait - projectedWait) * 10) / 10);
  const waitReductionPercent = baselineWait > 0 ? Math.round(((baselineWait - projectedWait) / baselineWait) * 100) : 0;

  const diversionSuccessRate = checkInsLast24h > 0 ? Math.min(96, Math.round((avoidedOvercrowdedSpots / checkInsLast24h) * 100)) : 0;
  const crowdBalanceScore = Math.round(100 - Math.min(75, highShare * 100 + mediumShare * 45));
  const experienceStabilityScore = Math.max(
    20,
    Math.min(
      99,
      Math.round(
        crowdBalanceScore * 0.5 +
          diversionSuccessRate * 0.25 +
          Math.max(0, 100 - projectedWait * 2.2) * 0.25
      )
    )
  );

  return {
    scenario,
    avoidedOvercrowdedSpots,
    estimatedWaitTimeSavedMinutes: Math.round(avoidedOvercrowdedSpots * 14),
    waitReductionMinutes,
    waitReductionPercent,
    diversionSuccessRate,
    crowdBalanceScore,
    experienceStabilityScore,
    projectedAverageWaitMinutes: Number(projectedWait.toFixed(1)),
    baselineAverageWaitMinutes: Number(baselineWait.toFixed(1)),
  };
}

router.get("/overview", async (req, res) => {
  try {
    const scenario = normalizeScenario(req.query.scenario);
    const [placeBundle, totalCheckIns, checkInsLast24h, totalReviews] = await Promise.all([
      getScenarioAwarePlaceStats(scenario),
      CheckIn.countDocuments({}),
      CheckIn.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      Review.countDocuments({}),
    ]);

    const { places, stats: placeStats } = placeBundle;
    const byCrowdLevel = getByCrowdLevel(placeStats);

    const topCrowdedPlaces = [...placeStats]
      .sort((a, b) => b.currentVisitors - a.currentVisitors)
      .slice(0, 5);

    const topRatedPlaces = [...placeStats]
      .filter((entry) => entry.totalReviews > 0)
      .sort((a, b) => b.averageRating - a.averageRating || b.totalReviews - a.totalReviews)
      .slice(0, 5);

    const impactPreview = buildImpactMetrics(placeStats, checkInsLast24h, scenario);

    return res.json({
      success: true,
      data: {
        scenario,
        scenarioMultiplier: getScenarioMultiplier(scenario),
        totals: {
          places: places.length,
          totalCheckIns,
          checkInsLast24h,
          totalReviews,
        },
        byCrowdLevel,
        topCrowdedPlaces,
        topRatedPlaces,
        impactPreview,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics overview",
      error: error.message,
    });
  }
});

router.get("/impact", async (req, res) => {
  try {
    const scenario = normalizeScenario(req.query.scenario);
    const [placeBundle, checkInsLast24h, checkInsLast6h] = await Promise.all([
      getScenarioAwarePlaceStats(scenario),
      CheckIn.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      CheckIn.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      }),
    ]);

    const impact = buildImpactMetrics(placeBundle.stats, checkInsLast24h, scenario);

    return res.json({
      success: true,
      data: {
        ...impact,
        totalPlaces: placeBundle.places.length,
        checkInsLast24h,
        checkInsLast6h,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch impact metrics",
      error: error.message,
    });
  }
});

router.get("/scenario", async (req, res) => {
  try {
    const scenario = normalizeScenario(req.query.mode || req.query.scenario);
    const multiplier = getScenarioMultiplier(scenario);
    const { places, stats } = await getScenarioAwarePlaceStats(scenario);
    const byCrowdLevel = getByCrowdLevel(stats);

    const projectedCurrentVisitors = stats.reduce((sum, entry) => sum + entry.currentVisitors, 0);
    const topProjectedHotspots = [...stats]
      .sort((a, b) => b.currentVisitors - a.currentVisitors)
      .slice(0, 6)
      .map((entry) => ({
        placeId: entry.placeId,
        name: entry.name,
        category: entry.category,
        crowdLevel: entry.crowdLevel,
        projectedVisitors: entry.currentVisitors,
      }));

    return res.json({
      success: true,
      data: {
        scenario,
        multiplier,
        totalPlaces: places.length,
        byCrowdLevel,
        projectedCurrentVisitors,
        topProjectedHotspots,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch scenario simulation",
      error: error.message,
    });
  }
});

router.get("/trends", async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days || 7), 1), 30);
    const scenario = normalizeScenario(req.query.scenario);
    const multiplier = getScenarioMultiplier(scenario);
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const daily = await CheckIn.aggregate([
      {
        $match: {
          createdAt: { $gte: fromDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          total: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return res.json({
      success: true,
      data: {
        days,
        scenario,
        scenarioMultiplier: multiplier,
        daily: daily.map((row) => {
          const projectedTotal = Math.round(row.total * multiplier);
          return {
            date: row._id,
            totalCheckIns: row.total,
            projectedTotalCheckIns: projectedTotal,
          };
        }),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trend analytics",
      error: error.message,
    });
  }
});

router.get("/place/:placeId/hourly", async (req, res) => {
  try {
    const { placeId } = req.params;
    if (!mongoose.isValidObjectId(placeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid placeId",
      });
    }

    const place = await Place.findById(placeId);
    if (!place || !place.isActive) {
      return res.status(404).json({
        success: false,
        message: "Place not found",
      });
    }

    const days = Math.min(Math.max(Number(req.query.days || 14), 1), 60);
    const scenario = normalizeScenario(req.query.scenario);
    const multiplier = getScenarioMultiplier(scenario);
    const hourlyPattern = await getHourlyFootfallPattern(place._id, days);
    const projectedHourlyPattern = hourlyPattern.map((entry) => ({
      ...entry,
      count: Math.round(entry.count * multiplier),
      projectedCount: Math.round(entry.count * multiplier),
    }));
    const bestSlots = deriveBestVisitTimes(projectedHourlyPattern, 3);

    return res.json({
      success: true,
      data: {
        place: {
          id: place._id,
          name: place.name,
          category: place.category,
        },
        lookbackDays: days,
        scenario,
        scenarioMultiplier: multiplier,
        bestSlots,
        hourlyPattern: projectedHourlyPattern,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place hourly analytics",
      error: error.message,
    });
  }
});

module.exports = router;
