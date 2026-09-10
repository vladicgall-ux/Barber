import { validateInitData } from '../../../lib/auth/validateInitData';
import { upsertUserByTelegramId } from '../../../lib/auth/upsertUser';
import { createUserSessionCookie } from '../../../lib/auth/session';
import { toPublicUser } from '../../../lib/auth/publicUser';

// POST /api/auth/telegram
// Header: X-Telegram-Init-Data: <raw Telegram.WebApp.initData string>
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const initDataRaw = req.headers['x-telegram-init-data'];
  if (!initDataRaw) {
    return res.status(400).json({ error: 'Отсутствует X-Telegram-Init-Data' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const { valid, user, reason } = validateInitData(initDataRaw, botToken);

  if (!valid || !user?.id) {
    return res.status(401).json({ error: 'Недействительные данные Telegram', reason });
  }

  const dbUser = await upsertUserByTelegramId(user.id, {
    firstName: user.first_name,
    lastName: user.last_name,
  });

  res.setHeader('Set-Cookie', createUserSessionCookie(dbUser.id));
  return res.status(200).json({ ok: true, user: toPublicUser(dbUser) });
}
