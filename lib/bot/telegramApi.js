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

// Closes the loading spinner on an inline button press; `text` (if given)
// pops up as a small toast in the Telegram client.
export async function answerTelegramCallback(callbackQueryId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  }).catch((e) => console.error('Telegram answerCallbackQuery failed', e));
}

// Removes the inline keyboard from a message once its action has been
// handled (e.g. the "Подтвердить" button after the booking is confirmed).
export async function clearTelegramInlineKeyboard(chatId, messageId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
  }).catch((e) => console.error('Telegram editMessageReplyMarkup failed', e));
}
