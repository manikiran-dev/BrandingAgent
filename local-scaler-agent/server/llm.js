// Provider-neutral text generation: Gemini API (Gemma), OpenRouter (Gemma), or Anthropic (Claude).
const TIMEOUT_MS = 150000;

const env = (name) => (process.env[name] || "").trim();
const usable = (v) => v && !/^your_|_here$/i.test(v);

// Picks the provider from whichever key is set. LLM_PROVIDER=gemini|openrouter|anthropic forces one.
function available() {
  const list = [];
  // OpenRouter keys start with sk-or-; route them to OpenRouter even if pasted on the Gemini line.
  const isOr = (k) => k.startsWith("sk-or-");
  const gemini = env("GEMINI_API_KEY") || env("GOOGLE_API_KEY");
  const orKey = env("OPENROUTER_API_KEY") || (isOr(gemini) ? gemini : "");
  if (usable(gemini) && !isOr(gemini)) {
    list.push({ provider: "gemini", model: env("GEMINI_MODEL") || "gemma-4-26b-a4b-it", key: gemini });
  }
  if (usable(orKey)) {
    list.push({ provider: "openrouter", model: env("OPENROUTER_MODEL") || "google/gemma-4-26b-a4b-it", key: orKey });
  }
  // Real Anthropic keys start with sk-ant-; anything else would only produce 401 errors.
  if (usable(env("ANTHROPIC_API_KEY")) && env("ANTHROPIC_API_KEY").startsWith("sk-ant-")) {
    list.push({ provider: "anthropic", model: env("ANTHROPIC_MODEL") || "claude-sonnet-4-5", key: env("ANTHROPIC_API_KEY") });
  }
  return list;
}

function llmConfig() {
  const list = available();
  const forced = env("LLM_PROVIDER").toLowerCase();
  return list.find((c) => c.provider === forced) || list[0] || null;
}

// Safe to expose (no key).
function llmInfo() {
  const c = llmConfig();
  const ignoredAnthropic = usable(env("ANTHROPIC_API_KEY")) && !env("ANTHROPIC_API_KEY").startsWith("sk-ant-");
  return {
    configured: Boolean(c),
    provider: c ? c.provider : null,
    model: c ? c.model : null,
    note: ignoredAnthropic && !c ? "ANTHROPIC_API_KEY is set but is not an Anthropic key (sk-ant-...); it is ignored." : "",
  };
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || json?.error || `HTTP ${res.status}`;
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    err.status = res.status;
    throw err;
  }
  return json;
}

async function gemini(c, { system, user, maxTokens }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model)}:generateContent`;
  const headers = { "x-goog-api-key": c.key };
  const generationConfig = { maxOutputTokens: maxTokens, temperature: 0.7 };
  const call = (body) => postJson(url, headers, { generationConfig, ...body });

  let json;
  try {
    json = await call({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
    });
  } catch (err) {
    // Some Gemma builds reject systemInstruction; retry with the instructions inline.
    if (err.status !== 400 || !/instruction|system|developer/i.test(err.message)) throw err;
    json = await call({ contents: [{ role: "user", parts: [{ text: `${system}\n\n---\n\n${user}` }] }] });
  }
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join("");
  if (!text.trim()) {
    const reason = json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason || "empty response";
    throw new Error(`Gemini API returned no text (${reason})`);
  }
  return text;
}

async function openrouter(c, { system, user, maxTokens }) {
  const json = await postJson(
    "https://openrouter.ai/api/v1/chat/completions",
    { Authorization: `Bearer ${c.key}`, "X-Title": "Scaler Social Media Agent" },
    {
      model: c.model,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }
  );
  const text = json?.choices?.[0]?.message?.content;
  if (!text || !String(text).trim()) throw new Error(`OpenRouter returned no text (${json?.choices?.[0]?.finish_reason || "empty"})`);
  return String(text);
}

async function anthropic(c, { system, user, maxTokens }) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: c.key });
  const message = await client.messages.create({
    model: c.model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

const DRIVERS = { gemini, openrouter, anthropic };

async function complete(opts) {
  const c = llmConfig();
  if (!c) throw new Error("No LLM API key configured");
  return DRIVERS[c.provider](c, { maxTokens: 3000, ...opts });
}

module.exports = { complete, llmConfig, llmInfo };
