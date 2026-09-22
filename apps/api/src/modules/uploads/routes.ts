import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { uploadsDir, processUpload, type UploadKind } from './storage';
import { errors } from '../../lib/errors';

const KINDS: UploadKind[] = ['avatar', 'post', 'logo', 'cover'];

function readKind(kind?: string): UploadKind {
  if (!kind || !KINDS.includes(kind as UploadKind)) throw errors.badRequest('Geçersiz upload türü');
  return kind as UploadKind;
}

export async function registerUploads(app: FastifyInstance): Promise<void> {
  app.register(fastifyStatic, { root: uploadsDir, prefix: '/uploads/' });

  app.post<{ Querystring: { kind?: string } }>('/api/uploads', async (request, reply) => {
    request.requireAuthUser();
    const kind = readKind(request.query.kind);

    const part = await request.file();
    if (!part) throw errors.badRequest('Dosya gerekli');
    const data = await part.toBuffer();

    const file = await processUpload({ data, mimetype: part.mimetype, filename: part.filename }, kind);
    return reply.status(201).send({ file });
  });
}