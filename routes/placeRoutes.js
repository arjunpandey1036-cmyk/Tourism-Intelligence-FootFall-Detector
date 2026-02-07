const express = require("express");
const mongoose = require("mongoose");
const { City } = require("country-state-city");
const Place = require("../models/Place");
const Review = require("../models/Review");
const {
  getPlaceCrowdMetrics,
  getPlaceBestTimeRecommendation,
  getPlaceCrowdForecast,
  applyScenarioToCrowd,
  normalizeScenario,
  findAlternativePlaces,
  buildItineraryPlan,
} = require("../utils/crowdUtils");
const { getReviewSummaryMap, getPlaceReviewBundle } = require("../utils/reviewUtils");

const router = express.Router();
let cachedIndiaCities = null;

function getIndiaCities() {
  if (cachedIndiaCities) {
    return cachedIndiaCities;
  }

  const cities = City.getCitiesOfCountry("IN") || [];
  const uniqueCityNames = Array.from(
    new Set(
      cities
        .map((city) => String(city && city.name ? city.name : "").trim())
        .filter((name) => name.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  cachedIndiaCities = uniqueCityNames;
  return cachedIndiaCities;
}

function normalizeTags(tagsInput) {
  if (Array.isArray(tagsInput)) {
    return tagsInput
      .map((tag) => String(tag).trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 8);
  }

  if (typeof tagsInput === "string") {
    return tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 8);
  }

  return [];
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractLocation(body) {
  if (body.location && typeof body.location === "object") {
    return {
      lat: safeNumber(body.location.lat),
      lng: safeNumber(body.location.lng),
    };
  }
  return {
    lat: safeNumber(body.lat),
    lng: safeNumber(body.lng),
  };
}

function isValidLatitude(value) {
  return typeof value === "number" && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return typeof value === "number" && value >= -180 && value <= 180;
}

function generateReviewerAlias() {
  return `Traveler-${Math.floor(1000 + Math.random() * 9000)}`;
}

function isValidImageUrl(url) {
  try {
    const parsed = new URL(String(url));
    return ["http:", "https:"].includes(parsed.protocol);
  } catch (_error) {
    return false;
  }
}

function normalizeReviewPhotos(photosInput) {
  let rawPhotos = [];

  if (Array.isArray(photosInput)) {
    rawPhotos = photosInput;
  } else if (typeof photosInput === "string") {
    rawPhotos = photosInput.split(/[\n,]+/g);
  }

  const cleaned = rawPhotos
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0)
    .slice(0, 6);

  const invalid = cleaned.find((url) => !isValidImageUrl(url));
  if (invalid) {
    return {
      ok: false,
      message: "Each photo must be a valid image URL (http/https).",
      photos: [],
    };
  }

  return {
    ok: true,
    photos: cleaned,
  };
}

function toTitleCase(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text
    .split(/\s+/g)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

async function enrichPlace(place, reviewSummaryMap, scenario = "normal") {
  const [crowdMetrics, bestTime] = await Promise.all([
    getPlaceCrowdMetrics(place._id),
    getPlaceBestTimeRecommendation(place._id),
  ]);
  const scenarioAwareCrowd = applyScenarioToCrowd(crowdMetrics, scenario);

  const reviewSummary = reviewSummaryMap.get(String(place._id)) || {
    averageRating: 0,
    totalReviews: 0,
  };

  return {
    id: place._id,
    name: place.name,
    description: place.description,
    history: place.history || "",
    category: place.category,
    location: place.location,
    tags: place.tags,
    averageVisitDurationMinutes: place.averageVisitDurationMinutes,
    crowd: scenarioAwareCrowd,
    bestTime: {
      recommendedTimeText: bestTime.recommendedTimeText,
      bestSlots: bestTime.bestSlots,
    },
    reviews: reviewSummary,
  };
}

router.post("/", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    const history = String(req.body.history || "").trim();
    const category = String(req.body.category || "Attraction").trim() || "Attraction";
    const location = extractLocation(req.body);
    const tags = normalizeTags(req.body.tags);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name is required",
      });
    }

    if (!isValidLatitude(location.lat) || !isValidLongitude(location.lng)) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    const rawDuration = Number(req.body.averageVisitDurationMinutes || 60);
    const rawPopularity = Number(req.body.basePopularity || 52);

    const averageVisitDurationMinutes = Number.isFinite(rawDuration)
      ? Math.max(15, Math.min(480, rawDuration))
      : 60;
    const basePopularity = Number.isFinite(rawPopularity)
      ? Math.max(1, Math.min(100, rawPopularity))
      : 52;

    const place = await Place.create({
      name,
      description,
      history,
      category,
      location,
      tags,
      averageVisitDurationMinutes,
      basePopularity,
      isActive: true,
    });

    const reviewSummaryMap = new Map();
    reviewSummaryMap.set(String(place._id), { averageRating: 0, totalReviews: 0 });
    const created = await enrichPlace(place, reviewSummaryMap);

    return res.status(201).json({
      success: true,
      message: "Place added successfully",
      data: created,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add place",
      error: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const scenario = normalizeScenario(req.query.scenario);
    const places = await Place.find({ isActive: true }).sort({ name: 1 });
    const reviewSummaryMap = await getReviewSummaryMap(places.map((place) => place._id));

    const enrichedPlaces = await Promise.all(
      places.map(async (place) => enrichPlace(place, reviewSummaryMap, scenario))
    );

    res.json({
      success: true,
      total: enrichedPlaces.length,
      scenario,
      data: enrichedPlaces,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch places",
      error: error.message,
    });
  }
});

