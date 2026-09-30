import { describe, expect, it } from 'vitest';
import {
  POST_CATEGORIES,
  POST_CATEGORY_LABELS,
  POST_CONTENT_MAX,
  POST_GAMES,
  POST_GAME_LABELS,
  createCommentSchema,
  createPostSchema,
  loginSchema,
  registerSchema,
  updatePostSchema,
} from './schemas';

describe('sabitler', () => {
  it('her kategori icin etiket tanimli', () => {
    for (const category of POST_CATEGORIES) {
      expect(POST_CATEGORY_LABELS[category]).toBeTruthy();
    }
  });

  it('her oyun icin etiket tanimli', () => {
    for (const game of POST_GAMES) {
      expect(POST_GAME_LABELS[game]).toBeTruthy();
    }
  });
});

describe('loginSchema', () => {
  it('gecerli girisleri kabul eder ve emaili normalize eder', () => {
    const result = loginSchema.parse({ email: '  TEST@Ornek.COM ', password: 'parola123' });

    expect(result.email).toBe('test@ornek.com');
  });

  it('kisa sifreyi reddeder', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'kisa' }).success).toBe(false);
  });

  it('gecersiz emaili reddeder', () => {
    expect(loginSchema.safeParse({ email: 'gecersiz', password: 'parola123' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = {
    email: 'yeni@ornek.com',
    password: 'parola123',
    name: 'Test Kullanici',
    username: 'test_user',
  };

  it('gecerli kaydi kabul eder', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('bilinmeyen alanlari reddeder', () => {
    expect(registerSchema.safeParse({ ...valid, rol: 'admin' }).success).toBe(false);
  });

  it('rakam ve alt cizgi disi karakterli username reddeder', () => {
    expect(registerSchema.safeParse({ ...valid, username: 'test user' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, username: 'ab' }).success).toBe(false);
  });
});

describe('createPostSchema', () => {
  const valid = { content: 'Icerik', category: 'soru' as const };

  it('isDraft varsayilani false', () => {
    expect(createPostSchema.parse(valid).isDraft).toBe(false);
  });

  it('bilinmeyen kategori reddeder', () => {
    expect(createPostSchema.safeParse({ ...valid, category: 'oyun' }).success).toBe(false);
  });

  it('maksimum icerik sinirini uygular', () => {
    expect(createPostSchema.safeParse({ ...valid, content: 'a'.repeat(POST_CONTENT_MAX + 1) }).success).toBe(false);
  });

  it('gorsel sayisini sinirlar', () => {
    const images = Array.from({ length: 6 }, (_, i) => `https://ornek.com/${i}.png`);

    expect(createPostSchema.safeParse({ ...valid, images }).success).toBe(false);
  });

  it('anket icin en az iki secenek ister', () => {
    const poll = { question: 'Hangisi?', options: [{ text: 'Sadece biri' }] };

    expect(createPostSchema.safeParse({ ...valid, poll }).success).toBe(false);
  });

  it('gecerli ankete izin verir', () => {
    const poll = { question: 'Hangisi?', options: [{ text: 'A' }, { text: 'B' }] };

    expect(createPostSchema.safeParse({ ...valid, poll }).success).toBe(true);
  });
});

describe('updatePostSchema', () => {
  it('bos guncellemeyi kabul eder (tum alanlar opsiyonel)', () => {
    expect(updatePostSchema.safeParse({}).success).toBe(true);
  });

  it('isDraft alanini kabul etmez', () => {
    expect(updatePostSchema.safeParse({ isDraft: true }).success).toBe(false);
  });

  it('id alanini kabul etmez', () => {
    expect(updatePostSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(false);
  });

  it('gecerli alanlari gunceller', () => {
    expect(updatePostSchema.safeParse({ content: 'Yeni icerik' }).success).toBe(true);
  });
});

describe('createCommentSchema', () => {
  it('gecerli yorumu kabul eder', () => {
    const postId = '550e8400-e29b-41d4-a716-446655440000';

    expect(createCommentSchema.safeParse({ postId, content: 'Yorum' }).success).toBe(true);
  });

  it('gecersiz uuid reddeder', () => {
    expect(createCommentSchema.safeParse({ postId: 'uuid-degil', content: 'Yorum' }).success).toBe(false);
  });

  it('bos yorumu reddeder', () => {
    const postId = '550e8400-e29b-41d4-a716-446655440000';

    expect(createCommentSchema.safeParse({ postId, content: '   ' }).success).toBe(false);
  });
});
