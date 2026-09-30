import type { AppNotification } from './api';

export interface NotificationText {
  /** Bildirim satirinda gosterilecek metin. */
  text: string;
  /** Kullaniciyi ilgili icerige tasiyan yol; yoksa link olmaz. */
  href?: string;
}

/**
 * Bildirim metnini ve hedefini uretir. Sunucu sadece tip/aktör gonderiyor,
 * okunabilir metin ve yonlendirme istemcide uretilir (ayrica test edilebilir).
 */
export function notificationText(item: AppNotification): NotificationText {
  const actor = item.actor?.name ?? 'Sistem';

  switch (item.type) {
    case 'follow':
      return { text: `${actor} seni takip etmeye başladı`, href: profileHref(item) };
    case 'like':
      return { text: `${actor} gönderini beğendi`, href: postHref(item) };
    case 'comment':
    case 'reply':
      return { text: `${actor} gönderine yorum yaptı`, href: postHref(item) };
    case 'mention':
      return { text: `${actor} gönderinde seni etiketledi`, href: postHref(item) };
    case 'launch':
      return { text: `${actor} vitrin kaydını yayına aldı`, href: projectHref(item) };
    case 'reportUpdate':
      return { text: reportResultText(item) };
    default:
      return { text: `${actor} yeni bir bildirim gönderdi` };
  }
}

function profileHref(item: AppNotification): string | undefined {
  const username = item.actor?.username;
  return username ? `/u/${username}` : undefined;
}

function postHref(item: AppNotification): string | undefined {
  return item.entityType === 'post' && item.entityId ? `/post/${item.entityId}` : undefined;
}

function projectHref(item: AppNotification): string | undefined {
  return item.entityType === 'project' && item.entityId ? `/vitrin/${item.entityId}` : undefined;
}

/** Sikayet sonucu: hedef turune gore kisa ozet. */
function reportResultText(item: AppNotification): string {
  const status = typeof item.payload?.status === 'string' ? item.payload.status : null;
  const target = typeof item.payload?.targetType === 'string' ? item.payload.targetType : null;
  const targetLabel =
    target === 'post' ? 'gönderin' : target === 'user' ? 'kullanıcı' : target === 'project' ? 'vitrin kaydının' : 'içeriğin';

  if (status === 'approved') return `Şikâyetin onaylandı; ${targetLabel} incelemeye alındı`;
  if (status === 'rejected') return `Şikâyetin reddedildi; ${targetLabel} için işlem yapılmadı`;
  return `Şikâyetin güncellendi; ${targetLabel} inceleniyor`;
}
