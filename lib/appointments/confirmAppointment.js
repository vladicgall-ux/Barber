import { supabaseAdmin } from '../supabaseAdmin';
import { notifyClient } from '../notify';

// Marks a booking as confirmed by the barber and texts the client.
// Shared by the in-app admin panel (POST /api/admin/confirm) and the
// "Подтвердить" inline button on the Telegram admin notification.
export async function confirmAppointment(appointmentId) {
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

  if (error) throw error;
  if (!appointment) return null;

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

  return appointment;
}
