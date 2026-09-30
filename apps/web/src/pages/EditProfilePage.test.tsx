import { describe, expect, it } from 'vitest';
import { parseTools } from './EditProfilePage';

describe('parseTools', () => {
  it('virgülle ayrılmış metni listeye çevirir', () => {
    expect(parseTools('React, TypeScript ,  Drizzle')).toEqual(['React', 'TypeScript', 'Drizzle']);
  });

  it('büyük/küçük harf farkını yok sayarak tekillestirir', () => {
    expect(parseTools('React, react, REACT')).toEqual(['React']);
  });

  it('boş girdide boş liste döner', () => {
    expect(parseTools('')).toEqual([]);
    expect(parseTools(' , , ')).toEqual([]);
  });

  it('en fazla 20 kayıt tutar', () => {
    const many = Array.from({ length: 30 }, (_, i) => `tool-${i}`);
    expect(parseTools(many.join(', '))).toHaveLength(20);
  });
});
