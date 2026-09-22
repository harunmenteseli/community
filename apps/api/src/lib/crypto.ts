import { createHash, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../env';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function calculateTokenExpiry(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function signSessionHash(userId: string, tokenHash: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(`${userId}.${tokenHash}`).digest('hex');
}

export function verifySessionSignature(userId: string, tokenHash: string, signature: string): boolean {
  const expected = signSessionHash(userId, tokenHash);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}