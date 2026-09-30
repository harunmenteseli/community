import { describe, expect, it } from 'vitest';
import { buildPagination, decodeCursor, encodeCursor } from './pagination';

describe('encodeCursor / decodeCursor', () => {
  it('gidis-donus degeri korur', () => {
    const value = { createdAt: new Date('2026-01-02T03:04:05.000Z'), id: 'abc' };
    const decoded = decodeCursor<{ createdAt: Date; id: string }>(encodeCursor(value));

    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe('abc');
    expect(new Date(decoded!.createdAt).toISOString()).toBe('2026-01-02T03:04:05.000Z');
  });

  it('bozuk cursor icin null doner', () => {
    expect(decodeCursor('bu-bir-cursor-degil')).toBeNull();
  });

  it('URL guvenli karakterler uretir', () => {
    const cursor = encodeCursor({ id: 'a?b&c=/+' });

    expect(cursor).not.toMatch(/[?&=+/]/);
  });
});

describe('buildPagination', () => {
  it('limitten az oge geldiyse nextCursor null olur', () => {
    const result = buildPagination([1, 2], { id: '1' }, 5);

    expect(result.items).toEqual([1, 2]);
    expect(result.nextCursor).toBeNull();
  });

  it('limitten fazla oge geldiyse kirpar ve cursor uretir', () => {
    const result = buildPagination([1, 2, 3, 4], { id: '3' }, 3);

    expect(result.items).toEqual([1, 2, 3]);
    expect(result.nextCursor).not.toBeNull();
    expect(decodeCursor<{ id: string }>(result.nextCursor!)).toEqual({ id: '3' });
  });

  it('tam olarak limit kadar oge geldiyse nextCursor null olur', () => {
    expect(buildPagination([1, 2, 3], { id: '3' }, 3).nextCursor).toBeNull();
  });
});
