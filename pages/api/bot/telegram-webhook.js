import { handleIncomingMessage } from '../../../lib/bot/handleIncomingMessage';
import {
  makeTelegramSender,
  telegramRequestContactKeyboard,
  answerTelegramCallback,
  clearTelegramInlineKeyboard,
} from '../../../lib/bot/telegramApi';
import { confirmAppointment } from '../../../lib/appointments/confirmAppointment';
import { isAdminId } from '../../../lib/auth/requireActiveUser';

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

  const callback = req.body?.callback_query;
  if (callback) {
    await handleCallbackQuery(callback).catch((e) => console.error('Telegram callback error', e));
    return res.status(200).json({ ok: true });
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

// Handles the "✅ Подтвердить" inline button on the admin notification.
async function handleCallbackQuery(callback) {
  const data = callback.data || '';
  const chatId = callback.message?.chat?.id;
  const messageId = callback.message?.message_id;
  const fromId = callback.from?.id;

  if (!data.startsWith('confirm:')) {
    return answerTelegramCallback(callback.id);
  }

  if (!isAdminId(fromId)) {
    return answerTelegramCallback(callback.id, 'Только администратор может подтверждать записи');
  }

  const appointmentId = data.slice('confirm:'.length);

  let appointment;
  try {
    appointment = await confirmAppointment(appointmentId);
  } catch (e) {
    console.error('confirmAppointment error', e);
    return answerTelegramCallback(callback.id, 'Ошибка. Попробуйте ещё раз.');
  }

  if (!appointment) {
    return answerTelegramCallback(callback.id, 'Запись не найдена или уже отменена');
  }

  await answerTelegramCallback(callback.id, 'Запись подтверждена ✅');
  if (chatId && messageId) {
    await clearTelegramInlineKeyboard(chatId, messageId);
  }
}
