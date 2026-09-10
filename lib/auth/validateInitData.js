import crypto from 'crypto';

// Shared implementation of the Telegram Mini Apps "initData" signature check
// (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
// MAX Mini Apps use the identical scheme with their own bot token, per the
// app's auth spec, so both platforms reuse this one function.
//
//   secret_key = HMAC_SHA256(key = "WebAppData", message = botToken)
//   hash       = HMAC_SHA256(key = secret_key,   message = data_check_string)
//
// data_check_string is every "key=value" pair from initData (except "hash"),
// sorted alphabetically by key and joined with "\n".
export function validateInitData(initDataRaw, botToken, { maxAgeSeconds = 24 * 60 * 60 } = {}) {
  if (!initDataRaw || !botToken) return { valid: false, reason: 'missing_input' };

  const params = new URLSearchParams(initDataRaw);
  const hash = params.get('hash');
  if (!hash) return { valid: false, reason: 'no_hash' };
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const providedHashBuf = Buffer.from(hash, 'hex');
  const computedHashBuf = Buffer.from(computedHash, 'hex');
  const validSignature =
    providedHashBuf.length === computedHashBuf.length &&
    crypto.timingSafeEqual(providedHashBuf, computedHashBuf);

  if (!validSignature) return { valid: false, reason: 'bad_signature' };

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate)) return { valid: false, reason: 'no_auth_date' };
  const ageSeconds = Date.now() / 1000 - authDate;
  if (ageSeconds > maxAgeSeconds) return { valid: false, reason: 'expired' };

  let user = null;
  const userRaw = params.get('user');
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      return { valid: false, reason: 'bad_user_json' };
    }
  }

  return { valid: true, user, authDate };
}
