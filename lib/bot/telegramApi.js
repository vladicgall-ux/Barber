export function makeTelegramSender(chatId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return async function send(text, { replyMarkup } = {}) {
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
      }),
    }).catch((e) => console.error('Telegram sendMessage failed', e));
  };
}

export function telegramRequestContactKeyboard() {
  return {
    keyboard: [[{ text: 'Поделиться номером телефона', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}
