import { describe, expect, it } from 'vitest';
import { POLL_MAX_OPTIONS, POLL_MIN_OPTIONS, pollDraftError, toPollDto } from './PollEditor';

const valid = { question: 'Hangi oyun?', options: ['A', 'B'] };

describe('pollDraftError', () => {
  it('anket yoksa hata yoktur', () => {
    expect(pollDraftError(null)).toBeNull();
  });

  it('gecerli ankette hata yoktur', () => {
    expect(pollDraftError(valid)).toBeNull();
  });

  it('bos soruyu reddeder', () => {
    expect(pollDraftError({ ...valid, question: '   ' })).toBe('Anket sorusu zorunlu');
  });

  it(`en az ${POLL_MIN_OPTIONS} secenek ister`, () => {
    expect(pollDraftError({ ...valid, options: ['A'] })).toBe(
      `En az ${POLL_MIN_OPTIONS} seçenek gerekli`,
    );
  });

  it(`en fazla ${POLL_MAX_OPTIONS} secenek kabul eder`, () => {
    const options = Array.from({ length: POLL_MAX_OPTIONS }, (_, i) => `S${i}`);
    expect(pollDraftError({ ...valid, options })).toBeNull();
    expect(pollDraftError({ ...valid, options: [...options, 'fazla'] })).toBe(
      `En fazla ${POLL_MAX_OPTIONS} seçenek eklenebilir`,
    );
  });

  it('bos secenegi reddeder', () => {
    expect(pollDraftError({ ...valid, options: ['A', '  '] })).toBe('Boş seçenek bırakma veya kaldır');
  });
});

describe('toPollDto', () => {
  it('anket yoksa undefined doner', () => {
    expect(toPollDto(null)).toBeUndefined();
  });

  it('gecersiz ankette undefined doner', () => {
    expect(toPollDto({ ...valid, question: '' })).toBeUndefined();
  });

  it('kirparilan soru ve secenekleri doner', () => {
    expect(toPollDto({ question: '  Hangi oyun?  ', options: [' A ', 'B'] })).toEqual({
      question: 'Hangi oyun?',
      options: [{ text: 'A' }, { text: 'B' }],
    });
  });
});
