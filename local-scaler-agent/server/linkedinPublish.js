// LinkedIn publishing: Images API (upload) + Posts API, posting as the connected member.
const { API, LinkedInError, config, loadToken, http, failure } = require("./linkedinAuth");

const MAX_TEXT = 3000; // LinkedIn commentary limit
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Posts API commentary uses "little text format": these characters are reserved and must be escaped.
// "#" is left alone so #hashtags stay hashtags.
const escapeCommentary = (text) => String(text).replace(/[\\|{}@[\]()<>*_~]/g, "\\$&");

function parseImage(dataUrl) {
  const m = /^data:image\/(png|jpe?g|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!m) throw new LinkedInError("Image must be a PNG, JPEG or GIF data URL (LinkedIn does not accept SVG).", 400);
  const buffer = Buffer.from(m[2], "base64");
  if (!buffer.length) throw new LinkedInError("Image is empty.", 400);
  if (buffer.length > MAX_IMAGE_BYTES) throw new LinkedInError("Image is larger than 8 MB.", 400);
  return buffer;
}

const apiHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  "Linkedin-Version": config().version,
  "X-Restli-Protocol-Version": "2.0.0",
});

async function uploadImage(token, personId, buffer) {
  const init = await http(`${API}/rest/images?action=initializeUpload`, {
    method: "POST",
    headers: { ...apiHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ initializeUploadRequest: { owner: `urn:li:person:${personId}` } }),
  });
  if (!init.ok) throw await failure(init, "Image upload setup");
  const { value } = await init.json();
  if (!value || !value.uploadUrl || !value.image) throw new LinkedInError("LinkedIn returned no upload URL.");

  const put = await http(value.uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
    body: buffer,
  });
  if (!put.ok) throw await failure(put, "Image upload");
  return value.image; // urn:li:image:...
}

let publishing = false;

async function publishPost({ text, imageDataUrl, altText }) {
  const body = String(text || "").trim();
  if (!body) throw new LinkedInError("Post text is empty.", 400);
  if (body.length > MAX_TEXT) throw new LinkedInError(`Post is ${body.length} characters; LinkedIn allows ${MAX_TEXT}.`, 400);
  const buffer = imageDataUrl ? parseImage(imageDataUrl) : null;

  const t = loadToken();
  if (!t) throw new LinkedInError("LinkedIn is not connected (or the token expired). Connect LinkedIn first.", 401);
  if (publishing) throw new LinkedInError("A post is already being published. Wait a moment.", 409);

  publishing = true;
  try {
    const post = {
      author: `urn:li:person:${t.personId}`,
      commentary: escapeCommentary(body),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };
    if (buffer) {
      const imageUrn = await uploadImage(t.accessToken, t.personId, buffer);
      post.content = { media: { id: imageUrn, altText: String(altText || "").slice(0, 4000) } };
    }

    const res = await http(`${API}/rest/posts`, {
      method: "POST",
      headers: { ...apiHeaders(t.accessToken), "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
    if (!res.ok) throw await failure(res, "Publishing the post");
    const urn = res.headers.get("x-restli-id") || "";
    return { urn, url: urn ? `https://www.linkedin.com/feed/update/${urn}/` : "", withImage: Boolean(buffer) };
  } finally {
    publishing = false;
  }
}

module.exports = { publishPost, escapeCommentary, parseImage };
