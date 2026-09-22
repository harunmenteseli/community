export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errors = {
  badRequest: (msg: string, code?: string) => new AppError(400, msg, code ?? 'BAD_REQUEST'),
  unauthorized: (msg = 'Yetkisiz erişim', code = 'UNAUTHORIZED') => new AppError(401, msg, code),
  forbidden: (msg = 'Bu işlem için yetkin yok', code = 'FORBIDDEN') => new AppError(403, msg, code),
  notFound: (msg = 'Kayıt bulunamadı', code = 'NOT_FOUND') => new AppError(404, msg, code),
  conflict: (msg: string, code = 'CONFLICT') => new AppError(409, msg, code),
  rateLimited: (msg = 'Çok fazla istek', code = 'RATE_LIMITED') => new AppError(429, msg, code),
  internal: (msg = 'Sunucu hatası', code = 'INTERNAL') => new AppError(500, msg, code),
};

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}

export function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23503';
}