import { useState } from "react";
import Card from "./components/Card.jsx";
import ResultPanel from "./components/ResultPanel.jsx";

const PLATFORMS = ["LinkedIn", "X (Twitter)", "Instagram", "Facebook", "YouTube"];

const GOAL_PRESETS = [
  "Increase brand awareness",
  "Drive webinar / masterclass sign-ups",
  "Generate leads for upskilling programs",
  "Build engineering thought leadership",
];

const DEFAULT_VISUAL =
  "Clean, dark-mode technical architecture diagram / infographic card with high-contrast text and crisp component flow";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-scaler-light focus:outline-none focus:ring-1 focus:ring-scaler-light";

export default function App() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [goals, setGoals] = useState(GOAL_PRESETS[0]);
  const [visualStyle, setVisualStyle] = useState(DEFAULT_VISUAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const generate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, goals, visualStyle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult({ ...data, source: res.headers.get("X-Content-Source"), inputs: { goals, visualStyle } });
    } catch (err) {
      setResult(null);
      setError(err.message || "Something went wrong. Is the backend running on port 5000?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              <span className="text-scaler-light">Scaler</span> Social Media Agent
            </h1>
            <p className="text-xs text-slate-400">Generate ready-to-publish technical posts and AI image prompts</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">{window.location.host}</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-5">
        <form onSubmit={generate} className="space-y-5 lg:col-span-2">
          <Card title="Campaign Inputs">
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="mb-1 block text-sm font-medium text-slate-300">Topic</label>
                <textarea
                  id="topic"
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. System design basics: designing a URL shortener"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="platform" className="mb-1 block text-sm font-medium text-slate-300">Social Platform</label>
                <select id="platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputClass}>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="goals" className="mb-1 block text-sm font-medium text-slate-300">Brand Goals</label>
                <input
                  id="goals"
                  list="goal-presets"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  className={inputClass}
                />
                <datalist id="goal-presets">
                  {GOAL_PRESETS.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="visualStyle" className="mb-1 block text-sm font-medium text-slate-300">Visual Style</label>
                <textarea
                  id="visualStyle"
                  rows={2}
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-scaler px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-scaler-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Generating…" : "Generate Post"}
              </button>
              {error && (
                <p role="alert" className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
            </div>
          </Card>
        </form>

        <div className="space-y-5 lg:col-span-3">
          <ResultPanel data={result} loading={loading} />
        </div>
      </main>
    </div>
  );
}
