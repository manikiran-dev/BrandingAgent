// Offline test of server/llm.js with a mocked fetch: node scripts/llm-test.js
const path = require("path");
const assert = require("assert");
const llm = require(path.join(__dirname, "..", "server", "llm.js"));

const clear = () => ["GEMINI_API_KEY", "GOOGLE_API_KEY", "OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "LLM_PROVIDER"].forEach((k) => delete process.env[k]);
const calls = [];
global.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  calls.push({ url, headers: opts.headers, body });
  if (url.includes("generativelanguage")) {
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "thinking", thought: true }, { text: '{"ok":1}' }] } }] }) };
  }
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"ok":2}' } }] }) };
};

(async () => {
  clear();
  assert.strictEqual(llm.llmInfo().configured, false);

  process.env.ANTHROPIC_API_KEY = "tm_vk_notanthropic";
  assert.strictEqual(llm.llmInfo().configured, false, "non sk-ant key must be ignored");
  assert.ok(llm.llmInfo().note.includes("ignored"));

  clear();
  process.env.GEMINI_API_KEY = "AIza-test";
  let info = llm.llmInfo();
  assert.strictEqual(info.provider, "gemini");
  assert.strictEqual(info.model, "gemma-4-26b-a4b-it");
  const out = await llm.complete({ system: "S", user: "U", maxTokens: 100 });
  assert.strictEqual(out, '{"ok":1}', "thought parts must be dropped");
  assert.ok(calls[0].url.endsWith("/models/gemma-4-26b-a4b-it:generateContent"));
  assert.strictEqual(calls[0].headers["x-goog-api-key"], "AIza-test");
  assert.strictEqual(calls[0].body.systemInstruction.parts[0].text, "S");
  assert.strictEqual(calls[0].body.contents[0].parts[0].text, "U");

  clear();
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  info = llm.llmInfo();
  assert.strictEqual(info.provider, "openrouter");
  assert.strictEqual(info.model, "google/gemma-4-26b-a4b-it");
  assert.strictEqual(await llm.complete({ system: "S", user: "U" }), '{"ok":2}');
  const last = calls[calls.length - 1];
  assert.strictEqual(last.headers.Authorization, "Bearer sk-or-test");
  assert.strictEqual(last.body.messages[0].role, "system");

  process.env.GEMINI_API_KEY = "AIza-test";
  assert.strictEqual(llm.llmInfo().provider, "gemini", "gemini first by default");
  process.env.LLM_PROVIDER = "openrouter";
  assert.strictEqual(llm.llmInfo().provider, "openrouter", "LLM_PROVIDER forces choice");

  console.log("llm-test: ALL PASSED");
})().catch((e) => {
  console.error("llm-test FAILED:", e.message);
  process.exit(1);
});
