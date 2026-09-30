import { useRef, useState } from 'react';
import { ImagePlus, Loader2, MoveLeft, MoveRight, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ApiError } from '../../lib/api';
import { postsApi, type StoredFile } from '../posts/api';
import { toast } from 'sonner';

const MAX_IMAGES = 5;
const MAX_MB = 5;

export interface ImageAttachmentsProps {
  images: StoredFile[];
  onChange: (images: StoredFile[]) => void;
  disabled?: boolean;
}

export function ImageAttachments({ images, onChange, disabled }: ImageAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`En fazla ${MAX_IMAGES} görsel yükleyebilirsin`);
      return;
    }
    const oversized = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (oversized) {
      toast.error('Görsel boyutu en fazla 5MB olmalı');
      return;
    }
    const typeBad = files.find((f) => !/^image\/(jpeg|png|webp|avif|gif)$/.test(f.type));
    if (typeBad) {
      toast.error('Desteklenen formatlar: jpeg, png, webp, avif, gif');
      return;
    }

    setUploading(true);
    try {
      const uploaded: StoredFile[] = [];
      for (const file of files) {
        const result = await postsApi.uploadImage(file);
        uploaded.push(result);
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Görsel yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        className="hidden"
        onChange={(e) => void handlePick(e)}
      />

      {images.length ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <li key={image.url} className="group relative aspect-square overflow-hidden rounded-lg border border-ink-200 dark:border-ink-800">
              <img src={image.url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col justify-between bg-ink-950/0 p-1 transition-colors group-hover:bg-ink-950/40">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    aria-label="Sırada öne al"
                    disabled={index === 0 || disabled}
                    onClick={() => move(index, -1)}
                    className="rounded bg-ink-950/60 p-1 text-white opacity-0 transition-opacity hover:bg-ink-950/80 group-hover:opacity-100 disabled:opacity-0"
                  >
                    <MoveLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Sırada sona al"
                    disabled={index === images.length - 1 || disabled}
                    onClick={() => move(index, 1)}
                    className="rounded bg-ink-950/60 p-1 text-white opacity-0 transition-opacity hover:bg-ink-950/80 group-hover:opacity-100 disabled:opacity-0"
                  >
                    <MoveRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Görseli kaldır"
                    disabled={disabled}
                    onClick={() => remove(index)}
                    className="rounded bg-red-600/80 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading || images.length >= MAX_IMAGES}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {images.length >= MAX_IMAGES ? `${MAX_IMAGES} görsel sınırı` : uploading ? 'Yükleniyor…' : 'Görsel ekle'}
        </Button>
        <p className="mt-1.5 text-xs text-ink-400 dark:text-ink-500">
          En fazla {MAX_IMAGES} adet, her biri {MAX_MB}MB (jpeg, png, webp, avif, gif)
        </p>
      </div>
    </div>
  );
}