import { describe, expect, it } from 'vitest';
import {
  REPORT_MESSAGE_MAX,
  isSelfReport,
  validateReport,
} from './options';

describe('validateReport', () => {
  it('sebep secilmeden gonderilemez', () => {
    expect(validateReport(null, 'aciklama')).toBe('Bir sebep seç');
  });

  it('secilen sebep ve bos aciklamayla gonderilir', () => {
    expect(validateReport('spam', '   ')).toBeNull();
  });

  it('"Diger" icin aciklama zorunlu', () => {
    expect(validateReport('other', '   ')).not.toBeNull();
    expect(validateReport('other', 'bir sey oldu')).toBeNull();
  });

  it('aciklamayi sinir disina cikarmaz', () => {
    const long = 'x'.repeat(REPORT_MESSAGE_MAX + 1);
    expect(validateReport('abuse', long)).toBe(
      `Açıklama en fazla ${REPORT_MESSAGE_MAX} karakter olabilir`,
    );
    expect(validateReport('abuse', 'x'.repeat(REPORT_MESSAGE_MAX))).toBeNull();
  });
});

describe('isSelfReport', () => {
  it('kendi profilini sikayet etmeyi kendisi yakalar', () => {
    expect(isSelfReport('user', 'u1', 'u1')).toBe(true);
    expect(isSelfReport('user', 'u1', 'u2')).toBe(false);
  });

  it('post ve vitrin kaydi icin kullanici kimligi rol oynamaz', () => {
    expect(isSelfReport('post', 'p1', 'p1')).toBe(false);
    expect(isSelfReport('project', 'pr1', 'pr1')).toBe(false);
  });

  it('oturumsuz kullanicida hicbiri kendisi degildir', () => {
    expect(isSelfReport('user', 'u1', null)).toBe(false);
  });
});
