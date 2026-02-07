const THEME_STORAGE_KEY = "tourism_theme_mode";
const AUTH_SESSION_KEY = "tourism_auth_session_v1";
const VALID_THEMES = new Set(["dark", "light"]);

const elements = {
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  dashboardLink: document.getElementById("dashboardLink"),
  primaryCta: document.getElementById("primaryCta"),
  sessionInfo: document.getElementById("sessionInfo"),
  heroTitle: document.getElementById("heroTitle"),
  logoutBtn: document.getElementById("logoutBtn"),
};

function readStoredTheme() {
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    return VALID_THEMES.has(theme) ? theme : "dark";
  } catch (_error) {
    return "dark";
  }
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (_error) {
    // Ignore storage failures.
  }
}

function applyTheme(theme) {
  const safeTheme = VALID_THEMES.has(theme) ? theme : "dark";
  document.body.classList.remove("theme-dark", "theme-light");
  document.body.classList.add(`theme-${safeTheme}`);
  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.textContent = safeTheme === "dark" ? "Light Mode" : "Dark Mode";
  }
  return safeTheme;
}

function readAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.userId || !parsed.email) return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (_error) {
    // Ignore storage failures.
  }
}

function applySessionState(session) {
  if (!elements.dashboardLink || !elements.primaryCta || !elements.sessionInfo || !elements.heroTitle) return;

  if (session) {
    const name = String(session.name || "Traveler").trim() || "Traveler";
    elements.heroTitle.textContent = `Welcome back, ${name}`;
    elements.dashboardLink.textContent = "Continue Dashboard";
    elements.primaryCta.textContent = "Continue To Dashboard";
    elements.primaryCta.setAttribute("href", "/app");
    elements.sessionInfo.textContent = `Signed in as ${name} (${session.email}). Resume your live trip planner.`;
    if (elements.logoutBtn) {
      elements.logoutBtn.classList.remove("hidden");
    }
    return;
  }

  elements.heroTitle.textContent = "Explore Cities Without The Crowd Stress";
  elements.dashboardLink.textContent = "Open Dashboard";
  elements.primaryCta.textContent = "Get Started";
  elements.primaryCta.setAttribute("href", "/login");
  elements.sessionInfo.textContent = "No active session. Log in with any email and password.";
  if (elements.logoutBtn) {
    elements.logoutBtn.classList.add("hidden");
  }
}

function bindEvents() {
  let currentTheme = applyTheme(readStoredTheme());

  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener("click", () => {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(currentTheme);
      writeStoredTheme(currentTheme);
    });
  }

  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", () => {
      clearAuthSession();
      applySessionState(null);
      window.location.href = "/login";
    });
  }
}

function initWelcomePage() {
  bindEvents();
  const session = readAuthSession();
  applySessionState(session);
}

document.addEventListener("DOMContentLoaded", initWelcomePage);
