import Card from "./Card.jsx";
import CopyButton from "./CopyButton.jsx";
import ImageGenerator from "./ImageGenerator.jsx";
import LinkedInPublisher from "./LinkedInPublisher.jsx";
import { useState } from "react";

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-200">{children}</dd>
    </div>
  );
}

export default function ResultPanel({ data, loading }) {
  const [image, setImage] = useState(null);

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">
        The agent is writing your post…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">
        Your generated post, hashtags, image prompt and publishing plan will appear here.
      </div>
    );
  }

  const pkg = data.content_package;
  const visual = pkg.visual_asset_concept;
  const { source, inputs, ...fullJson } = data;

  return (
    <>
      <Card
        title={`Post Copy · ${pkg.platform}`}
        action={<CopyButton text={pkg.post_copy} label="Copy post" />}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{pkg.post_copy}</p>
        {source === "offline-template" && (
          <p className="mt-3 text-xs text-amber-400">
            Using the offline template. Set GEMINI_API_KEY (or OPENROUTER_API_KEY) in server/.env for AI-written copy. No restart needed.
          </p>
        )}
      </Card>

      <Card title="Hashtags" action={<CopyButton text={pkg.hashtags.join(" ")} label="Copy hashtags" />}>
        <div className="flex flex-wrap gap-2">
          {pkg.hashtags.map((h) => (
            <span key={h} className="rounded-full bg-scaler/20 px-3 py-1 text-xs font-medium text-blue-300">
              {h}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Visual Asset · AI Image Prompt" action={<CopyButton text={visual.ai_image_prompt} label="Copy prompt" />}>
        <dl className="mb-4 space-y-3">
          <Field label="Visual type">{visual.visual_type}</Field>
          <Field label="Color palette">{visual.color_palette}</Field>
          {visual.typography_hierarchy && <Field label="Typography">{visual.typography_hierarchy}</Field>}
        </dl>
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-300">
          {visual.ai_image_prompt}
        </pre>
      </Card>

      <ImageGenerator data={data} inputs={inputs || {}} onImage={setImage} />

      <LinkedInPublisher pkg={pkg} image={image} />

      <Card title="Publishing Plan">
        <dl className="space-y-3">
          <Field label="Suggested posting time">{pkg.suggested_posting_time}</Field>
          <Field label="Strategic rationale">{pkg.strategic_rationale}</Field>
        </dl>
      </Card>

      <div className="flex justify-end">
        <CopyButton text={JSON.stringify(fullJson, null, 2)} label="Copy full JSON" />
      </div>
    </>
  );
}
