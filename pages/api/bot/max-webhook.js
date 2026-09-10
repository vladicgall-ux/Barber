import { handleIncomingMessage } from '../../../lib/bot/handleIncomingMessage';
import { makeMaxSender, maxRequestContactKeyboard } from '../../../lib/bot/maxApi';

// POST /api/bot/max-webhook?secret=<MAX_WEBHOOK_SECRET>
// Assumes an update shape mirroring Telegram's { message: {...} } — adjust
// the field access below once MAX's actual webhook payload is confirmed.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedSecret = process.env.MAX_WEBHOOK_SECRET;
  if (expectedSecret && req.query.secret !== expectedSecret) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  const message = req.body?.message;
  if (!message) return res.status(200).json({ ok: true });

  const chatId = message.chat?.id;
  const platformUserId = message.from?.id;
  if (!chatId || !platformUserId) return res.status(200).json({ ok: true });

  const send = makeMaxSender(chatId);

  try {
    await handleIncomingMessage({
      platform: 'max',
      platformUserId,
      firstName: message.from?.first_name,
      lastName: message.from?.last_name,
      text: message.text,
      contactPhone: message.contact?.phone_number,
      send,
      requestContactKeyboard: maxRequestContactKeyboard,
    });
  } catch (e) {
    console.error('MAX webhook error', e);
  }

  return res.status(200).json({ ok: true });
}
