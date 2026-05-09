# house-calc-email — Cloudflare Worker

Backend that delivers the house-calculator scenario report. Static-site frontend (GitHub Pages) posts to this Worker; the Worker renders an HTML email and hands it to **Resend** for delivery.

## Architecture

```
[ user clicks "Send my report" ]
            │ POST { email, payload, hp }
            ▼
[ Cloudflare Worker — this folder ]
   ├── CORS check (allowed origins)
   ├── Honeypot drop  (silent 200)
   ├── Email regex
   ├── KV rate limit  (5 / IP / day, 1 / email / hour)
   ├── Render HTML + text
   └── POST → api.resend.com
            │
            ▼
       [ user inbox ]
```

No SMTP creds, no API keys ever touch the browser. The frontend only knows the Worker URL.

## One-time setup

1. **Resend account** (free tier is fine for portfolio traffic — 100/day, 3,000/mo)
   - Sign up: https://resend.com
   - Add and verify the `mkalmykov.com` domain (Resend walks you through SPF + DKIM DNS records on whatever DNS provider you're using). This is what gets you into inboxes instead of spam.
   - Create an API key with **Send only** permission.

2. **Cloudflare account** (free)
   - `npm i -g wrangler` (or run `npx wrangler` in this folder).
   - `wrangler login` — opens your browser for OAuth.

3. **KV namespace for rate limiting**
   ```bash
   wrangler kv namespace create RATE_LIMIT
   ```
   Paste the returned `id` into `wrangler.toml` and uncomment the `[[kv_namespaces]]` block.

4. **Secrets** (encrypted, never in git):
   ```bash
   wrangler secret put RESEND_API_KEY     # paste the Resend key
   wrangler secret put FROM_EMAIL          # e.g. "Michael <reports@mkalmykov.com>"
   wrangler secret put REPLY_TO            # optional, e.g. "michael.kalmykov.88@gmail.com"
   ```

5. **Deploy**:
   ```bash
   cd server/email-worker
   npm install
   npm run deploy
   ```
   Wrangler prints the worker URL (e.g. `https://house-calc-email.<your-subdomain>.workers.dev`).

6. **Custom domain (recommended)**
   In the Cloudflare dashboard → Workers & Pages → `house-calc-email` → Settings → Triggers → Custom Domains, add `email.mkalmykov.com`. Cloudflare provisions the cert and routes `https://email.mkalmykov.com/*` to the worker.

   The frontend posts to `https://email.mkalmykov.com/api/house-scenario` by default. If you skip the custom domain, override at runtime by adding to `tools/house-calculator.html` before the JS loads:
   ```html
   <script>window.__HC_EMAIL_ENDPOINT = 'https://house-calc-email.<your-subdomain>.workers.dev/api/house-scenario';</script>
   ```

## Local development

```bash
npm run dev          # starts wrangler dev on http://localhost:8787
```

Then in another terminal serve the static site (`tools/_devserver.mjs` or whatever you use) and set the override:

```html
<script>window.__HC_EMAIL_ENDPOINT = 'http://localhost:8787/api/house-scenario';</script>
```

`wrangler dev` reads secrets from `.dev.vars` (gitignored). Create one:

```ini
RESEND_API_KEY=re_xxx
FROM_EMAIL=Michael <onboarding@resend.dev>
```

> Tip: while you're still verifying your domain on Resend, use `onboarding@resend.dev` as the sender — Resend lets you send to **your own verified email** with that. Swap to `reports@mkalmykov.com` once the domain is verified.

## Iterating on the email design

```bash
npm run preview-email     # writes preview.html
open preview.html         # or just open in your browser
```

The preview script lives in `scripts/preview-email.mjs` with hardcoded sample data, so you can tweak the template (`src/email-template.js`) and refresh without sending real mail.

## Operational notes

- **Logs**: `npm run tail` streams worker logs from Cloudflare. Resend failures are logged with the upstream JSON for debugging.
- **Rate limit**: tuned conservatively (5 sends per IP per day, 1 per email per hour). Adjust constants at the top of `src/worker.js` if needed.
- **Bounces / complaints**: Resend dashboards surface these; nothing to do unless they spike.
- **Cost**: Cloudflare Workers free tier = 100k req/day. Resend free tier = 3k emails/mo. Both well above realistic portfolio volume.
