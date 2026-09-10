import { supabaseAdmin } from '../supabaseAdmin';
import { notifyClient } from '../notify';

// Cancels a booking and texts the client. Frees the slot immediately —
// the unique index on appointments only applies to status='confirmed'
// rows, so the next availability check / booking attempt sees it as open.
// Shared by the in-app admin panel (POST /api/admin/cancel) and the
// "❌ Отменить" inline button on the Telegram admin notification.
export async function cancelAppointment(appointmentId) {
  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('status', 'confirmed')
    .select(
      `id, appointment_date, appointment_time, status,
       masters ( name ),
       services ( name ),
       users ( telegram_id, max_id )`
    )
    .single();

  if (error) throw error;
  if (!appointment) return null;

  const user = appointment.users;
  if (user && (user.telegram_id || user.max_id)) {
    const text =
      `Ваша запись в BLACK BEARD отменена ❌\n\n` +
      `Услуга: ${appointment.services?.name}\n` +
      `Мастер: ${appointment.masters?.name}\n` +
      `Дата: ${appointment.appointment_date}\n` +
      `Время: ${String(appointment.appointment_time).slice(0, 5)}`;

    await notifyClient({ telegramId: user.telegram_id, maxId: user.max_id, text }).catch((e) =>
      console.error('Client cancel-notify error', e)
    );
  }

  return appointment;
}