router.get("/india-cities", (req, res) => {
  try {
    const cities = getIndiaCities();
    return res.json({
      success: true,
      total: cities.length,
      data: cities,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch India cities",
      error: error.message,
    });
  }
});

router.post("/itinerary", async (req, res) => {
  try {
    const scenario = normalizeScenario(req.body.scenario || req.query.scenario);
    const city = String(req.body.city || req.query.city || "").trim();
    const cityNormalized = city.toLowerCase();
    const maxPlaces = Number(req.body.maxPlaces ?? req.query.maxPlaces ?? 4);
    const timeBudgetHours = Number(req.body.timeBudgetHours ?? req.query.timeBudgetHours ?? 6);
    const startHour = Number(req.body.startHour ?? req.query.startHour ?? 9);

    const allPlaces = await Place.find({ isActive: true }).sort({ name: 1 });
    if (!allPlaces.length) {
      return res.status(404).json({
        success: false,
        message: "No active places available for itinerary.",
      });
    }

    const cityFiltered =
      cityNormalized.length > 0
        ? allPlaces.filter((place) => {
            const haystack = `${place.name} ${place.description} ${place.history || ""} ${place.category}`.toLowerCase();
            return haystack.includes(cityNormalized);
          })
        : allPlaces;

    const usedFallback = cityNormalized.length > 0 && cityFiltered.length === 0;
    const sourcePlaces = cityFiltered.length > 0 ? cityFiltered : allPlaces;
    const reviewSummaryMap = await getReviewSummaryMap(sourcePlaces.map((place) => place._id));
    const enriched = await Promise.all(
      sourcePlaces.map((place) => enrichPlace(place, reviewSummaryMap, scenario))
    );

    const itineraryPlan = buildItineraryPlan(enriched, {
      maxPlaces,
      timeBudgetHours,
      startHour,
      scenario,
    });

    return res.json({
      success: true,
      data: {
        filters: {
          city: city ? toTitleCase(city) : "",
          fallbackToAllCities: usedFallback,
          scenario,
        },
        ...itineraryPlan,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate itinerary",
      error: error.message,
    });
  }
});

router.get("/:placeId/forecast", async (req, res) => {
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

    const scenario = normalizeScenario(req.query.scenario);
    const hoursAhead = Number(req.query.hoursAhead || 3);
    const forecast = await getPlaceCrowdForecast(place._id, {
      scenario,
      hoursAhead,
    });

    return res.json({
      success: true,
      data: {
        place: {
          id: place._id,
          name: place.name,
          category: place.category,
        },
        ...forecast,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place crowd forecast",
      error: error.message,
    });
  }
});

router.get("/:placeId/reviews", async (req, res) => {
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

    const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 120);
    const reviewBundle = await getPlaceReviewBundle(place._id, limit);

    return res.json({
      success: true,
      data: {
        place: {
          id: place._id,
          name: place.name,
          category: place.category,
        },
        summary: reviewBundle.summary,
        breakdown: reviewBundle.breakdown,
        reviews: reviewBundle.reviews,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
});

router.post("/:placeId/reviews", async (req, res) => {
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

    const rating = Number(req.body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "rating must be between 1 and 5",
      });
    }

    const comment = String(req.body.comment || "").trim();
    if (comment.length < 3) {
      return res.status(400).json({
        success: false,
        message: "comment must be at least 3 characters",
      });
    }

    if (comment.length > 900) {
      return res.status(400).json({
        success: false,
        message: "comment is too long",
      });
    }

    const reviewerAlias = String(req.body.reviewerAlias || "").trim() || generateReviewerAlias();
    const normalizedPhotos = normalizeReviewPhotos(req.body.photos);
    if (!normalizedPhotos.ok) {
      return res.status(400).json({
        success: false,
        message: normalizedPhotos.message,
      });
    }

    const createdReview = await Review.create({
      place: place._id,
      reviewerAlias,
      rating: Math.round(rating),
      comment,
      photos: normalizedPhotos.photos,
      createdAt: new Date(),
    });

    const reviewBundle = await getPlaceReviewBundle(place._id, 25);

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: {
        review: {
          id: createdReview._id,
          placeId: place._id,
          reviewerAlias: createdReview.reviewerAlias,
          rating: createdReview.rating,
          comment: createdReview.comment,
          photos: createdReview.photos || [],
          createdAt: createdReview.createdAt,
        },
        summary: reviewBundle.summary,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to submit review",
      error: error.message,
    });
  }
});

