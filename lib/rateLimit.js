import { supabaseAdmin } from './supabaseAdmin';

// Simple sliding-window rate limiter backed by Supabase (no Redis
// dependency). Not perfectly atomic under heavy concurrency, but that's an
// acceptable tradeoff here — the goal is to make brute-force/spam
// meaningfully harder, not to build a precise distributed limiter.
//
// Returns { allowed: boolean, remaining: number }.
export async function checkRateLimit(key, maxCount, windowMs) {
  const now = Date.now();

  const { data: existing } = await supabaseAdmin.from('rate_limits').select('*').eq('key', key).maybeSingle();

  if (!existing || now - new Date(existing.window_start).getTime() > windowMs) {
    await supabaseAdmin
      .from('rate_limits')
      .upsert({ key, count: 1, window_start: new Date(now).toISOString(), updated_at: new Date(now).toISOString() });
    return { allowed: true, remaining: maxCount - 1 };
  }

  if (existing.count >= maxCount) {
    return { allowed: false, remaining: 0 };
  }

  await supabaseAdmin
    .from('rate_limits')
    .update({ count: existing.count + 1, updated_at: new Date(now).toISOString() })
    .eq('key', key);

  return { allowed: true, remaining: maxCount - existing.count - 1 };
}

// Best-effort client IP extraction behind Vercel's proxy.
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
