import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth/requireAdmin';

const MAX_RANGE_DAYS = 180;

// GET    /api/admin/closed-dates
//   -> list closures. A master-scoped admin (admin_master_id set) only
//      sees their own master's closures; a global admin sees everything.
// POST   /api/admin/closed-dates { startDate, endDate?, masterId?, reason?, startTime?, endTime? }
//   -> closes every date in [startDate, endDate] (endDate defaults to startDate).
//      Leave startTime/endTime empty to close the whole day; set both to
//      block only that time window (e.g. 08:00–10:00) on each date.
//      A master-scoped admin can only close days for their own master —
//      masterId is forced server-side regardless of what's sent, so they
//      can never close "весь барбершоп" or someone else's master.
// DELETE /api/admin/closed-dates { id }
//   -> reopens one closure row. A master-scoped admin can only reopen
//      their own master's rows.
export default async function handler(req, res) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(403).json({ error: 'Доступно только администратору' });
  }
  const scopedMasterId = admin.admin_master_id || null;

  if (req.method === 'GET') {
    let query = supabaseAdmin
      .from('closed_dates')
      .select('id, master_id, date, start_time, end_time, reason, masters ( name )')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true });

    if (scopedMasterId) query = query.eq('master_id', scopedMasterId);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ closedDates: data });
  }

  if (req.method === 'POST') {
    const { startDate, endDate, masterId, reason, startTime, endTime } = req.body || {};
    if (!startDate) return res.status(400).json({ error: 'startDate is required' });

    // A master-scoped admin can only ever close their own master's days,
    // no matter what the client sends.
    const effectiveMasterId = scopedMasterId || masterId || null;

    const from = new Date(`${startDate}T00:00:00Z`);
    const to = new Date(`${endDate || startDate}T00:00:00Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
      return res.status(400).json({ error: 'Некорректный диапазон дат' });
    }
    const dayCount = Math.round((to - from) / 86400000) + 1;
    if (dayCount > MAX_RANGE_DAYS) {
      return res.status(400).json({ error: `Слишком большой диапазон (максимум ${MAX_RANGE_DAYS} дней)` });
    }
    if ((startTime && !endTime) || (!startTime && endTime)) {
      return res.status(400).json({ error: 'Укажите и начало, и конец времени, либо оставьте оба поля пустыми' });
    }
    if (startTime && endTime && startTime >= endTime) {
      return res.status(400).json({ error: 'Время начала должно быть раньше времени окончания' });
    }

    const rows = [];
    for (let i = 0; i < dayCount; i += 1) {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + i);
      rows.push({
        date: d.toISOString().slice(0, 10),
        master_id: effectiveMasterId,
        start_time: startTime || null,
        end_time: endTime || null,
        reason: reason || null,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('closed_dates')
      .insert(rows)
      .select('id, master_id, date, start_time, end_time, reason, masters ( name )');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ closedDates: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });

    let query = supabaseAdmin.from('closed_dates').delete().eq('id', id);
    if (scopedMasterId) query = query.eq('master_id', scopedMasterId);

    const { data, error } = await query.select('id');
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена или вам недоступна' });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
