import { validateInitData } from '../../../lib/auth/validateInitData';
import { upsertUserByMaxId } from '../../../lib/auth/upsertUser';
import { createUserSessionCookie } from '../../../lib/auth/session';
import { toPublicUser } from '../../../lib/auth/publicUser';

// POST /api/auth/max
// Header: X-Max-Init-Data: <raw MAX WebApp initData string>
// MAX Mini Apps sign initData with the identical scheme Telegram uses, just
// with the MAX bot's own token — see lib/auth/validateInitData.js.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const initDataRaw = req.headers['x-max-init-data'];
  if (!initDataRaw) {
    return res.status(400).json({ error: 'Отсутствует X-Max-Init-Data' });
  }

  const botToken = process.env.MAX_BOT_TOKEN;
  const { valid, user, reason } = validateInitData(initDataRaw, botToken);

  if (!valid || !user?.id) {
    return res.status(401).json({ error: 'Недействительные данные MAX', reason });
  }

  const dbUser = await upsertUserByMaxId(user.id, {
    firstName: user.first_name,
    lastName: user.last_name,
  });

  res.setHeader('Set-Cookie', createUserSessionCookie(dbUser.id));
  return res.status(200).json({ ok: true, user: toPublicUser(dbUser) });
}
