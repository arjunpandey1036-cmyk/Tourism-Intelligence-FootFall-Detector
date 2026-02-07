const state = {
  map: null,
  markers: new Map(),
  heatLayer: null,
  heatEnabled: true,
  mapTilesReady: false,
  resizeRaf: null,
  hasFittedBounds: false,
  places: [],
  selectedPlaceId: null,
  refreshHandle: null,
  reviewsByPlace: new Map(),
  forecastByPlace: new Map(),
  refreshPromise: null,
  impactData: null,
  theme: "dark",
  scenario: "normal",
  demoStoryRunning: false,
  demoStoryRunId: 0,
  headerMenuOpen: false,
  baseTileLayer: null,
  placesViewMode: "smart",
  selectedIndiaCity: "Jaipur",
  tourRouteLayer: null,
  tourStopLayers: [],
  lastMapCity: "all",
  lastRouteCity: "all",
  guides: [],
  selectedGuideId: "",
  lastGuideCity: "",
};

const elements = {
  map: document.getElementById("map"),
  mapStatusOverlay: document.getElementById("mapStatusOverlay"),
  forecastPanel: document.getElementById("forecastPanel"),
  placesList: document.getElementById("placesList"),
  indiaCitySelect: document.getElementById("indiaCitySelect"),
  placesViewSelect: document.getElementById("placesViewSelect"),
  routeBadge: document.getElementById("routeBadge"),
  selectedPlaceCard: document.getElementById("selectedPlaceCard"),
  tourRouteSummary: document.getElementById("tourRouteSummary"),
  guidesList: document.getElementById("guidesList"),
  guideBookingForm: document.getElementById("guideBookingForm"),
  guideSelect: document.getElementById("guideSelect"),
  bookingName: document.getElementById("bookingName"),
  bookingPhone: document.getElementById("bookingPhone"),
  bookingDate: document.getElementById("bookingDate"),
  bookingTime: document.getElementById("bookingTime"),
  bookingHours: document.getElementById("bookingHours"),
  bookingNotes: document.getElementById("bookingNotes"),
  guideBookingStatus: document.getElementById("guideBookingStatus"),
  bookGuideBtn: document.getElementById("bookGuideBtn"),
  alternativesList: document.getElementById("alternativesList"),
  reviewTrustPanel: document.getElementById("reviewTrustPanel"),
  overviewCards: document.getElementById("overviewCards"),
  impactCards: document.getElementById("impactCards"),
  recentCheckIns: document.getElementById("recentCheckIns"),
  menuWrap: document.getElementById("menuWrap"),
  menuToggleBtn: document.getElementById("menuToggleBtn"),
  headerMenu: document.getElementById("headerMenu"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  aboutBtn: document.getElementById("aboutBtn"),
  welcomeBtn: document.getElementById("welcomeBtn"),
  scenarioSelect: document.getElementById("scenarioSelect"),
  demoStoryBtn: document.getElementById("demoStoryBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  openAddPlaceBtn: document.getElementById("openAddPlaceBtn"),
  closeAddPlaceBtn: document.getElementById("closeAddPlaceBtn"),
  addPlaceModal: document.getElementById("addPlaceModal"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  addPlaceForm: document.getElementById("addPlaceForm"),
  addPlaceSubmitBtn: document.getElementById("addPlaceSubmitBtn"),
  placeName: document.getElementById("placeName"),
  placeCategory: document.getElementById("placeCategory"),
  placeDescription: document.getElementById("placeDescription"),
  placeHistory: document.getElementById("placeHistory"),
  placeTags: document.getElementById("placeTags"),
  placeDuration: document.getElementById("placeDuration"),
  placeLat: document.getElementById("placeLat"),
  placeLng: document.getElementById("placeLng"),
  geocodeQuery: document.getElementById("geocodeQuery"),
  geocodeBtn: document.getElementById("geocodeBtn"),
  geocodeResults: document.getElementById("geocodeResults"),
  reviewSummary: document.getElementById("reviewSummary"),
  reviewsList: document.getElementById("reviewsList"),
  reviewForm: document.getElementById("reviewForm"),
  reviewAlias: document.getElementById("reviewAlias"),
  reviewRating: document.getElementById("reviewRating"),
  reviewComment: document.getElementById("reviewComment"),
  reviewPhotos: document.getElementById("reviewPhotos"),
  submitReviewBtn: document.getElementById("submitReviewBtn"),
  itineraryForm: document.getElementById("itineraryForm"),
  itineraryCity: document.getElementById("itineraryCity"),
  itineraryHours: document.getElementById("itineraryHours"),
  itineraryStartHour: document.getElementById("itineraryStartHour"),
  itineraryMaxPlaces: document.getElementById("itineraryMaxPlaces"),
  generateItineraryBtn: document.getElementById("generateItineraryBtn"),
  itineraryOutput: document.getElementById("itineraryOutput"),
  heatToggleBtn: document.getElementById("heatToggleBtn"),
  centerInsights: document.getElementById("centerInsights"),
  lastUpdated: document.getElementById("lastUpdated"),
  toast: document.getElementById("toast"),
  currentUser: document.getElementById("currentUser"),
  logoutBtn: document.getElementById("logoutBtn"),
};

const THEME_STORAGE_KEY = "tourism_theme_mode";
const AUTH_SESSION_KEY = "tourism_auth_session_v1";
const SCENARIO_STORAGE_KEY = "tourism_scenario_mode";
const VALID_THEMES = new Set(["dark", "light"]);
const VALID_SCENARIOS = new Set(["normal", "weekend", "festival"]);
const VALID_PLACES_VIEW_MODES = new Set([
  "smart",
  "low-only",
  "medium-only",
  "high-only",
  "top-rated",
  "most-visited",
  "name-az",
]);
const PLACE_HISTORY_FALLBACK = {
  "Amber Fort, Jaipur":
    "Built in the late 16th century by Raja Man Singh, Amber Fort was the capital seat of the Kachwaha Rajputs before Jaipur city was founded.",
  "Jal Mahal Viewpoint, Jaipur":
    "Jal Mahal is an 18th-century palace built in the middle of Man Sagar Lake, known for its Rajput and Mughal architectural blend.",
  "City Palace Jaipur":
    "City Palace was established in 1727 by Maharaja Sawai Jai Singh II and remains one of Jaipur's most important royal heritage complexes.",
  "Hawa Mahal, Jaipur":
    "Constructed in 1799 by Maharaja Sawai Pratap Singh, Hawa Mahal allowed royal women to observe street festivals without being seen.",
  "Jantar Mantar, Jaipur":
    "Commissioned by Sawai Jai Singh II in 1734, Jantar Mantar is the largest stone observatory in the world and a UNESCO World Heritage site.",
  "Nahargarh Fort, Jaipur":
    "Built in 1734 by Sawai Jai Singh II, Nahargarh Fort formed part of Jaipur's defensive ring along with Amber and Jaigarh forts.",
  "Jaigarh Fort, Jaipur":
    "Completed in 1726, Jaigarh Fort protected Amber Fort and houses Jaivana, once considered the world's largest cannon on wheels.",
  "Albert Hall Museum, Jaipur":
    "Opened to the public in 1887, Albert Hall is Rajasthan's oldest museum and an important symbol of Jaipur's colonial-era architecture.",
};

function readAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || typeof session !== "object") return null;
    if (!session.userId || !session.email) return null;
    return session;
  } catch (_error) {
    return null;
  }
}

function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (_error) {
    // Ignore storage access issues.
  }
}

function enforceAuthSession() {
  const session = readAuthSession();
  if (!session) {
    window.location.replace("/");
    return null;
  }
  return session;
}

function applyCurrentUser(session) {
  if (!elements.currentUser) return;
  const fallbackName = String(session.email || "Guest").split("@")[0] || "Guest";
  const displayName = String(session.name || fallbackName).trim();
  elements.currentUser.textContent = displayName || "Guest";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message, type = "info") {
  const themeStyles = getComputedStyle(document.body);
  const infoBg = themeStyles.getPropertyValue("--toast-info").trim() || "#1f2e3e";
  const errorBg = themeStyles.getPropertyValue("--toast-error").trim() || "#b42318";
  elements.toast.textContent = message;
  elements.toast.style.background = type === "error" ? errorBg : infoBg;
  elements.toast.classList.add("show");
  setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2200);
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const message = payload.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload.data;
}

function getBadgeClass(crowdLevel) {
  if (crowdLevel === "Low") return "badge badge-low";
  if (crowdLevel === "Medium") return "badge badge-medium";
  return "badge badge-high";
}

function getMarkerClass(crowdLevel) {
  if (crowdLevel === "Low") return "marker-low";
  if (crowdLevel === "Medium") return "marker-medium";
  return "marker-high";
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-IN");
}

function updateLastUpdated() {
  elements.lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString("en-IN")}`;
}

function setMapStatus(message, isError = false) {
  if (!elements.mapStatusOverlay) return;
  elements.mapStatusOverlay.textContent = message;
  elements.mapStatusOverlay.classList.remove("hidden", "error");
  if (isError) {
    elements.mapStatusOverlay.classList.add("error");
  }
}

function clearMapStatus() {
  if (!elements.mapStatusOverlay) return;
  elements.mapStatusOverlay.classList.add("hidden");
  elements.mapStatusOverlay.classList.remove("error");
  elements.mapStatusOverlay.textContent = "";
}

function syncMapViewport() {
  if (!state.map) return;
  try {
    state.map.invalidateSize({
      pan: false,
      debounceMoveend: true,
    });
  } catch (_error) {
    // Ignore map resize errors.
  }
}

function normalizeScenarioMode(value) {
  const candidate = String(value || "normal").trim().toLowerCase();
  if (VALID_SCENARIOS.has(candidate)) {
    return candidate;
  }
  return "normal";
}

function readSavedScenario() {
  try {
    const value = localStorage.getItem(SCENARIO_STORAGE_KEY);
    return normalizeScenarioMode(value);
  } catch (_error) {
    return "normal";
  }
}

function persistScenario(scenario) {
  try {
    localStorage.setItem(SCENARIO_STORAGE_KEY, scenario);
  } catch (_error) {
    // Ignore storage access issues.
  }
}

function scenarioLabel(scenario) {
  if (scenario === "weekend") return "Weekend Surge";
  if (scenario === "festival") return "Festival Peak";
  return "Normal";
}

function applyScenarioMode(scenario, options = {}) {
  const { persist = true } = options;
  const normalized = normalizeScenarioMode(scenario);
  state.scenario = normalized;
  if (elements.scenarioSelect) {
    elements.scenarioSelect.value = normalized;
  }
  if (persist) {
    persistScenario(normalized);
  }
}

function withScenario(url) {
  const scenario = normalizeScenarioMode(state.scenario);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}scenario=${encodeURIComponent(scenario)}`;
}

