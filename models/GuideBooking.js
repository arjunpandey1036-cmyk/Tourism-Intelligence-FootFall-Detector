const mongoose = require("mongoose");

const guideBookingSchema = new mongoose.Schema(
  {
    guideId: {
      type: String,
      required: true,
      trim: true,
    },
    guideName: {
      type: String,
      required: true,
      trim: true,
    },
    guideCity: {
      type: String,
      required: true,
      trim: true,
    },
    touristName: {
      type: String,
      required: true,
      trim: true,
    },
    touristPhone: {
      type: String,
      required: true,
      trim: true,
    },
    preferredDate: {
      type: String,
      required: true,
      trim: true,
    },
    preferredTime: {
      type: String,
      required: true,
      trim: true,
    },
    durationHours: {
      type: Number,
      default: 4,
      min: 1,
      max: 12,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 800,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

guideBookingSchema.index({ guideCity: 1, createdAt: -1 });
guideBookingSchema.index({ guideId: 1, createdAt: -1 });

module.exports = mongoose.model("GuideBooking", guideBookingSchema);
