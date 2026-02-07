const express = require("express");
const Place = require("../models/Place");
const CheckIn = require("../models/CheckIn");
const { getPlaceCrowdMetrics, getPlaceBestTimeRecommendation } = require("../utils/crowdUtils");

const router = express.Router();

function generateVisitorAlias() {
  const randomValue = Math.floor(1000 + Math.random() * 9000);
  return `Guest-${randomValue}`;
}

router.post("/", async (req, res) => {
  try {
    const { placeId, visitorAlias } = req.body;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: "placeId is required",
      });
    }

    const place = await Place.findById(placeId);
    if (!place || !place.isActive) {
      return res.status(404).json({
        success: false,
        message: "Place not found",
      });
    }

    const alias = visitorAlias && visitorAlias.trim() ? visitorAlias.trim() : generateVisitorAlias();

    const checkIn = await CheckIn.create({
      place: place._id,
      visitorAlias: alias,
      source: "manual",
      createdAt: new Date(),
    });

    const [crowd, bestTime] = await Promise.all([
      getPlaceCrowdMetrics(place._id),
      getPlaceBestTimeRecommendation(place._id),
    ]);

    return res.status(201).json({
      success: true,
      message: "Check-in recorded successfully",
      data: {
        checkIn: {
          id: checkIn._id,
          placeId: place._id,
          placeName: place.name,
          visitorAlias: checkIn.visitorAlias,
          createdAt: checkIn.createdAt,
        },
        crowd,
        bestTime: {
          recommendedTimeText: bestTime.recommendedTimeText,
          bestSlots: bestTime.bestSlots,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to record check-in",
      error: error.message,
    });
  }
});

router.get("/recent", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const recent = await CheckIn.find({})
      .populate("place", "name category")
      .sort({ createdAt: -1 })
      .limit(limit);

    const data = recent.map((item) => ({
      id: item._id,
      visitorAlias: item.visitorAlias,
      source: item.source,
      createdAt: item.createdAt,
      place: item.place
        ? {
            id: item.place._id,
            name: item.place.name,
            category: item.place.category,
          }
        : null,
    }));

    return res.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch recent check-ins",
      error: error.message,
    });
  }
});

module.exports = router;

