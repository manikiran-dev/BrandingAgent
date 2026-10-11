// Offline test of the LinkedIn modules (OAuth + publishing) with a mocked fetch: node scripts/linkedin-test.js
const path = require("path");
const os = require("os");
const fs = require("fs");
const assert = require("assert");

const server = path.join(__dirname, "..", "server");
process.env.LINKEDIN_TOKEN_FILE = path.join(os.tmpdir(), `li-test-${process.pid}.json`);
process.env.LINKEDIN_CLIENT_ID = "cid";
process.env.LINKEDIN_CLIENT_SECRET = "secret";
process.env.LINKEDIN_REDIRECT_URI = "http://localhost:3000/api/linkedin/callback";

const auth = require(path.join(server, "linkedinAuth.js"));
const pub = require(path.join(server, "linkedinPublish.js"));

const PNG = "data:image/png;base64," + Buffer.from("fakepng").toString("base64");
const calls = [];
global.fetch = async (url, opts = {}) => {
  calls.push({ url: String(url), opts });
  const json = (obj, status = 200, headers = {}) => ({
    ok: status < 400,
    status,
    headers: { get: (k) => headers[k.toLowerCase()] || null },
    json: async () => obj,
    text: async () => JSON.stringify(obj),
  });
  if (String(url).includes("/oauth/v2/accessToken")) return json({ access_token: "tok123", expires_in: 3600 });
  if (String(url).endsWith("/v2/userinfo")) return json({ sub: "abc", name: "Test User" });
  if (String(url).includes("initializeUpload")) {
    return json({ value: { uploadUrl: "https://upload.example/x", image: "urn:li:image:IMG1" } });
  }
  if (String(url) === "https://upload.example/x") return json({}, 201);
  if (String(url).endsWith("/rest/posts")) return json({}, 201, { "x-restli-id": "urn:li:share:999" });
  return json({ message: "unexpected" }, 500);
};

(async () => {
  assert.strictEqual(
    pub.escapeCommentary("a (b) *c* #Tag @x [y] _z_ ~ {q} | <w> \\"),
    "a \\(b\\) \\*c\\* #Tag \\@x \\[y\\] \\_z\\_ \\~ \\{q\\} \\| \\<w\\> \\\\"
  );

  assert.ok(pub.parseImage(PNG).length > 0);
  assert.throws(() => pub.parseImage("data:image/svg+xml;base64,AAAA"), /PNG, JPEG or GIF/);
  assert.throws(() => pub.parseImage("nonsense"), /PNG, JPEG or GIF/);

  await assert.rejects(pub.publishPost({ text: "hi" }), (e) => e.status === 401);

  assert.ok(auth.isConfigured());
  const state = auth.newState();
  const url = new URL(auth.authUrl(state));
  assert.strictEqual(url.searchParams.get("scope"), "openid profile w_member_social");
  assert.strictEqual(url.searchParams.get("state"), state);
  assert.strictEqual(auth.consumeState(state), true);
  assert.strictEqual(auth.consumeState(state), false, "state is single-use");
  const saved = await auth.connectWithCode("thecode");
  assert.strictEqual(saved.personId, "abc");
  assert.strictEqual(auth.loadToken().name, "Test User");
  assert.ok(calls[0].opts.body.toString().includes("code=thecode"));

  calls.length = 0;
  let r = await pub.publishPost({ text: "Hello #World (test)" });
  assert.strictEqual(r.urn, "urn:li:share:999");
  assert.strictEqual(r.url, "https://www.linkedin.com/feed/update/urn:li:share:999/");
  assert.strictEqual(r.withImage, false);
  assert.strictEqual(calls.length, 1);
  let body = JSON.parse(calls[0].opts.body);
  assert.strictEqual(body.author, "urn:li:person:abc");
  assert.strictEqual(body.commentary, "Hello #World \\(test\\)");
  assert.strictEqual(body.content, undefined);
  assert.strictEqual(calls[0].opts.headers["Linkedin-Version"], "202609");
  assert.strictEqual(calls[0].opts.headers["X-Restli-Protocol-Version"], "2.0.0");
  assert.strictEqual(calls[0].opts.headers.Authorization, "Bearer tok123");

  calls.length = 0;
  r = await pub.publishPost({ text: "With image", imageDataUrl: PNG, altText: "alt" });
  assert.strictEqual(r.withImage, true);
  assert.deepStrictEqual(
    calls.map((c) => c.url.replace(/^https:\/\/api\.linkedin\.com/, "")),
    ["/rest/images?action=initializeUpload", "https://upload.example/x", "/rest/posts"]
  );
  assert.strictEqual(JSON.parse(calls[0].opts.body).initializeUploadRequest.owner, "urn:li:person:abc");
  assert.strictEqual(calls[1].opts.method, "PUT");
  body = JSON.parse(calls[2].opts.body);
  assert.deepStrictEqual(body.content.media, { id: "urn:li:image:IMG1", altText: "alt" });

  await assert.rejects(pub.publishPost({ text: "  " }), (e) => e.status === 400);
  await assert.rejects(pub.publishPost({ text: "x".repeat(3001) }), (e) => e.status === 400);

  auth.clearToken();
  assert.strictEqual(auth.loadToken(), null);

  console.log("linkedin-test: ALL PASSED");
})()
  .catch((e) => {
    console.error("linkedin-test FAILED:", e.stack || e.message);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(process.env.LINKEDIN_TOKEN_FILE, { force: true }));