function setHeaderMenuOpen(open) {
  if (!elements.headerMenu || !elements.menuToggleBtn) return;
  state.headerMenuOpen = Boolean(open);
  elements.headerMenu.classList.toggle("hidden", !state.headerMenuOpen);
  elements.menuToggleBtn.setAttribute("aria-expanded", String(state.headerMenuOpen));
}

function closeHeaderMenu() {
  setHeaderMenuOpen(false);
}

function toggleHeaderMenu() {
  setHeaderMenuOpen(!state.headerMenuOpen);
}

function readSavedTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value && VALID_THEMES.has(value)) {
      return value;
    }
  } catch (_error) {
    // Ignore storage access issues.
  }
  return null;
}

function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (_error) {
    // Ignore storage access issues.
  }
}

function getPreferredTheme() {
  const saved = readSavedTheme();
  if (saved) return saved;

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

function getMapTileConfig() {
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  };
}

function updateThemeToggleText() {
  if (!elements.themeToggleBtn) return;
  elements.themeToggleBtn.textContent = state.theme === "dark" ? "Light Mode" : "Dark Mode";
}

function updateBaseTileLayer() {
  if (!state.map || typeof L === "undefined") return;

  setMapStatus("Loading map tiles...");
  const config = getMapTileConfig();
  const previousLayer = state.baseTileLayer;
  const nextLayer = L.tileLayer(config.url, {
    maxZoom: 19,
    attribution: config.attribution,
  });

  state.mapTilesReady = false;
  nextLayer.setOpacity(0);
  nextLayer.addTo(state.map);

  let settled = false;
  let loaded = false;
  const finalizeSwap = () => {
    if (settled) return;
    settled = true;

    nextLayer.setOpacity(1);
    if (previousLayer && state.map.hasLayer(previousLayer)) {
      state.map.removeLayer(previousLayer);
    }
  };

  nextLayer.once("load", () => {
    loaded = true;
    state.mapTilesReady = true;
    clearMapStatus();
    finalizeSwap();
    syncMapViewport();
  });

  setTimeout(() => {
    if (!loaded) {
      setMapStatus("Map tiles are slow or blocked. Live insights below are still active.");
    }
    finalizeSwap();
    syncMapViewport();
  }, 2400);

  state.baseTileLayer = nextLayer;
}

function applyTheme(theme, options = {}) {
  const { persist = true, refreshTiles = false } = options;
  if (!VALID_THEMES.has(theme)) return;

  state.theme = theme;
  document.body.classList.remove("theme-dark", "theme-light");
  document.body.classList.add(`theme-${theme}`);
  updateThemeToggleText();

  if (persist) {
    persistTheme(theme);
  }

  if (refreshTiles) {
    updateBaseTileLayer();
  }
}

function getPlaceById(placeId) {
  return state.places.find((place) => String(place.id) === String(placeId));
}

function normalizePlacesViewMode(value) {
  return VALID_PLACES_VIEW_MODES.has(value) ? value : "smart";
}

function getAverageRating(place) {
  if (!place || !place.reviews || place.reviews.totalReviews <= 0) return 0;
  return Number(place.reviews.averageRating) || 0;
}

function getVisitorsNow(place) {
  return Number(place && place.crowd ? place.crowd.currentVisitors : 0) || 0;
}

function getVisitScore(place) {
  return Number(place && place.crowd ? place.crowd.visitScore : 0) || 0;
}

function getPlaceHistoryText(place) {
  const direct = String(place && place.history ? place.history : "").trim();
  if (direct) return direct;
  const key = String(place && place.name ? place.name : "").trim();
  return PLACE_HISTORY_FALLBACK[key] || "";
}

function normalizeCityFilterValue(value) {
  const raw = String(value || "").trim();
  return raw.length > 0 ? raw : "all";
}

function getGuideCityFromSelection() {
  const city = normalizeCityFilterValue(state.selectedIndiaCity);
  return city === "all" ? "Jaipur" : city;
}

function clearGuidesPanel(message) {
  if (!elements.guidesList) return;
  elements.guidesList.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
}

function setGuideBookingFormState(disabled) {
  const fields = [
    elements.guideSelect,
    elements.bookingName,
    elements.bookingPhone,
    elements.bookingDate,
    elements.bookingTime,
    elements.bookingHours,
    elements.bookingNotes,
    elements.bookGuideBtn,
  ];
  fields.forEach((field) => {
    if (field) field.disabled = disabled;
  });

  if (elements.bookGuideBtn) {
    elements.bookGuideBtn.textContent = disabled ? "Booking..." : "Book Tour Guide";
  }
}

function setGuideBookingStatus(message, type = "info") {
  if (!elements.guideBookingStatus) return;
  elements.guideBookingStatus.textContent = String(message || "");
  elements.guideBookingStatus.classList.remove("success", "error");
  if (type === "success") {
    elements.guideBookingStatus.classList.add("success");
  } else if (type === "error") {
    elements.guideBookingStatus.classList.add("error");
  }
}

function renderGuideSelectOptions(guides) {
  if (!elements.guideSelect) return;

  const previous = String(state.selectedGuideId || "").trim();
  elements.guideSelect.innerHTML = `<option value="">Select guide</option>`;

  guides.forEach((guide) => {
    const option = document.createElement("option");
    option.value = guide.id;
    option.textContent = `${guide.name} (${guide.city})`;
    elements.guideSelect.appendChild(option);
  });

  const nextSelected =
    guides.find((guide) => String(guide.id) === previous)?.id || (guides[0] ? guides[0].id : "");

  state.selectedGuideId = nextSelected;
  elements.guideSelect.value = nextSelected;
  elements.guideSelect.disabled = guides.length === 0;
  if (elements.bookGuideBtn) {
    elements.bookGuideBtn.disabled = guides.length === 0;
  }
}

function renderGuides(guides, cityLabel) {
  if (!elements.guidesList) return;
  if (!Array.isArray(guides) || guides.length === 0) {
    clearGuidesPanel(`No guides available right now for ${cityLabel}.`);
    return;
  }

  elements.guidesList.innerHTML = guides
    .map(
      (guide) => `
      <article class="guide-card">
        <h4>${escapeHtml(guide.name)}</h4>
        <div class="muted">${escapeHtml(guide.specialization)}</div>
        <div class="guide-meta">
          <span class="guide-chip">City: ${escapeHtml(guide.city)}</span>
          <span class="guide-chip">Rating: ${Number(guide.rating || 0).toFixed(1)}</span>
          <span class="guide-chip">Experience: ${guide.experienceYears}y</span>
          <span class="guide-chip">INR ${guide.hourlyRateInr}/hr</span>
        </div>
        <div class="muted">Languages: ${escapeHtml((guide.languages || []).join(", "))}</div>
        <div class="muted">Contact: ${escapeHtml(guide.phone || "N/A")}</div>
        <div class="action-row">
          <button class="secondary-btn js-pick-guide" type="button" data-guide-id="${escapeHtml(guide.id)}">
            Select This Guide
          </button>
        </div>
      </article>
    `
    )
    .join("");
}

async function loadTourGuides() {
  const city = getGuideCityFromSelection();
  try {
    const payload = await apiRequest(`/api/guides?city=${encodeURIComponent(city)}`);
    const guides = payload && Array.isArray(payload.guides) ? payload.guides : [];
    const cityLabel = payload && payload.city ? payload.city : city;
    state.guides = guides;
    state.lastGuideCity = cityLabel;

    renderGuides(guides, cityLabel);
    renderGuideSelectOptions(guides);
    if (guides.length > 0) {
      setGuideBookingStatus(`Guides loaded for ${cityLabel}. Pick one and submit booking request.`, "info");
    } else {
      setGuideBookingStatus(`No guides currently listed for ${cityLabel}.`, "error");
    }
  } catch (error) {
    state.guides = [];
    state.selectedGuideId = "";
    clearGuidesPanel("Unable to load tour guides right now.");
    renderGuideSelectOptions([]);
    setGuideBookingStatus("Unable to load guides. Try refreshing data.", "error");
    showToast(error.message, "error");
  }
}

function selectGuideById(guideId) {
  const selected = state.guides.find((guide) => String(guide.id) === String(guideId));
  if (!selected) {
    showToast("Guide not found in current list.", "error");
    return;
  }
  state.selectedGuideId = selected.id;
  if (elements.guideSelect) {
    elements.guideSelect.value = selected.id;
  }
  setGuideBookingStatus(`Guide selected: ${selected.name}. Complete details to book.`, "info");
  if (elements.bookingName) {
    elements.bookingName.focus();
  }
  showToast(`Selected guide: ${selected.name}.`, "info");
}

function getPlacesForSelectedCity() {
  const selectedCity = normalizeCityFilterValue(state.selectedIndiaCity);
  if (selectedCity === "all") {
    return [...state.places];
  }
  return state.places.filter((place) => placeMatchesCity(place, selectedCity));
}

function getPlacesForMap() {
  return getPlacesForSelectedCity().filter(
    (place) => place && place.location && Number.isFinite(place.location.lat) && Number.isFinite(place.location.lng)
  );
}

