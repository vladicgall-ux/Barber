import { confirmAppointment } from '../../../lib/appointments/confirmAppointment';
import { cancelAppointment } from '../../../lib/appointments/cancelAppointment';
import { answerVkMessageEvent, clearVkMessageKeyboard } from '../../../lib/notify';
import { getAdminScope } from '../../../lib/auth/requireActiveUser';
import { makeVkSender } from '../../../lib/bot/vkApi';
import { handleIncomingMessage } from '../../../lib/bot/handleIncomingMessage';

// POST /api/bot/vk-webhook
// Set as the community's Callback API server URL:
//   Управление сообществом → Настройки → Работа с API → Callback API
// VK first sends a { type: "confirmation" } request that must be answered
// with the exact "Строка подтверждения" shown on that page (VK_CALLBACK_CONFIRMATION)
// as plain text — not JSON.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method not allowed');
  }

  const body = req.body || {};

  if (body.type === 'confirmation') {
    const confirmation = process.env.VK_CALLBACK_CONFIRMATION;
    if (!confirmation) return res.status(500).end('VK_CALLBACK_CONFIRMATION is not set');
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(confirmation);
  }

  const expectedSecret = process.env.VK_CALLBACK_SECRET;
  if (!expectedSecret) {
    // Never silently accept unauthenticated events in production — but VK
    // still needs a 200 "ok" response even when we're ignoring everything,
    // or it retries the same event forever.
    if (process.env.NODE_ENV === 'production') {
      console.error('VK_CALLBACK_SECRET is not set in production — ignoring all events');
      return res.status(200).end('ok');
    }
  } else if (body.secret !== expectedSecret) {
    return res.status(200).end('ok');
  }

  if (body.type === 'message_event') {
    await handleMessageEvent(body.object || {}).catch((e) => console.error('VK message_event error', e));
  }

  if (body.type === 'message_new') {
    await handleMessageNew(body.object?.message || {}).catch((e) => console.error('VK message_new error', e));
  }

  // VK requires a plain "ok" body for every event type it knows we handled.
  return res.status(200).end('ok');
}

// Handles a plain text message to the community — the browser "enter this
// code" login flow (see lib/bot/handleIncomingMessage.js). VK has no
// "share contact" button like Telegram/MAX, so phone confirmation for VK
// users only happens through the Mini App (VKWebAppGetPhoneNumber).
async function handleMessageNew(message) {
  const peerId = message.peer_id;
  const fromId = message.from_id;
  if (!peerId || !fromId) return;

  await handleIncomingMessage({
    platform: 'vk',
    platformUserId: fromId,
    text: message.text,
    send: makeVkSender(peerId),
    requestContactKeyboard: () => undefined,
  });
}

const CALLBACK_ACTIONS = {
  confirm: { run: confirmAppointment, successText: 'Запись подтверждена ✅' },
  cancel: { run: cancelAppointment, successText: 'Запись отменена ❌' },
};

// Handles a press on the "✅ Подтвердить" / "❌ Отменить" inline keyboard
// button attached to the admin notification message.
async function handleMessageEvent(object) {
  const { user_id: userId, peer_id: peerId, event_id: eventId, conversation_message_id: messageId } = object;

  let payload = object.payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }

  const action = payload && CALLBACK_ACTIONS[payload.action];
  if (!action || !payload.id) {
    return answerVkMessageEvent({ eventId, userId, peerId, text: '' });
  }

  const { isAdmin, adminMasterId } = await getAdminScope(userId);
  if (!isAdmin) {
    return answerVkMessageEvent({ eventId, userId, peerId, text: 'Только администратор может управлять записями' });
  }

  let appointment;
  try {
    appointment = await action.run(payload.id, adminMasterId);
  } catch (e) {
    console.error(`${payload.action}Appointment error`, e);
    return answerVkMessageEvent({ eventId, userId, peerId, text: 'Ошибка. Попробуйте ещё раз.' });
  }

  if (!appointment) {
    return answerVkMessageEvent({ eventId, userId, peerId, text: 'Запись не найдена или уже отменена' });
  }

  await answerVkMessageEvent({ eventId, userId, peerId, text: action.successText });
  if (peerId && messageId) {
    await clearVkMessageKeyboard(peerId, messageId, action.successText);
  }
}
