import { describe, expect, it, vi } from 'vitest';
import type { DB } from '../../db';
import { isReservedUsername } from '@community/shared';
import argon2 from 'argon2';

/** Yazma yapilacak herhangi bir zincir kurmadan yalnizca SELECT taklit eder. */
function selectOnlyDb(rows: unknown[], writes: unknown[]) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
    set: (values: unknown) => {
      writes.push(values);
      return chain;
    },
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve().then(resolve, reject),
  };
  return { select: () => chain, update: () => chain } as unknown as DB;
}

describe('normalizeTools', () => {
  it('boslari kirpar ve tekillestirir', async () => {
    const { normalizeTools } = await import('./service');
    expect(normalizeTools(['  React ', 'react', 'Node'])).toEqual(['React', 'Node']);
    expect(normalizeTools(['  ', ''])).toEqual([]);
  });

  it('en fazla 20 kayit tutar', async () => {
    const { normalizeTools } = await import('./service');
    const many = Array.from({ length: 25 }, (_, i) => `tool-${i}`);
    expect(normalizeTools(many)).toHaveLength(20);
  });
});

describe('changeUsername', () => {
  it('rezerve kullanici adini reddeder ve DB ye dokunmaz', async () => {
    const { usersService } = await import('./service');
    const writes: unknown[] = [];
    const fakeDb = selectOnlyDb([], writes);

    const promise = usersService.changeUsername.call({ db: fakeDb } as never, 'user-id', 'admin');

    await expect(promise).rejects.toMatchObject({ code: 'USERNAME_RESERVED' });
    // Kontrol kullanici adindan baslamali: DB'ye hic yazilmadi.
    expect(writes).toHaveLength(0);
  });

  it('buyuk/kucuk harf farkini yok sayarak ayni adi reddeder', async () => {
    const { usersService } = await import('./service');
    const writes: unknown[] = [];
    // Ilk SELECT (kendi kaydi) bos, ikinci SELECT buyuk/kucuk harf eslesmesi doner.
    let selectCount = 0;
    const chain: Record<string, unknown> = {
      from: () => chain,
      where: () => chain,
      limit: () => {
        selectCount += 1;
        return Promise.resolve(selectCount === 1 ? [{ id: 'user-id', username: 'oldname' }] : [{ id: 'other' }]);
      },
      set: (values: unknown) => {
        writes.push(values);
        return chain;
      },
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve().then(resolve, reject),
    };
    const fakeDb = { select: () => chain, update: () => chain } as unknown as DB;

    const promise = usersService.changeUsername.call({ db: fakeDb } as never, 'user-id', 'ALICAN');
    await expect(promise).rejects.toMatchObject({ code: 'USERNAME_TAKEN' });
    expect(writes).toHaveLength(0);
  });

  it('ayni kullanici adini tekrar gondermeyi reddeder', async () => {
    const { usersService } = await import('./service');
    const writes: unknown[] = [];
    const fakeDb = selectOnlyDb([{ id: 'user-id', username: 'alican' }], writes);

    const promise = usersService.changeUsername.call({ db: fakeDb } as never, 'user-id', 'AliCan');
    await expect(promise).rejects.toMatchObject({ code: 'USERNAME_UNCHANGED' });
    expect(writes).toHaveLength(0);
  });
});

describe('updateProfile', () => {
  it('tools gonderilmezse mevcut liste korunur', async () => {
    const { usersService } = await import('./service');
    const captured: Record<string, unknown>[] = [];
    const chain: Record<string, unknown> = {
      set: (values: unknown) => {
        captured.push(values as Record<string, unknown>);
        return chain;
      },
      where: () => Promise.resolve(),
    };
    const fakeDb = { update: () => chain } as unknown as DB;

    await usersService.updateProfile.call({ db: fakeDb } as never, 'user-id', {
      name: 'Ali',
      bio: '',
      siteUrl: '',
    });

    expect(captured[0]).not.toHaveProperty('tools');
    expect(captured[0]?.avatarUrl).toBeUndefined();
  });

  it('tools gonderilirse normalize edilip yazilir', async () => {
    const { usersService } = await import('./service');
    const captured: Record<string, unknown>[] = [];
    const chain: Record<string, unknown> = {
      set: (values: unknown) => {
        captured.push(values as Record<string, unknown>);
        return chain;
      },
      where: () => Promise.resolve(),
    };
    const fakeDb = { update: () => chain } as unknown as DB;

    await usersService.updateProfile.call({ db: fakeDb } as never, 'user-id', {
      name: 'Ali',
      bio: '',
      siteUrl: '',
      tools: ['React', ' react ', 'Node'],
    });

    expect(captured[0]?.tools).toEqual(['React', 'Node']);
  });
});

describe('deleteAccount', () => {
  const USER = {
    id: 'user-id',
    username: 'alican',
    passwordHash: 'hash',
    avatarUrl: null,
  };

  function fakeDbWithUser(passwordMatches: boolean) {
    const chain: Record<string, unknown> = {
      from: () => chain,
      where: () => chain,
      limit: () => Promise.resolve([USER]),
      set: () => chain,
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve().then(resolve, reject),
    };
    return {
      select: () => chain,
      update: () => chain,
      delete: () => ({ where: () => Promise.resolve() }),
      verifyPassword: passwordMatches,
    };
  }

  it('kullanici adi eslesmezse sifre dogrulanmaz', async () => {
    const { usersService } = await import('./service');
    const verifySpy = vi.spyOn(argon2, 'verify');
    const fakeDb = fakeDbWithUser(true);

    const promise = usersService.deleteAccount.call({ db: fakeDb as never } as never, 'user-id', 'Pass1234', 'ali');
    await expect(promise).rejects.toMatchObject({ code: 'CONFIRM_MISMATCH' });
    expect(verifySpy).not.toHaveBeenCalled();
    verifySpy.mockRestore();
  });

  it('sifre yanlissa silmez', async () => {
    const { usersService } = await import('./service');
    const verifySpy = vi.spyOn(argon2, 'verify').mockResolvedValue(false);
    const fakeDb = fakeDbWithUser(false);

    const promise = usersService.deleteAccount.call({ db: fakeDb as never } as never, 'user-id', 'Yanlis123', 'alican');
    await expect(promise).rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' });
    verifySpy.mockRestore();
  });

  it('sifre dogrulaninca hesabi siler', async () => {
    const { usersService } = await import('./service');
    const verifySpy = vi.spyOn(argon2, 'verify').mockResolvedValue(true);
    let deleted = false;
    const fakeDb = {
      select: () => {
        const chain: Record<string, unknown> = {
          from: () => chain,
          where: () => chain,
          limit: () => Promise.resolve([USER]),
        };
        return chain;
      },
      delete: () => ({
        where: () => {
          deleted = true;
          return Promise.resolve();
        },
      }),
    };

    await usersService.deleteAccount.call({ db: fakeDb as never } as never, 'user-id', 'Dogru123', 'alican');
    expect(deleted).toBe(true);
    verifySpy.mockRestore();
  });
});

describe('isReservedUsername', () => {
  it('buyuk/kucuk harf ve bosluk duyarsiz calisir', () => {
    expect(isReservedUsername('Admin')).toBe(true);
    expect(isReservedUsername('  SETTINGS ')).toBe(true);
    expect(isReservedUsername('alican')).toBe(false);
  });
});