function haversineDistanceKm(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const lat1 = Number(a.lat);
  const lng1 = Number(a.lng);
  const lat2 = Number(b.lat);
  const lng2 = Number(b.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Number.POSITIVE_INFINITY;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aTerm =
    sinLat * sinLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng;
  const cTerm = 2 * Math.atan2(Math.sqrt(aTerm), Math.sqrt(1 - aTerm));
  return earthRadiusKm * cTerm;
}

function escapeRegexValue(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function placeMatchesCity(place, cityFilterValue) {
  const normalized = normalizeCityFilterValue(cityFilterValue).toLowerCase();
  if (normalized === "all") return true;

  const name = String(place && place.name ? place.name : "");
  const description = String(place && place.description ? place.description : "");
  const history = String(place && place.history ? place.history : "");
  const category = String(place && place.category ? place.category : "");
  const tags = Array.isArray(place && place.tags) ? place.tags.join(" ") : "";
  const haystack = `${name} ${description} ${history} ${category} ${tags}`.toLowerCase();
  const escapedCity = escapeRegexValue(normalized);
  const cityRegex = new RegExp(`(^|[^a-z])${escapedCity}([^a-z]|$)`, "i");

  return cityRegex.test(haystack);
}

async function loadIndiaCities() {
  if (!elements.indiaCitySelect) return;

  const currentValue = normalizeCityFilterValue(state.selectedIndiaCity);
  elements.indiaCitySelect.disabled = true;
  elements.indiaCitySelect.innerHTML = `<option value="all">Loading cities...</option>`;

  try {
    const citiesPayload = await apiRequest("/api/places/india-cities");
    const cities = Array.isArray(citiesPayload) ? citiesPayload : [];
    const fragment = document.createDocumentFragment();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Cities";
    fragment.appendChild(allOption);

    cities.forEach((city) => {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      fragment.appendChild(option);
    });

    elements.indiaCitySelect.innerHTML = "";
    elements.indiaCitySelect.appendChild(fragment);

    const nextValue = cities.includes(currentValue) ? currentValue : "all";
    state.selectedIndiaCity = nextValue;
    elements.indiaCitySelect.value = nextValue;
  } catch (error) {
    elements.indiaCitySelect.innerHTML = `<option value="all">All Cities</option>`;
    state.selectedIndiaCity = "all";
    elements.indiaCitySelect.value = "all";
    showToast("Unable to load India cities list right now.", "error");
  } finally {
    elements.indiaCitySelect.disabled = false;
  }
}

function getPlacesForList() {
  const places = getPlacesForSelectedCity();
  const mode = normalizePlacesViewMode(state.placesViewMode);

  if (mode === "low-only") {
    return places
      .filter((place) => place.crowd && place.crowd.crowdLevel === "Low")
      .sort((a, b) => getVisitorsNow(a) - getVisitorsNow(b));
  }

  if (mode === "medium-only") {
    return places
      .filter((place) => place.crowd && place.crowd.crowdLevel === "Medium")
      .sort((a, b) => getVisitorsNow(a) - getVisitorsNow(b));
  }

  if (mode === "high-only") {
    return places
      .filter((place) => place.crowd && place.crowd.crowdLevel === "High")
      .sort((a, b) => getVisitorsNow(b) - getVisitorsNow(a));
  }

  if (mode === "top-rated") {
    return places.sort((a, b) => {
      const byRating = getAverageRating(b) - getAverageRating(a);
      if (Math.abs(byRating) > 0.001) return byRating;
      const byCount = (b.reviews ? b.reviews.totalReviews : 0) - (a.reviews ? a.reviews.totalReviews : 0);
      if (byCount !== 0) return byCount;
      return getVisitScore(b) - getVisitScore(a);
    });
  }

  if (mode === "most-visited") {
    return places.sort((a, b) => getVisitorsNow(b) - getVisitorsNow(a));
  }

  if (mode === "name-az") {
    return places.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }

  return places.sort((a, b) => {
    const byScore = getVisitScore(b) - getVisitScore(a);
    if (byScore !== 0) return byScore;
    const byRating = getAverageRating(b) - getAverageRating(a);
    if (Math.abs(byRating) > 0.001) return byRating;
    return getVisitorsNow(a) - getVisitorsNow(b);
  });
}

function renderStars(rating, max = 5) {
  const safeRating = Math.max(0, Math.min(max, Number(rating) || 0));
  const full = Math.round(safeRating);
  let output = "";
  for (let i = 1; i <= max; i += 1) {
    output += i <= full ? "<span class=\"star on\">&#9733;</span>" : "<span class=\"star\">&#9733;</span>";
  }
  return output;
}

function isImageUrl(url) {
  try {
    const parsed = new URL(String(url));
    return ["http:", "https:"].includes(parsed.protocol);
  } catch (_error) {
    return false;
  }
}

function normalizeReviewPhotoInput(value) {
  const photos = String(value || "")
    .split(/[\n,]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const uniquePhotos = [];
  for (const url of photos) {
    if (uniquePhotos.includes(url)) continue;
    uniquePhotos.push(url);
    if (uniquePhotos.length >= 6) break;
  }
  return uniquePhotos;
}

function renderReviewPhotos(photos) {
  if (!Array.isArray(photos) || photos.length === 0) return "";

  const validPhotos = photos
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0 && isImageUrl(item))
    .slice(0, 6);

  if (!validPhotos.length) return "";

  return `
    <div class="review-photos">
      ${validPhotos
        .map(
          (url) => `
        <a class="review-photo-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
          <img class="review-photo" src="${escapeHtml(url)}" alt="Place review photo" loading="lazy" />
        </a>
      `
        )
        .join("")}
    </div>
  `;
}

function renderPlaces() {
  if (!state.places.length) {
    elements.placesList.innerHTML = `<p class="muted">No places available.</p>`;
    return;
  }

  const placesForList = getPlacesForList();
  if (!placesForList.length) {
    elements.placesList.innerHTML = `<p class="muted">No places match this view.</p>`;
    return;
  }

  elements.placesList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  placesForList.forEach((place, index) => {
    const card = document.createElement("div");
    card.className = `place-card fade-rise ${
      String(place.id) === String(state.selectedPlaceId) ? "selected" : ""
    }`;
    card.style.animationDelay = `${index * 35}ms`;
    card.dataset.placeId = place.id;

    const tagsMarkup = (place.tags || []).slice(0, 4).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
    const averageRating = place.reviews && place.reviews.totalReviews > 0 ? place.reviews.averageRating : 0;
    const totalReviews = place.reviews ? place.reviews.totalReviews : 0;

    card.innerHTML = `
      <h4>${escapeHtml(place.name)}</h4>
      <div class="muted">${escapeHtml(place.category)}</div>
      <div class="place-meta">
        <span class="${getBadgeClass(place.crowd.crowdLevel)}">${escapeHtml(place.crowd.crowdLevel)}</span>
        <span>${place.crowd.currentVisitors} visitors now</span>
      </div>
      <div class="muted">Best time: ${escapeHtml(place.bestTime.recommendedTimeText)}</div>
      <div class="rating-line">${renderStars(averageRating)}
        <span>${totalReviews > 0 ? `${averageRating.toFixed(1)}/5 (${totalReviews})` : "No ratings yet"}</span>
      </div>
      <div class="tag-row">${tagsMarkup}</div>
      <div class="action-row">
        <button class="primary-btn js-checkin-btn" data-checkin="${place.id}">Check In</button>
      </div>
    `;

    card.addEventListener("click", () => {
      selectPlace(place.id, true);
    });

    const checkInBtn = card.querySelector(".js-checkin-btn");
    checkInBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      handleCheckIn(place.id);
    });

    fragment.appendChild(card);
  });

  elements.placesList.appendChild(fragment);
}

async function syncSelectionForCurrentFilters() {
  const visiblePlaces = getPlacesForList();
  if (!visiblePlaces.length) {
    state.selectedPlaceId = null;
    renderPlaces();
    renderSelectedPlace(null);
    renderAlternatives(null, []);
    clearForecastPanel("Select a place to see forecast.");
    clearReviewPanel("Select a place to see ratings and reviews.");
    return;
  }

  const hasVisibleSelection = visiblePlaces.some(
    (place) => String(place.id) === String(state.selectedPlaceId)
  );
  if (!hasVisibleSelection) {
    state.selectedPlaceId = visiblePlaces[0].id;
  }

  renderPlaces();
  const selectedPlace = getPlaceById(state.selectedPlaceId);
  renderSelectedPlace(selectedPlace);

  if (state.selectedPlaceId) {
    await Promise.all([
      loadAlternatives(state.selectedPlaceId),
      loadReviews(state.selectedPlaceId),
      loadForecast(state.selectedPlaceId),
    ]);
  }
}

function renderSelectedPlace(place) {
  if (!place) {
    elements.selectedPlaceCard.innerHTML = `<p class="muted">Select a place to view recommendations.</p>`;
    setReviewFormEnabled(false);
    return;
  }

  const topSlots = place.bestTime.bestSlots.map((slot) => slot.label).join(", ");
  const reviewLabel =
    place.reviews && place.reviews.totalReviews > 0
      ? `${place.reviews.averageRating.toFixed(1)}/5 from ${place.reviews.totalReviews} reviews`
      : "No reviews yet";
  const historyText = getPlaceHistoryText(place);
  const historyMarkup = historyText
    ? `<div class="history-note"><strong>History:</strong> ${escapeHtml(historyText)}</div>`
    : `<div class="history-note"><strong>History:</strong> Historical details are not available for this place yet.</div>`;

  elements.selectedPlaceCard.innerHTML = `
    <h4>${escapeHtml(place.name)}</h4>
    <div class="muted">${escapeHtml(place.description || "No description yet.")}</div>
    ${historyMarkup}
    <div class="muted">Scenario: ${escapeHtml(scenarioLabel(state.scenario))}</div>
    <div class="place-meta">
      <span class="${getBadgeClass(place.crowd.crowdLevel)}">${escapeHtml(place.crowd.crowdLevel)}</span>
      <span>${place.crowd.currentVisitors} in last hour</span>
    </div>
    <div class="muted">Last 6h: ${place.crowd.last6HoursVisitors} | Last 24h: ${place.crowd.last24HoursVisitors}</div>
    <div class="muted">Visit score: ${place.crowd.visitScore}/100</div>
    <div class="muted">Recommended windows: ${escapeHtml(topSlots || "No data yet")}</div>
    <div class="rating-line">${renderStars(place.reviews ? place.reviews.averageRating : 0)} <span>${escapeHtml(reviewLabel)}</span></div>
    <div class="action-row">
      <button class="primary-btn" id="selectedCheckinBtn">Check In Here</button>
    </div>
  `;

  const selectedCheckinBtn = document.getElementById("selectedCheckinBtn");
  selectedCheckinBtn.addEventListener("click", () => handleCheckIn(place.id));
  setReviewFormEnabled(true);
}

