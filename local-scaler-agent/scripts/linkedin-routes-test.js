// Offline test of LinkedIn access control + routes over real HTTP: node scripts/linkedin-routes-test.js
const path = require("path");
const os = require("os");
const fs = require("fs");
const assert = require("assert");
const http = require("http");

const server = path.join(__dirname, "..", "server");
process.env.LINKEDIN_TOKEN_FILE = path.join(os.tmpdir(), `li-routes-${process.pid}.json`);
process.env.LINKEDIN_CLIENT_ID = "cid";
process.env.LINKEDIN_CLIENT_SECRET = "secret";

const auth = require(path.join(server, "linkedinAuth.js"));
const { createRouter, authorized, isLoopback } = require(path.join(server, "linkedinRoutes.js"));
const express = require(path.join(server, "node_modules", "express"));

// Only calls to LinkedIn are mocked; the test client below uses node:http, so real localhost traffic is unaffected.
global.fetch = async (url, opts = {}) => {
  const json = (obj, status = 200, headers = {}) => ({
    ok: status < 400,
    status,
    headers: { get: (k) => headers[k.toLowerCase()] || null },
    json: async () => obj,
    text: async () => JSON.stringify(obj),
  });
  const u = String(url);
  if (u.includes("/oauth/v2/accessToken")) return json({ access_token: "tok123", expires_in: 3600 });
  if (u.endsWith("/v2/userinfo")) return json({ sub: "abc", name: "Test User" });
  if (u.endsWith("/rest/posts")) return json({}, 201, { "x-restli-id": "urn:li:share:999" });
  return json({ message: "unexpected" }, 500);
};

const mk = (ip, headers = {}) => ({ socket: { remoteAddress: ip }, headers, get: (k) => headers[k.toLowerCase()] });

(async () => {
  delete process.env.LINKEDIN_PUBLISH_PASSCODE;
  assert.strictEqual(authorized(mk("127.0.0.1")), true);
  assert.strictEqual(authorized(mk("::1")), true);
  assert.strictEqual(authorized(mk("10.0.0.5")), false);
  assert.strictEqual(isLoopback(mk("127.0.0.1", { "x-forwarded-for": "1.2.3.4" })), false, "proxied requests are not local");

  process.env.LINKEDIN_PUBLISH_PASSCODE = "s3cret";
  assert.strictEqual(authorized(mk("10.0.0.5", { "x-publish-passcode": "s3cret" })), true);
  assert.strictEqual(authorized(mk("10.0.0.5", { "x-publish-passcode": "nope" })), false);
  assert.strictEqual(authorized(mk("127.0.0.1")), false, "passcode is required even locally once set");

  await auth.connectWithCode("thecode");

  const app = express();
  app.use(express.json());
  app.use("/api/linkedin", createRouter({ reloadEnv: () => {} }));
  const srv = app.listen(0, "127.0.0.1");
  await new Promise((res) => srv.once("listening", res));
  const port = srv.address().port;
  const req = (method, p, headers = {}, payload) =>
    new Promise((resolve, reject) => {
      const rq = http.request({ host: "127.0.0.1", port, path: p, method, headers: { "Content-Type": "application/json", ...headers } }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: d && d[0] === "{" ? JSON.parse(d) : null }));
      });
      rq.on("error", reject);
      if (payload) rq.write(JSON.stringify(payload));
      rq.end();
    });
  const pass = { "X-Publish-Passcode": "s3cret" };

  let res = await req("GET", "/api/linkedin/status");
  assert.strictEqual(res.body.authorized, false);
  assert.strictEqual(res.body.connected, false, "status must not reveal the account to unauthorized callers");
  res = await req("GET", "/api/linkedin/status", pass);
  assert.strictEqual(res.body.connected, true);
  assert.strictEqual(res.body.name, "Test User");

  res = await req("POST", "/api/linkedin/publish", {}, { text: "x" });
  assert.strictEqual(res.status, 403);
  res = await req("POST", "/api/linkedin/publish", pass, { text: "Via route" });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.urn, "urn:li:share:999");

  res = await req("POST", "/api/linkedin/connect", {}, {});
  assert.strictEqual(res.status, 403);
  res = await req("POST", "/api/linkedin/connect", pass, {});
  assert.ok(res.body.url.startsWith("https://www.linkedin.com/oauth/v2/authorization?"));

  res = await req("GET", "/api/linkedin/callback?code=abc&state=forged");
  assert.strictEqual(res.status, 302);
  assert.ok(res.headers.location.startsWith("/?linkedin=error"), "forged state is rejected");

  res = await req("POST", "/api/linkedin/disconnect", {}, {});
  assert.strictEqual(res.status, 403);
  res = await req("POST", "/api/linkedin/disconnect", pass, {});
  assert.strictEqual(res.status, 200);
  assert.strictEqual(auth.loadToken(), null);
  srv.close();

  console.log("linkedin-routes-test: ALL PASSED");
})()
  .catch((e) => {
    console.error("linkedin-routes-test FAILED:", e.stack || e.message);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(process.env.LINKEDIN_TOKEN_FILE, { force: true }));
