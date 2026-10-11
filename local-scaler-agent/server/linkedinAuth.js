// LinkedIn OAuth 2.0 (3-legged): config, token storage, authorization URL and code exchange.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const API = "https://api.linkedin.com";
const SCOPES = "openid profile w_member_social";
const TIMEOUT_MS = 60000;
const STATE_TTL_MS = 10 * 60 * 1000;

const env = (name) => (process.env[name] || "").trim();
const tokenPath = () => env("LINKEDIN_TOKEN_FILE") || path.join(__dirname, ".linkedin-token.json");

class LinkedInError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

function config() {
  return {
    clientId: env("LINKEDIN_CLIENT_ID"),
    clientSecret: env("LINKEDIN_CLIENT_SECRET"),
    redirectUri: env("LINKEDIN_REDIRECT_URI") || "http://localhost:3000/api/linkedin/callback",
    version: env("LINKEDIN_API_VERSION") || "202609",
  };
}

const isConfigured = () => Boolean(config().clientId && config().clientSecret);

// ---- token storage (git-ignored file; on hosts with an ephemeral disk you simply reconnect) ----
function loadToken() {
  try {
    const t = JSON.parse(fs.readFileSync(tokenPath(), "utf8"));
    if (!t.accessToken || !t.personId) return null;
    if (t.expiresAt && Date.now() >= t.expiresAt) return null;
    return t;
  } catch {
    return null;
  }
}
const saveToken = (t) => fs.writeFileSync(tokenPath(), JSON.stringify(t), { mode: 0o600 });
function clearToken() {
  try {
    fs.unlinkSync(tokenPath());
  } catch {
    /* nothing stored */
  }
}

async function http(url, opts = {}) {
  try {
    return await fetch(url, { ...opts, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new LinkedInError(`Could not reach LinkedIn: ${err.message}`);
  }
}

async function failure(res, what) {
  const body = await res.text().catch(() => "");
  let detail = body.slice(0, 300);
  try {
    const j = JSON.parse(body);
    detail = j.message || j.error_description || j.error || detail;
  } catch {
    /* keep raw text */
  }
  const status = res.status === 401 ? 401 : res.status === 403 ? 403 : 502;
  const hint =
    res.status === 401
      ? " Reconnect LinkedIn (the token expired or was revoked)."
      : res.status === 403
        ? ' Make sure your LinkedIn app has the "Share on LinkedIn" product (w_member_social scope).'
        : "";
  return new LinkedInError(`${what} failed (${res.status}): ${detail}.${hint}`, status);
}

// One-time `state` values protect the OAuth callback against forged requests.
const pendingStates = new Map();
function newState() {
  const now = Date.now();
  for (const [k, exp] of pendingStates) if (exp < now) pendingStates.delete(k);
  const state = crypto.randomBytes(24).toString("hex");
  pendingStates.set(state, now + STATE_TTL_MS);
  return state;
}
function consumeState(state) {
  const exp = pendingStates.get(state);
  pendingStates.delete(state);
  return Boolean(exp && exp >= Date.now());
}

function authUrl(state) {
  const c = config();
  const q = new URLSearchParams({
    response_type: "code",
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    state,
    scope: SCOPES,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${q}`;
}

async function connectWithCode(code) {
  const c = config();
  const res = await http("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: c.redirectUri,
    }),
  });
  if (!res.ok) throw await failure(res, "LinkedIn sign-in");
  const tok = await res.json();

  const me = await http(`${API}/v2/userinfo`, { headers: { Authorization: `Bearer ${tok.access_token}` } });
  if (!me.ok) throw await failure(me, "Reading your LinkedIn profile");
  const profile = await me.json();

  const saved = {
    accessToken: tok.access_token,
    expiresAt: tok.expires_in ? Date.now() + Number(tok.expires_in) * 1000 : 0,
    personId: profile.sub,
    name: profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(" ") || "LinkedIn member",
  };
  saveToken(saved);
  return saved;
}

module.exports = {
  API,
  LinkedInError,
  config,
  isConfigured,
  loadToken,
  clearToken,
  http,
  failure,
  newState,
  consumeState,
  authUrl,
  connectWithCode,
};
