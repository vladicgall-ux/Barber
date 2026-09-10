import { getActiveUserStatus, isAdminUser } from './requireActiveUser';

// Shape returned to the client — never leak telegram_id/max_id or raw rows.
export function toPublicUser(user) {
  if (!user) return null;
  const { active, reason } = getActiveUserStatus(user);
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    phoneConfirmed: user.phone_confirmed,
    isBanned: user.is_banned,
    active,
    activeReason: reason,
    isAdmin: isAdminUser(user),
  };
}
