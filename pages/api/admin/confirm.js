import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/auth/requireAdmin';
import { notifyClient } from '../../../lib/notify';

// POST /api/admin/confirm { appointmentId }
// Marks a booking as confirmed by the barber and notifies the client.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(403).json({ error: 'Доступно только администратору' });
  }

  const { appointmentId } = req.body || {};
  if (!appointmentId) {
    return res.status(400).json({ error: 'appointmentId is required' });
  }

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .update({ admin_confirmed: true })
    .eq('id', appointmentId)
    .eq('status', 'confirmed')
    .select(
      `id, appointment_date, appointment_time, status, admin_confirmed,
       masters ( name ),
       services ( name ),
       users ( telegram_id, max_id )`
    )
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!appointment) return res.status(404).json({ error: 'Запись не найдена или отменена' });

  const user = appointment.users;
  if (user && (user.telegram_id || user.max_id)) {
    const text =
      `Ваша запись в BLACK BEARD подтверждена ✅\n\n` +
      `Услуга: ${appointment.services?.name}\n` +
      `Мастер: ${appointment.masters?.name}\n` +
      `Дата: ${appointment.appointment_date}\n` +
      `Время: ${String(appointment.appointment_time).slice(0, 5)}`;

    await notifyClient({ telegramId: user.telegram_id, maxId: user.max_id, text }).catch((e) =>
      console.error('Client confirm-notify error', e)
    );
  }

  return res.status(200).json({ appointment });
}
