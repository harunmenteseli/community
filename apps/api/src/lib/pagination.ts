export interface Cursor<T> {
  items: T[];
  nextCursor: string | null;
}

export function encodeCursor(value: Record<string, string | number | Date>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function decodeCursor<T extends Record<string, unknown>>(cursor: string): T | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

export function buildPagination<T>(
  items: T[],
  cursorKey: Record<string, string | number | Date>,
  limit: number,
): Cursor<T> {
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? encodeCursor(cursorKey) : null;
  return { items: page, nextCursor };
}