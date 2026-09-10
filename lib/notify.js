import { supabaseAdmin } from './supabaseAdmin';

// Sends the "new booking" notification to the admin Telegram chat
// and optionally to a VK community, via plain fetch (no extra deps).

function buildAdminNotificationText({ clientName, clientPhone, serviceName, masterName, date, time }) {
  return (
    `💈 *Новая запись — BLACK BEARD*\n\n` +
    `👤 Клиент: ${escapeMd(clientName)}\n` +
    `📞 Телефон: ${escapeMd(clientPhone)}\n` +
    `✂️ Услуга: ${escapeMd(serviceName)}\n` +
    `🧔 Мастер: ${escapeMd(masterName)}\n` +
    `📅 Дата: ${escapeMd(date)}\n` +
    `🕒 Время: ${escapeMd(time)}`
  );
}

function buildAdminInlineKeyboard(appointmentId) {
  if (!appointmentId) return undefined;
  return {
    inline_keyboard: [
      [
        { text: '✅ Подтвердить', callback_data: `confirm:${appointmentId}` },
        { text: '❌ Отменить', callback_data: `cancel:${appointmentId}` },
      ],
    ],
  };
}

// The barbershop's fixed admin group/channel — always gets every booking,
// regardless of which master it's for.
export async function notifyTelegramAdmin(payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;

  await sendTelegramMarkdown(chatId, buildAdminNotificationText(payload), buildAdminInlineKeyboard(payload.appointmentId));
}

// Notifies only the admins scoped to this booking's master — a global admin
// (admin_master_id = null) sees every booking, while an admin assigned to a
// specific master only sees that master's bookings.
export async function notifyMasterAdmins({ masterId, ...payload }) {
  if (!masterId) return;

  const { data: admins, error } = await supabaseAdmin
    .from('users')
    .select('telegram_id, max_id')
    .eq('is_admin', true)
    .or(`admin_master_id.is.null,admin_master_id.eq.${masterId}`);

  if (error) {
    console.error('notifyMasterAdmins query error', error);
    return;
  }

  const text = buildAdminNotificationText(payload);
  const replyMarkup = buildAdminInlineKeyboard(payload.appointmentId);

  await Promise.all(
    (admins || []).map(async (admin) => {
      if (admin.telegram_id) await sendTelegramMarkdown(admin.telegram_id, text, replyMarkup);
      if (admin.max_id) await sendPlainMax(admin.max_id, text.replace(/\\([_*[\]()~`>#+\-=|{}.!])/g, '$1'));
    })
  );
}

async function sendTelegramMarkdown(chatId, text, replyMarkup) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
      reply_markup: replyMarkup,
    }),
  }).catch((e) => {
    console.error('Telegram admin notify network error', e);
    return null;
  });

  if (res && !res.ok) {
    const body = await res.text().catch(() => '');
    console.error('Telegram admin notify failed', res.status, body);
  }
}

export async function notifyVkCommunity({ clientName, clientPhone, serviceName, masterName, date, time }) {
  const token = process.env.VK_GROUP_TOKEN;
  const groupId = process.env.VK_GROUP_ID;
  if (!token || !groupId) return;

  const message =
    `Новая запись — BLACK BEARD\n` +
    `Клиент: ${clientName}\n` +
    `Телефон: ${clientPhone}\n` +
    `Услуга: ${serviceName}\n` +
    `Мастер: ${masterName}\n` +
    `Дата: ${date}\n` +
    `Время: ${time}`;

  const params = new URLSearchParams({
    group_id: groupId,
    message,
    access_token: token,
    v: '5.199',
  });

  const res = await fetch(`https://api.vk.com/method/wall.postToAdmins?${params.toString()}`, {
    method: 'POST',
  }).catch((e) => {
    console.error('VK notify network error', e);
    return null;
  });

  if (res && !res.ok) {
    const body = await res.text().catch(() => '');
    console.error('VK notify failed', res.status, body);
  }
}

function escapeMd(str = '') {
  return String(str).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

// Sends a plain-text message directly to a client, on whichever platform
// they're linked to (Telegram and/or MAX). Plain text (no parse_mode) so a
// stray "-" or "." in a date/name never breaks delivery.
export async function notifyClient({ telegramId, maxId, text }) {
  await Promise.all([
    telegramId ? sendPlainTelegram(telegramId, text) : null,
    maxId ? sendPlainMax(maxId, text) : null,
  ]);
}

async function sendPlainTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch((e) => {
    console.error('Telegram client notify network error', e);
    return null;
  });

  if (res && !res.ok) {
    const body = await res.text().catch(() => '');
    console.error('Telegram client notify failed', res.status, body);
  }
}

async function sendPlainMax(chatId, text) {
  const token = process.env.MAX_BOT_TOKEN;
  const base = process.env.MAX_BOT_API_BASE || 'https://botapi.max.ru';
  if (!token) return;

  const res = await fetch(`${base}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch((e) => {
    console.error('MAX client notify network error', e);
    return null;
  });

  if (res && !res.ok) {
    const body = await res.text().catch(() => '');
    console.error('MAX client notify failed', res.status, body);
  }
}
