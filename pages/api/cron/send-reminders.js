import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { notifyClient } from '../../../lib/notify';

// POST /api/cron/send-reminders
// Called on a schedule (see supabase pg_cron job) — finds confirmed
// appointments starting in about an hour and haven't been reminded yet,
// texts the client, and marks them as reminded so they're never repeated.
//
// Protected by a shared secret rather than session auth, since the caller
// is Postgres (pg_net), not a browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!secret || provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: candidates, error } = await supabaseAdmin
    .from('appointments')
    .select(
      `id, appointment_date, appointment_time,
       masters ( name ),
       services ( name ),
       users ( telegram_id, max_id )`
    )
    .eq('status', 'confirmed')
    .eq('reminder_sent', false);

  if (error) return res.status(500).json({ error: error.message });

  const now = Date.now();
  const due = (candidates || []).filter((a) => {
    // Kunashak/Chelyabinsk region is a fixed UTC+5 offset (no DST).
    const apptTime = new Date(`${a.appointment_date}T${String(a.appointment_time).slice(0, 5)}:00+05:00`).getTime();
    const minutesUntil = (apptTime - now) / 60000;
    return minutesUntil <= 65 && minutesUntil >= 50;
  });

  let sent = 0;
  for (const appointment of due) {
    const user = appointment.users;
    if (user && (user.telegram_id || user.max_id)) {
      const text =
        `Напоминание: через час у вас запись в BLACK BEARD ✂️\n\n` +
        `Услуга: ${appointment.services?.name}\n` +
        `Мастер: ${appointment.masters?.name}\n` +
        `Время: ${String(appointment.appointment_time).slice(0, 5)}`;

      await notifyClient({ telegramId: user.telegram_id, maxId: user.max_id, text }).catch((e) =>
        console.error('Reminder notify error', e)
      );
      sent += 1;
    }

    await supabaseAdmin.from('appointments').update({ reminder_sent: true }).eq('id', appointment.id);
  }

  return res.status(200).json({ checked: candidates?.length || 0, due: due.length, sent });
}
