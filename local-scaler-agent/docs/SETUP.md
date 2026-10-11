# Setup Guide

This guide takes you from a fresh Windows, macOS or Linux machine to a running Scaler Social Media Agent.

**What you get:** a React dashboard at http://localhost:3000 backed by an Express API at http://localhost:5000. The API calls an LLM (Gemma 4 26B A4B by default) to write a post package and to draw a matching SVG visual.

---

## 1. Requirements

| Tool | Version | Needed for |
| --- | --- | --- |
| Node.js (includes npm) | 18 or newer (LTS recommended) | Running the API and dashboard |
| An LLM API key | any one of Gemini, OpenRouter, Anthropic | AI-written posts and SVG visuals |
| Git | any | Optional, only for cloning |
| OpenAI API key | optional | Real PNG images (see [Image modes](USER-GUIDE.md#6-image-modes)) |

No API key is needed just to try the app. Without one, it uses an offline template and an offline SVG card, and both are clearly labelled.

### Check what you have

```powershell
node -v
npm -v
```

If both print a version (Node v18 or higher), skip to step 2.

### Install Node.js

- **Windows:** `winget install OpenJS.NodeJS.LTS`
- **macOS:** `brew install node` or use the installer from https://nodejs.org
- **Linux:**
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.bashrc && nvm install --lts
  ```

> **After installing, completely close and reopen VS Code and any terminals.** Programs started before the install keep the old PATH and report `'npm' is not recognized`. See [Troubleshooting](#7-troubleshooting).

---

## 2. Get the project

Place the `local-scaler-agent` folder anywhere you like (for example `C:\Vibe Code\local-scaler-agent`). All commands below are run from inside that folder.

```powershell
cd "C:\Vibe Code\local-scaler-agent"
```

Layout:

```
local-scaler-agent/
├─ start.bat              one-click start for Windows
├─ package.json           root scripts (runs server + client together)
├─ server/                Express API
│  ├─ server.js           routes: /api/health, /api/generate-post, /api/generate-image
│  ├─ llm.js              provider-neutral LLM client (Gemini, OpenRouter, Anthropic)
│  ├─ brand.js            Scaler brand context and the system prompt
│  ├─ imageGen.js         image mode selection and fallbacks
│  ├─ providers.js        OpenAI image + LLM-drawn SVG
│  ├─ svgCard.js          offline SVG card renderer
│  ├─ .env.example        configuration template
│  └─ .env                your private keys (you create this)
├─ client/                React + Vite + Tailwind dashboard
├─ scripts/               test and check scripts
└─ docs/                  this documentation
```

---

## 3. Install dependencies

```powershell
npm run install:all
```

This installs the root, `server/` and `client/` dependencies. It takes a minute or two.

> If PowerShell reports that scripts are disabled, either use `npm.cmd run install:all`, or run once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## 4. Configure your API key

Create the config file from the template:

```powershell
copy server\.env.example server\.env
```

On macOS or Linux use `cp server/.env.example server/.env`.

Open `server/.env` and fill in **one** provider. The first key found is used, in this order: Gemini, OpenRouter, Anthropic.

### Option A: Google AI Studio (Gemini API, Gemma)

1. Create a key at https://aistudio.google.com/apikey
2. Set:
   ```
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemma-4-26b-a4b-it
   ```

### Option B: OpenRouter (Gemma)

1. Create a key at https://openrouter.ai/keys (it starts with `sk-or-`)
2. Set:
   ```
   OPENROUTER_API_KEY=sk-or-...
   OPENROUTER_MODEL=google/gemma-4-26b-a4b-it
   ```

A `sk-or-` key pasted on the `GEMINI_API_KEY` line is detected and routed to OpenRouter automatically.

### Option C: Anthropic (Claude)

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5
```

Anthropic keys must start with `sk-ant-`. Anything else is ignored.

### All settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Allowed browser origin (CORS) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | empty / `gemma-4-26b-a4b-it` | Google AI Studio |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | empty / `google/gemma-4-26b-a4b-it` | OpenRouter |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | empty / `claude-sonnet-4-5` | Anthropic |
| `LLM_PROVIDER` | empty | Force one of `gemini`, `openrouter`, `anthropic` when several keys are set |
| `OPENAI_API_KEY` / `OPENAI_IMAGE_MODEL` | empty / `gpt-image-1` | Optional raster PNG images |

**Security notes**

- `server/.env` is in `.gitignore`. Never commit it, paste it in chat, or share screenshots of it.
- If a key is ever exposed, revoke it in the provider's dashboard and create a new one.
- The server re-reads `.env` on every request, so **changing a key does not need a restart**. Changing `PORT` does.

---

## 5. Run the app

### Windows: one click

Double-click `start.bat`. It:

1. finds Node even if your terminal's PATH is stale,
2. installs dependencies on the first run,
3. opens http://localhost:3000,
4. starts the API and the dashboard.

Keep the window open while you use the app. Close it or press `Ctrl+C` to stop.

### Any OS: command line

```powershell
npm run dev
```

You can also run each half separately in two terminals:

```powershell
npm run dev:server    # API on :5000
npm run dev:client    # dashboard on :3000
```

### Production-style build (optional)

```powershell
npm run build         # builds the dashboard into client/dist
```

---

## 6. Verify the installation

1. Open http://localhost:3000. You should see the **Scaler Social Media Agent** dashboard.
2. Open http://localhost:3000/api/health. A working AI setup looks like:
   ```json
   {"status":"ok","aiConfigured":true,"provider":"openrouter","model":"google/gemma-4-26b-a4b-it","note":"","imageProviders":{"openai":false,"llm_svg":true,"offline_svg":true}}
   ```

How to read it:

| Field | Meaning |
| --- | --- |
| `aiConfigured: true` | A valid-looking LLM key was found |
| `aiConfigured: false` | No key, so the app runs in offline-template mode |
| `provider` / `model` | Which model will be called |
| `imageProviders.openai` | `true` only if `OPENAI_API_KEY` is set |
| `imageProviders.llm_svg` | `true` when the LLM can draw SVG visuals |

Optional automated check (needs no key or network):

```powershell
node scripts/llm-test.js
```

---

## 7. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `'npm' is not recognized` | The terminal (or VS Code) started before Node was installed. **Fully close and reopen VS Code**, or run `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`, or just use `start.bat`. |
| `npm.ps1 cannot be loaded` / scripts disabled | Use `npm.cmd` instead of `npm`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `EADDRINUSE` / port already in use | An old copy is still running. Close its window, or find the process with `Get-NetTCPConnection -LocalPort 5000` and stop it. The dashboard needs port 3000 exactly (`strictPort`). |
| Health shows `aiConfigured:false` after adding a key | Check the key is on the correct line, has no quotes or spaces, and the file is `server/.env` (not `.env.example`). Also check for an old server still running on port 5000 from before your change. |
| Post is labelled "offline template" | No usable key is configured. Add one (step 4); no restart is needed. |
| `Generation failed: HTTP 401` | The key is wrong or revoked. Create a new one. |
| `Generation failed: HTTP 429` | Rate limit or quota reached. Wait, or switch provider or model. |
| Visual takes 1 to 3 minutes | Normal for LLM-drawn SVG. The request times out after 150 seconds, then falls back to the offline card with a warning. |
| Visual shows "Offline SVG card" with a warning | The AI SVG call failed. Read the warning text in the dashboard and the server console. Retry with **Regenerate visual**. |
| Dashboard loads but requests fail | The API is not running on port 5000. Check the terminal for errors. |
| `http://127.0.0.1:3000` does not load but `http://localhost:3000` does | Vite binds to IPv6 `::1` on some Windows systems. Use `localhost`. |

Server errors are printed in the console window running the API. Start there when something fails.

