// NOTE: MAX's Bot API endpoint/payload shape isn't finalized here — adjust
// MAX_BOT_API_BASE and the request body below to match MAX's actual docs
// once available. It's written to mirror the Telegram Bot API shape, since
// MAX's Mini App platform already mirrors Telegram's initData signing scheme.
const DEFAULT_BASE = 'https://botapi.max.ru';

export function makeMaxSender(chatId) {
  const token = process.env.MAX_BOT_TOKEN;
  const base = process.env.MAX_BOT_API_BASE || DEFAULT_BASE;
  return async function send(text, { replyMarkup } = {}) {
    if (!token) return;
    await fetch(`${base}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
      }),
    }).catch((e) => console.error('MAX sendMessage failed', e));
  };
}

export function maxRequestContactKeyboard() {
  return {
    keyboard: [[{ text: 'Поделиться номером телефона', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}
