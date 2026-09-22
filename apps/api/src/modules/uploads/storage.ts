import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { env } from '../../env';
import { errors } from '../../lib/errors';
import { logger } from '../../logger';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(__dirname, '../../../../uploads');

export const MAX_AVATAR_MB = 2;
export const MAX_IMAGE_MB = 5;

const KIND_LIMITS = {
  avatar: MAX_AVATAR_MB,
  post: MAX_IMAGE_MB,
  logo: MAX_IMAGE_MB,
  cover: MAX_IMAGE_MB,
} as const;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

export type UploadKind = keyof typeof KIND_LIMITS;

export interface StoredFile {
  url: string;
  width: number | null;
  height: number | null;
}

export interface StorageProvider {
  save(buffer: Buffer, kind: UploadKind, ext: string): Promise<string>;
}

class LocalStorageProvider implements StorageProvider {
  async save(buffer: Buffer, _kind: UploadKind, ext: string): Promise<string> {
    const target = path.join(uploadsDir, new Date().toISOString().slice(0, 7));
    await mkdir(target, { recursive: true });
    const name = `${randomBytes(16).toString('hex')}${ext}`;
    const filePath = path.join(target, name);
    await writeFile(filePath, buffer);
    const relative = path.relative(uploadsDir, filePath).replace(/\\/g, '/');
    return `${env.API_URL}/uploads/${relative}`;
  }
}

export const storage: StorageProvider = new LocalStorageProvider();

export async function processUpload(file: { data: Buffer; mimetype: string; filename: string }, kind: UploadKind): Promise<StoredFile> {
  const limitBytes = KIND_LIMITS[kind] * 1024 * 1024;

  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw errors.badRequest('Desteklenmeyen dosya türü (jpeg, png, webp, avif, gif)', 'UNSUPPORTED_MIME');
  }
  if (file.data.byteLength > limitBytes) {
    throw errors.badRequest(`${KIND_LIMITS[kind]}MB üzeri dosya yüklenemez`, 'FILE_TOO_LARGE');
  }

  let width: number | null = null;
  let height: number | null = null;
  try {
    const meta = await sharp(file.data).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
  } catch (err) {
    logger.error({ err }, 'Görsel analizi başarısız');
  }

  const ext = path.extname(file.filename).toLowerCase() || '.jpg';
  const url = await storage.save(file.data, kind, ext);
  return { url, width, height };
}