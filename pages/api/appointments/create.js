import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { notifyTelegramAdmin, notifyMasterAdmins, notifyVkCommunity } from '../../../lib/notify';
import { getSessionUser } from '../../../lib/auth/session';
import { getActiveUserStatus } from '../../../lib/auth/requireActiveUser';
import { getShopNow } from '../../../lib/timeSlots';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getSessionUser(req);
  const { active, reason } = getActiveUserStatus(user);
  if (!active) {
    return res.status(403).json({ error: activeErrorMessage(reason), reason });
  }

  const { masterId, serviceId, date, time, clientName, clientPhone, source } = req.body || {};

  if (!masterId || !serviceId || !date || !time || !clientName || !clientPhone) {
    return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
  }
  if (!/^[0-9a-f-]{36}$/i.test(masterId)) {
    return res.status(400).json({ error: 'Некорректный мастер' });
  }

  if (String(clientName).trim().length < 2) {
    return res.status(400).json({ error: 'Некорректное имя' });
  }
  const phoneDigits = String(clientPhone).replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    return res.status(400).json({ error: 'Некорректный номер телефона' });
  }

  const shopNow = getShopNow();
  if (date < shopNow.date || (date === shopNow.date && time <= shopNow.time)) {
    return res.status(400).json({ error: 'Это время уже прошло. Пожалуйста, выберите другое.' });
  }

  const { data: closures, error: closuresErr } = await supabaseAdmin
    .from('closed_dates')
    .select('id')
    .eq('date', date)
    .or(`master_id.is.null,master_id.eq.${masterId}`);
  if (closuresErr) return res.status(500).json({ error: closuresErr.message });
  if (closures && closures.length > 0) {
    return res.status(400).json({ error: 'В этот день барбершоп не работает. Пожалуйста, выберите другую дату.' });
  }

  // Fetch master & service names for the notification.
  const [{ data: master, error: masterErr }, { data: service, error: serviceErr }] = await Promise.all([
    supabaseAdmin.from('masters').select('name').eq('id', masterId).single(),
    supabaseAdmin.from('services').select('name').eq('id', serviceId).single(),
  ]);

  if (masterErr || !master) return res.status(400).json({ error: 'Мастер не найден' });
  if (serviceErr || !service) return res.status(400).json({ error: 'Услуга не найдена' });

  const { data: appointment, error: insertErr } = await supabaseAdmin
    .from('appointments')
    .insert({
      master_id: masterId,
      service_id: serviceId,
      user_id: user.id,
      client_name: String(clientName).trim(),
      client_phone: String(clientPhone).trim(),
      appointment_date: date,
      appointment_time: time,
      source: source || 'web',
      status: 'confirmed',
    })
    .select()
    .single();

  if (insertErr) {
    // Unique constraint violation => slot was just taken by someone else.
    if (insertErr.code === '23505') {
      return res.status(409).json({ error: 'Это время уже занято. Пожалуйста, выберите другое.' });
    }
    return res.status(500).json({ error: insertErr.message });
  }

  const payload = {
    appointmentId: appointment.id,
    masterId,
    clientName: appointment.client_name,
    clientPhone: appointment.client_phone,
    serviceName: service.name,
    masterName: master.name,
    date: appointment.appointment_date,
    time: String(appointment.appointment_time).slice(0, 5),
  };

  // Vercel serverless functions can freeze right after the response is
  // sent, so a true "fire-and-forget" background call may never finish —
  // await the notifications (each already catches its own errors) before
  // responding.
  await Promise.all([
    notifyTelegramAdmin(payload),
    notifyMasterAdmins(payload),
    notifyVkCommunity(payload),
  ]).catch((e) => console.error('Notification error', e));

  return res.status(201).json({ appointment });
}

function activeErrorMessage(reason) {
  switch (reason) {
    case 'not_authenticated':
      return 'Войдите в приложение, чтобы записаться на услугу.';
    case 'banned':
      return 'Ваш аккаунт заблокирован администратором.';
    case 'phone_not_confirmed':
      return 'Подтвердите номер телефона через бота, чтобы записаться.';
    case 'name_missing':
      return 'Укажите имя и фамилию через бота, чтобы записаться.';
    default:
      return 'Запись недоступна.';
  }
}
