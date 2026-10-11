// Offline test of the image pipeline: node scripts/image-test.js  (writes scripts/_test-card.svg)
delete process.env.OPENAI_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.OPENROUTER_API_KEY;
const fs = require("fs");
const path = require("path");
const { generateImage } = require("../server/imageGen");
const { keyPoints, composePrompt } = require("../server/postAnalysis");
const { sanitizeSvg } = require("../server/providers");

const post = `Your AI agent worked perfectly in the demo.
Then it hit a failing tool, retried the same call in a loop, and kept spending tokens.

Four failure modes to design for before you ship:

🔁 Runaway loops
→ Set a hard cap on steps, tokens and wall-clock time.

🛠️ Tool errors the model "reasons around"
→ Return structured errors.

⚠️ Non-idempotent actions
→ Use idempotency keys.

🕳️ Prompt injection through tool output
→ Treat fetched content as untrusted.

💬 Your turn: what's the worst failure you've seen?
♻️ Repost if your team is building agents right now.
🎓 Scaler's free masterclass link is in the first comment.

#AgenticAI #Scaler`;

const out = [];
const check = (name, ok, extra = "") => out.push(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);

(async () => {
  const pts = keyPoints(post);
  check("keyPoints = 4 failure modes", pts.length === 4 && /Runaway loops/.test(pts[0]), JSON.stringify(pts));

  const prompt = composePrompt(
    { topic: "Agentic AI", platform: "LinkedIn", goals: "Awareness", visualStyle: "dark", basePrompt: "Base brief", palette: "" },
    pts
  );
  check("prompt contains post points + goal", prompt.includes("Runaway loops") && prompt.includes("Awareness"));

  const r = await generateImage({
    topic: "Agentic AI failure modes", platform: "LinkedIn", goals: "Awareness", visualStyle: "dark",
    postCopy: post, basePrompt: "", palette: "", mode: "auto",
  });
  check("offline source", r.source === "offline-svg" && r.format === "svg");
  const svg = Buffer.from(r.image.split(",")[1], "base64").toString("utf8");
  fs.writeFileSync(path.join(__dirname, "_test-card.svg"), svg);
  check("svg contains post labels", svg.includes("Runaway loops") && svg.includes("Prompt injection"));

  const dirty = sanitizeSvg('x <svg><script>alert(1)</script><rect onclick="x()" width="1"/><a href="http://e.com"/></svg>');
  check("sanitize strips script/onclick/href", !/script|onclick|href/.test(dirty));

  try {
    await generateImage({ topic: "t", platform: "LinkedIn", goals: "g", visualStyle: "v", postCopy: post, mode: "openai" });
    check("openai mode without key errors", false);
  } catch (e) {
    check("openai mode without key errors", /OPENAI_API_KEY/.test(e.message));
  }
})()
  .catch((e) => out.push("FAIL exception " + e.stack))
  .finally(() => {
    out.push("DONE");
    fs.writeFileSync(path.join(__dirname, "_image-test.log"), out.join("\n"));
  });
