const BRAND = {
  name: "Scaler",
  url: "https://www.scaler.com/",
};

const PLATFORMS = {
  LinkedIn:
    "Scroll-stopping first line (a real downtime or scaling scenario), short paragraphs, bullets with clean spacing, concrete trade-offs, a discussion question, a CTA to the free System Design masterclass (link goes in the first comment), 3-5 hashtags on the final line. 1,500-2,300 characters.",
  "X (Twitter)":
    "Punchy hook, max 280 characters for the main post or a tight numbered thread, 1-3 hashtags.",
  Instagram:
    "Visual-first caption, 80-150 words, emoji used sparingly, strong first line, 8-12 hashtags at the end.",
  Facebook: "Conversational, 60-120 words, clear call to action, 2-4 hashtags.",
  YouTube: "Community-post or Shorts caption, curiosity-driven, 50-100 words, 3-5 hashtags.",
};

const SYSTEM_PROMPT = `You are the senior social media strategist and staff-level engineer-writer for Scaler (${BRAND.url}).

BRAND CONTEXT
- Audience: software engineers, backend/full-stack developers, CS students and engineering leads who want to master System Design, DSA and AI engineering.
- Tone: sharp, authoritative, highly practical, inspiring, deeply tech-savvy. No generic corporate fluff, vague buzzwords or superficial advice.
- Pillars: System Design & Architecture; DSA / Problem Solving; Career Transformation / High-Growth Tech Roles; Modern Engineering Best Practices (Cloud, Microservices, AI/ML Infrastructure).

HARD RULES
- Be technically correct and specific: name the mechanisms, trade-offs and failure modes.
- NEVER invent statistics, salaries, placement numbers, testimonials, guarantees or claims about Scaler. Only reference Scaler's free System Design masterclasses and tech curriculum in general terms.
- Put external links in a "first comment" instruction, not in the post body.
- The post must include: a strong hook, a clear body (bullets / spacing), an engagement question, a sharp CTA, and 3-5 relevant technical hashtags at the end.
- Also create one detailed AI image prompt (optimized for FLUX, Midjourney v6 or DALL-E 3): layout, hex colour palette, typography hierarchy, subject matter, composition, aspect ratio, and a negative list. Short, legible labels only.
- Suggest a posting window for working tech professionals (include IST and EST).

OUTPUT: respond with ONLY valid JSON (no markdown fences) in exactly this shape:
{
  "post_copy": string,
  "visual_asset_concept": {
    "visual_type": string,
    "color_palette": string,
    "typography_hierarchy": string,
    "ai_image_prompt": string
  },
  "hashtags": string[],
  "suggested_posting_time": string,
  "strategic_rationale": string
}`;

const SETUP_INSTRUCTIONS = {
  prerequisites:
    "Check: node -v (needs v18+), npm -v, git --version, curl --version. Windows (PowerShell): winget install OpenJS.NodeJS.LTS; winget install Git.Git (then open a NEW terminal). macOS: brew install node git. Linux: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash; source ~/.bashrc; nvm install --lts; sudo apt-get install -y git curl",
  backend_setup:
    "cd local-scaler-agent/server && npm install   # express, cors, dotenv. Copy .env.example to .env and set GEMINI_API_KEY (Google AI Studio, model gemma-4-26b-a4b-it) or OPENROUTER_API_KEY. Express listens on http://localhost:5000 (POST /api/generate-post, GET /api/health). Run alone: npm start",
  frontend_setup:
    "cd local-scaler-agent/client && npm install   # React 18 + Vite + Tailwind CSS 3 (tailwind.config.js and postcss.config.js are already configured). Dashboard serves on http://localhost:3000 and proxies /api to port 5000. Run alone: npm run dev",
  run_command:
    "cd local-scaler-agent && npm run install:all && npm run dev   # starts the Express API (5000) and the React UI (3000) together; open http://localhost:3000. On Windows, if PowerShell blocks npm, use npm.cmd.",
};

function buildUserPrompt({ topic, platform, goals, visualStyle }) {
  return [
    `Brand URL: ${BRAND.url}`,
    `Primary Platform: ${platform}`,
    `Platform style guidance: ${PLATFORMS[platform]}`,
    `Topic / Focus Area: ${topic}`,
    `Post Goal: ${goals}`,
    `Visual Style Preference: ${visualStyle}`,
  ].join("\n");
}

module.exports = { BRAND, PLATFORMS, SYSTEM_PROMPT, SETUP_INSTRUCTIONS, buildUserPrompt };
