import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { ALL_SLOTS, getShopNow } from '../../lib/timeSlots';

// GET /api/availability?masterId=...&date=YYYY-MM-DD
// Returns all slots + which ones are already booked (confirmed) for that master/date.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { masterId, date } = req.query;
  if (!masterId || !date) {
    return res.status(400).json({ error: 'masterId and date are required' });
  }

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('appointment_time')
    .eq('master_id', masterId)
    .eq('appointment_date', date)
    .eq('status', 'confirmed');

  if (error) return res.status(500).json({ error: error.message });

  const bookedTimes = new Set(
    data.map((row) => row.appointment_time.slice(0, 5)) // "08:00:00" -> "08:00"
  );

  const shopNow = getShopNow();
  const isToday = date === shopNow.date;

  const slots = ALL_SLOTS.map((time) => ({
    time,
    available: !bookedTimes.has(time) && (!isToday || time > shopNow.time),
  }));

  return res.status(200).json({ slots });
}
