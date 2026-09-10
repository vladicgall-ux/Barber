import { handleIncomingMessage } from '../../../lib/bot/handleIncomingMessage';
import { makeTelegramSender, telegramRequestContactKeyboard } from '../../../lib/bot/telegramApi';

// POST /api/bot/telegram-webhook
// Set with: https://api.telegram.org/bot<TOKEN>/setWebhook
//   ?url=<this endpoint>&secret_token=<TELEGRAM_WEBHOOK_SECRET>
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const gotSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (gotSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
  }

  const message = req.body?.message;
  if (!message) return res.status(200).json({ ok: true });

  const chatId = message.chat?.id;
  const platformUserId = message.from?.id;
  if (!chatId || !platformUserId) return res.status(200).json({ ok: true });

  const send = makeTelegramSender(chatId);

  try {
    await handleIncomingMessage({
      platform: 'telegram',
      platformUserId,
      firstName: message.from?.first_name,
      lastName: message.from?.last_name,
      text: message.text,
      contactPhone: message.contact?.phone_number,
      send,
      requestContactKeyboard: telegramRequestContactKeyboard,
    });
  } catch (e) {
    console.error('Telegram webhook error', e);
  }

  return res.status(200).json({ ok: true });
}