function renderAlternatives(target, alternatives) {
  if (!target) {
    elements.alternativesList.innerHTML = `<p class="muted">Alternatives appear when a place is crowded.</p>`;
    return;
  }

  if (target.crowdLevel === "Low") {
    elements.alternativesList.innerHTML = `<p class="muted">${escapeHtml(target.name)} is currently low crowd. No diversion needed.</p>`;
    return;
  }

  if (!alternatives.length) {
    elements.alternativesList.innerHTML = `<p class="muted">No suitable alternatives found nearby right now.</p>`;
    return;
  }

  elements.alternativesList.innerHTML = alternatives
    .map(
      (item) => `
      <div class="alternative-card">
        <strong>${escapeHtml(item.name)}</strong>
        <div class="place-meta">
          <span class="${getBadgeClass(item.crowdLevel)}">${escapeHtml(item.crowdLevel)}</span>
          <span>${item.currentVisitors} visitors now</span>
        </div>
        <div class="muted">${item.distanceKm} km away | ${escapeHtml(item.category)}</div>
      </div>
    `
    )
    .join("");
}

function renderOverview(data) {
  const totalReviews = data.totals.totalReviews || 0;
  const scenarioText = scenarioLabel(data.scenario || state.scenario);

  elements.overviewCards.innerHTML = `
    <div class="metric-card">
      <strong>${data.totals.places}</strong>
      <span class="muted">Places</span>
    </div>
    <div class="metric-card">
      <strong>${data.totals.totalCheckIns}</strong>
      <span class="muted">Total Check-ins</span>
    </div>
    <div class="metric-card">
      <strong>${data.byCrowdLevel.Low}</strong>
      <span class="muted">Low Crowd</span>
    </div>
    <div class="metric-card">
      <strong>${data.byCrowdLevel.Medium + data.byCrowdLevel.High}</strong>
      <span class="muted">Need Attention</span>
    </div>
    <div class="metric-card metric-wide">
      <strong>${totalReviews}</strong>
      <span class="muted">Total Reviews</span>
    </div>
    <div class="metric-card metric-wide">
      <strong>${escapeHtml(scenarioText)}</strong>
      <span class="muted">Scenario Mode</span>
    </div>
  `;
}

function renderCenterInsights() {
  if (!elements.centerInsights) return;

  if (!state.places.length) {
    elements.centerInsights.innerHTML = `<div class="insight-list"><p class="muted">Live insights appear after place data loads.</p></div>`;
    return;
  }

  const sortedByVisitors = [...state.places].sort(
    (a, b) => (b.crowd.currentVisitors || 0) - (a.crowd.currentVisitors || 0)
  );
  const topCrowded = sortedByVisitors.slice(0, 3);
  const lowCrowdPlaces = state.places
    .filter((place) => place.crowd.crowdLevel === "Low")
    .sort((a, b) => (a.crowd.currentVisitors || 0) - (b.crowd.currentVisitors || 0))
    .slice(0, 3);

  let weightedRatingTotal = 0;
  let totalReviewCount = 0;
  const categoryLoad = new Map();
  for (const place of state.places) {
    const average = Number(place.reviews && place.reviews.averageRating ? place.reviews.averageRating : 0);
    const count = Number(place.reviews && place.reviews.totalReviews ? place.reviews.totalReviews : 0);
    weightedRatingTotal += average * count;
    totalReviewCount += count;

    const category = place.category || "Other";
    const visitors = Number(place.crowd.currentVisitors || 0);
    categoryLoad.set(category, (categoryLoad.get(category) || 0) + visitors);
  }

  const globalRating = totalReviewCount > 0 ? (weightedRatingTotal / totalReviewCount).toFixed(1) : "0.0";
  const busiestCategoryEntry = [...categoryLoad.entries()].sort((a, b) => b[1] - a[1])[0];
  const busiestCategory = busiestCategoryEntry ? busiestCategoryEntry[0] : "N/A";
  const selected = getPlaceById(state.selectedPlaceId) || state.places[0];
  const selectedWindows =
    selected && selected.bestTime && Array.isArray(selected.bestTime.bestSlots)
      ? selected.bestTime.bestSlots.slice(0, 2).map((slot) => slot.label).join(" | ")
      : "";
  const topRows =
    topCrowded.length > 0
      ? topCrowded
          .map(
            (place) => `
        <div class="insight-row">
          <span class="insight-name">${escapeHtml(place.name)}</span>
          <span class="insight-meta">
            <span class="${getBadgeClass(place.crowd.crowdLevel)}">${escapeHtml(place.crowd.crowdLevel)}</span>
            <span>${place.crowd.currentVisitors}</span>
          </span>
        </div>
      `
          )
          .join("")
      : `<div class="insight-row"><span class="muted">No crowd records yet.</span></div>`;

  const lowRows =
    lowCrowdPlaces.length > 0
      ? lowCrowdPlaces
          .map(
            (place) => `
        <div class="insight-row">
          <span class="insight-name">${escapeHtml(place.name)}</span>
          <span class="insight-meta"><span class="pulse-chip">${place.crowd.currentVisitors} now</span></span>
        </div>
      `
          )
          .join("")
      : `<div class="insight-row"><span class="muted">No low-crowd places right now.</span></div>`;

  elements.centerInsights.innerHTML = `
    <div class="insight-grid">
      <article class="insight-card">
        <strong>${state.places.length}</strong>
        <span>Live tracked places</span>
      </article>
      <article class="insight-card">
        <strong>${escapeHtml(String(busiestCategory))}</strong>
        <span>Busiest category now</span>
      </article>
      <article class="insight-card">
        <strong>${globalRating}/5</strong>
        <span>Global public rating</span>
      </article>
    </div>
    <div class="insight-list">
      <div class="insight-row">
        <span class="insight-name">Top crowd right now</span>
        <span class="pulse-chip">${selectedWindows || "No best window yet"}</span>
      </div>
      ${topRows}
    </div>
    <div class="insight-list">
      <div class="insight-row">
        <span class="insight-name">Low-crowd picks</span>
        <span class="pulse-chip">${escapeHtml(selected ? selected.name : "No selection")}</span>
      </div>
      ${lowRows}
    </div>
  `;
}

function clearForecastPanel(message) {
  if (!elements.forecastPanel) return;
  elements.forecastPanel.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
}

function renderForecastPanel(bundle) {
  if (!elements.forecastPanel) return;
  if (!bundle || !Array.isArray(bundle.forecast) || bundle.forecast.length === 0) {
    clearForecastPanel("Forecast unavailable for this place.");
    return;
  }

  elements.forecastPanel.innerHTML = bundle.forecast
    .map(
      (slot) => `
      <article class="forecast-tile">
        <small>${escapeHtml(slot.label)} (${escapeHtml(slot.window)})</small>
        <strong>${slot.expectedVisitors}</strong>
        <span class="${getBadgeClass(slot.crowdLevel)}">${escapeHtml(slot.crowdLevel)}</span>
        <small>Confidence ${slot.confidence}%</small>
      </article>
    `
    )
    .join("");
}

function clearImpactCards(message) {
  if (!elements.impactCards) return;
  elements.impactCards.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
}

function renderImpactCards(data) {
  if (!elements.impactCards) return;
  if (!data) {
    clearImpactCards("Impact metrics unavailable.");
    return;
  }

  elements.impactCards.innerHTML = `
    <article class="impact-card">
      <strong>${data.avoidedOvercrowdedSpots}</strong>
      <span>Avoided overcrowded visits</span>
    </article>
    <article class="impact-card">
      <strong>${data.estimatedWaitTimeSavedMinutes} min</strong>
      <span>Total wait saved</span>
    </article>
    <article class="impact-card">
      <strong>${data.diversionSuccessRate}%</strong>
      <span>Diversion success rate</span>
    </article>
    <article class="impact-card">
      <strong>${data.experienceStabilityScore}/100</strong>
      <span>Experience stability score</span>
    </article>
  `;
}

function clearItineraryOutput(message) {
  if (!elements.itineraryOutput) return;
  elements.itineraryOutput.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
}

function renderItineraryOutput(data) {
  if (!elements.itineraryOutput) return;
  if (!data || !Array.isArray(data.itinerary) || data.itinerary.length === 0) {
    clearItineraryOutput("No itinerary generated yet.");
    return;
  }

  const fallbackNote =
    data.filters && data.filters.fallbackToAllCities
      ? `<p class="muted">No exact city match found. Showing best plan from all cities.</p>`
      : "";

  const itemsMarkup = data.itinerary
    .map(
      (item) => `
      <article class="itinerary-item">
        <strong>${item.order}. ${escapeHtml(item.place.name)}</strong>
        <div class="itinerary-meta">
          <span>${escapeHtml(item.place.category)}</span>
          <span>${item.timing.arrivalTime} - ${item.timing.departureTime}</span>
          <span>${item.timing.stayMinutes} min stay</span>
          <span>Travel ${item.timing.travelFromPreviousMinutes} min</span>
          <span class="${getBadgeClass(item.crowd.crowdLevel)}">${escapeHtml(item.crowd.crowdLevel)}</span>
        </div>
      </article>
    `
    )
    .join("");

  const alternativesMarkup =
    data.alternatives && data.alternatives.length > 0
      ? data.alternatives
          .map(
            (item) =>
              `<span class="trust-chip">${escapeHtml(item.name)} (${escapeHtml(item.crowdLevel)})</span>`
          )
          .join("")
      : `<span class="muted">No extra alternatives</span>`;

  elements.itineraryOutput.innerHTML = `
    <div class="insight-row">
      <span class="insight-name">Plan Summary</span>
      <span class="pulse-chip">${data.summary.totalPlaces} stops | ${data.summary.totalDurationMinutes} min</span>
    </div>
    <div class="itinerary-meta">
      <span>Start ${data.summary.startTime}</span>
      <span>End ${data.summary.endTime}</span>
      <span>Travel ${data.summary.travelMinutes} min</span>
      <span>Visit score ${data.summary.avgVisitScore}</span>
      <span>Scenario ${escapeHtml(scenarioLabel(data.summary.scenario))}</span>
    </div>
    ${fallbackNote}
    ${itemsMarkup}
    <div class="itinerary-meta">${alternativesMarkup}</div>
  `;
}

