const AUTH_USERS_KEY = "tourism_auth_users_v1";
const AUTH_SESSION_KEY = "tourism_auth_session_v1";

const authElements = {
  container: document.getElementById("container"),
  toggleBtn: document.getElementById("toggleBtn"),
  loginForm: document.getElementById("loginForm"),
  signupForm: document.getElementById("signupForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  signupName: document.getElementById("signupName"),
  signupEmail: document.getElementById("signupEmail"),
  signupPassword: document.getElementById("signupPassword"),
};

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (_error) {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function getUsers() {
  const users = readJsonStorage(AUTH_USERS_KEY, []);
  if (!Array.isArray(users)) return [];
  return users.filter((item) => item && typeof item === "object");
}

function saveUsers(users) {
  writeJsonStorage(AUTH_USERS_KEY, users);
}

function createNotice() {
  const notice = document.createElement("div");
  notice.className = "auth-notice";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  document.body.appendChild(notice);
  return notice;
}

const noticeElement = createNotice();
let noticeTimer = null;

function showNotice(message, type = "info") {
  if (!noticeElement) return;

  noticeElement.textContent = message;
  noticeElement.classList.remove("error", "success", "show");
  noticeElement.classList.add(type === "error" ? "error" : type === "success" ? "success" : "info");

  requestAnimationFrame(() => {
    noticeElement.classList.add("show");
  });

  if (noticeTimer) {
    clearTimeout(noticeTimer);
  }
  noticeTimer = setTimeout(() => {
    noticeElement.classList.remove("show");
  }, 2600);
}

function createSession(user) {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    loggedInAt: new Date().toISOString(),
  };
}

function saveSession(session) {
  writeJsonStorage(AUTH_SESSION_KEY, session);
}

function readSession() {
  const session = readJsonStorage(AUTH_SESSION_KEY, null);
  if (!session || typeof session !== "object") return null;
  if (!session.userId || !session.email) return null;
  return session;
}

function redirectToApp() {
  window.location.replace("/app");
}

function setToggleState(signupActive) {
  if (!authElements.container || !authElements.toggleBtn) return;
  authElements.container.classList.toggle("signup-active", signupActive);
  authElements.toggleBtn.textContent = signupActive ? "Login" : "Sign Up";
}

function attachToggleBehavior() {
  let signupActive = false;
  setToggleState(signupActive);

  if (!authElements.toggleBtn) return;
  authElements.toggleBtn.addEventListener("click", () => {
    signupActive = !signupActive;
    setToggleState(signupActive);
  });
}

function validateSignupPayload(name, email, password) {
  if (name.length < 2) {
    return "Name must be at least 2 characters.";
  }
  if (!email.includes("@") || !email.includes(".")) {
    return "Please enter a valid email address.";
  }
  if (!password) {
    return "Password is required.";
  }
  return null;
}

function deriveNameFromEmail(email) {
  const username = String(email || "").split("@")[0] || "Traveler";
  const normalized = username.replace(/[._-]+/g, " ").trim();
  if (!normalized) return "Traveler";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function handleSignupSubmit(event) {
  event.preventDefault();

  const name = String(authElements.signupName ? authElements.signupName.value : "").trim();
  const email = normalizeEmail(authElements.signupEmail ? authElements.signupEmail.value : "");
  const password = String(authElements.signupPassword ? authElements.signupPassword.value : "").trim();

  const validationMessage = validateSignupPayload(name, email, password);
  if (validationMessage) {
    showNotice(validationMessage, "error");
    return;
  }

  const users = getUsers();
  const exists = users.some((item) => item.email === email);
  if (exists) {
    showNotice("Account already exists. Please log in instead.", "error");
    setToggleState(false);
    return;
  }

  const user = {
    id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name,
    email,
    password,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);
  saveSession(createSession(user));
  showNotice("Account created. Redirecting to dashboard...", "success");

  setTimeout(() => {
    redirectToApp();
  }, 420);
}

function handleLoginSubmit(event) {
  event.preventDefault();

  const email = normalizeEmail(authElements.loginEmail ? authElements.loginEmail.value : "");
  const password = String(authElements.loginPassword ? authElements.loginPassword.value : "").trim();

  if (!email || !password) {
    showNotice("Enter email and password to continue.", "error");
    return;
  }

  if (!email.includes("@") || !email.includes(".")) {
    showNotice("Please enter a valid email address.", "error");
    return;
  }

  const users = getUsers();
  const existingByEmail = users.find((item) => item.email === email);
  const user = existingByEmail || {
    id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name: deriveNameFromEmail(email),
    email,
    createdAt: new Date().toISOString(),
  };

  user.password = password;
  if (!user.name) {
    user.name = deriveNameFromEmail(email);
  }

  if (!existingByEmail) {
    users.push(user);
  }
  saveUsers(users);
  saveSession(createSession(user));
  showNotice(`Welcome, ${user.name}. Redirecting...`, "success");

  setTimeout(() => {
    redirectToApp();
  }, 320);
}

function bootstrapAuth() {
  const session = readSession();
  if (session) {
    redirectToApp();
    return;
  }

  attachToggleBehavior();

  if (authElements.loginForm) {
    authElements.loginForm.addEventListener("submit", handleLoginSubmit);
  }
  if (authElements.signupForm) {
    authElements.signupForm.addEventListener("submit", handleSignupSubmit);
  }

  showNotice("Use any email and password to log in.");
}

document.addEventListener("DOMContentLoaded", bootstrapAuth);
