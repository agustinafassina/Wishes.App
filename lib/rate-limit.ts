import { NextResponse } from 'next/server';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Simple in-memory sliding fixed window. Fine for single-node / Docker; not shared across replicas. */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

/** ~40 writes / minute / user across mutating location APIs. */
const WRITE_LIMIT = 40;
const WRITE_WINDOW_MS = 60_000;

export function enforceWriteRateLimit(userKey: string): NextResponse | null {
  const result = checkRateLimit(`write:${userKey}`, WRITE_LIMIT, WRITE_WINDOW_MS);
  if (result.ok) return null;
  return NextResponse.json(
    { error: 'Too many requests. Please try again shortly.' },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSec) },
    }
  );
}

/** Best-effort CSRF mitigation for cookie sessions: require Origin/Referer match APP_BASE_URL when present. */
export function enforceSameOrigin(request: Request): NextResponse | null {
  const appBase = (process.env.APP_BASE_URL || '').replace(/\/$/, '');
  if (!appBase) return null;

  let expected: URL;
  try {
    expected = new URL(appBase);
  } catch {
    return null;
  }

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const o = new URL(origin);
      if (o.protocol === expected.protocol && o.host === expected.host) return null;
    } catch {
      /* fall through */
    }
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const r = new URL(referer);
      if (r.protocol === expected.protocol && r.host === expected.host) return null;
    } catch {
      /* fall through */
    }
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  // No Origin/Referer (e.g. some same-site or non-browser clients) — allow; SameSite cookies still apply.
  return null;
}
