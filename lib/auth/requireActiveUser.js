// Admin ids (Telegram or MAX user ids) are exempt from the "confirm phone +
// provide a name" gate. Configure as a comma-separated list, e.g. "123,456".
function getAdminIds() {
  return String(process.env.ADMIN_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdminUser(user) {
  if (!user) return false;
  const adminIds = getAdminIds();
  if (adminIds.length === 0) return false;
  return (
    (user.telegram_id != null && adminIds.includes(String(user.telegram_id))) ||
    (user.max_id != null && adminIds.includes(String(user.max_id)))
  );
}

// A user may search/book only once they've confirmed a phone number and
// provided first + last name via the bot, and are not banned. Admins bypass
// every restriction except the ban itself.
export function getActiveUserStatus(user) {
  if (!user) return { active: false, reason: 'not_authenticated' };
  if (user.is_banned) return { active: false, reason: 'banned' };
  if (isAdminUser(user)) return { active: true, reason: 'admin' };
  if (!user.phone_confirmed) return { active: false, reason: 'phone_not_confirmed' };
  if (!user.first_name || !user.last_name) return { active: false, reason: 'name_missing' };
  return { active: true, reason: 'ok' };
}
