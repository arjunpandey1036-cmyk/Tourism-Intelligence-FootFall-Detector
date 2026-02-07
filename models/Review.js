const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      required: true,
      index: true,
    },
    reviewerAlias: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 900,
    },
    photos: {
      type: [String],
      default: [],
      validate: [
        {
          validator(value) {
            return Array.isArray(value) && value.length <= 6;
          },
          message: "A maximum of 6 photos is allowed per review.",
        },
      ],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false, timestamps: false }
);

reviewSchema.index({ place: 1, createdAt: -1 });
reviewSchema.index({ place: 1, rating: 1 });

module.exports = mongoose.model("Review", reviewSchema);
