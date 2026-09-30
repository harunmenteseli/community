import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { Loader2, Save, Trash2, UploadCloud } from 'lucide-react';
import { POST_CATEGORIES, POST_CATEGORY_LABELS, POST_GAMES, POST_GAME_LABELS, type PostCategory, type PostGame } from '@community/shared';
import { userAtom } from '../state/atoms';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { ApiError } from '../lib/api';
import { postsApi, type StoredFile } from '../features/posts/api';
import { TipTapEditor } from '../features/editor/TipTapEditor';
import { ImageAttachments } from '../features/editor/ImageAttachments';
import { toast } from 'sonner';
import { cn } from '../lib/cn';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function NewPostPage() {
  const user = useAtomValue(userAtom);
  const navigate = useNavigate();
  const location = useLocation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('genel');
  const [game, setGame] = useState<PostGame | null>(null);
  const [images, setImages] = useState<StoredFile[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const categoryRef = useRef(category);
  const gameRef = useRef(game);
  const imagesRef = useRef(images);
  const draftIdRef = useRef(draftId);
  const publishingRef = useRef(false);
  titleRef.current = title;
  contentRef.current = content;
  categoryRef.current = category;
  gameRef.current = game;
  imagesRef.current = images;
  draftIdRef.current = draftId;

  const draftIdParam = useMemo(() => new URLSearchParams(location.searchStr ?? '').get('id'), [location.searchStr]);

  useEffect(() => {
    if (!draftIdParam || !user) return;
    let active = true;
    setLoadingDraft(true);
    postsApi
      .get(draftIdParam)
      .then(({ post: draft }) => {
        if (!active || draft.author.id !== user.id) {
          if (active) toast.error('Bu taslağı düzenleme yetkin yok');
          return;
        }
        setTitle(draft.title ?? '');
        setContent(draft.content);
        setCategory(draft.category);
        setGame(draft.game);
        setImages(draft.images.map((i) => ({ url: i.url, width: i.width, height: i.height })));
        setDraftId(draft.id);
      })
      .catch((err) => {
        if (active) toast.error(err instanceof ApiError ? err.message : 'Taslak yüklenemedi');
      })
      .finally(() => {
        if (active) setLoadingDraft(false);
      });
    return () => {
      active = false;
    };
  }, [draftIdParam, user]);

  const persist = useCallback(async (): Promise<void> => {
    const t = titleRef.current.trim();
    const c = stripHtml(contentRef.current);
    if (!c && !t) {
      setSaveStatus('idle');
      return;
    }
    setSaveStatus('saving');
    const payload = {
      title: t || undefined,
      content: contentRef.current,
      category: categoryRef.current,
      game: gameRef.current ?? undefined,
      images: imagesRef.current.map((i) => i.url),
      isDraft: true,
    };
    try {
      if (draftIdRef.current) {
        await postsApi.update(draftIdRef.current, {
          title: payload.title,
          content: payload.content,
          category: payload.category,
          game: payload.game,
          images: payload.images,
        });
      } else {
        const { post } = await postsApi.create(payload);
        draftIdRef.current = post.id;
        setDraftId(post.id);
      }
      setLastSavedAt(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      toast.error(err instanceof ApiError ? err.message : 'Taslak kaydedilemedi');
    }
  }, []);

  const signature = `${title}|${content}|${category}|${game}|${images.map((i) => i.url).join(',')}`;

  useEffect(() => {
    if (publishingRef.current || loadingDraft) return;
    if (!stripHtml(content) && !title.trim()) {
      setSaveStatus('idle');
      return;
    }
    setSaveStatus('saving');
    const timer = window.setTimeout(() => void persist(), 1200);
    return () => window.clearTimeout(timer);
  }, [signature, persist, loadingDraft]);

  const publish = async () => {
    publishingRef.current = true;
    setPublishing(true);
    try {
      const body = {
        content: contentRef.current,
        category: categoryRef.current,
        game: gameRef.current ?? undefined,
        title: titleRef.current.trim() || undefined,
        images: imagesRef.current.map((i) => i.url),
        isDraft: false,
      };
      if (!stripHtml(body.content) && !body.title) {
        toast.error('Yayınlamak için içerik gerekli');
        return;
      }
      const { post } = await postsApi.create(body);
      if (draftIdRef.current) {
        try {
          await postsApi.delete(draftIdRef.current);
        } catch {
          // taslak temizlenemedi, sorun değil
        }
      }
      toast.success('Paylaşıldı!');
      setShareOpen(false);
      await navigate({ to: '/' });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Yayınlanamadı');
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  };

  const deleteDraft = async () => {
    if (!draftId) return;
    if (!window.confirm('Bu taslağı silmek istediğine emin misin?')) return;
    try {
      await postsApi.delete(draftId);
      toast.success('Taslak silindi');
      setTitle('');
      setContent('');
      setGame(null);
      setImages([]);
      setDraftId(null);
      setSaveStatus('idle');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Taslak silinemedi');
    }
  };

  const charCount = stripHtml(content).length;

  if (!user) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <h1 className="text-xl font-semibold">Giriş gerekli</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Paylaşım yapabilmek için önce giriş yapmalısın.</p>
        <Link to="/login" className="mt-5">
          <Button variant="primary">Giriş yap</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Yeni post</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
            {loadingDraft ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Taslak yükleniyor…
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <Save className="h-3.5 w-3.5" /> Kaydediliyor…
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Save className="h-3.5 w-3.5 text-emerald-500" /> Taslak {lastSavedAt} kaydedildi
              </>
            ) : saveStatus === 'error' ? (
              <>
                <Save className="h-3.5 w-3.5 text-red-500" /> Kaydedilemedi — değişiklik yaptıkça tekrar denenir
              </>
            ) : (
              'Otomatik taslak kaydı açık'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/taslaklar">
            <Button variant="ghost" size="sm">
              Taslaklar
            </Button>
          </Link>
          {draftId ? (
            <Button variant="ghost" size="icon-sm" aria-label="Taslağı sil" onClick={() => void deleteDraft()}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Başlık (isteğe bağlı)"
          maxLength={200}
          className="w-full text-xl font-semibold tracking-tight outline-none placeholder:text-ink-300 dark:placeholder:text-ink-600"
        />

        <div className="flex flex-wrap items-center gap-2">
          {POST_CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                category === value
                  ? 'border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                  : 'border-ink-200 text-ink-500 hover:border-ink-300 hover:text-ink-700 dark:border-ink-800 dark:text-ink-400 dark:hover:text-ink-200',
              )}
            >
              {POST_CATEGORY_LABELS[value]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink-500 dark:text-ink-400">Oyun etiketi</span>
          <button
            type="button"
            onClick={() => setGame(null)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              game === null
                ? 'border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                : 'border-ink-200 text-ink-500 hover:border-ink-300 hover:text-ink-700 dark:border-ink-800 dark:text-ink-400 dark:hover:text-ink-200',
            )}
          >
            Etiket yok
          </button>
          {POST_GAMES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setGame(game === value ? null : value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                game === value
                  ? 'border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                  : 'border-ink-200 text-ink-500 hover:border-ink-300 hover:text-ink-700 dark:border-ink-800 dark:text-ink-400 dark:hover:text-ink-200',
              )}
            >
              {POST_GAME_LABELS[value]}
            </button>
          ))}
        </div>

        <TipTapEditor value={content} onChange={setContent} placeholder="Düşüncelerini paylaş…" />

        <ImageAttachments images={images} onChange={setImages} disabled={publishing} />

        <div className="flex items-center justify-between gap-3 border-t border-ink-200 pt-4 dark:border-ink-800">
          <div className="flex items-center gap-4 text-xs text-ink-400 dark:text-ink-500">
            <span>{charCount.toLocaleString('tr-TR')} karakter</span>
            <span>{images.length}/5 görsel</span>
          </div>
          <Button size="lg" onClick={() => setShareOpen(true)} disabled={publishing}>
            <UploadCloud className="h-4 w-4" />
            Yayınla
          </Button>
        </div>
      </div>

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Yayınla"
        description="Paylaşmadan önce son bir bakış."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShareOpen(false)} disabled={publishing}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              onClick={() => void publish()}
              loading={publishing}
              disabled={!charCount && !title.trim()}
            >
              Yayınla
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-medium text-accent-600 dark:text-accent-400">
              {POST_CATEGORY_LABELS[category]}
            </span>
            {game ? (
              <span className="rounded-full border border-ink-300 px-2.5 py-1 text-xs font-medium text-ink-500 dark:border-ink-700 dark:text-ink-400">
                {POST_GAME_LABELS[game]}
              </span>
            ) : null}
            {title.trim() ? <span className="text-sm font-medium">{title.trim()}</span> : (
              <span className="text-sm text-ink-400 dark:text-ink-500">Başlık yok</span>
            )}
          </div>
          {content ? (
            <div className="prose-editor rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-sm dark:border-ink-800 dark:bg-ink-950/40">
              <div dangerouslySetInnerHTML={{ __html: content }} className="max-h-40 overflow-hidden" />
            </div>
          ) : null}
          {images.length ? (
            <div className="grid grid-cols-5 gap-2">
              {images.map((image) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={image.url} src={image.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              ))}
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}