function renderRecentCheckIns(checkIns) {
  if (!checkIns.length) {
    elements.recentCheckIns.innerHTML = `<p class="muted">No check-ins yet.</p>`;
    return;
  }

  elements.recentCheckIns.innerHTML = checkIns
    .map(
      (entry) => `
      <div class="checkin-item">
        <strong>${entry.place ? escapeHtml(entry.place.name) : "Unknown Place"}</strong>
        <div class="muted">${escapeHtml(entry.visitorAlias)} | ${formatDateTime(entry.createdAt)}</div>
      </div>
    `
    )
    .join("");
}

function setReviewFormEnabled(enabled) {
  elements.reviewAlias.disabled = !enabled;
  elements.reviewRating.disabled = !enabled;
  elements.reviewComment.disabled = !enabled;
  if (elements.reviewPhotos) {
    elements.reviewPhotos.disabled = !enabled;
  }
  elements.submitReviewBtn.disabled = !enabled;
}

function clearReviewPanel(message) {
  elements.reviewSummary.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
  elements.reviewsList.innerHTML = "";
  if (elements.reviewTrustPanel) {
    elements.reviewTrustPanel.innerHTML = `<p class="muted">Trust signals will appear after reviews load.</p>`;
  }
}

function renderReviewTrust(bundle) {
  if (!elements.reviewTrustPanel) return;
  if (!bundle || !Array.isArray(bundle.reviews)) {
    elements.reviewTrustPanel.innerHTML = `<p class="muted">Trust signals unavailable.</p>`;
    return;
  }

  const selected = getPlaceById(state.selectedPlaceId);
  const verifiedCheckIns = selected && selected.crowd ? selected.crowd.last24HoursVisitors : 0;
  const totalPhotos = bundle.reviews.reduce((sum, review) => {
    const count = Array.isArray(review.photos) ? review.photos.length : 0;
    return sum + count;
  }, 0);
  const latestPhotoReview = bundle.reviews.find(
    (review) => Array.isArray(review.photos) && review.photos.length > 0
  );
  const latestPhotoUrl =
    latestPhotoReview && Array.isArray(latestPhotoReview.photos) ? latestPhotoReview.photos[0] : "";

  elements.reviewTrustPanel.innerHTML = `
    <div class="trust-grid">
      <span class="trust-chip">Verified check-ins 24h: ${verifiedCheckIns}</span>
      <span class="trust-chip">Photo uploads: ${totalPhotos}</span>
      <span class="trust-chip">Live scenario: ${escapeHtml(scenarioLabel(state.scenario))}</span>
    </div>
    ${
      latestPhotoUrl
        ? `<a class="trust-photo-preview" href="${escapeHtml(
            latestPhotoUrl
          )}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(
            latestPhotoUrl
          )}" alt="Latest review photo" loading="lazy" /></a>`
        : `<p class="muted">No photo uploaded yet for this place.</p>`
    }
  `;
}

function renderReviewBundle(bundle) {
  if (!bundle) {
    clearReviewPanel("Select a place to see ratings and reviews.");
    return;
  }

  const average = bundle.summary.averageRating || 0;
  const total = bundle.summary.totalReviews || 0;

  elements.reviewSummary.innerHTML = `
    <div class="review-summary-top">
      <div class="review-score">${average.toFixed(1)}</div>
      <div>
        <div class="rating-line big">${renderStars(average)}</div>
        <div class="muted">${total} review${total === 1 ? "" : "s"}</div>
      </div>
    </div>
    <div class="breakdown-grid">
      ${[5, 4, 3, 2, 1]
        .map((star) => {
          const count = bundle.breakdown && bundle.breakdown[star] ? bundle.breakdown[star] : 0;
          const width = total > 0 ? Math.round((count / total) * 100) : 0;
          return `
            <div class="break-row">
              <span>${star}&#9733;</span>
              <div class="break-track"><div class="break-fill" style="width:${width}%"></div></div>
              <span>${count}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  if (!bundle.reviews || bundle.reviews.length === 0) {
    renderReviewTrust(bundle);
    elements.reviewsList.innerHTML = `<p class="muted">No reviews yet. Be the first to review this place.</p>`;
    return;
  }

  elements.reviewsList.innerHTML = bundle.reviews
    .map(
      (review) => `
      <article class="review-card">
        <div class="review-top">
          <strong>${escapeHtml(review.reviewerAlias)}</strong>
          <span class="muted">${formatDateTime(review.createdAt)}</span>
        </div>
        <div class="rating-line">${renderStars(review.rating)}</div>
        <p>${escapeHtml(review.comment)}</p>
        ${renderReviewPhotos(review.photos)}
      </article>
    `
    )
    .join("");
  renderReviewTrust(bundle);
}

function safeFlyTo(lat, lng, zoom = 12, duration = 0.8) {
  if (!state.map || typeof L === "undefined") return;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  try {
    if (typeof state.map.stop === "function") {
      state.map.stop();
    }

    if (state.map._loaded) {
      state.map.flyTo([lat, lng], zoom, { duration, animate: true });
    } else {
      state.map.setView([lat, lng], zoom, { animate: false });
    }
  } catch (_error) {
    try {
      state.map.setView([lat, lng], zoom, { animate: false });
    } catch (_fallbackError) {
      // Ignore fallback failures to keep UI responsive.
    }
  }
}

function clearMarkers() {
  for (const markerLayer of state.markers.values()) {
    markerLayer.remove();
  }
  state.markers.clear();
}

function clearTourRoute() {
  if (state.tourRouteLayer && state.map) {
    state.map.removeLayer(state.tourRouteLayer);
  }
  state.tourRouteLayer = null;

  if (Array.isArray(state.tourStopLayers)) {
    state.tourStopLayers.forEach((layer) => {
      if (layer && state.map) {
        state.map.removeLayer(layer);
      }
    });
  }
  state.tourStopLayers = [];
}

function updateRouteBadge(text, active = false) {
  if (!elements.routeBadge) return;
  elements.routeBadge.textContent = text;
  elements.routeBadge.classList.toggle("route-badge-active", Boolean(active));
  elements.routeBadge.classList.toggle("route-badge-muted", !active);
}

function renderTourRouteSummary(routePlaces, cityName, totalDistanceKm) {
  if (!elements.tourRouteSummary) return;

  const cityLabel = cityName && cityName !== "all" ? cityName : "";
  if (!cityLabel) {
    elements.tourRouteSummary.innerHTML = `<p class="muted">Select a city to generate a tour route.</p>`;
    return;
  }

  if (!Array.isArray(routePlaces) || routePlaces.length < 2) {
    elements.tourRouteSummary.innerHTML = `
      <p class="muted">
        Not enough places to build a route for ${escapeHtml(cityLabel)}. Add at least 2 places in this city.
      </p>
    `;
    return;
  }

  const stepsMarkup = routePlaces
    .map(
      (place, index) => `
      <div class="route-step">
        <span class="route-step-index">${index + 1}</span>
        <span class="route-step-name">${escapeHtml(place.name)}</span>
      </div>
    `
    )
    .join("");

  elements.tourRouteSummary.innerHTML = `
    <div class="route-summary-head">
      <strong>${escapeHtml(cityLabel)} Tour Route</strong>
      <span class="badge badge-low">${routePlaces.length} stops</span>
    </div>
    <div class="route-summary-meta">
      <span>Approx distance: ${Number(totalDistanceKm || 0).toFixed(1)} km</span>
      <span>Optimized for nearby hops</span>
    </div>
    <div class="route-step-list">${stepsMarkup}</div>
  `;
}

function buildTourRoutePlaces(places) {
  if (!Array.isArray(places) || places.length < 2) return [];

  const pool = [...places];
  let current =
    pool.find((place) => String(place.id) === String(state.selectedPlaceId)) ||
    pool
      .slice()
      .sort((a, b) => getVisitScore(b) - getVisitScore(a) || getVisitorsNow(a) - getVisitorsNow(b))[0];

  if (!current) return [];

  const ordered = [current];
  let remaining = pool.filter((place) => String(place.id) !== String(current.id));

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i += 1) {
      const distance = haversineDistanceKm(current.location, remaining[i].location);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    current = remaining.splice(bestIndex, 1)[0];
    ordered.push(current);
  }

  return ordered;
}

function updateTourRouteOnMap(mapPlaces) {
  if (!state.map || typeof L === "undefined") return;

  clearTourRoute();

  const selectedCity = normalizeCityFilterValue(state.selectedIndiaCity);
  if (selectedCity === "all") {
    updateRouteBadge("Tour Route: Select City", false);
    renderTourRouteSummary([], "", 0);
    state.lastRouteCity = "all";
    return;
  }

  const routePlaces = buildTourRoutePlaces(mapPlaces);
  if (routePlaces.length < 2) {
    updateRouteBadge(`Tour Route: Need 2+ spots in ${selectedCity}`, false);
    renderTourRouteSummary(routePlaces, selectedCity, 0);
    state.lastRouteCity = selectedCity;
    return;
  }

  const latLngs = routePlaces.map((place) => [place.location.lat, place.location.lng]);
  state.tourRouteLayer = L.polyline(latLngs, {
    color: "#10c6da",
    weight: 4,
    opacity: 0.86,
    lineJoin: "round",
    dashArray: "10 8",
  }).addTo(state.map);

  let totalDistanceKm = 0;
  for (let i = 1; i < routePlaces.length; i += 1) {
    totalDistanceKm += haversineDistanceKm(routePlaces[i - 1].location, routePlaces[i].location);
  }

  state.tourStopLayers = routePlaces.map((place, index) => {
    const marker = L.marker([place.location.lat, place.location.lng], {
      icon: L.divIcon({
        className: "route-stop-wrap",
        html: `<span class="route-stop-marker">${index + 1}</span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      keyboard: false,
      title: `${index + 1}. ${place.name}`,
    }).addTo(state.map);

    marker.bindTooltip(`${index + 1}. ${place.name}`, {
      direction: "top",
      offset: [0, -10],
      opacity: 0.92,
    });
    return marker;
  });

  if (state.lastRouteCity !== selectedCity && state.tourRouteLayer) {
    const routeBounds = state.tourRouteLayer.getBounds();
    if (routeBounds && routeBounds.isValid()) {
      state.map.fitBounds(routeBounds.pad(0.23), { animate: true, duration: 0.65 });
    }
  }

  updateRouteBadge(`Tour Route: ${selectedCity} (${routePlaces.length} stops)`, true);
  renderTourRouteSummary(routePlaces, selectedCity, totalDistanceKm);
  state.lastRouteCity = selectedCity;
}

