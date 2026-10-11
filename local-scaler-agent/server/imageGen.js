const { renderOfflineCard } = require("./svgCard");
const { keyPoints, composePrompt } = require("./postAnalysis");
const { openaiImage, llmSvg, openaiModel, llmModel } = require("./providers");
const { llmInfo } = require("./llm");

function imageProviders() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    llm_svg: llmInfo().configured,
    offline_svg: true,
  };
}

const toDataUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;

// mode: "auto" | "openai" | "svg"
async function generateImage(input) {
  const providers = imageProviders();
  const points = keyPoints(input.postCopy);
  let warning = "";

  if (input.mode === "openai" && !providers.openai) {
    throw new Error(
      "OPENAI_API_KEY is not set in server/.env. Gemma and Claude cannot generate raster images; choose the SVG diagram option instead."
    );
  }

  if (input.mode === "openai" || (input.mode === "auto" && providers.openai)) {
    const prompt = composePrompt(input, points);
    try {
      return {
        image: await openaiImage(prompt),
        format: "png",
        source: "openai",
        model: openaiModel(),
        prompt_used: prompt,
        key_points: points,
        warning,
      };
    } catch (err) {
      if (input.mode === "openai") throw err;
      console.error("OpenAI image failed:", err.message);
      warning = `OpenAI image generation failed (${err.message}). Showing an SVG diagram instead.`;
    }
  }

  if (providers.llm_svg) {
    try {
      const svg = await llmSvg(input, points);
      return { image: toDataUrl(svg), format: "svg", source: "llm-svg", model: llmModel(), prompt_used: "", key_points: points, warning };
    } catch (err) {
      console.error("LLM SVG failed:", err.message);
      warning = `${warning} AI SVG generation failed (${err.message}). Showing the offline card instead.`.trim();
    }
  }

  const svg = renderOfflineCard({ title: input.topic, points, platform: input.platform });
  return { image: toDataUrl(svg), format: "svg", source: "offline-svg", model: "", prompt_used: "", key_points: points, warning };
}

module.exports = { generateImage, imageProviders };
