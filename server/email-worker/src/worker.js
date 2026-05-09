/**
 * Cloudflare Worker — house-calculator email delivery.
 *
 * POST /api/house-scenario
 *   { email: string, payload: HouseScenarioPayload, hp: string }
 *
 * Responds 200 { ok: true } on success.
 * 400 on bad input, 429 on rate limit, 5xx on upstream failure.
 *
 * Required env (set via `wrangler secret put`):
 *   - RESEND_API_KEY      Resend API key
 *   - FROM_EMAIL          Verified sender, e.g. "Michael <reports@mkalmykov.com>"
 *
 * Optional env (set in wrangler.toml [vars]):
 *   - ALLOWED_ORIGINS     Comma-separated list (defaults below)
 *   - PORTFOLIO_URL       Defaults to https://www.mkalmykov.com
 *   - FOCUS_READER_URL    Defaults to https://www.mkalmykov.com/tools/focus-reader.html
 *
 * Optional KV binding (recommended for prod):
 *   - RATE_LIMIT          Workers KV namespace for IP/email throttling
 */

import { renderHouseScenarioEmail, renderHouseScenarioText } from './email-template.js';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.mkalmykov.com',
  'https://mkalmykov.com',
  'http://localhost:8080',
  'http://localhost:4321',
  'http://127.0.0.1:8080',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Per-IP: 5 sends / day. Per-email: 1 send / hour.
const IP_LIMIT = 5;
const IP_WINDOW_S = 24 * 60 * 60;
const EMAIL_WINDOW_S = 60 * 60;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = parseAllowedOrigins(env);
    const corsOrigin = allowed.includes(origin) ? origin : allowed[0];

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(corsOrigin) });
    }

    if (url.pathname !== '/api/house-scenario' || request.method !== 'POST') {
      return json({ error: 'Not found' }, 404, corsOrigin);
    }

    // Reject untrusted origins outright (defense in depth — CORS is for browsers).
    if (origin && !allowed.includes(origin)) {
      return json({ error: 'Origin not allowed' }, 403, corsOrigin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, corsOrigin);
    }

    const { email, payload, hp } = body || {};

    // Honeypot — silent success so bots don't learn they're filtered.
    if (typeof hp === 'string' && hp.trim().length > 0) {
      return json({ ok: true }, 200, corsOrigin);
    }

    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return json({ error: 'Invalid email' }, 400, corsOrigin);
    }
    if (!payload || typeof payload !== 'object' || !payload.outputs || !payload.inputs) {
      return json({ error: 'Invalid payload' }, 400, corsOrigin);
    }

    const cleanEmail = email.trim().toLowerCase();
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Rate limit (KV-backed). If KV isn't bound we degrade open — log & continue.
    if (env.RATE_LIMIT) {
      const ipKey = `ip:${ip}`;
      const emailKey = `em:${cleanEmail}`;
      const [ipCountStr, emailHit] = await Promise.all([
        env.RATE_LIMIT.get(ipKey),
        env.RATE_LIMIT.get(emailKey),
      ]);
      if (emailHit) {
        return json({ error: 'You just sent one. Try again in an hour.' }, 429, corsOrigin);
      }
      const ipCount = parseInt(ipCountStr || '0', 10) || 0;
      if (ipCount >= IP_LIMIT) {
        return json({ error: 'Daily send limit reached for this network.' }, 429, corsOrigin);
      }
      // Record both — fire-and-forget after response so latency isn't affected.
      ctx.waitUntil(Promise.all([
        env.RATE_LIMIT.put(ipKey, String(ipCount + 1), { expirationTtl: IP_WINDOW_S }),
        env.RATE_LIMIT.put(emailKey, '1', { expirationTtl: EMAIL_WINDOW_S }),
      ]));
    }

    if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
      return json({ error: 'Email service not configured' }, 500, corsOrigin);
    }

    const portfolioUrl = env.PORTFOLIO_URL || 'https://www.mkalmykov.com';
    const focusReaderUrl = env.FOCUS_READER_URL || 'https://www.mkalmykov.com/tools/focus-reader.html';

    let html, text, subject;
    try {
      const rendered = renderHouseScenarioEmail(payload, { portfolioUrl, focusReaderUrl });
      html = rendered.html;
      subject = rendered.subject;
      text = renderHouseScenarioText(payload, { portfolioUrl, focusReaderUrl });
    } catch (err) {
      return json({ error: 'Failed to render report' }, 500, corsOrigin);
    }

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [cleanEmail],
        subject,
        html,
        text,
        reply_to: env.REPLY_TO || undefined,
        tags: [{ name: 'source', value: 'house-calculator' }],
      }),
    });

    if (!resendResp.ok) {
      let detail = '';
      try { detail = JSON.stringify(await resendResp.json()); } catch {}
      console.error('Resend failure', resendResp.status, detail);
      return json({ error: 'Could not send email' }, 502, corsOrigin);
    }

    return json({ ok: true }, 200, corsOrigin);
  },
};

function parseAllowedOrigins(env) {
  if (env.ALLOWED_ORIGINS) {
    return env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}
