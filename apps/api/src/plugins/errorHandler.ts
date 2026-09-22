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

    logger.error({ err: error as Error }, 'İşlenmemiş hata');

    if (env.NODE_ENV === 'development') {
      return reply.status(500).send({
        error: { code: 'INTERNAL', message: (error as Error).message, stack: (error as Error).stack },
      });
    }

    return reply.status(500).send({ error: { code: 'INTERNAL', message: 'Sunucu hatası' } });
  });
}