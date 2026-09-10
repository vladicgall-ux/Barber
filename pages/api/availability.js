import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { ALL_SLOTS, getShopNow } from '../../lib/timeSlots';
import { isWholeDayClosed, isTimeClosed } from '../../lib/closures';

// GET /api/availability?masterId=...&date=YYYY-MM-DD
// Returns all slots + which ones are already booked (confirmed) for that master/date.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { masterId, date } = req.query;
  if (!masterId || !date || !/^[0-9a-f-]{36}$/i.test(masterId)) {
    return res.status(400).json({ error: 'masterId and date are required' });
  }

  const [{ data, error }, { data: closures, error: closuresErr }] = await Promise.all([
    supabaseAdmin
      .from('appointments')
      .select('appointment_time')
      .eq('master_id', masterId)
      .eq('appointment_date', date)
      .eq('status', 'confirmed'),
    supabaseAdmin
      .from('closed_dates')
      .select('master_id, start_time, end_time')
      .eq('date', date)
      .or(`master_id.is.null,master_id.eq.${masterId}`),
  ]);

  if (error) return res.status(500).json({ error: error.message });
  if (closuresErr) return res.status(500).json({ error: closuresErr.message });

  if (isWholeDayClosed(closures)) {
    return res.status(200).json({ slots: ALL_SLOTS.map((time) => ({ time, available: false })), closed: true });
  }

  const bookedTimes = new Set(
    data.map((row) => row.appointment_time.slice(0, 5)) // "08:00:00" -> "08:00"
  );

  const shopNow = getShopNow();
  const isToday = date === shopNow.date;

  const slots = ALL_SLOTS.map((time) => ({
    time,
    available: !bookedTimes.has(time) && (!isToday || time > shopNow.time) && !isTimeClosed(time, closures),
  }));

  return res.status(200).json({ slots, closed: false });
}
