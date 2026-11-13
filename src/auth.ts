// Minimal authentication helpers.
//
// The lab needs *identities* so that "editing someone else's profile" is a
// meaningful action. It is NOT a lesson in password storage, so this stays
// deliberately small: a salted SHA-256 using Node's built-in crypto. Do NOT
// copy this into a real application — use argon2id or bcrypt there.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string, salt?: string): string {
  const useSalt = salt ?? randomBytes(16).toString('hex');
  const digest = createHash('sha256').update(`${useSalt}:${password}`).digest('hex');
  return `${useSalt}:${digest}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt] = stored.split(':');
  if (!salt) return false;
  const candidate = hashPassword(password, salt);
  const a = Buffer.from(candidate);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}
