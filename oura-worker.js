// Somnus — Oura API CORS Proxy (Cloudflare Worker)
//
// Problem: browsers block direct fetch() calls to api.ouraring.com from a
// github.io origin because Oura's API doesn't send CORS headers for arbitrary
// origins. This Worker sits in between, forwards the request to Oura, and
// adds the correct CORS headers so the PWA can call it from the browser.
//
// Deploy: paste this file into the Cloudflare Workers editor, click Deploy.
// The worker URL will look like: https://somnus-oura.YOUR-NAME.workers.dev
//
// Security: the Oura token travels in the Authorization header (HTTPS end-to-end).
// Only GET requests to /v2/usercollection/* are forwarded — nothing else passes.

const ALLOWED_ORIGIN = 'https://diegoarm-ai.github.io';
const OURA_BASE      = 'https://api.ouraring.com';

const CORS = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization',
  'Access-Control-Max-Age':       '86400',
};

export default {
  async fetch(request) {

    // ── CORS preflight ────────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── Only GET allowed ──────────────────────────────────────────────────────
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: CORS });
    }

    // ── Require Authorization header ──────────────────────────────────────────
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return new Response('Missing or invalid Authorization header', { status: 401, headers: CORS });
    }

    // ── Only proxy Oura v2 collection endpoints ───────────────────────────────
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/v2/usercollection/')) {
      return new Response('Not found', { status: 404, headers: CORS });
    }

    // ── Forward to Oura ───────────────────────────────────────────────────────
    const ouraUrl = OURA_BASE + url.pathname + url.search;
    const ouraRes = await fetch(ouraUrl, {
      headers: { 'Authorization': auth },
    });

    const body = await ouraRes.text();

    return new Response(body, {
      status: ouraRes.status,
      headers: {
        ...CORS,
        'Content-Type': ouraRes.headers.get('Content-Type') ?? 'application/json',
      },
    });
  },
};
