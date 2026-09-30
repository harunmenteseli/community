import { unlink, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { uploadsDir, deleteStoredFile } from './storage';
import { env } from '../../env';

function urlFor(relative: string): string {
  return `${env.API_URL}/uploads/${relative}`;
}

describe('deleteStoredFile', () => {
  const dir = path.join(uploadsDir, 'test-deletion');

  beforeAll(async () => {
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await unlink(path.join(dir, 'dosya.png')).catch(() => undefined);
  });

  it('kendi uploads dizinindeki dosyayi siler', async () => {
    await writeFile(path.join(dir, 'dosya.png'), 'x');
    await expect(deleteStoredFile(urlFor('test-deletion/dosya.png'))).resolves.toBe(true);
  });

  it('yoksa false doner (hata firlatmaz)', async () => {
    await expect(deleteStoredFile(urlFor('test-deletion/yok.png'))).resolves.toBe(false);
  });

  it('disaridaki bir URL e dokunmaz', async () => {
    await expect(deleteStoredFile('https://ornek.com/avatar.png')).resolves.toBe(false);
  });

  it('dizin disina cikis denemesini reddeder', async () => {
    await expect(deleteStoredFile(urlFor('../../../../package.json'))).resolves.toBe(false);
    // Kardes dizin oneki de reddedilmeli ("uploads-evil" gibi).
    await expect(deleteStoredFile(urlFor('../uploads-evil/x.png'))).resolves.toBe(false);
  });
});
