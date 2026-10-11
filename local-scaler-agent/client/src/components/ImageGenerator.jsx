import { useEffect, useState } from "react";
import Card from "./Card.jsx";
import { saveBlob, saveUrl, slug, svgToPngBlob } from "../utils/download.js";

const SOURCE_LABELS = {
  openai: "OpenAI image model (PNG)",
  "llm-svg": "AI-designed SVG diagram",
  "offline-svg": "Offline SVG card (no API key)",
};

const MODES = [
  { value: "auto", label: "Auto (best available)" },
  { value: "openai", label: "OpenAI image (PNG, needs OPENAI_API_KEY)" },
  { value: "svg", label: "SVG diagram (uses your Gemma/LLM key)" },
];

const selectClass =
  "rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-scaler-light focus:outline-none focus:ring-1 focus:ring-scaler-light";
const smallBtn =
  "rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700";

export default function ImageGenerator({ data, inputs, onImage }) {
  const pkg = data.content_package;
  const visual = pkg.visual_asset_concept;
  const [mode, setMode] = useState("auto");
  const [prompt, setPrompt] = useState(visual.ai_image_prompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState(null);

  // A new post resets the visual and the editable brief.
  useEffect(() => {
    setPrompt(visual.ai_image_prompt);
    setImage(null);
    setError("");
  }, [visual.ai_image_prompt, pkg.post_copy]);

  // Lets the LinkedIn publisher attach whatever visual is currently shown.
  useEffect(() => {
    if (onImage) onImage(image);
  }, [image]);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: pkg.topic,
          platform: pkg.platform,
          goals: inputs.goals,
          visualStyle: inputs.visualStyle,
          postCopy: pkg.post_copy,
          basePrompt: prompt,
          palette: visual.color_palette,
          mode,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setImage(json);
    } catch (err) {
      setError(err.message || "Image generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const base = slug(pkg.topic);
  const downloadPng = async () => {
    try {
      saveBlob(await svgToPngBlob(image.image), `${base}.png`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Card title="Generate Visual">
      <p className="mb-3 text-xs text-slate-400">
        Built from your campaign inputs and the generated post above. Edit the brief for a different angle.
      </p>
      <label htmlFor="img-prompt" className="mb-1 block text-sm font-medium text-slate-300">Image brief</label>
      <textarea
        id="img-prompt"
        rows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className={`${selectClass} w-full font-mono text-xs`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select aria-label="Image generator" value={mode} onChange={(e) => setMode(e.target.value)} className={selectClass}>
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="rounded-lg bg-scaler px-4 py-2 text-sm font-semibold text-white transition hover:bg-scaler-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Generating visual…" : image ? "Regenerate visual" : "Generate visual"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {image && (
        <div className="mt-4 space-y-3">
          {image.warning && <p className="text-xs text-amber-400">{image.warning}</p>}
          <img
            src={image.image}
            alt={`Generated visual for ${pkg.topic}`}
            className="mx-auto max-h-[640px] w-auto rounded-lg border border-slate-800"
          />
          <p className="text-center text-xs text-slate-500">
            Source: {SOURCE_LABELS[image.source] || image.source}
            {image.key_points?.length ? ` · based on: ${image.key_points.join(" · ")}` : ""}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className={smallBtn} onClick={() => saveUrl(image.image, `${base}.${image.format}`)}>
              Download {image.format.toUpperCase()}
            </button>
            {image.format === "svg" && (
              <button type="button" className={smallBtn} onClick={downloadPng}>
                Download PNG (1080×1350)
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
