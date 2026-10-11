# User Guide

How to use the Scaler Social Media Agent dashboard to produce a ready-to-publish post and a matching visual.

New here? Follow the [Setup Guide](SETUP.md) first. Then open http://localhost:3000.

---

## 1. What the tool does

You give it a topic. It returns:

- **Post copy** written for your chosen platform, in Scaler's brand voice (technical, practical, no invented statistics).
- **Hashtags** relevant to the topic.
- **An AI image prompt** with layout, colours and typography that you can paste into an image tool.
- **A generated visual** drawn from the post's own key points.
- **A publishing plan** with a suggested posting time (IST and EST) and the strategy behind it.

---

## 2. Quick start (2 minutes)

1. Start the app (`start.bat`, or `npm run dev`).
2. Open http://localhost:3000.
3. In **Topic**, type something like: `System design basics: designing a URL shortener`.
4. Pick a **Social Platform**, then click **Generate Post**.
5. Review the post, hashtags and publishing plan on the right.
6. In **Generate Visual**, click **Generate visual**. Wait up to a few minutes.
7. Click **Download PNG** and copy the post and hashtags.

---

## 3. The dashboard

### Left side: Campaign Inputs

| Field | What to enter | Notes |
| --- | --- | --- |
| **Topic** | The subject of the post | Required. Be specific: "Why cache stampedes take down databases" beats "caching". |
| **Social Platform** | LinkedIn, X (Twitter), Instagram, Facebook or YouTube | Changes length, tone and hashtag count (see table below). |
| **Brand Goals** | What the post should achieve | Pick a preset from the list or type your own. |
| **Visual Style** | How the image should look | Default is a dark-mode technical diagram. Edit it for a different look. |
| **Generate Post** | Starts generation | Disabled while it works. |

Brand goal presets:

- Increase brand awareness
- Drive webinar / masterclass sign-ups
- Generate leads for upskilling programs
- Build engineering thought leadership

### What each platform produces

| Platform | Style |
| --- | --- |
| LinkedIn | Strong first line, short paragraphs and bullets, trade-offs, a discussion question, a CTA to the free System Design masterclass (link goes in the first comment), 3 to 5 hashtags. About 1,500 to 2,300 characters. |
| X (Twitter) | Punchy hook within 280 characters, or a tight numbered thread. 1 to 3 hashtags. |
| Instagram | Visual-first caption of 80 to 150 words, sparing emoji, 8 to 12 hashtags. |
| Facebook | Conversational, 60 to 120 words, clear CTA, 2 to 4 hashtags. |
| YouTube | Community post or Shorts caption of 50 to 100 words, 3 to 5 hashtags. |

---

### Right side: Results

Cards appear in this order:

1. **Post Copy**: the text to publish. Use **Copy post**.
2. **Hashtags**: use **Copy hashtags**.
3. **Visual Asset · AI Image Prompt**: visual type, colour palette, typography and the full prompt. Use **Copy prompt** to paste it into Midjourney, FLUX, DALL-E or similar.
4. **Generate Visual**: builds an image (see below).
5. **Publishing Plan**: suggested posting time and strategic rationale.
6. **Copy full JSON**: the whole package as JSON, for automation or archiving.

