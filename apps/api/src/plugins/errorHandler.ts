import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../logger';
import { env } from '../env';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code ?? 'APP_ERROR', message: error.message },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Girdi doğrulama hatası',
          issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      });
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'validation' in error &&
      (error as FastifyError).validation
    ) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Girdi doğrulama hatası',
          issues: (error as FastifyError).validation,
        },
      });
    }

    // @fastify/rate-limit yaniti hata olarak firlatiyor; hazir statusCode ve govde
    // korunmali, yoksa limit asimlari 500 "İşlenmemiş hata" olarak donuyor.
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { statusCode?: unknown }).statusCode === 429
    ) {
      const rateLimitError = error as { error?: { code?: string; message?: string } };
      return reply.status(429).send({
        error: {
          code: rateLimitError.error?.code ?? 'RATE_LIMITED',
          message: rateLimitError.error?.message ?? 'Çok fazla istek. Lütfen biraz bekleyin.',
        },
      });
    }

    logger.error({ err: error as Error }, 'İşlenmemiş hata');

    if (env.NODE_ENV === 'development') {
      return reply.status(500).send({
        error: { code: 'INTERNAL', message: (error as Error).message, stack: (error as Error).stack },
      });
    }

    return reply.status(500).send({ error: { code: 'INTERNAL', message: 'Sunucu hatası' } });
  });
}