const express = require("express");
const GuideBooking = require("../models/GuideBooking");

const router = express.Router();

const guideCatalog = [
  {
    id: "guide_jaipur_raj",
    name: "Raj Singh",
    city: "Jaipur",
    specialization: "Heritage Forts + Old City Walks",
    languages: ["English", "Hindi", "French"],
    experienceYears: 9,
    rating: 4.9,
    hourlyRateInr: 1400,
    phone: "+91-98765-12001",
    bio: "Licensed Rajasthan heritage guide focused on Amber, City Palace, and cultural storytelling.",
  },
  {
    id: "guide_jaipur_priya",
    name: "Priya Sharma",
    city: "Jaipur",
    specialization: "Museums, Architecture, and Food Lanes",
    languages: ["English", "Hindi", "Spanish"],
    experienceYears: 7,
    rating: 4.8,
    hourlyRateInr: 1300,
    phone: "+91-98765-12002",
    bio: "Curates compact Jaipur routes combining history, local markets, and evening cultural spots.",
  },
  {
    id: "guide_jaipur_aamir",
    name: "Aamir Khan",
    city: "Jaipur",
    specialization: "Sunrise/Sunset Photo Tours",
    languages: ["English", "Hindi", "Urdu"],
    experienceYears: 6,
    rating: 4.7,
    hourlyRateInr: 1150,
    phone: "+91-98765-12003",
    bio: "Specialist in Nahargarh, Jal Mahal and night-lit landmarks with low-crowd photography windows.",
  },
  {
    id: "guide_jaipur_meera",
    name: "Meera Joshi",
    city: "Jaipur",
    specialization: "Family-Friendly Guided Tours",
    languages: ["English", "Hindi", "Gujarati"],
    experienceYears: 8,
    rating: 4.8,
    hourlyRateInr: 1250,
    phone: "+91-98765-12004",
    bio: "Known for relaxed, educational city tours suitable for families and first-time visitors.",
  },
  {
    id: "guide_delhi_arjun",
    name: "Arjun Verma",
    city: "New Delhi",
    specialization: "Monuments + Street Culture",
    languages: ["English", "Hindi"],
    experienceYears: 10,
    rating: 4.7,
    hourlyRateInr: 1450,
    phone: "+91-98765-12011",
    bio: "Handles full-day Delhi circuits from heritage sites to culinary hotspots.",
  },
  {
    id: "guide_mumbai_neha",
    name: "Neha Patil",
    city: "Mumbai",
    specialization: "Coastal + Colonial History Trails",
    languages: ["English", "Hindi", "Marathi"],
    experienceYears: 8,
    rating: 4.8,
    hourlyRateInr: 1500,
    phone: "+91-98765-12021",
    bio: "Provides structured South Mumbai walking routes with crowd-aware scheduling.",
  },
];

function normalizeCity(value) {
  return String(value || "").trim().toLowerCase();
}

function toTitleCase(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text
    .split(/\s+/g)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

function getGuidesByCity(cityInput) {
  const cityRaw = String(cityInput || "").trim();
  const cityNormalized = normalizeCity(cityRaw);

  if (!cityNormalized || cityNormalized === "all") {
    return {
      city: "All Cities",
      guides: guideCatalog,
    };
  }

  const filtered = guideCatalog.filter((guide) => normalizeCity(guide.city) === cityNormalized);
  return {
    city: toTitleCase(cityRaw),
    guides: filtered,
  };
}

function isValidDateText(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function isValidTimeText(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || "").trim());
}

router.get("/", (req, res) => {
  try {
    const city = String(req.query.city || "").trim();
    const result = getGuidesByCity(city);

    return res.json({
      success: true,
      data: {
        city: result.city,
        total: result.guides.length,
        guides: result.guides,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load guides",
      error: error.message,
    });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const guideId = String(req.body.guideId || "").trim();
    const touristName = String(req.body.touristName || "").trim();
    const touristPhone = String(req.body.touristPhone || "").trim();
    const preferredDate = String(req.body.preferredDate || "").trim();
    const preferredTime = String(req.body.preferredTime || "").trim();
    const notes = String(req.body.notes || "").trim();
    const durationInput = Number(req.body.durationHours || 4);
    const durationHours = Number.isFinite(durationInput)
      ? Math.max(1, Math.min(12, Math.round(durationInput)))
      : 4;

    const guide = guideCatalog.find((entry) => entry.id === guideId);
    if (!guide) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid tour guide.",
      });
    }

    if (touristName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Tourist name must be at least 2 characters.",
      });
    }

    if (!/^[0-9+\-\s]{8,20}$/.test(touristPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number.",
      });
    }

    if (!isValidDateText(preferredDate)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid preferred date (YYYY-MM-DD).",
      });
    }

    if (!isValidTimeText(preferredTime)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid preferred time (HH:mm).",
      });
    }

    const requestedDateTime = new Date(`${preferredDate}T${preferredTime}:00`);
    if (Number.isNaN(requestedDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Preferred date/time is invalid.",
      });
    }

    if (requestedDateTime.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Preferred date/time must be in the future.",
      });
    }

    const booking = await GuideBooking.create({
      guideId: guide.id,
      guideName: guide.name,
      guideCity: guide.city,
      touristName,
      touristPhone,
      preferredDate,
      preferredTime,
      durationHours,
      notes,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Tour guide booked successfully.",
      data: {
        booking: {
          id: booking._id,
          guideId: booking.guideId,
          guideName: booking.guideName,
          guideCity: booking.guideCity,
          touristName: booking.touristName,
          touristPhone: booking.touristPhone,
          preferredDate: booking.preferredDate,
          preferredTime: booking.preferredTime,
          durationHours: booking.durationHours,
          status: booking.status,
          createdAt: booking.createdAt,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to book tour guide.",
      error: error.message,
    });
  }
});

module.exports = router;
