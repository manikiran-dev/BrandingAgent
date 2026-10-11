const path = require("path");
const ENV_PATH = path.join(__dirname, ".env");
require("dotenv").config({ path: ENV_PATH });
// Re-read server/.env on each request so adding or changing a key takes effect without a restart.
const reloadEnv = () => require("dotenv").config({ path: ENV_PATH, override: true });
const express = require("express");
const cors = require("cors");
const { complete, llmInfo } = require("./llm");
const { BRAND, PLATFORMS, SYSTEM_PROMPT, SETUP_INSTRUCTIONS, buildUserPrompt } = require("./brand");
const { offlineDraft } = require("./offline");
const { generateImage, imageProviders } = require("./imageGen");

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const DEFAULT_GOAL = "Maximum educational value, high community engagement (comments & shares), and authority for Scaler's tech curriculum";
const DEFAULT_VISUAL = "Clean, dark-mode technical architecture diagram / infographic card with high-contrast text and crisp component flow";

const app = express();
app.use(cors({ origin: [CLIENT_ORIGIN, "http://127.0.0.1:3000"], exposedHeaders: ["X-Content-Source", "X-Image-Source"] }));
app.use(express.json({ limit: "1mb" }));


function extractJson(text) {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Model did not return valid JSON");
  }
}

// Coerces model output into the strict content_package shape.
function normalize(raw, { topic, platform }) {
  const v = raw.visual_asset_concept || {};
  const hashtags = (Array.isArray(raw.hashtags) ? raw.hashtags : [])
    .map((h) => String(h).trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));
  return {
    brand: BRAND.name,
    url: BRAND.url,
    platform,
    topic,
    post_copy: String(raw.post_copy || "").trim(),
    visual_asset_concept: {
      visual_type: String(v.visual_type || "").trim(),
      color_palette: String(v.color_palette || "").trim(),
      typography_hierarchy: String(v.typography_hierarchy || "").trim(),
      ai_image_prompt: String(v.ai_image_prompt || "").trim(),
    },
    hashtags,
    suggested_posting_time: String(raw.suggested_posting_time || "").trim(),
    strategic_rationale: String(raw.strategic_rationale || "").trim(),
  };
}

// Sends the strict { setup_instructions, content_package } body; the generation source goes in a header.
function sendEnvelope(res, contentPackage, source) {
  res.set("X-Content-Source", source);
  res.json({ setup_instructions: SETUP_INSTRUCTIONS, content_package: contentPackage });
}

app.get("/api/health", (_req, res) => {
  reloadEnv();
  const llm = llmInfo();
  res.json({
    status: "ok",
    aiConfigured: llm.configured,
    provider: llm.provider,
    model: llm.model,
    note: llm.note,
    imageProviders: imageProviders(),
  });
});

app.post("/api/generate-post", async (req, res) => {
  reloadEnv();
  const { topic, platform, goals, visualStyle } = req.body || {};
  if (!topic || !String(topic).trim()) {
    return res.status(400).json({ error: "`topic` is required." });
  }
  const input = {
    topic: String(topic).trim(),
    platform: PLATFORMS[platform] ? platform : "LinkedIn",
    goals: String(goals || "").trim() || DEFAULT_GOAL,
    visualStyle: String(visualStyle || "").trim() || DEFAULT_VISUAL,
  };

  const llm = llmInfo();
  if (!llm.configured) {
    return sendEnvelope(res, normalize(offlineDraft(input), input), "offline-template");
  }

  try {
    const text = await complete({ system: SYSTEM_PROMPT, user: buildUserPrompt(input), maxTokens: 4000 });
    const pkg = normalize(extractJson(text), input);
    if (!pkg.post_copy || !pkg.visual_asset_concept.ai_image_prompt) {
      throw new Error("Model response was missing post copy or image prompt");
    }
    sendEnvelope(res, pkg, llm.provider);
  } catch (err) {
    console.error("Generation failed:", err.message);
    res.status(502).json({ error: `Generation failed: ${err.message}` });
  }
});

// Generates a visual from the campaign inputs + the generated post, so the image matches the post.
app.post("/api/generate-image", async (req, res) => {
  reloadEnv();
  const { topic, platform, goals, visualStyle, postCopy, basePrompt, palette, mode } = req.body || {};
  if (!postCopy || !String(postCopy).trim()) {
    return res.status(400).json({ error: "`postCopy` is required. Generate a post first." });
  }
  const input = {
    topic: String(topic || "").trim() || "Technical concept",
    platform: PLATFORMS[platform] ? platform : "LinkedIn",
    goals: String(goals || "").trim() || DEFAULT_GOAL,
    visualStyle: String(visualStyle || "").trim() || DEFAULT_VISUAL,
    postCopy: String(postCopy).slice(0, 6000),
    basePrompt: String(basePrompt || "").slice(0, 2500),
    palette: String(palette || "").slice(0, 600),
    mode: ["auto", "openai", "svg"].includes(mode) ? mode : "auto",
  };
  try {
    const result = await generateImage(input);
    res.set("X-Image-Source", result.source);
    res.json(result);
  } catch (err) {
    console.error("Image generation failed:", err.message);
    res.status(502).json({ error: `Image generation failed: ${err.message}` });
  }
});

// Hosted mode: serve the built React dashboard (client/dist) from the same origin as the API.
// Skipped in local dev, where Vite serves the client on :3000 and proxies /api here.
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
if (require("fs").existsSync(path.join(CLIENT_DIST, "index.html"))) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));
}

app.listen(PORT, () => {
  console.log(`Scaler agent API listening on http://localhost:${PORT}`);
});
