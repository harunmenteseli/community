export const REPORT_TARGET_TYPES = ['post', 'user', 'project'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = ['spam', 'abuse', 'scam', 'nsfw', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_OPTIONS: readonly { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam veya reklam' },
  { value: 'abuse', label: 'Hakaret veya taciz' },
  { value: 'scam', label: 'Dolandırıcılık / sahte içerik' },
  { value: 'nsfw', label: 'Uygunsuz içerik' },
  { value: 'other', label: 'Diğer' },
];

/** Modal başlığında hedefi anlatan kısa etiket: "gönderi", "kullanıcı", "vitrin kaydı". */
export const TARGET_LABELS: Record<ReportTargetType, string> = {
  post: 'Gönderi',
  user: 'Kullanıcı',
  project: 'Vitrin kaydı',
};

export const REPORT_MESSAGE_MAX = 1000;

/**
 * Form doğrulaması. Hata yoksa null döner; sunucu doğrulamasıyla aynı kurallar
 * (seçim zorunlu, "Diğer" için açıklama zorunlu, 1000 karakter sınırı).
 */
export function validateReport(reason: ReportReason | null, message: string): string | null {
  if (!reason) return 'Bir sebep seç';
  if (message.length > REPORT_MESSAGE_MAX) return `Açıklama en fazla ${REPORT_MESSAGE_MAX} karakter olabilir`;
  if (reason === 'other' && message.trim().length === 0) return '"Diğer" için açıklama yaz';
  return null;
}

/** Kendi içeriğini şikayet etme kontrolü (post/kullanıcı/vitrin kaydı). */
export function isSelfReport(targetType: ReportTargetType, targetId: string, viewerId: string | null): boolean {
  return targetType === 'user' && targetId === viewerId;
}
