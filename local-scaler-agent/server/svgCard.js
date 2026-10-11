// Builds a dark-mode infographic card (1080x1350) locally, with no API key.
const FONT = "Inter, 'Segoe UI', Arial, sans-serif";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wrap(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[\s.,;:]*$/, "") + "…";
    return kept;
  }
  return lines;
}

function renderOfflineCard({ title, points, platform }) {
  const items = (points && points.length ? points : ["Define the failure mode", "Compare designs and trade-offs", "Plan for dependency failure"]).slice(0, 5);
  const titleLines = wrap(title, 26, 2);
  const cardH = 140;
  const gap = 38;
  const startY = 340;

  let body = "";
  items.forEach((label, i) => {
    const y = startY + i * (cardH + gap);
    const cy = y + cardH / 2;
    const last = i === items.length - 1;
    const accent = last ? "#00FF87" : "#00D2FF";
    const lines = wrap(label, 34, 2);
    const textY = lines.length === 1 ? [cy + 12] : [cy - 6, cy + 36];
    body += `<rect x="90" y="${y}" width="900" height="${cardH}" rx="22" fill="#111C33" stroke="${accent}" stroke-opacity="0.6" stroke-width="2"/>`;
    body += `<circle cx="165" cy="${cy}" r="36" fill="${accent}"/>`;
    body += `<text x="165" y="${cy + 12}" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="700" fill="#0F172A">${i + 1}</text>`;
    lines.forEach((l, k) => {
      body += `<text x="235" y="${textY[k]}" font-family="${FONT}" font-size="34" font-weight="600" fill="#F8FAFC">${esc(l)}</text>`;
    });
    if (!last) {
      const ay = y + cardH;
      body += `<path d="M540 ${ay + 4} V${ay + gap - 14}" stroke="#00D2FF" stroke-width="3" fill="none"/>`;
      body += `<polygon points="530,${ay + gap - 16} 550,${ay + gap - 16} 540,${ay + gap - 2}" fill="#00D2FF"/>`;
    }
  });

  const titleSvg = titleLines
    .map((l, i) => `<text x="90" y="${150 + i * 64}" font-family="${FONT}" font-size="56" font-weight="800" fill="#F8FAFC">${esc(l)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
<defs><pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse"><path d="M45 0H0V45" fill="none" stroke="#1E293B" stroke-width="1"/></pattern></defs>
<rect width="1080" height="1350" fill="#0F172A"/>
<rect width="1080" height="1350" fill="url(#grid)" opacity="0.6"/>
<rect x="90" y="70" width="120" height="8" rx="4" fill="#00D2FF"/>
${titleSvg}
<text x="90" y="${150 + titleLines.length * 64 + 10}" font-family="${FONT}" font-size="26" fill="#94A3B8">Key ideas at a glance · ${esc(platform || "LinkedIn")}</text>
${body}
<text x="90" y="1300" font-family="${FONT}" font-size="26" font-weight="600" fill="#94A3B8">Scaler | scaler.com</text>
</svg>`;
}

module.exports = { renderOfflineCard };
