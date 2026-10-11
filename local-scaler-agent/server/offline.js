function hashtagFrom(text) {
  return (
    "#" +
    text
      .split(/\s+/)
      .slice(0, 3)
      .map((w) => w.replace(/[^a-zA-Z0-9]+/g, ""))
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join("")
  );
}

// Used when no LLM key (GEMINI_API_KEY / OPENROUTER_API_KEY / ANTHROPIC_API_KEY) is set, so the UI and API can be tried offline.
function offlineDraft({ topic, platform, goals, visualStyle }) {
  const hashtags = ["#SystemDesign", "#SoftwareEngineering", hashtagFrom(topic), "#Scaler"].filter(
    (h, i, arr) => h.length > 1 && arr.indexOf(h) === i
  );
  return {
    post_copy:
      `[OFFLINE TEMPLATE - set GEMINI_API_KEY in server/.env for AI-written copy]\n\n` +
      `${topic}: the trade-offs most engineers skip.\n\n` +
      `• Define the failure mode first.\n• Compare at least two designs and name the cost of each.\n• Decide what happens when a dependency goes down.\n\n` +
      `Goal for this post: ${goals}\n\n` +
      `Your turn: how would you approach this? Share your answer below.\n` +
      `Want to go deeper? Scaler's free System Design masterclass link is in the first comment.\n\n` +
      hashtags.join(" "),
    visual_asset_concept: {
      visual_type: "Technical Architecture Infographic Card",
      color_palette:
        "Dark slate background (#0F172A), neon blue (#00D2FF) data flow lines, vibrant green (#00FF87) success paths, muted red (#FF3B30) failure paths, white (#F8FAFC) headline text",
      typography_hierarchy:
        "Bold geometric sans-serif title, medium-weight uppercase component labels, monospace status badges.",
      ai_image_prompt:
        `A sleek, high-contrast technical architecture infographic card titled "${topic}". ${visualStyle}. ` +
        `Dark slate background (#0F172A), neon blue (#00D2FF) flow lines, green (#00FF87) success arrows, muted red (#FF3B30) failure arrows, ` +
        `glassmorphism component nodes, short legible labels, left-to-right composition, flat vector UI, crisp 2px lines, ` +
        `${platform === "Instagram" ? "1:1" : "4:5"} aspect ratio. Avoid photorealism, clutter, low contrast, blurry or misspelled text.`,
    },
    hashtags,
    suggested_posting_time: "Tuesday at 08:30 AM IST (or 08:00 AM EST for US engineers)",
    strategic_rationale:
      "Offline template. Configure an API key to get topic-specific analysis tailored to the platform and goal.",
  };
}

module.exports = { offlineDraft };
