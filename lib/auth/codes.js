import crypto from 'crypto';

export const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function generateSixDigitCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export function generatePollToken() {
  return crypto.randomBytes(32).toString('hex');
}
