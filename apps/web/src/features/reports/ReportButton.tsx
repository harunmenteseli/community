import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ReportModal } from './ReportModal';
import { TARGET_LABELS, type ReportTargetType } from './options';

export interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  /** Başlık/erişilebilir ad için okunabilir hedef adı. */
  subject: string;
  /** Görünen metin; örn. kart köşesinde sadece "Şikayet". */
  text?: string;
  className?: string;
}

/** Şikâyet modalını açan küçük buton; post, profil ve vitrin kartlarında ortak. */
export function ReportButton({ targetType, targetId, subject, text = 'Şikayet', className }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const name = subject || TARGET_LABELS[targetType];

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Şikayet et: ${name}`}
        onClick={() => setOpen(true)}
        className={className}
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
        {text}
      </Button>
      <ReportModal
        open={open}
        targetType={targetType}
        targetId={targetId}
        targetName={name}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
