import Card from "./Card.jsx";
import useLinkedIn from "../hooks/useLinkedIn.js";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-scaler-light focus:outline-none focus:ring-1 focus:ring-scaler-light";
const smallBtn =
  "rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700";
const liBtn =
  "rounded-lg bg-[#0a66c2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004182] disabled:cursor-not-allowed disabled:opacity-60";

export default function LinkedInPublisher({ pkg, image }) {
  const li = useLinkedIn(pkg, image);
  const { status } = li;
  const locked = status && !status.authorized;
  const tooLong = li.text.length > 3000;

  return (
    <Card title="Publish to LinkedIn">
      {!status && <p className="text-sm text-slate-400">Checking LinkedIn connection…</p>}

      {status && !status.configured && (
        <p className="text-sm text-amber-400">
          LinkedIn is not set up yet. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to server/.env (see docs/LINKEDIN.md).
          Redirect URI to register: <code className="text-xs">{status.redirectUri}</code>
        </p>
      )}

      {status && status.configured && (
        <div className="space-y-3">
          {(status.passcodeRequired || locked) && (
            <div>
              <label htmlFor="li-pass" className="mb-1 block text-sm font-medium text-slate-300">Publish passcode</label>
              <input
                id="li-pass"
                type="password"
                value={li.passcode}
                onChange={(e) => li.savePasscode(e.target.value)}
                placeholder="LINKEDIN_PUBLISH_PASSCODE"
                className={inputClass}
              />
            </div>
          )}
          {locked && (
            <p className="text-xs text-amber-400">
              {status.passcodeRequired
                ? "Enter the correct passcode to connect or publish."
                : "Publishing is limited to localhost. Set LINKEDIN_PUBLISH_PASSCODE on the server to enable it on this hosted site."}
            </p>
          )}

          {status.authorized && !status.connected && (
            <button type="button" onClick={li.connect} disabled={li.busy} className={liBtn}>
              Connect LinkedIn
            </button>
          )}

          {status.authorized && status.connected && (
            <>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Connected as <span className="font-medium text-emerald-400">{status.name}</span></span>
                <button type="button" onClick={li.disconnect} className={smallBtn}>Disconnect</button>
              </div>

              <div>
                <label htmlFor="li-text" className="mb-1 block text-sm font-medium text-slate-300">Text to publish (editable)</label>
                <textarea
                  id="li-text"
                  rows={10}
                  value={li.text}
                  onChange={(e) => li.setText(e.target.value)}
                  className={`${inputClass} leading-relaxed`}
                />
                <p className={`mt-1 text-right text-xs ${tooLong ? "text-red-400" : "text-slate-500"}`}>{li.text.length} / 3000</p>
              </div>

              {image ? (
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={li.withImage} onChange={(e) => li.setWithImage(e.target.checked)} />
                  Attach the generated visual{image.format === "svg" ? " (converted to PNG)" : ""}
                </label>
              ) : (
                <p className="text-xs text-slate-500">No visual generated yet, so this will be published as a text-only post.</p>
              )}

              <button
                type="button"
                onClick={li.publish}
                disabled={li.busy || !li.text.trim() || tooLong}
                className={`${liBtn} w-full`}
              >
                {li.busy ? "Publishing…" : "Post on LinkedIn"}
              </button>
            </>
          )}

          {li.published && (
            <p className="rounded-md border border-emerald-900 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
              Published{li.published.withImage ? " with image" : ""}.{" "}
              {li.published.url && (
                <a href={li.published.url} target="_blank" rel="noreferrer" className="underline">View on LinkedIn</a>
              )}
            </p>
          )}
        </div>
      )}

      {li.error && (
        <p role="alert" className="mt-3 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {li.error}
        </p>
      )}
    </Card>
  );
}
