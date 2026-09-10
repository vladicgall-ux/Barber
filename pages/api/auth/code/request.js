import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { generateSixDigitCode, generatePollToken, CODE_TTL_MS } from '../../../../lib/auth/codes';

// POST /api/auth/code/request
// Issues a fresh 6-digit code the browser shows to the user, plus a
// pollToken only this browser knows. The user sends the code to the bot
// (Telegram or MAX); the bot webhook then claims it by poll_token-free
// lookup on the code value itself.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = generateSixDigitCode();
  const pollToken = generatePollToken();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from('auth_codes').insert({
    code,
    poll_token: pollToken,
    status: 'pending',
    expires_at: expiresAt,
  });

  if (error) return res.status(500).json({ error: error.message });

  const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME || null;
  const maxBotUsername = process.env.MAX_BOT_USERNAME || null;
  const vkGroupId = process.env.VK_GROUP_ID || null;

  return res.status(201).json({
    code,
    pollToken,
    expiresInSeconds: Math.floor(CODE_TTL_MS / 1000),
    telegramBotUsername,
    maxBotUsername,
    // Deep links so "Open chat" can skip the copy-paste step. Telegram's
    // ?start=<code> is documented and real; MAX's is a best-effort guess
    // (assumed to mirror Telegram, per the rest of the MAX integration) —
    // worst case it just opens the chat and the user pastes the code.
    telegramChatUrl: telegramBotUsername ? `https://t.me/${telegramBotUsername}?start=${code}` : null,
    maxChatUrl: maxBotUsername ? `https://max.ru/${maxBotUsername}?start=${code}` : null,
    // VK has no prefilled-message deep link for community dialogs, so this
    // just opens the chat — the user pastes the code themselves.
    vkChatUrl: vkGroupId ? `https://vk.com/write-${vkGroupId}` : null,
  });
}
