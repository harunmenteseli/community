import { describe, expect, it } from 'vitest';
import { AppError, errors, isForeignKeyViolation, isUniqueViolation } from './errors';

describe('errors', () => {
  it('dogru statusCode ve code ile AppError uretir', () => {
    const err = errors.badRequest('Girdi hatali');

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Girdi hatali');
  });

  it('ozel code verilirse onu kullanir', () => {
    expect(errors.conflict('Post zaten var', 'DUPLICATE_POST').code).toBe('DUPLICATE_POST');
  });

  it('varsayilan mesajlari kullanir', () => {
    expect(errors.notFound().message).toBe('Kayıt bulunamadı');
    expect(errors.unauthorized().statusCode).toBe(401);
    expect(errors.forbidden().statusCode).toBe(403);
  });

  it('name degeri her zaman AppError olur', () => {
    expect(errors.internal().name).toBe('AppError');
  });
});

describe('isUniqueViolation', () => {
  it('23505 kodunu yakalar', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
  });

  it('diger kodlari ve ilgisiz degerleri reddeder', () => {
    expect(isUniqueViolation({ code: '23503' })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation('23505')).toBe(false);
    expect(isUniqueViolation(new Error('boom'))).toBe(false);
  });
});

describe('isForeignKeyViolation', () => {
  it('23503 kodunu yakalar', () => {
    expect(isForeignKeyViolation({ code: '23503' })).toBe(true);
  });

  it('23505 kodunu reddeder', () => {
    expect(isForeignKeyViolation({ code: '23505' })).toBe(false);
  });
});
