import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { isValidSession } from '../../../lib/adminAuth';

// POST /api/admin/cancel { appointmentId }
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isValidSession(req)) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const { appointmentId } = req.body || {};
  if (!appointmentId) {
    return res.status(400).json({ error: 'appointmentId is required' });
  }

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Slot is now free again: the unique index only applies to status='confirmed'
  // rows, so the next availability check / booking attempt will see it as open.
  return res.status(200).json({ appointment: data });
}
