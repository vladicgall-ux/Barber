// Sends the "new booking" notification to the admin Telegram chat
// and optionally to a VK community, via plain fetch (no extra deps).

export async function notifyTelegramAdmin({ clientName, clientPhone, serviceName, masterName, date, time }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;

  const text =
    `💈 *Новая запись — BLACK BEARD*\n\n` +
    `👤 Клиент: ${escapeMd(clientName)}\n` +
    `📞 Телефон: ${escapeMd(clientPhone)}\n` +
    `✂️ Услуга: ${escapeMd(serviceName)}\n` +
    `🧔 Мастер: ${escapeMd(masterName)}\n` +
    `📅 Дата: ${date}\n` +
    `🕒 Время: ${time}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('Telegram notify failed', res.status, body);
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
