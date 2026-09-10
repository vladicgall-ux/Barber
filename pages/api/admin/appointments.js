import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth/requireAdmin';

// GET /api/admin/appointments?date=YYYY-MM-DD&masterId=...
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(403).json({ error: 'Доступно только администратору' });
  }

  const { date, masterId } = req.query;
  // A master-scoped admin only ever sees their own master's appointments,
  // regardless of what masterId the client sends.
  const effectiveMasterId = admin.admin_master_id || masterId;

  let query = supabaseAdmin
    .from('appointments')
    .select(
      `id, client_name, client_phone, appointment_date, appointment_time, status, source, created_at, admin_confirmed,
       masters ( id, name ),
       services ( id, name, price )`
    )
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });

  if (date) query = query.eq('appointment_date', date);
  if (effectiveMasterId) query = query.eq('master_id', effectiveMasterId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ appointments: data });
}