function getHeatPoints() {
  return getPlacesForMap().map((place) => [
    place.location.lat,
    place.location.lng,
    Math.min(1, place.crowd.currentVisitors / 70 + 0.12),
  ]);
}

function updateHeatLayer() {
  if (!state.map || typeof L === "undefined") return;
  if (typeof L.heatLayer !== "function") return;
  const heatPoints = getHeatPoints();

  if (!state.heatEnabled) {
    if (state.heatLayer && state.map.hasLayer(state.heatLayer)) {
      state.map.removeLayer(state.heatLayer);
    }
    return;
  }

  if (!state.heatLayer) {
    state.heatLayer = L.heatLayer(heatPoints, {
      radius: 26,
      blur: 24,
      maxZoom: 14,
      minOpacity: 0.3,
      gradient: {
        0.2: "#18d47b",
        0.5: "#f7b53a",
        0.82: "#ff5f7a",
      },
    });
  } else {
    state.heatLayer.setLatLngs(heatPoints);
  }

  if (!state.map.hasLayer(state.heatLayer)) {
    state.heatLayer.addTo(state.map);
  }
}

function updateMapMarkers() {
  if (!state.map || typeof L === "undefined") return;
  clearMarkers();

  const mapPlaces = getPlacesForMap();
  const currentMapCity = normalizeCityFilterValue(state.selectedIndiaCity);
  const cityChanged = currentMapCity !== state.lastMapCity;
  const bounds = L.latLngBounds([]);

  mapPlaces.forEach((place) => {
    const icon = L.divIcon({
      className: "crowd-icon-wrap",
      html: `<span class="crowd-marker ${getMarkerClass(place.crowd.crowdLevel)}"></span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const marker = L.marker([place.location.lat, place.location.lng], {
      icon,
      keyboard: false,
      title: place.name,
    }).addTo(state.map);

    const reviewText =
      place.reviews && place.reviews.totalReviews > 0
        ? `${place.reviews.averageRating.toFixed(1)}/5 (${place.reviews.totalReviews})`
        : "No ratings";

    marker.bindPopup(`
      <div style="min-width:220px;">
        <strong>${escapeHtml(place.name)}</strong>
        <div>${escapeHtml(place.category)}</div>
        <div>Crowd: ${escapeHtml(place.crowd.crowdLevel)} (${place.crowd.currentVisitors})</div>
        <div>Best time: ${escapeHtml(place.bestTime.recommendedTimeText)}</div>
        <div>Rating: ${escapeHtml(reviewText)}</div>
      </div>
    `);

    marker.on("click", () => {
      selectPlace(place.id, true);
    });

    state.markers.set(String(place.id), marker);
    bounds.extend([place.location.lat, place.location.lng]);
  });

  if ((!state.hasFittedBounds || cityChanged) && bounds.isValid()) {
    state.map.fitBounds(bounds.pad(0.3));
    state.hasFittedBounds = true;
  }

  updateHeatLayer();
  updateTourRouteOnMap(mapPlaces);
  state.lastMapCity = currentMapCity;
}

function openInfoWindowForPlace(place) {
  if (!state.map || typeof L === "undefined") return;
  const marker = state.markers.get(String(place.id));
  if (!marker) return;
  if (!state.map.hasLayer(marker)) return;

  try {
    marker.openPopup();
  } catch (_error) {
    // Ignore transient popup errors while markers are being refreshed.
  }
}

async function loadAlternatives(placeId) {
  try {
    const data = await apiRequest(withScenario(`/api/places/${placeId}/alternatives?maxDistanceKm=8&maxResults=4`));
    renderAlternatives(data.target, data.alternatives);
  } catch (error) {
    renderAlternatives(null, []);
  }
}

async function loadForecast(placeId) {
  if (!placeId) {
    clearForecastPanel("Select a place to see forecast.");
    return;
  }

  try {
    const data = await apiRequest(withScenario(`/api/places/${placeId}/forecast?hoursAhead=3`));
    state.forecastByPlace.set(String(placeId), data);
    if (String(placeId) === String(state.selectedPlaceId)) {
      renderForecastPanel(data);
    }
  } catch (error) {
    if (String(placeId) === String(state.selectedPlaceId)) {
      clearForecastPanel("Forecast unavailable right now.");
    }
  }
}

async function loadReviews(placeId) {
  if (!placeId) {
    clearReviewPanel("Select a place to see ratings and reviews.");
    return;
  }

  try {
    const data = await apiRequest(`/api/places/${placeId}/reviews?limit=40`);
    state.reviewsByPlace.set(String(placeId), data);
    if (String(placeId) === String(state.selectedPlaceId)) {
      renderReviewBundle(data);
    }
  } catch (error) {
    if (String(placeId) === String(state.selectedPlaceId)) {
      clearReviewPanel("Unable to load reviews right now.");
    }
  }
}

async function selectPlace(placeId, panToMarker) {
  state.selectedPlaceId = placeId;
  renderPlaces();

  const place = getPlaceById(placeId);
  renderSelectedPlace(place);
  if (!place) return;

  if (panToMarker && state.map) {
    safeFlyTo(place.location.lat, place.location.lng, 12, 0.8);
    openInfoWindowForPlace(place);
  }

  await Promise.all([loadAlternatives(place.id), loadReviews(place.id), loadForecast(place.id)]);
}

function setCheckinButtonsState(placeId, disabled) {
  const buttons = document.querySelectorAll(`[data-checkin="${placeId}"]`);
  buttons.forEach((btn) => {
    btn.disabled = disabled;
    btn.textContent = disabled ? "Checking..." : "Check In";
  });

  const selectedButton = document.getElementById("selectedCheckinBtn");
  if (selectedButton) {
    selectedButton.disabled = disabled;
    selectedButton.textContent = disabled ? "Checking..." : "Check In Here";
  }
}

async function handleCheckIn(placeId) {
  setCheckinButtonsState(placeId, true);
  try {
    const payload = await apiRequest("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    });

    showToast(`Check-in saved at ${payload.checkIn.placeName}. Crowd is now ${payload.crowd.crowdLevel}.`, "info");

    await refreshData(true);
    await selectPlace(placeId, false);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setCheckinButtonsState(placeId, false);
  }
}

async function fetchPlaces() {
  const data = await apiRequest(withScenario("/api/places"));
  state.places = data;
}

async function fetchOverview() {
  const data = await apiRequest(withScenario("/api/analytics/overview"));
  renderOverview(data);
}

async function fetchImpact() {
  const data = await apiRequest(withScenario("/api/analytics/impact"));
  state.impactData = data;
  renderImpactCards(data);
}

async function fetchRecentCheckIns() {
  const data = await apiRequest("/api/checkins/recent?limit=8");
  renderRecentCheckIns(data);
}

async function refreshData(keepSelection = true) {
  if (state.refreshPromise) {
    return state.refreshPromise;
  }

  state.refreshPromise = (async () => {
    try {
      await fetchPlaces();

      if (state.places.length && (!keepSelection || !getPlaceById(state.selectedPlaceId))) {
        state.selectedPlaceId = state.places[0].id;
      }

      const visiblePlaces = getPlacesForList();
      if (!visiblePlaces.length) {
        state.selectedPlaceId = null;
      } else if (!visiblePlaces.some((place) => String(place.id) === String(state.selectedPlaceId))) {
        state.selectedPlaceId = visiblePlaces[0].id;
      }

      updateMapMarkers();
      renderPlaces();

      if (state.selectedPlaceId) {
        const selectedPlace = getPlaceById(state.selectedPlaceId);
        renderSelectedPlace(selectedPlace);
        await Promise.all([
          loadAlternatives(state.selectedPlaceId),
          loadReviews(state.selectedPlaceId),
          loadForecast(state.selectedPlaceId),
        ]);
      } else {
        renderSelectedPlace(null);
        renderAlternatives(null, []);
        clearForecastPanel("Select a place to see forecast.");
        clearReviewPanel("Select a place to see ratings and reviews.");
      }

      renderCenterInsights();
      updateLastUpdated();
      await Promise.all([fetchOverview(), fetchImpact(), fetchRecentCheckIns()]);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      state.refreshPromise = null;
    }
  })();

  return state.refreshPromise;
}

function renderMapFallback(message) {
  setMapStatus(message, true);
  elements.map.innerHTML = `<div class="map-fallback">${escapeHtml(message)}</div>`;
}

function initializeMap() {
  if (typeof L === "undefined") {
    renderMapFallback("Leaflet failed to load.");
    return false;
  }

  state.map = L.map(elements.map, {
    center: [22.9734, 78.6569],
    zoom: 4,
    zoomControl: false,
    preferCanvas: true,
    attributionControl: true,
    worldCopyJump: true,
  });

  L.control.zoom({ position: "topright" }).addTo(state.map);
  updateBaseTileLayer();
  setTimeout(syncMapViewport, 120);
  setTimeout(syncMapViewport, 620);

  return true;
}

function updateHeatToggleText() {
  if (!elements.heatToggleBtn) return;
  elements.heatToggleBtn.textContent = `Heatmap: ${state.heatEnabled ? "On" : "Off"}`;
}

function openAddPlaceModal() {
  closeHeaderMenu();
  elements.modalBackdrop.classList.remove("hidden");
  elements.addPlaceModal.classList.remove("hidden");
  elements.addPlaceModal.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    elements.placeName.focus();
  }, 20);
}

function closeAddPlaceModal() {
  elements.modalBackdrop.classList.add("hidden");
  elements.addPlaceModal.classList.add("hidden");
  elements.addPlaceModal.setAttribute("aria-hidden", "true");
}

function setAddPlaceFormState(disabled) {
  const fields = [
    elements.placeName,
    elements.placeCategory,
    elements.placeDescription,
    elements.placeHistory,
    elements.placeTags,
    elements.placeDuration,
    elements.placeLat,
    elements.placeLng,
    elements.geocodeQuery,
    elements.geocodeBtn,
    elements.addPlaceSubmitBtn,
  ];
  fields.forEach((field) => {
    if (field) field.disabled = disabled;
  });

  elements.addPlaceSubmitBtn.textContent = disabled ? "Adding Place..." : "Add Place";
}

function setGeocodeLoading(loading) {
  elements.geocodeBtn.disabled = loading;
  elements.geocodeBtn.textContent = loading ? "Searching..." : "Find Location";
}

function renderGeocodeResults(results) {
  if (!results || !results.length) {
    elements.geocodeResults.innerHTML = `<p class="muted">No locations found.</p>`;
    return;
  }

  elements.geocodeResults.innerHTML = results
    .map(
      (item, index) => `
      <button type="button" class="geocode-item" data-geo-index="${index}">
        <strong>${escapeHtml(item.display_name.split(",")[0])}</strong>
        <span>${escapeHtml(item.display_name)}</span>
      </button>
    `
    )
    .join("");

  const optionButtons = elements.geocodeResults.querySelectorAll(".geocode-item");
  optionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-geo-index"));
      const selected = results[index];
      if (!selected) return;

      const lat = Number(selected.lat);
      const lng = Number(selected.lon);
      elements.placeLat.value = Number.isFinite(lat) ? String(lat.toFixed(6)) : "";
      elements.placeLng.value = Number.isFinite(lng) ? String(lng.toFixed(6)) : "";

      if (!elements.placeName.value.trim()) {
        elements.placeName.value = selected.display_name.split(",")[0].trim();
      }

      if (state.map && Number.isFinite(lat) && Number.isFinite(lng)) {
        safeFlyTo(lat, lng, 11, 0.8);
      }
    });
  });
}

async function handleGeocodeSearch() {
  const query = elements.geocodeQuery.value.trim();
  if (query.length < 3) {
    showToast("Enter at least 3 characters to search location.", "error");
    return;
  }

  setGeocodeLoading(true);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(
      query
    )}`;
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      throw new Error("Location search failed.");
    }

    const results = await response.json();
    renderGeocodeResults(results || []);
  } catch (error) {
    elements.geocodeResults.innerHTML = `<p class="muted">Unable to search location now. Enter coordinates manually.</p>`;
    showToast(error.message, "error");
  } finally {
    setGeocodeLoading(false);
  }
}

async function handleAddPlaceSubmit(event) {
  event.preventDefault();

  const name = elements.placeName.value.trim();
  const category = elements.placeCategory.value.trim() || "Attraction";
  const description = elements.placeDescription.value.trim();
  const history = elements.placeHistory ? elements.placeHistory.value.trim() : "";
  const tags = elements.placeTags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  const averageVisitDurationMinutes = Number(elements.placeDuration.value || 60);
  const lat = Number(elements.placeLat.value);
  const lng = Number(elements.placeLng.value);

  if (!name) {
    showToast("Place name is required.", "error");
    return;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    showToast("Valid latitude and longitude are required.", "error");
    return;
  }

  setAddPlaceFormState(true);
  try {
    const created = await apiRequest("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        description,
        history,
        tags,
        averageVisitDurationMinutes,
        location: { lat, lng },
      }),
    });

    showToast(`Added ${created.name} successfully.`);
    closeAddPlaceModal();
    elements.addPlaceForm.reset();
    elements.geocodeResults.innerHTML = "";

    await refreshData(true);
    if (created && created.id) {
      await selectPlace(created.id, true);
    }
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setAddPlaceFormState(false);
  }
}

