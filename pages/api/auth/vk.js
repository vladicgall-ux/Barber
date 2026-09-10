import { validateVkParams } from '../../../lib/auth/validateVkParams';
import { upsertUserByVkId } from '../../../lib/auth/upsertUser';
import { createUserSessionCookie } from '../../../lib/auth/session';
import { toPublicUser } from '../../../lib/auth/publicUser';

// POST /api/auth/vk
// Body: { queryString } — the raw VK launch params, i.e. window.location.search
// (or VK Bridge's VKWebAppGetLaunchParams) with the leading "?" stripped or not,
// both are fine since it's parsed with URLSearchParams.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { queryString, firstName, lastName, phone } = req.body || {};
  if (!queryString) {
    return res.status(400).json({ error: 'queryString is required' });
  }

  const secret = process.env.VK_APP_SECRET;
  const { valid, vkUserId, reason } = validateVkParams(queryString, secret);

  if (!valid) {
    return res.status(401).json({ error: 'Недействительные данные VK', reason });
  }

  const dbUser = await upsertUserByVkId(vkUserId, { firstName, lastName, phone });

  res.setHeader('Set-Cookie', createUserSessionCookie(dbUser.id));
  return res.status(200).json({ ok: true, user: toPublicUser(dbUser) });
}
