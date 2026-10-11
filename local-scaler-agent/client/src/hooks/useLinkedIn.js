import { useCallback, useEffect, useState } from "react";
import { imageToPngDataUrl } from "../utils/download.js";

const PASS_KEY = "linkedin-publish-passcode";

// Post text = generated copy, with hashtags appended if the model did not already put them in the copy.
export function buildText(pkg) {
  const missing = pkg.hashtags.filter((h) => !pkg.post_copy.includes(h));
  return missing.length ? `${pkg.post_copy}\n\n${missing.join(" ")}` : pkg.post_copy;
}

export default function useLinkedIn(pkg, image) {
  const [status, setStatus] = useState(null);
  const [passcode, setPasscode] = useState(() => sessionStorage.getItem(PASS_KEY) || "");
  const [text, setText] = useState(() => buildText(pkg));
  const [withImage, setWithImage] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/linkedin/status", { headers: { "X-Publish-Passcode": passcode } });
      setStatus(await res.json());
    } catch {
      setStatus(null);
    }
  }, [passcode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // A new post resets the editable text and the "published" banner.
  useEffect(() => {
    setText(buildText(pkg));
    setPublished(null);
    setError("");
  }, [pkg.post_copy, pkg.hashtags.join(" ")]);

  // The OAuth round-trip returns to /?linkedin=connected|error&message=...
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!q.has("linkedin")) return;
    if (q.get("linkedin") === "error") setError(q.get("message") || "LinkedIn connection failed.");
    window.history.replaceState({}, "", window.location.pathname);
    refresh();
  }, [refresh]);

  const savePasscode = (value) => {
    setPasscode(value);
    sessionStorage.setItem(PASS_KEY, value);
  };

  const call = async (path, body) => {
    const res = await fetch(`/api/linkedin/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Publish-Passcode": passcode },
      body: JSON.stringify(body || {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return json;
  };

  const connect = async () => {
    setBusy(true);
    setError("");
    try {
      window.location.href = (await call("connect")).url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setError("");
    try {
      await call("disconnect");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const publish = async () => {
    if (!window.confirm("Publish this post publicly on your LinkedIn profile now?")) return;
    setBusy(true);
    setError("");
    setPublished(null);
    try {
      const attach = withImage && image;
      const payload = { text, altText: attach ? `Visual for: ${pkg.topic}` : "" };
      if (attach) payload.image = await imageToPngDataUrl(image);
      setPublished(await call("publish", payload));
    } catch (err) {
      setError(err.message);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return { status, passcode, savePasscode, text, setText, withImage, setWithImage, busy, error, published, connect, disconnect, publish };
}
