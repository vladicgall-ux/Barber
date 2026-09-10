import { supabaseAdmin } from '../../lib/supabaseAdmin';

// GET /api/closed-dates?masterId=...
// Public: returns the dates fully closed for this master (whole-day
// closures only — shop-wide + this master's own) so the Calendar can grey
// them out entirely. Partial-day closures (a specific time window) don't
// block the whole date; those are enforced by /api/availability instead,
// which leaves the rest of that day's slots bookable.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { masterId } = req.query;
  const isValidUuid = typeof masterId === 'string' && /^[0-9a-f-]{36}$/i.test(masterId);

  let query = supabaseAdmin
    .from('closed_dates')
    .select('date, master_id')
    .is('start_time', null)
    .is('end_time', null);

  if (isValidUuid) {
    query = query.or(`master_id.is.null,master_id.eq.${masterId}`);
  } else {
    query = query.is('master_id', null);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const dates = [...new Set((data || []).map((row) => row.date))];
  return res.status(200).json({ dates });
}
