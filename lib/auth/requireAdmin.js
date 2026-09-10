import { getSessionUser } from './session';
import { isAdminUser } from './requireActiveUser';

// Returns the authenticated user if they're an admin (their Telegram/MAX id
// is listed in ADMIN_IDS) and not banned, otherwise null.
export async function requireAdmin(req) {
  const user = await getSessionUser(req);
  if (!user || user.is_banned || !isAdminUser(user)) return null;
  return user;
}
