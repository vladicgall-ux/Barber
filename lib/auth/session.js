import crypto from 'crypto';
import { supabaseAdmin } from '../supabaseAdmin';

const COOKIE_NAME = 'bb_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) throw new Error('AUTH_SESSION_SECRET is not set');
  return secret;
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

export function createUserSessionCookie(userId) {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expires}`;
  const signature = sign(payload);
  const token = `${payload}.${signature}`;

  const isProd = process.env.NODE_ENV === 'production';
  return [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    isProd ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function clearUserSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`;
}

// Returns the userId from a valid, unexpired session cookie, or null.
export function getSessionUserId(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;

  const token = match.slice(COOKIE_NAME.length + 1);
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signature] = parts;

  const payload = `${userId}.${expiresRaw}`;
  const expected = sign(payload);
  const validSig =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!validSig) return null;

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || Date.now() >= expires) return null;

  return userId;
}

// Loads the full user row for the current session, or null if unauthenticated.
export async function getSessionUser(req) {
  const userId = getSessionUserId(req);
  if (!userId) return null;

  const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return data;
}