If the post card shows a message about the **offline template**, no API key is configured. The result is a placeholder, not AI-written copy. See [SETUP.md](SETUP.md#4-configure-your-api-key).

---

## 4. Generating a visual

The **Generate Visual** card builds an image from your campaign inputs **and** the generated post, so the image matches what you will publish. It pulls the post's key points (for example, a list of failure modes) and places them in the image.

1. **Image brief** (optional): edit the text to change the angle. It starts as the AI image prompt.
2. **Image generator**: choose a mode (see [Image modes](#6-image-modes)). **Auto** is fine for most people.
3. Click **Generate visual**. The button changes to *Generating visual…*.
4. When it finishes you will see the image, its **Source**, and the key points it was based on.
5. Not happy? Edit the brief and click **Regenerate visual**.

> AI-drawn SVG visuals can take **1 to 3 minutes**. This is normal. The request stops after 150 seconds and falls back to the offline card with a warning.

### Downloading

| Button | Output |
| --- | --- |
| **Download SVG** | The vector file. Scales to any size and is editable in Figma or Inkscape. |
| **Download PNG (1080×1350)** | A portrait PNG, converted in your browser. Best for uploading to social platforms. |
| **Download PNG** (OpenAI mode) | The raster image directly from OpenAI. |

Files are named after the topic.

### Always check the visual before posting

AI-drawn diagrams can have overlapping text or awkward spacing. Look at the image closely. If it is off, adjust the brief (for example "fewer boxes, larger text") and regenerate.

---

## 5. Recommended workflow

1. Write a specific topic and choose the platform.
2. Generate the post. Read it for technical accuracy. Edit anything you disagree with.
3. Generate the visual. Check text, spacing and spelling.
4. Copy the post and hashtags. Download the PNG.
5. Publish at the suggested time. If the post has a link, put it in the **first comment**, as the brand rules require.

Tips for better results:

- Use specific topics with a clear angle: a failure scenario, a trade-off, or a comparison.
- Put the outcome you want in **Brand Goals** (for example, "Drive webinar sign-ups") because it shapes the CTA.
- Change **Visual Style** for a different look, for example "light theme, minimal, single flow diagram".
- Generate the same topic for different platforms to compare tone and length.

---

## 6. Image modes

| Mode | Needs | Output |
| --- | --- | --- |
| **OpenAI image** | `OPENAI_API_KEY` in `server/.env` | A real PNG image (model `gpt-image-1` by default) |
| **SVG diagram** | The same LLM key used for the post | An LLM-designed SVG with exact text, exportable to PNG |
| **Offline card** | Nothing | A simple SVG card from the post's key points |

**Auto** uses OpenAI if its key is set, otherwise the SVG diagram, otherwise the offline card. If a provider fails, the next one is tried and a warning appears above the image.

**Why not Gemma or Claude for photos?** They are text models. They can draw SVG diagrams, but they cannot create raster or photographic images. For those, add an `OPENAI_API_KEY` or paste the generated AI image prompt into an image tool.

Choosing **OpenAI image** without an OpenAI key shows an error telling you to pick the SVG option.

---

## 7. Guardrails built into the writing

The AI is instructed to:

- Stay technically specific: name mechanisms, trade-offs and failure modes.
- **Never invent** statistics, salaries, placement numbers, testimonials, guarantees or claims about Scaler.
- Mention Scaler's masterclasses and curriculum only in general terms.
- Keep links out of the post body and ask for them in the first comment.

Still review every post before publishing. A language model can make mistakes, and you are responsible for what goes out under your brand.

---

## 8. Customising the agent

| What to change | Where |
| --- | --- |
| Brand voice, audience, content pillars, hard rules | `server/brand.js` (`SYSTEM_PROMPT`) |
| Platform formats and lengths | `server/brand.js` (`PLATFORMS`) |
| Add a platform | Add it in `server/brand.js` and in the `PLATFORMS` list in `client/src/App.jsx` |
| Brand goal presets | `GOAL_PRESETS` in `client/src/App.jsx` |
| Default visual style | `DEFAULT_VISUAL` in `client/src/App.jsx` and `server/server.js` |
| SVG drawing instructions | `server/providers.js` |
| Model | `GEMINI_MODEL`, `OPENROUTER_MODEL` or `ANTHROPIC_MODEL` in `server/.env` |

The server restarts itself when server files change (`node --watch`). The dashboard hot-reloads.

---

## 9. API reference

Use the API directly to automate content creation. The server runs on `http://localhost:5000`.

### `GET /api/health`

Returns status, provider, model and available image providers. See [SETUP.md](SETUP.md#6-verify-the-installation).

### `POST /api/generate-post`

Request body (only `topic` is required):

```json
{
  "topic": "Designing a URL shortener",
  "platform": "LinkedIn",
  "goals": "Drive webinar / masterclass sign-ups",
  "visualStyle": "Dark-mode architecture diagram"
}
```

`platform` is one of `LinkedIn`, `X (Twitter)`, `Instagram`, `Facebook`, `YouTube` (anything else becomes LinkedIn).

Response:

```json
{
  "setup_instructions": { "prerequisites": "", "backend_setup": "", "frontend_setup": "", "run_command": "" },
  "content_package": {
    "brand": "Scaler",
    "url": "https://www.scaler.com/",
    "platform": "LinkedIn",
    "topic": "Designing a URL shortener",
    "post_copy": "",
    "visual_asset_concept": {
      "visual_type": "", "color_palette": "", "typography_hierarchy": "", "ai_image_prompt": ""
    },
    "hashtags": ["#SystemDesign"],
    "suggested_posting_time": "",
    "strategic_rationale": ""
  }
}
```

The `X-Content-Source` response header is `openrouter`, `gemini`, `anthropic` or `offline-template`.

Errors: `400` when `topic` is missing; `502` with `{ "error": "Generation failed: ..." }` when the model call fails.

### `POST /api/generate-image`

Request body (`postCopy` is required):

```json
{
  "topic": "Designing a URL shortener",
  "platform": "LinkedIn",
  "goals": "Drive webinar / masterclass sign-ups",
  "visualStyle": "Dark-mode architecture diagram",
  "postCopy": "<the generated post text>",
  "basePrompt": "<optional image brief>",
  "palette": "<optional colour palette>",
  "mode": "auto"
}
```

`mode` is `auto`, `openai` or `svg`.

Response:

```json
{
  "image": "data:image/svg+xml;base64,...",
  "format": "svg",
  "source": "llm-svg",
  "model": "google/gemma-4-26b-a4b-it",
  "prompt_used": "",
  "key_points": ["..."],
  "warning": ""
}
```

`source` is `openai`, `llm-svg` or `offline-svg`. `warning` is non-empty when a provider failed and a fallback was used. The `X-Image-Source` header repeats `source`.

### Example with PowerShell

```powershell
$body = @{ topic = "Cache stampedes"; platform = "LinkedIn" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/generate-post -ContentType "application/json" -Body $body
```

---

## 10. FAQ

**Do I need to restart after changing my API key?** No. `server/.env` is re-read on each request.

**Which model is used?** Gemma 4 26B A4B by default, through whichever provider you configured. The health endpoint shows the active provider and model.

**Can I use it without any key?** Yes, in offline mode. You get a labelled template and a basic SVG card. For real AI output, add a key.

**Why does the visual take so long?** The model writes a full SVG diagram as text, which is slow. Expect 1 to 3 minutes.

**Is my data stored anywhere?** The server saves nothing. Prompts go to your configured LLM provider, and results exist only in your browser until you download or copy them.

**Where do I debug errors?** Check the red message in the dashboard, then the console window running the API, then the Troubleshooting table in [SETUP.md](SETUP.md#7-troubleshooting).

