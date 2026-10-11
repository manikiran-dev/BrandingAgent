// Express routes for LinkedIn (mounted at /api/linkedin) plus access control.
const crypto = require("crypto");
const express = require("express");
const auth = require("./linkedinAuth");
const { publishPost } = require("./linkedinPublish");

const env = (name) => (process.env[name] || "").trim();

// The deployed site is public, so connecting/publishing must not be open to everyone:
// with LINKEDIN_PUBLISH_PASSCODE set, callers must send it; without it, only local (loopback) requests are allowed.
function isLoopback(req) {
  const ip = req.socket.remoteAddress || "";
  const local = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  return local && !req.headers["x-forwarded-for"] && !req.headers.forwarded;
}

function authorized(req) {
  const pass = env("LINKEDIN_PUBLISH_PASSCODE");
  if (!pass) return isLoopback(req);
  const hash = (s) => crypto.createHash("sha256").update(String(s)).digest();
  return crypto.timingSafeEqual(hash(req.get("x-publish-passcode") || ""), hash(pass));
}

function createRouter({ reloadEnv }) {
  const router = express.Router();
  router.use((_req, _res, next) => {
    reloadEnv();
    next();
  });

  const guard = (req, res, next) => {
    if (authorized(req)) return next();
    res.status(403).json({
      error: env("LINKEDIN_PUBLISH_PASSCODE")
        ? "Wrong or missing publish passcode."
        : "Publishing is limited to localhost. Set LINKEDIN_PUBLISH_PASSCODE on the server to enable it on a hosted site.",
    });
  };

  router.get("/status", (req, res) => {
    const ok = authorized(req);
    const t = ok ? auth.loadToken() : null;
    res.json({
      configured: auth.isConfigured(),
      passcodeRequired: Boolean(env("LINKEDIN_PUBLISH_PASSCODE")),
      authorized: ok,
      connected: Boolean(t),
      name: t ? t.name : null,
      expiresAt: t && t.expiresAt ? t.expiresAt : null,
      redirectUri: auth.config().redirectUri,
    });
  });

  router.post("/connect", guard, (_req, res) => {
    if (!auth.isConfigured()) {
      return res.status(400).json({ error: "Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in server/.env first (see docs/LINKEDIN.md)." });
    }
    res.json({ url: auth.authUrl(auth.newState()) });
  });

  // LinkedIn redirects the browser here. The one-time `state` (issued only to an authorized caller) protects it.
  router.get("/callback", async (req, res) => {
    const { code, state, error, error_description: desc } = req.query;
    const back = (status, message) =>
      res.redirect(`/?linkedin=${status}${message ? `&message=${encodeURIComponent(message)}` : ""}`);
    if (error) return back("error", String(desc || error));
    if (!code || !state || !auth.consumeState(String(state))) {
      return back("error", "Invalid or expired sign-in attempt. Try connecting again.");
    }
    try {
      await auth.connectWithCode(String(code));
      back("connected");
    } catch (err) {
      console.error("LinkedIn connect failed:", err.message);
      back("error", err.message);
    }
  });

  router.post("/disconnect", guard, (_req, res) => {
    auth.clearToken();
    res.json({ ok: true });
  });

  router.post("/publish", guard, async (req, res) => {
    const { text, image, altText } = req.body || {};
    try {
      res.json(await publishPost({ text, imageDataUrl: image, altText }));
    } catch (err) {
      if (!(err instanceof auth.LinkedInError)) console.error("LinkedIn publish failed:", err.message);
      res.status(err.status || 502).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createRouter, authorized, isLoopback };