router.get("/:placeId", async (req, res) => {
  try {
    const { placeId } = req.params;
    const scenario = normalizeScenario(req.query.scenario);
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

    const [crowdMetrics, bestTime, reviewBundle] = await Promise.all([
      getPlaceCrowdMetrics(place._id),
      getPlaceBestTimeRecommendation(place._id),
      getPlaceReviewBundle(place._id, 6),
    ]);
    const scenarioAwareCrowd = applyScenarioToCrowd(crowdMetrics, scenario);

    return res.json({
      success: true,
      data: {
        id: place._id,
        name: place.name,
        description: place.description,
        history: place.history || "",
        category: place.category,
        location: place.location,
        tags: place.tags,
        averageVisitDurationMinutes: place.averageVisitDurationMinutes,
        crowd: scenarioAwareCrowd,
        bestTime: {
          recommendedTimeText: bestTime.recommendedTimeText,
          bestSlots: bestTime.bestSlots,
          hourlyPattern: bestTime.hourlyPattern,
        },
        reviews: {
          summary: reviewBundle.summary,
          breakdown: reviewBundle.breakdown,
          latest: reviewBundle.reviews,
        },
        scenario,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place",
      error: error.message,
    });
  }
});

router.get("/:placeId/alternatives", async (req, res) => {
  try {
    const { placeId } = req.params;
    const scenario = normalizeScenario(req.query.scenario);
    const maxDistanceKm = Number(req.query.maxDistanceKm || 5);
    const maxResults = Number(req.query.maxResults || 3);

    const places = await Place.find({ isActive: true }).sort({ name: 1 });
    const targetPlace = places.find((p) => String(p._id) === String(placeId));

    if (!targetPlace) {
      return res.status(404).json({
        success: false,
        message: "Place not found",
      });
    }

    const placeStats = await Promise.all(
      places.map(async (place) => ({
        placeId: place._id,
        stats: applyScenarioToCrowd(await getPlaceCrowdMetrics(place._id), scenario),
      }))
    );

    const placeStatsMap = new Map(placeStats.map((entry) => [String(entry.placeId), entry.stats]));
    const targetStats = placeStatsMap.get(String(targetPlace._id));

    const alternatives = findAlternativePlaces(
      targetPlace,
      places,
      placeStatsMap,
      maxDistanceKm,
      maxResults
    );

    return res.json({
      success: true,
      data: {
        target: {
          id: targetPlace._id,
          name: targetPlace.name,
          crowdLevel: targetStats.crowdLevel,
          currentVisitors: targetStats.currentVisitors,
        },
        scenario,
        alternatives,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch alternatives",
      error: error.message,
    });
  }
});

module.exports = router;
