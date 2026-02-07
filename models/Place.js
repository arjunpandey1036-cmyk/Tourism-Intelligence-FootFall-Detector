const mongoose = require("mongoose");

const placeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    history: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "Attraction",
    },
    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    averageVisitDurationMinutes: {
      type: Number,
      default: 60,
    },
    basePopularity: {
      type: Number,
      default: 50,
      min: 1,
      max: 100,
    },
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

placeSchema.index({ "location.lat": 1, "location.lng": 1 });
placeSchema.index({ name: 1 });

module.exports = mongoose.model("Place", placeSchema);
