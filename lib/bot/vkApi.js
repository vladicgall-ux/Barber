// VK community ("group") messaging — VK's rough equivalent of a Telegram
// bot: the community can message a user directly (once the user has
// allowed it / opened the Mini App), including inline "callback" keyboard
// buttons that trigger a Callback API event instead of a visible reply.

const VK_API_BASE = 'https://api.vk.com/method';
const VK_API_VERSION = '5.199';

async function callVk(method, params) {
  const token = process.env.VK_GROUP_TOKEN;
  if (!token) return null;

  const body = new URLSearchParams({
    ...params,
    access_token: token,
    v: VK_API_VERSION,
  });

  const res = await fetch(`${VK_API_BASE}/${method}`, { method: 'POST', body }).catch((e) => {
    console.error(`VK ${method} network error`, e);
    return null;
  });
  if (!res) return null;

  const data = await res.json().catch(() => null);
  if (data?.error) {
    console.error(`VK ${method} failed`, data.error);
    return null;
  }
  return data?.response ?? null;
}

export function buildVkConfirmKeyboard(appointmentId) {
  return {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'callback',
            label: '✅ Подтвердить',
            payload: JSON.stringify({ action: 'confirm', id: appointmentId }),
          },
          color: 'positive',
        },
        {
          action: {
            type: 'callback',
            label: '❌ Отменить',
            payload: JSON.stringify({ action: 'cancel', id: appointmentId }),
          },
          color: 'negative',
        },
      ],
    ],
  };
}

// Sends a message from the community to a specific VK user (peer_id = their
// user id). The user must have allowed community messages first (they get
// prompted automatically the first time they open the Mini App, or can
// message the community themselves).
export async function sendVkMessage(userId, text, keyboard) {
  return callVk('messages.send', {
    peer_id: String(userId),
    message: text,
    random_id: String(Math.floor(Math.random() * 2 ** 31)),
    ...(keyboard ? { keyboard: JSON.stringify(keyboard) } : {}),
  });
}

// Adapts sendVkMessage to the `send(text, { replyMarkup })` shape
// lib/bot/handleIncomingMessage.js expects (same shape as the Telegram/MAX
// senders), so the same conversational logic can drive a VK dialog too.
export function makeVkSender(peerId) {
  return async function send(text, { replyMarkup } = {}) {
    await sendVkMessage(peerId, text, replyMarkup);
  };
}

// Closes the loading spinner on a callback button; `text` pops up as a
// small snackbar in the VK client.
export async function answerVkMessageEvent({ eventId, userId, peerId, text }) {
  return callVk('messages.sendMessageEventAnswer', {
    event_id: eventId,
    user_id: String(userId),
    peer_id: String(peerId),
    event_data: JSON.stringify({ type: 'show_snackbar', text: text || '' }),
  });
}

// Removes the inline keyboard from a message once its action has been
// handled (mirrors clearTelegramInlineKeyboard).
export async function clearVkMessageKeyboard(peerId, conversationMessageId, text) {
  return callVk('messages.edit', {
    peer_id: String(peerId),
    conversation_message_id: String(conversationMessageId),
    message: text,
    keyboard: JSON.stringify({ inline: true, buttons: [] }),
  });
}
