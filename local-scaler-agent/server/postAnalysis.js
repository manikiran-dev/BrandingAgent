const DEFAULT_PALETTE =
  "Dark slate background (#0F172A), neon blue (#00D2FF) flow lines, vibrant green (#00FF87) success paths, muted red (#FF3B30) failure paths, white (#F8FAFC) headline text, slate gray (#94A3B8) secondary labels";

const SKIP = /^(your turn|repost|scaler|want to go deeper|drop your|comment|share)/i;

function shorten(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return cut.slice(0, at > 20 ? at : max).replace(/[\s.,;:]*$/, "") + "…";
}

function cleanLabel(line) {
  return line.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[:：]\s*$/, "").trim();
}

// Pulls the main ideas out of the post so the visual illustrates THIS post.
function keyPoints(postCopy, max = 5) {
  const lines = String(postCopy).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const headings = lines.filter((l) => /^\p{Extended_Pictographic}/u.test(l));
  const bullets = lines.filter((l) => /^[•\-*→]/.test(l));
  const goodHeadings = headings.filter((l) => !SKIP.test(cleanLabel(l)));
  const pool = goodHeadings.length >= 3 ? goodHeadings : bullets.concat(goodHeadings);

  const seen = new Set();
  const out = [];
  for (const line of pool) {
    const label = cleanLabel(line);
    if (label.length < 4 || SKIP.test(label)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(shorten(label, 70));
    if (out.length >= max) break;
  }
  return out;
}

function composePrompt(input, points) {
  const parts = [
    input.basePrompt || `A sleek dark-mode technical infographic card about "${input.topic}".`,
    `This visual must illustrate this specific ${input.platform} post, not a generic tech scene.`,
    `Campaign topic: ${input.topic}. Campaign goal: ${input.goals}.`,
  ];
  if (points.length) {
    parts.push(
      `Depict these key ideas from the post as labeled nodes or panels (very short labels, max 3 words each): ${points.join("; ")}.`
    );
  }
  parts.push(
    `Visual style: ${input.visualStyle}. Colors: ${input.palette || DEFAULT_PALETTE}.`,
    `Portrait 4:5 composition. Render only a short title and the short labels with exact spelling; no paragraphs of text, no logos, no photorealism, no clutter.`
  );
  return parts.join("\n\n").slice(0, 3800);
}

module.exports = { DEFAULT_PALETTE, keyPoints, composePrompt };
