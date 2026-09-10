import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth/requireAdmin';

// GET   /api/admin/users                                    -> list all users + count
// PATCH /api/admin/users { userId, isBanned?, isAdmin?, adminMasterId? } -> update flags
export default async function handler(req, res) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(403).json({ error: 'Доступно только администратору' });
  }

  if (req.method === 'GET') {
    const { data, error, count } = await supabaseAdmin
      .from('users')
      .select(
        `id, telegram_id, max_id, vk_id, phone, phone_confirmed, first_name, last_name,
         is_banned, is_admin, admin_master_id, created_at,
         masters ( id, name )`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ users: data, count: count ?? data.length });
  }

  if (req.method === 'PATCH') {
    const { userId, isBanned, isAdmin, adminMasterId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const patch = { updated_at: new Date().toISOString() };
    if (typeof isBanned === 'boolean') patch.is_banned = isBanned;
    if (typeof isAdmin === 'boolean') {
      patch.is_admin = isAdmin;
      // Clearing admin status also clears which master they were scoped to.
      if (!isAdmin) patch.admin_master_id = null;
    }
    if (adminMasterId !== undefined) patch.admin_master_id = adminMasterId || null;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(patch)
      .eq('id', userId)
      .select(
        `id, telegram_id, max_id, vk_id, phone, phone_confirmed, first_name, last_name,
         is_banned, is_admin, admin_master_id, created_at,
         masters ( id, name )`
      )
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ user: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
