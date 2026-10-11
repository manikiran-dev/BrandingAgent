# Publish to LinkedIn from the dashboard

After you generate a post (and optionally a visual), the **Publish to LinkedIn** card lets you edit the text and click **Post on LinkedIn**. The post goes live on your own profile, with the generated image attached.

## 1. Create a LinkedIn app (one time, about 10 minutes)

1. Go to https://www.linkedin.com/developers/apps and click **Create app**.
   - LinkedIn requires the app to be linked to a **Company Page**. Create a free page if you don't have one. You are only using it to own the app; posts still go to your personal profile.
2. Open the app's **Products** tab and request both:
   - **Share on LinkedIn** (gives the `w_member_social` scope used to post)
   - **Sign In with LinkedIn using OpenID Connect** (gives `openid profile`, used to find your member ID)
   Both are self-serve and approved instantly for personal use.
3. Open the **Auth** tab:
   - Copy the **Client ID** and **Client Secret**.
   - Under **Authorized redirect URLs for your app**, add every URL you will use. They must match exactly:
     - Local: `http://localhost:3000/api/linkedin/callback`
     - Hosted: `https://<your-render-name>.onrender.com/api/linkedin/callback`

## 2. Configure the server

Add to `server/.env` (no restart needed):

```
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/linkedin/callback
```

Start the app, generate a post, then in **Publish to LinkedIn** click **Connect LinkedIn**, approve the permission, and you return to the dashboard as "Connected as <your name>".

## 3. Hosted site (Render)

The public site is open to anyone, so publishing is **blocked unless you set a passcode**:

| Variable | Value |
| --- | --- |
| `LINKEDIN_CLIENT_ID` | from the LinkedIn app |
| `LINKEDIN_CLIENT_SECRET` | from the LinkedIn app |
| `LINKEDIN_REDIRECT_URI` | `https://<your-render-name>.onrender.com/api/linkedin/callback` |
| `LINKEDIN_PUBLISH_PASSCODE` | a long random string only you know |

Enter the passcode in the card on the site, then connect and publish. Without the passcode, nobody (including you) can connect or publish on the hosted site. Locally, with no passcode set, only requests from localhost are accepted.

## Things to know

- **Tokens last about 60 days.** After that, the card shows "Connect LinkedIn" again. LinkedIn does not issue refresh tokens for this product tier.
- **Render's free plan has an ephemeral disk.** The saved token is lost on every redeploy or restart after idle sleep, so you may need to click Connect again. This takes a few seconds. Locally the token is kept in `server/.linkedin-token.json` (git-ignored).
- **Images:** LinkedIn only accepts PNG, JPEG or GIF (up to 8 MB here). SVG visuals are converted to a 1080×1350 PNG in the browser before upload.
- **Text:** up to 3,000 characters. Reserved characters such as `( ) * _ @` are escaped automatically so they show up literally. `#hashtags` stay hashtags.
- **Links:** the post prompts put the masterclass link in a "first comment". The API used here publishes the post only, so add that comment on LinkedIn yourself.
- The post is published **immediately and publicly**. A confirmation dialog appears first.
- API version: the `Linkedin-Version` header defaults to `202609`. Override it with `LINKEDIN_API_VERSION` when LinkedIn retires a version (each is supported for at least a year).

## Troubleshooting

| Message | Fix |
| --- | --- |
| `redirect_uri` does not match | The URI in `.env` must exactly match one registered on the LinkedIn Auth tab (scheme, host, port, path). |
| `Publishing ... failed (403)` | The **Share on LinkedIn** product is not approved on the app, or you connected before it was added. Disconnect, then connect again. |
| `Publishing ... failed (401)` | The token expired or was revoked. Connect again. |
| `Publishing is limited to localhost` | You are on the hosted site without `LINKEDIN_PUBLISH_PASSCODE` set. |
| Connect button missing | `LINKEDIN_CLIENT_ID` or `LINKEDIN_CLIENT_SECRET` is empty. |

## Tests

```powershell
node scripts/linkedin-test.js
node scripts/linkedin-routes-test.js
```

Both use a mocked LinkedIn API, so they post nothing.
