import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth/requireAdmin';

// GET    /api/admin/closed-dates                 -> list all closed dates
// POST   /api/admin/closed-dates { date, masterId?, reason? } -> close a date
// DELETE /api/admin/closed-dates { id }           -> reopen a date
export default async function handler(req, res) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(403).json({ error: 'Доступно только администратору' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('closed_dates')
      .select('id, master_id, date, reason, masters ( name )')
      .order('date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ closedDates: data });
  }

  if (req.method === 'POST') {
    const { date, masterId, reason } = req.body || {};
    if (!date) return res.status(400).json({ error: 'date is required' });

    const { data, error } = await supabaseAdmin
      .from('closed_dates')
      .insert({ date, master_id: masterId || null, reason: reason || null })
      .select('id, master_id, date, reason, masters ( name )')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Эта дата уже закрыта' });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ closedDate: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });

    const { error } = await supabaseAdmin.from('closed_dates').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
