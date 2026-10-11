const { complete, llmConfig } = require("./llm");
const { DEFAULT_PALETTE } = require("./postAnalysis");

const openaiModel = () => process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const llmModel = () => (llmConfig() ? llmConfig().model : "");

async function openaiImage(prompt) {
  const model = openaiModel();
  const body =
    model === "dall-e-3"
      ? { model, prompt, size: "1024x1792", response_format: "b64_json", n: 1 }
      : { model, prompt, size: "1024x1536", quality: "medium", n: 1 };
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI request failed (${res.status})`);
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data");
  return `data:image/png;base64,${b64}`;
}

function sanitizeSvg(text) {
  const match = String(text).match(/<svg[\s\S]*<\/svg>/i);
  if (!match) throw new Error("Model did not return an SVG");
  let svg = match[0]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/\s(?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, "");
  if (!/xmlns\s*=/.test(svg.slice(0, 300))) svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  if (!/viewBox\s*=/.test(svg.slice(0, 500))) svg = svg.replace(/<svg/i, '<svg viewBox="0 0 1080 1350"');
  return svg;
}

const SVG_SYSTEM = `You are a senior information designer creating a LinkedIn infographic card as a single SVG.

Rules:
- Output ONLY one <svg> element, nothing else. viewBox="0 0 1080 1350" (4:5 portrait), width="1080" height="1350".
- Dark-mode technical architecture / concept diagram that visualises the SPECIFIC post provided: its real components, steps, failure modes or trade-offs, connected with arrows.
- Use the given color palette. High contrast. Crisp 2-3px lines, rounded rectangles, subtle grid or glass panels.
- Typography: font-family="Inter, 'Segoe UI', Arial, sans-serif". Title (large, bold) at top, node labels medium, tiny footer "Scaler | scaler.com".
- Every text label must be SHORT (max 4 words), spelled correctly, and fully inside the canvas and its shape. Do not overlap text. No paragraphs.
- No scripts, no <foreignObject>, no external images, fonts or links, no animations.
- Keep generous margins (at least 60px) and a clear top-to-bottom or left-to-right flow.`;

// Uses whichever text LLM is configured (Gemma via Gemini API / OpenRouter, or Claude) to design the SVG.
async function llmSvg(input, points) {
  const user = [
    `Campaign topic: ${input.topic}`,
    `Platform: ${input.platform}`,
    `Campaign goal: ${input.goals}`,
    `Visual style preference: ${input.visualStyle}`,
    `Color palette: ${input.palette || DEFAULT_PALETTE}`,
    `Image concept brief: ${input.basePrompt || "(none)"}`,
    `Key ideas to depict: ${points.join("; ") || "(derive from the post)"}`,
    `\nFull post copy:\n${input.postCopy}`,
  ].join("\n");
  const text = await complete({ system: SVG_SYSTEM, user, maxTokens: 8000 });
  return sanitizeSvg(text);
}

module.exports = { openaiImage, llmSvg, sanitizeSvg, openaiModel, llmModel };
