require("dotenv").config();
const { connectDatabase } = require("../config/db");
const Place = require("../models/Place");
const CheckIn = require("../models/CheckIn");
const Review = require("../models/Review");

const MONGO_URI = process.env.MONGO_URI;
const CLEAR_EXISTING = String(process.env.SEED_CLEAR_EXISTING || "true").toLowerCase() === "true";

if (!MONGO_URI) {
  console.error("MONGO_URI is required in .env for seeding.");
  process.exit(1);
}

const placesSeed = [
  {
    name: "India Gate, New Delhi",
    description: "Historic war memorial boulevard known for evening walks and city events.",
    category: "Landmark",
    location: { lat: 28.6129, lng: 77.2295 },
    averageVisitDurationMinutes: 65,
    basePopularity: 92,
    tags: ["heritage", "city-center", "night-view"],
  },
  {
    name: "Humayun Tomb, New Delhi",
    description: "UNESCO-listed Mughal monument with gardens and red sandstone architecture.",
    category: "Historic",
    location: { lat: 28.5933, lng: 77.2507 },
    averageVisitDurationMinutes: 95,
    basePopularity: 76,
    tags: ["unesco", "architecture", "history"],
  },
  {
    name: "Lodhi Garden, New Delhi",
    description: "Large urban park with tombs, walking tracks, and low-crowd morning sessions.",
    category: "Nature",
    location: { lat: 28.5931, lng: 77.2197 },
    averageVisitDurationMinutes: 70,
    basePopularity: 68,
    tags: ["park", "walking", "sunrise"],
  },
  {
    name: "Gateway of India, Mumbai",
    description: "Iconic waterfront arch and ferry point with heavy tourist activity.",
    category: "Landmark",
    location: { lat: 18.922, lng: 72.8347 },
    averageVisitDurationMinutes: 80,
    basePopularity: 90,
    tags: ["waterfront", "colonial", "photos"],
  },
  {
    name: "Marine Drive, Mumbai",
    description: "Sea-facing promenade popular for sunsets and late-evening leisure crowds.",
    category: "Waterfront",
    location: { lat: 18.943, lng: 72.8238 },
    averageVisitDurationMinutes: 75,
    basePopularity: 82,
    tags: ["sunset", "promenade", "sea-view"],
  },
  {
    name: "CSMVS Museum, Mumbai",
    description: "Major museum with art and cultural collections near Fort district.",
    category: "Museum",
    location: { lat: 18.926, lng: 72.8322 },
    averageVisitDurationMinutes: 130,
    basePopularity: 72,
    tags: ["museum", "history", "indoor"],
  },
  {
    name: "Lalbagh Botanical Garden, Bengaluru",
    description: "Historic botanical garden with glasshouse and broad green landscapes.",
    category: "Nature",
    location: { lat: 12.9507, lng: 77.5848 },
    averageVisitDurationMinutes: 95,
    basePopularity: 74,
    tags: ["garden", "family", "morning"],
  },
  {
    name: "Cubbon Park, Bengaluru",
    description: "Central city green zone with low-noise walking loops and open lawns.",
    category: "Nature",
    location: { lat: 12.9763, lng: 77.5929 },
    averageVisitDurationMinutes: 80,
    basePopularity: 70,
    tags: ["greenery", "jogging", "relax"],
  },
  {
    name: "Bangalore Palace",
    description: "Heritage palace attraction known for architecture and interior tours.",
    category: "Historic",
    location: { lat: 12.9987, lng: 77.592 },
    averageVisitDurationMinutes: 90,
    basePopularity: 66,
    tags: ["palace", "architecture", "heritage"],
  },
  {
    name: "Amber Fort, Jaipur",
    description: "Hilltop fort complex with palace courtyards and panoramic city views.",
    history:
      "Built in the late 16th century by Raja Man Singh, Amber Fort was the capital seat of the Kachwaha Rajputs before Jaipur city was founded.",
    category: "Historic",
    location: { lat: 26.9855, lng: 75.8513 },
    averageVisitDurationMinutes: 150,
    basePopularity: 78,
    tags: ["fort", "hilltop", "heritage"],
  },
  {
    name: "Jal Mahal Viewpoint, Jaipur",
    description: "Lakeside viewpoint with scenic skyline and evening photo traffic.",
    history:
      "Jal Mahal is an 18th-century palace built in the middle of Man Sagar Lake, known for its Rajput and Mughal architectural blend.",
    category: "Waterfront",
    location: { lat: 26.9536, lng: 75.8468 },
    averageVisitDurationMinutes: 55,
    basePopularity: 63,
    tags: ["lake", "sunset", "photography"],
  },
  {
    name: "City Palace Jaipur",
    description: "Royal palace museum zone blending architecture, galleries, and courtyards.",
    history:
      "City Palace was established in 1727 by Maharaja Sawai Jai Singh II and remains one of Jaipur's most important royal heritage complexes.",
    category: "Museum",
    location: { lat: 26.9258, lng: 75.8237 },
    averageVisitDurationMinutes: 110,
    basePopularity: 69,
    tags: ["royal", "museum", "culture"],
  },
  {
    name: "Hawa Mahal, Jaipur",
    description: "Iconic pink sandstone facade with jharokha windows in Jaipur's old city.",
    history:
      "Constructed in 1799 by Maharaja Sawai Pratap Singh, Hawa Mahal allowed royal women to observe street festivals without being seen.",
    category: "Historic",
    location: { lat: 26.9239, lng: 75.8267 },
    averageVisitDurationMinutes: 75,
    basePopularity: 81,
    tags: ["palace", "pink-city", "architecture"],
  },
  {
    name: "Jantar Mantar, Jaipur",
    description: "UNESCO astronomical observatory with monumental stone instruments.",
    history:
      "Commissioned by Sawai Jai Singh II in 1734, Jantar Mantar is the largest stone observatory in the world and a UNESCO World Heritage site.",
    category: "Historic",
    location: { lat: 26.9248, lng: 75.8246 },
    averageVisitDurationMinutes: 95,
    basePopularity: 74,
    tags: ["unesco", "astronomy", "heritage"],
  },
  {
    name: "Nahargarh Fort, Jaipur",
    description: "Ridge-top fort with citywide sunset views and historic ramparts.",
    history:
      "Built in 1734 by Sawai Jai Singh II, Nahargarh Fort formed part of Jaipur's defensive ring along with Amber and Jaigarh forts.",
    category: "Historic",
    location: { lat: 26.9373, lng: 75.8152 },
    averageVisitDurationMinutes: 120,
    basePopularity: 72,
    tags: ["fort", "sunset", "viewpoint"],
  },
  {
    name: "Jaigarh Fort, Jaipur",
    description: "Massive hill fort known for military architecture and panoramic routes.",
    history:
      "Completed in 1726, Jaigarh Fort protected Amber Fort and houses Jaivana, once considered the world's largest cannon on wheels.",
    category: "Historic",
    location: { lat: 26.9854, lng: 75.8479 },
    averageVisitDurationMinutes: 120,
    basePopularity: 68,
    tags: ["fort", "cannon", "heritage"],
  },
  {
    name: "Albert Hall Museum, Jaipur",
    description: "Indo-Saracenic museum with art collections, artifacts, and evening lights.",
    history:
      "Opened to the public in 1887, Albert Hall is Rajasthan's oldest museum and an important symbol of Jaipur's colonial-era architecture.",
    category: "Museum",
    location: { lat: 26.9125, lng: 75.8198 },
    averageVisitDurationMinutes: 100,
    basePopularity: 66,
    tags: ["museum", "art", "history"],
  },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTimestamp(dayBase, hour) {
  const date = new Date(dayBase);
  date.setHours(hour, randomInt(0, 59), randomInt(0, 59), 0);
  return date;
}

function hourlyDemandMultiplier(hour) {
  if (hour >= 7 && hour <= 10) return 1.2;
  if (hour >= 11 && hour <= 16) return 2.2;
  if (hour >= 17 && hour <= 21) return 1.8;
  return 0.55;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

const reviewCommentPool = {
  5: [
    "Excellent experience, clean surroundings, and very good atmosphere.",
    "One of my favorite places so far. Great views and easy access.",
    "Worth the visit, well maintained and highly enjoyable.",
  ],
  4: [
    "Good place to visit. Slight crowd but still manageable.",
    "Nice location and overall good experience.",
    "Beautiful landmark with decent facilities nearby.",
  ],
  3: [
    "Average visit. Good place but can improve management.",
    "Decent location, not bad for a short stop.",
    "Okay experience. Better during non-peak hours.",
  ],
  2: [
    "Too crowded at the time of visit and waiting time was high.",
    "Expected better organization and cleanliness.",
    "Not very comfortable during peak hours.",
  ],
  1: [
    "Very congested and difficult to enjoy the place.",
    "Poor crowd management at this time.",
    "Visit quality was low due to heavy rush.",
  ],
};

const reviewPhotoPool = [
  "https://picsum.photos/id/1015/900/560",
  "https://picsum.photos/id/1035/900/560",
  "https://picsum.photos/id/1040/900/560",
  "https://picsum.photos/id/1043/900/560",
  "https://picsum.photos/id/1066/900/560",
  "https://picsum.photos/id/1074/900/560",
  "https://picsum.photos/id/1078/900/560",
  "https://picsum.photos/id/1084/900/560",
  "https://picsum.photos/id/1080/900/560",
  "https://picsum.photos/id/1082/900/560",
  "https://picsum.photos/id/1047/900/560",
  "https://picsum.photos/id/1056/900/560",
];

function randomFrom(array) {
  return array[randomInt(0, array.length - 1)];
}

function weightedRating(basePopularity) {
  if (basePopularity >= 85) {
    return randomFrom([5, 5, 4, 5, 4, 3]);
  }
  if (basePopularity >= 70) {
    return randomFrom([4, 4, 5, 3, 4, 3, 5]);
  }
  return randomFrom([3, 4, 3, 2, 4, 3]);
}

function randomPhotosForReview() {
  const shouldAttach = Math.random() < 0.58;
  if (!shouldAttach) return [];

  const count = randomInt(1, 3);
  const chosen = new Set();
  while (chosen.size < count) {
    chosen.add(randomFrom(reviewPhotoPool));
  }
  return Array.from(chosen);
}

async function seed() {
  await connectDatabase(MONGO_URI);

  if (CLEAR_EXISTING) {
    await Promise.all([Place.deleteMany({}), CheckIn.deleteMany({}), Review.deleteMany({})]);
    console.log("Cleared existing Place, CheckIn, and Review collections.");
  }

  const places = await Place.insertMany(placesSeed);
  console.log(`Inserted ${places.length} places.`);

  const allCheckIns = [];
  const now = new Date();

  for (const place of places) {
    for (let dayOffset = 14; dayOffset >= 1; dayOffset -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - dayOffset);
      day.setHours(0, 0, 0, 0);

      const weekendMultiplier = isWeekend(day) ? 1.25 : 1;
      const placeBase = place.basePopularity / 28;

      for (let hour = 0; hour < 24; hour += 1) {
        const demand = placeBase * hourlyDemandMultiplier(hour) * weekendMultiplier;
        const noisyCount = Math.max(
          0,
          Math.round(demand + randomInt(-2, 2) + (Math.random() < 0.07 ? randomInt(3, 8) : 0))
        );

        for (let i = 0; i < noisyCount; i += 1) {
          allCheckIns.push({
            place: place._id,
            visitorAlias: `Seed-${randomInt(1000, 9999)}`,
            source: "seed",
            createdAt: createTimestamp(day, hour),
          });
        }
      }
    }
  }

  const targetRecentLevels = {
    "India Gate, New Delhi": 59,
    "Humayun Tomb, New Delhi": 28,
    "Lodhi Garden, New Delhi": 17,
    "Gateway of India, Mumbai": 54,
    "Marine Drive, Mumbai": 31,
    "CSMVS Museum, Mumbai": 22,
    "Lalbagh Botanical Garden, Bengaluru": 26,
    "Cubbon Park, Bengaluru": 18,
    "Bangalore Palace": 14,
    "Amber Fort, Jaipur": 47,
    "Jal Mahal Viewpoint, Jaipur": 19,
    "City Palace Jaipur": 24,
    "Hawa Mahal, Jaipur": 41,
    "Jantar Mantar, Jaipur": 29,
    "Nahargarh Fort, Jaipur": 23,
    "Jaigarh Fort, Jaipur": 18,
    "Albert Hall Museum, Jaipur": 26,
  };

  for (const place of places) {
    const burstCount = targetRecentLevels[place.name] || randomInt(8, 20);
    for (let i = 0; i < burstCount; i += 1) {
      const recent = new Date(now);
      recent.setMinutes(now.getMinutes() - randomInt(0, 55), randomInt(0, 59), 0);

      allCheckIns.push({
        place: place._id,
        visitorAlias: `Live-${randomInt(1000, 9999)}`,
        source: "seed",
        createdAt: recent,
      });
    }
  }

  if (allCheckIns.length > 0) {
    await CheckIn.insertMany(allCheckIns, { ordered: false });
  }

  const allReviews = [];
  for (const place of places) {
    const reviewCount = randomInt(4, 18);
    for (let i = 0; i < reviewCount; i += 1) {
      const rating = weightedRating(place.basePopularity);
      const createdAt = new Date(now);
      createdAt.setDate(now.getDate() - randomInt(0, 24));
      createdAt.setHours(randomInt(7, 22), randomInt(0, 59), randomInt(0, 59), 0);

      allReviews.push({
        place: place._id,
        reviewerAlias: `Reviewer-${randomInt(1000, 9999)}`,
        rating,
        comment: randomFrom(reviewCommentPool[rating]),
        photos: randomPhotosForReview(),
        createdAt,
      });
    }
  }

  if (allReviews.length > 0) {
    await Review.insertMany(allReviews, { ordered: false });
  }

  console.log(`Inserted ${allCheckIns.length} check-ins.`);
  console.log(`Inserted ${allReviews.length} reviews.`);
  console.log("Seeding completed.");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
