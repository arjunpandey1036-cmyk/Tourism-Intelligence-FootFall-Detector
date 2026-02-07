const mongoose = require("mongoose");
const Review = require("../models/Review");

function formatReviewSummary(data) {
  return {
    averageRating: data.averageRating ? Number(data.averageRating.toFixed(1)) : 0,
    totalReviews: data.totalReviews || 0,
  };
}

function buildBreakdown(breakdownRows) {
  const initial = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of breakdownRows) {
    initial[row._id] = row.count;
  }
  return initial;
}

async function getReviewSummaryMap(placeIds = []) {
  const match =
    placeIds.length > 0
      ? {
          place: {
            $in: placeIds.map((id) => new mongoose.Types.ObjectId(String(id))),
          },
        }
      : {};

  const rows = await Review.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$place",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const summaryMap = new Map();
  rows.forEach((row) => {
    summaryMap.set(String(row._id), formatReviewSummary(row));
  });

  return summaryMap;
}

async function getPlaceReviewBundle(placeId, limit = 30) {
  const objectId = new mongoose.Types.ObjectId(String(placeId));

  const [summaryRows, breakdownRows, latestReviews] = await Promise.all([
    Review.aggregate([
      { $match: { place: objectId } },
      {
        $group: {
          _id: "$place",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]),
    Review.aggregate([
      { $match: { place: objectId } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Review.find({ place: objectId }).sort({ createdAt: -1 }).limit(limit),
  ]);

  const summary =
    summaryRows.length > 0
      ? formatReviewSummary(summaryRows[0])
      : { averageRating: 0, totalReviews: 0 };

  const breakdown = buildBreakdown(breakdownRows);

  return {
    summary,
    breakdown,
    reviews: latestReviews.map((review) => ({
      id: review._id,
      reviewerAlias: review.reviewerAlias,
      rating: review.rating,
      comment: review.comment,
      photos: review.photos || [],
      createdAt: review.createdAt,
    })),
  };
}

module.exports = {
  getReviewSummaryMap,
  getPlaceReviewBundle,
};
