# Local Scaler Social Media Agent

Express API (`http://localhost:5000`) + React/Vite/Tailwind dashboard (`http://localhost:3000`).
Generates a Scaler-branded social post, hashtags, an image prompt and a matching visual, using
Gemma 4 26B A4B (Google AI Studio or OpenRouter) or Claude.

## Documentation

| Guide | Covers |
| --- | --- |
| [Setup Guide](docs/SETUP.md) | Installing Node, dependencies, API keys, running, verifying, troubleshooting |
| [User Guide](docs/USER-GUIDE.md) | Using the dashboard, image modes, workflow tips, customising, full API reference |

**Fastest start on Windows:** double-click `start.bat`, then open http://localhost:3000.
The sections below are a condensed version of the guides.

## 1. Prerequisites (zero-setup machine)

Check what you have:

```bash
node -v   # needs v18+
npm -v
git --version
curl --version
```

Install if missing:

- **Windows (PowerShell):** `winget install OpenJS.NodeJS.LTS` and `winget install Git.Git` (curl ships with Windows 10+). Reopen the terminal afterwards.
- **macOS:** `brew install node git` (curl is preinstalled), or the installer from https://nodejs.org
- **Linux (via NVM):**
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.bashrc && nvm install --lts
  sudo apt-get install -y git curl
  ```

## 2. Install and configure

```bash
cd local-scaler-agent
npm run install:all          # root + server + client dependencies
cp server/.env.example server/.env    # Windows: copy server\.env.example server\.env
# edit server/.env and set GEMINI_API_KEY (Google AI Studio), OPENROUTER_API_KEY or ANTHROPIC_API_KEY
```

Keep `server/.env` private. It is git-ignored. Key changes are picked up without a restart.

Without an API key the API returns a clearly labelled offline template so the UI can still be tried.

## 3. Run both servers

```bash
npm run dev
```

Open http://localhost:3000. The Vite dev server proxies `/api` to port 5000.

On Windows PowerShell, if `npm` is blocked by the execution policy, use `npm.cmd` or run
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## API

`POST /api/generate-post` with `{ "topic": string, "platform": string, "goals": string, "visualStyle": string }`
(only `topic` is required) returns:

```json
{
  "setup_instructions": { "prerequisites": "", "backend_setup": "", "frontend_setup": "", "run_command": "" },
  "content_package": {
    "brand": "Scaler", "url": "https://www.scaler.com/", "platform": "", "topic": "",
    "post_copy": "",
    "visual_asset_concept": { "visual_type": "", "color_palette": "", "typography_hierarchy": "", "ai_image_prompt": "" },
    "hashtags": [], "suggested_posting_time": "", "strategic_rationale": ""
  }
}
```

The `X-Content-Source` response header is `gemini`, `openrouter`, `anthropic` or `offline-template`.
`GET /api/health` reports status. Brand context and prompts live in `server/brand.js`.

## Visual generator (image)

After a post is generated, the **Generate Visual** card builds an image from the campaign inputs
(topic, platform, goals, visual style) and the generated post itself. It extracts the post's key
points (for example the four failure modes) and puts them into the image.

Gemma and Claude are text models and cannot generate raster images. The dashboard therefore
supports three paths:

| Mode | Needs | Output |
| --- | --- | --- |
| OpenAI image | `OPENAI_API_KEY` in `server/.env` (optional `OPENAI_IMAGE_MODEL`, default `gpt-image-1`) | PNG |
| SVG diagram | the same LLM key as the post (`GEMINI_API_KEY`, `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY`) | LLM-designed SVG with exact text; PNG export in the browser |
| Offline card | nothing | SVG card built from the post's key points |

"Auto" uses OpenAI if its key is set, otherwise the SVG diagram, otherwise the offline card. If a
provider fails, the next one is used and a warning is shown.

`POST /api/generate-image` with `{ topic, platform, goals, visualStyle, postCopy, basePrompt, palette, mode }`
(`mode` is `auto`, `openai` or `svg`; `postCopy` is required). It returns
`{ image (data URL), format, source, model, prompt_used, key_points, warning }`.
`GET /api/health` also reports `imageProviders`.

## How the project was built (from scratch)

```bash
mkdir local-scaler-agent && cd local-scaler-agent
npm init -y && npm i -D concurrently
mkdir server && cd server && npm init -y && npm i express cors dotenv @anthropic-ai/sdk && cd ..
npm create vite@latest client -- --template react
cd client && npm i && npm i -D tailwindcss@3 postcss autoprefixer && npx tailwindcss init -p
```

Tailwind `content` is `["./index.html", "./src/**/*.{js,jsx}"]` and `src/index.css` contains the three `@tailwind` directives.
