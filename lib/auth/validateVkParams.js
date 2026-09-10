import crypto from 'crypto';

// Verifies VK Mini Apps launch parameters per VK's documented algorithm
// (https://dev.vk.com/mini-apps/development/launch-params#Проверка-launch-параметров):
//
//   sign = base64url( HMAC_SHA256(key = VK_APP_SECRET, message = sortedVkParams) )
//
// sortedVkParams is every "vk_*" query param, sorted alphabetically by key
// and joined as "key=value&key=value...". base64url means standard base64
// with "+" -> "-", "/" -> "_", and the trailing "=" padding stripped.
export function validateVkParams(queryString, secret, { maxAgeSeconds = 24 * 60 * 60 } = {}) {
  if (!queryString || !secret) return { valid: false, reason: 'missing_input' };

  const params = new URLSearchParams(queryString);
  const sign = params.get('sign');
  if (!sign) return { valid: false, reason: 'no_sign' };

  const vkEntries = [...params.entries()]
    .filter(([key]) => key.startsWith('vk_'))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const dataCheckString = vkEntries.map(([key, value]) => `${key}=${value}`).join('&');

  const computedSign = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const providedBuf = Buffer.from(sign);
  const computedBuf = Buffer.from(computedSign);
  const validSignature =
    providedBuf.length === computedBuf.length && crypto.timingSafeEqual(providedBuf, computedBuf);

  if (!validSignature) return { valid: false, reason: 'bad_signature' };

  const tsRaw = params.get('vk_ts');
  const ts = Number(tsRaw);
  if (Number.isFinite(ts)) {
    const ageSeconds = Date.now() / 1000 - ts;
    if (ageSeconds > maxAgeSeconds) return { valid: false, reason: 'expired' };
  }

  const vkUserId = params.get('vk_user_id');
  if (!vkUserId) return { valid: false, reason: 'no_user_id' };

  return { valid: true, vkUserId };
}
