// Admin ids (Telegram or MAX user ids) are exempt from the "confirm phone +
// provide a name" gate. Configure as a comma-separated list, e.g. "123,456".
function getAdminIds() {
  return String(process.env.ADMIN_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdminId(id) {
  if (id == null) return false;
  return getAdminIds().includes(String(id));
}

import { supabaseAdmin } from '../supabaseAdmin';

// Checks a raw Telegram/MAX platform id (e.g. straight off a bot webhook
// callback, before any session/user row is loaded) against both the
// ADMIN_IDS bootstrap list and the DB's is_admin flag.
export async function isAdminByPlatformId(id) {
  if (isAdminId(id)) return true;
  if (id == null || !Number.isFinite(Number(id))) return false;

  const { data } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .or(`telegram_id.eq.${id},max_id.eq.${id},vk_id.eq.${id}`)
    .eq('is_admin', true)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

// Like isAdminByPlatformId, but also returns the admin's master scope so
// callers (the confirm/cancel inline buttons on bot notifications) can
// restrict the action to that admin's own master — a bootstrap ADMIN_IDS
// admin is always global (adminMasterId: null).
export async function getAdminScope(id) {
  if (isAdminId(id)) return { isAdmin: true, adminMasterId: null };
  if (id == null || !Number.isFinite(Number(id))) return { isAdmin: false, adminMasterId: null };

  const { data } = await supabaseAdmin
    .from('users')
    .select('is_admin, admin_master_id')
    .or(`telegram_id.eq.${id},max_id.eq.${id},vk_id.eq.${id}`)
    .eq('is_admin', true)
    .limit(1)
    .maybeSingle();

  if (!data) return { isAdmin: false, adminMasterId: null };
  return { isAdmin: true, adminMasterId: data.admin_master_id || null };
}

// Admin status comes from two places: the ADMIN_IDS env var (a permanent
// bootstrap list — always works, immune to any UI mistake) OR the user's
// own `is_admin` flag in the database, set via the admin panel's "Сделать
// администратором" button. The DB flag is what actually persists across
// deploys/restarts (env vars are static per-deploy; the DB is not).
export function isAdminUser(user) {
  if (!user) return false;
  return (
    Boolean(user.is_admin) || isAdminId(user.telegram_id) || isAdminId(user.max_id) || isAdminId(user.vk_id)
  );
}

// A user may search/book once they've provided first + last name via the
// bot (or the platform account, for VK) and are not banned. The phone
// itself is collected/confirmed directly in the booking form on every
// booking, so it isn't gated here — VK in particular can't reliably hand
// back a confirmed phone via its bridge until the Mini App is verified.
// Admins bypass every restriction except the ban itself.
export function getActiveUserStatus(user) {
  if (!user) return { active: false, reason: 'not_authenticated' };
  if (user.is_banned) return { active: false, reason: 'banned' };
  if (isAdminUser(user)) return { active: true, reason: 'admin' };
  if (!user.first_name || !user.last_name) return { active: false, reason: 'name_missing' };
  return { active: true, reason: 'ok' };
}