async function handleReviewSubmit(event) {
  event.preventDefault();

  const placeId = state.selectedPlaceId;
  if (!placeId) {
    showToast("Select a place before posting a review.", "error");
    return;
  }

  const reviewerAlias = elements.reviewAlias.value.trim();
  const rating = Number(elements.reviewRating.value || 5);
  const comment = elements.reviewComment.value.trim();
  const photos = normalizeReviewPhotoInput(elements.reviewPhotos ? elements.reviewPhotos.value : "");

  if (comment.length < 3) {
    showToast("Review must be at least 3 characters.", "error");
    return;
  }

  if (photos.some((url) => !isImageUrl(url))) {
    showToast("Please provide valid image URLs (http/https).", "error");
    return;
  }

  setReviewFormEnabled(false);
  elements.submitReviewBtn.textContent = "Submitting...";

  try {
    await apiRequest(`/api/places/${placeId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewerAlias,
        rating,
        comment,
        photos,
      }),
    });

    elements.reviewComment.value = "";
    if (elements.reviewPhotos) {
      elements.reviewPhotos.value = "";
    }
    showToast("Review submitted successfully.");

    await refreshData(true);
    await loadReviews(placeId);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setReviewFormEnabled(true);
    elements.submitReviewBtn.textContent = "Submit Review";
  }
}

async function handleGuideBookingSubmit(event) {
  event.preventDefault();

  const guideId = String(elements.guideSelect ? elements.guideSelect.value : "").trim();
  const touristName = String(elements.bookingName ? elements.bookingName.value : "").trim();
  const touristPhone = String(elements.bookingPhone ? elements.bookingPhone.value : "").trim();
  const preferredDate = String(elements.bookingDate ? elements.bookingDate.value : "").trim();
  const preferredTime = String(elements.bookingTime ? elements.bookingTime.value : "").trim();
  const notes = String(elements.bookingNotes ? elements.bookingNotes.value : "").trim();
  const durationHours = Number(elements.bookingHours ? elements.bookingHours.value : 4);

  if (!guideId) {
    showToast("Please select a tour guide first.", "error");
    return;
  }

  if (touristName.length < 2) {
    showToast("Enter your name (at least 2 characters).", "error");
    return;
  }

  if (!/^[0-9+\-\s]{8,20}$/.test(touristPhone)) {
    showToast("Please enter a valid phone number.", "error");
    return;
  }

  if (!preferredDate || !preferredTime) {
    showToast("Please select preferred date and time.", "error");
    setGuideBookingStatus("Pick preferred date and time.", "error");
    return;
  }

  const bookingDateTime = new Date(`${preferredDate}T${preferredTime}:00`);
  if (Number.isNaN(bookingDateTime.getTime())) {
    showToast("Invalid booking date/time.", "error");
    setGuideBookingStatus("Invalid booking date/time format.", "error");
    return;
  }

  const now = new Date();
  if (bookingDateTime.getTime() < now.getTime()) {
    showToast("Please choose a future date/time.", "error");
    setGuideBookingStatus("Booking time cannot be in the past.", "error");
    return;
  }

  setGuideBookingFormState(true);
  try {
    const payload = await apiRequest("/api/guides/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guideId,
        touristName,
        touristPhone,
        preferredDate,
        preferredTime,
        durationHours,
        notes,
      }),
    });

    const booking = payload && payload.booking ? payload.booking : null;
    const guideName = booking && booking.guideName ? booking.guideName : "guide";
    const dateText = booking && booking.preferredDate ? booking.preferredDate : preferredDate;
    const timeText = booking && booking.preferredTime ? booking.preferredTime : preferredTime;
    showToast(`Booking requested with ${guideName} on ${dateText} at ${timeText}.`, "info");
    setGuideBookingStatus(
      `Request sent for ${guideName} on ${dateText} at ${timeText}. Status: pending confirmation.`,
      "success"
    );

    if (elements.bookingNotes) {
      elements.bookingNotes.value = "";
    }
  } catch (error) {
    showToast(error.message, "error");
    setGuideBookingStatus(error.message || "Unable to create booking request.", "error");
  } finally {
    setGuideBookingFormState(false);
  }
}

function setItineraryFormState(disabled) {
  const fields = [
    elements.itineraryCity,
    elements.itineraryHours,
    elements.itineraryStartHour,
    elements.itineraryMaxPlaces,
    elements.generateItineraryBtn,
  ];
  fields.forEach((field) => {
    if (field) field.disabled = disabled;
  });

  if (elements.generateItineraryBtn) {
    elements.generateItineraryBtn.textContent = disabled ? "Generating..." : "Generate Smart Plan";
  }
}

async function requestItinerary(payload) {
  return apiRequest("/api/places/itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      scenario: state.scenario,
    }),
  });
}

async function handleItinerarySubmit(event) {
  event.preventDefault();
  const city = elements.itineraryCity ? elements.itineraryCity.value.trim() : "";
  const timeBudgetHours = Number(elements.itineraryHours ? elements.itineraryHours.value : 6);
  const startHour = Number(elements.itineraryStartHour ? elements.itineraryStartHour.value : 9);
  const maxPlaces = Number(elements.itineraryMaxPlaces ? elements.itineraryMaxPlaces.value : 4);

  setItineraryFormState(true);
  try {
    const data = await requestItinerary({
      city,
      timeBudgetHours,
      startHour,
      maxPlaces,
    });
    renderItineraryOutput(data);
    showToast("Smart itinerary generated.", "info");
  } catch (error) {
    clearItineraryOutput("Unable to generate itinerary right now.");
    showToast(error.message, "error");
  } finally {
    setItineraryFormState(false);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function playDemoStory() {
  if (state.demoStoryRunning) {
    showToast("Demo story is already running.", "info");
    return;
  }

  state.demoStoryRunning = true;
  state.demoStoryRunId += 1;
  const runId = state.demoStoryRunId;

  if (elements.demoStoryBtn) {
    elements.demoStoryBtn.disabled = true;
    elements.demoStoryBtn.textContent = "Running Demo...";
  }

  try {
    await refreshData(true);

    if (!state.places.length) {
      throw new Error("No places available for demo story.");
    }

    const crowded = [...state.places].sort((a, b) => b.crowd.currentVisitors - a.crowd.currentVisitors)[0];
    await selectPlace(crowded.id, true);
    showToast(`Step 1: ${crowded.name} is currently crowded.`, "info");
    await sleep(1900);
    if (runId !== state.demoStoryRunId) return;

    const alternativesData = await apiRequest(
      withScenario(`/api/places/${crowded.id}/alternatives?maxDistanceKm=12&maxResults=4`)
    ).catch(() => null);
    const diversionId =
      alternativesData && alternativesData.alternatives && alternativesData.alternatives[0]
        ? alternativesData.alternatives[0].placeId
        : null;

    let divertedPlace = null;
    if (diversionId) {
      divertedPlace = getPlaceById(diversionId);
    }
    if (!divertedPlace) {
      divertedPlace = [...state.places]
        .filter((place) => place.id !== crowded.id)
        .sort((a, b) => a.crowd.currentVisitors - b.crowd.currentVisitors)[0];
    }

    if (divertedPlace) {
      await selectPlace(divertedPlace.id, true);
      showToast(`Step 2: Smart diversion suggests ${divertedPlace.name}.`, "info");
      await sleep(1900);
      if (runId !== state.demoStoryRunId) return;
    }

    const topRatedLow = [...state.places]
      .filter((place) => place.crowd.crowdLevel !== "High")
      .sort((a, b) => {
        const scoreA = (a.reviews.averageRating || 0) * 10 - a.crowd.currentVisitors;
        const scoreB = (b.reviews.averageRating || 0) * 10 - b.crowd.currentVisitors;
        return scoreB - scoreA;
      })[0];

    if (topRatedLow) {
      await selectPlace(topRatedLow.id, true);
      showToast(`Step 3: Best visit now -> ${topRatedLow.name}.`, "info");
      await sleep(1900);
      if (runId !== state.demoStoryRunId) return;
    }

    const itineraryData = await requestItinerary({
      city: "",
      timeBudgetHours: 6,
      startHour: new Date().getHours(),
      maxPlaces: 4,
    });
    renderItineraryOutput(itineraryData);
    showToast("Step 4: Auto itinerary generated for judges.", "info");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    state.demoStoryRunning = false;
    if (elements.demoStoryBtn) {
      elements.demoStoryBtn.disabled = false;
      elements.demoStoryBtn.textContent = "Play Demo Story";
    }
  }
}

function attachStaticEvents() {
  if (elements.menuToggleBtn) {
    elements.menuToggleBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleHeaderMenu();
    });
  }

  if (elements.headerMenu) {
    elements.headerMenu.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  document.addEventListener("click", (event) => {
    if (!state.headerMenuOpen) return;
    if (elements.menuWrap && elements.menuWrap.contains(event.target)) return;
    closeHeaderMenu();
  });

  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", () => {
      if (state.refreshHandle) {
        clearInterval(state.refreshHandle);
        state.refreshHandle = null;
      }

      closeHeaderMenu();
      clearAuthSession();
      window.location.replace("/");
    });
  }

  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener("click", () => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      applyTheme(nextTheme, { persist: true, refreshTiles: false });
      closeHeaderMenu();
    });
  }

  if (elements.aboutBtn) {
    elements.aboutBtn.addEventListener("click", () => {
      closeHeaderMenu();
      window.location.href = "/about";
    });
  }

  if (elements.welcomeBtn) {
    elements.welcomeBtn.addEventListener("click", () => {
      closeHeaderMenu();
      window.location.href = "/welcome";
    });
  }

  if (elements.scenarioSelect) {
    elements.scenarioSelect.addEventListener("change", async (event) => {
      const nextScenario = normalizeScenarioMode(event.target.value);
      applyScenarioMode(nextScenario, { persist: true });
      showToast(`Scenario switched to ${scenarioLabel(nextScenario)}.`);
      await refreshData(true);
      closeHeaderMenu();
    });
  }

  if (elements.placesViewSelect) {
    elements.placesViewSelect.addEventListener("change", async (event) => {
      state.placesViewMode = normalizePlacesViewMode(event.target.value);
      elements.placesViewSelect.value = state.placesViewMode;
      await syncSelectionForCurrentFilters();
    });
  }

  if (elements.indiaCitySelect) {
    elements.indiaCitySelect.addEventListener("change", async (event) => {
      state.selectedIndiaCity = normalizeCityFilterValue(event.target.value);
      elements.indiaCitySelect.value = state.selectedIndiaCity;
      await syncSelectionForCurrentFilters();
      updateMapMarkers();
      await loadTourGuides();
      if (state.selectedPlaceId) {
        openInfoWindowForPlace(getPlaceById(state.selectedPlaceId));
      }
    });
  }

  if (elements.demoStoryBtn) {
    elements.demoStoryBtn.addEventListener("click", () => {
      closeHeaderMenu();
      playDemoStory();
    });
  }

  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener("click", () => {
      closeHeaderMenu();
      refreshData(true);
    });
  }

  if (elements.heatToggleBtn) {
    elements.heatToggleBtn.addEventListener("click", () => {
      state.heatEnabled = !state.heatEnabled;
      updateHeatToggleText();
      updateHeatLayer();
    });
  }

  if (elements.openAddPlaceBtn) {
    elements.openAddPlaceBtn.addEventListener("click", openAddPlaceModal);
  }
  if (elements.closeAddPlaceBtn) {
    elements.closeAddPlaceBtn.addEventListener("click", closeAddPlaceModal);
  }
  if (elements.modalBackdrop) {
    elements.modalBackdrop.addEventListener("click", closeAddPlaceModal);
  }
  if (elements.addPlaceForm) {
    elements.addPlaceForm.addEventListener("submit", handleAddPlaceSubmit);
  }
  if (elements.geocodeBtn) {
    elements.geocodeBtn.addEventListener("click", handleGeocodeSearch);
  }
  if (elements.reviewForm) {
    elements.reviewForm.addEventListener("submit", handleReviewSubmit);
  }
  if (elements.guideBookingForm) {
    elements.guideBookingForm.addEventListener("submit", handleGuideBookingSubmit);
  }
  if (elements.guideSelect) {
    elements.guideSelect.addEventListener("change", (event) => {
      state.selectedGuideId = String(event.target.value || "").trim();
    });
  }
  if (elements.guidesList) {
    elements.guidesList.addEventListener("click", (event) => {
      const button = event.target.closest(".js-pick-guide");
      if (!button) return;
      const guideId = String(button.getAttribute("data-guide-id") || "").trim();
      selectGuideById(guideId);
    });
  }
  if (elements.itineraryForm) {
    elements.itineraryForm.addEventListener("submit", handleItinerarySubmit);
  }

  if (elements.geocodeQuery) {
    elements.geocodeQuery.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleGeocodeSearch();
      }
    });
  }

  window.addEventListener("resize", () => {
    if (state.resizeRaf) {
      cancelAnimationFrame(state.resizeRaf);
    }
    state.resizeRaf = requestAnimationFrame(() => {
      state.resizeRaf = null;
      syncMapViewport();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeHeaderMenu();
      closeAddPlaceModal();
    }
  });
}

async function bootstrap() {
  const session = enforceAuthSession();
  if (!session) {
    return;
  }

  applyCurrentUser(session);
  attachStaticEvents();
  applyTheme(getPreferredTheme(), { persist: false, refreshTiles: false });
  applyScenarioMode(readSavedScenario(), { persist: false });
  if (elements.placesViewSelect) {
    elements.placesViewSelect.value = state.placesViewMode;
  }
  if (elements.indiaCitySelect) {
    elements.indiaCitySelect.value = state.selectedIndiaCity;
  }
  if (elements.bookingDate) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayText = `${yyyy}-${mm}-${dd}`;
    elements.bookingDate.min = todayText;
    if (!elements.bookingDate.value) {
      elements.bookingDate.value = todayText;
    }
  }
  if (elements.bookingTime && !elements.bookingTime.value) {
    elements.bookingTime.value = "10:00";
  }
  setGuideBookingStatus("Select a guide and submit to request confirmation.", "info");
  setHeaderMenuOpen(false);
  setReviewFormEnabled(false);
  clearReviewPanel("Select a place to see ratings and reviews.");
  clearForecastPanel("Select a place to see forecast.");
  clearImpactCards("Impact metrics load with live data.");
  clearItineraryOutput("Generate an itinerary to show route intelligence.");
  renderCenterInsights();

  if (typeof L === "undefined" || typeof L.heatLayer !== "function") {
    state.heatEnabled = false;
    if (elements.heatToggleBtn) {
      elements.heatToggleBtn.disabled = true;
      elements.heatToggleBtn.textContent = "Heatmap: Unavailable";
    }
  } else {
    updateHeatToggleText();
  }

  const mapReady = initializeMap();
  if (!mapReady) {
    showToast("Map engine did not initialize.", "error");
  }

  await loadIndiaCities();
  await loadTourGuides();
  await refreshData(true);
  if (mapReady && state.selectedPlaceId) {
    openInfoWindowForPlace(getPlaceById(state.selectedPlaceId));
  }

  state.refreshHandle = setInterval(() => {
    refreshData(true);
  }, 20000);
}

document.addEventListener("DOMContentLoaded", bootstrap);


