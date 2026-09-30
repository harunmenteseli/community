import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('siniflari birlestirir', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('kosullu degerleri ele alir', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('cakisan tailwind siniflarini son olana gore birlestirir', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('cakismayan siniflari korur', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
  });

  it('dizi ve nesne girdilerini destekler', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });

  it('bos girdide bos metin doner', () => {
    expect(cn()).toBe('');
  });
});
