import { describe, expect, it } from 'vitest';
import { calculateTokenExpiry, generateToken, hashToken, signSessionHash, verifySessionSignature } from './crypto';

describe('hashToken', () => {
  it('ayni token icin ayni hash uretir', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('farkli token icin farkli hash uretir', () => {
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });

  it('64 karakterlik sha256 hex uretir', () => {
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generateToken', () => {
  it('URL guvenli karakterler uretir', () => {
    expect(generateToken()).not.toMatch(/[+/=]/);
  });

  it('varsayilan 32 bayt uretir (base64url -> 43 karakter)', () => {
    expect(generateToken()).toHaveLength(43);
  });

  it('cagirdikca farkli deger uretir', () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

describe('calculateTokenExpiry', () => {
  it('gun sayisini ileriye ekler', () => {
    const before = Date.now();
    const expiry = calculateTokenExpiry(7).getTime();

    expect(expiry).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000 - 1000);
  });
});

describe('signSessionHash / verifySessionSignature', () => {
  it('dogru imzayi dogrular', () => {
    const userId = 'user-1';
    const tokenHash = hashToken('token');
    const signature = signSessionHash(userId, tokenHash);

    expect(verifySessionSignature(userId, tokenHash, signature)).toBe(true);
  });

  it('farkli userId ile dogrulamaz', () => {
    const tokenHash = hashToken('token');
    const signature = signSessionHash('user-1', tokenHash);

    expect(verifySessionSignature('user-2', tokenHash, signature)).toBe(false);
  });

  it('farkli tokenHash ile dogrulamaz', () => {
    const signature = signSessionHash('user-1', hashToken('token-a'));

    expect(verifySessionSignature('user-1', hashToken('token-b'), signature)).toBe(false);
  });

  it('bozuk imzayi dogrulamaz', () => {
    expect(verifySessionSignature('user-1', hashToken('token'), 'bozuk')).toBe(false);
  });
});
