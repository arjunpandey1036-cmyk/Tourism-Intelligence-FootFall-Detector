const mongoose = require("mongoose");

const checkInSchema = new mongoose.Schema(
  {
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      required: true,
      index: true,
    },
    visitorAlias: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    source: {
      type: String,
      enum: ["manual", "seed", "simulated"],
      default: "manual",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false, timestamps: false }
);

checkInSchema.index({ place: 1, createdAt: -1 });

module.exports = mongoose.model("CheckIn", checkInSchema);

