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

  return res.status(201).json({
    code,
    pollToken,
    expiresInSeconds: Math.floor(CODE_TTL_MS / 1000),
    telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || null,
    maxBotUsername: process.env.MAX_BOT_USERNAME || null,
  });
}
