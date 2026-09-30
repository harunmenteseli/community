import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  PROJECT_COVER_MAX_COUNT,
  createProjectSchema,
  type CreateProjectDto,
} from '@community/shared';
import { Button, buttonClasses } from '../components/ui/button';
import { Field } from '../components/ui/field';
import { Skeleton } from '../components/ui/skeleton';
import { userAtom } from '../state/atoms';
import { projectsApi } from '../features/projects/api';

const CATEGORY_PRESETS = ['web', 'mobil', 'oyun', 'acik kaynak', 'tasarim', 'diger'] as const;

/** Vitrin kaydi formu; `projectId` verilirse kayit duzenlenir. */
export function ProjectFormPage() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const editing = Boolean(projectId);

  const user = useAtomValue(userAtom);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const existing = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId as string),
    enabled: editing,
  });

  const project = existing.data?.project;

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<string>(CATEGORY_PRESETS[0]);
  const [description, setDescription] = useState('');
  const [buildWith, setBuildWith] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [launched, setLaunched] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrls, setCoverUrls] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setUrl(project.url);
    setCategory(project.category);
    setDescription(project.description ?? '');
    setBuildWith(project.buildWith ?? []);
    setLaunched(project.launched);
    setLogoUrl(project.logoUrl);
    setCoverUrls(project.images.filter((i) => i.type === 'cover').map((i) => i.url));
  }, [project]);

  const uploadLogo = useMutation({ mutationFn: (file: File) => projectsApi.uploadLogo(file) });
  const uploadCover = useMutation({ mutationFn: (file: File) => projectsApi.uploadCover(file) });

  const save = useMutation({
    mutationFn: async () => {
      const payload: CreateProjectDto = {
        name,
        url,
        category,
        description,
        buildWith,
        launched,
        ...(logoUrl !== null ? { logoUrl } : {}),
        ...(coverUrls.length > 0 ? { coverUrls } : {}),
      };
      // Ayni dogrulama sunucuda da var; burada erken geri bildirim veriyoruz.
      const parsed = createProjectSchema.safeParse(payload);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        setFormError(issue ? `${issue.path.join('.')}: ${issue.message}` : 'Form geçersiz');
        throw new Error('form-invalid');
      }

      if (editing) {
        await projectsApi.update(projectId as string, payload);
        return projectId as string;
      }
      const created = await projectsApi.create(parsed.data);
      return created.project.id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: ['launchpad'] });
      toast.success(editing ? 'Vitrin kaydı güncellendi' : 'Vitrin kaydı eklendi');
      await navigate({ to: '/vitrin' });
      return id;
    },
    onError: (err) => {
      if (err.message === 'form-invalid') return;
      toast.error(err.message || 'Kaydedilemedi');
    },
  });

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    if (buildWith.includes(tag)) {
      setTagInput('');
      return;
    }
    if (buildWith.length >= 30) {
      setFormError('En fazla 30 etiket eklenebilir');
      return;
    }
    setBuildWith([...buildWith, tag]);
    setTagInput('');
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    void save.mutate();
  };

  if (!user) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <h1 className="text-xl font-semibold">Giriş gerekli</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Vitrin kaydı eklemek için önce giriş yapmalısın.</p>
        <Link
          to="/login"
          search={{ redirect: '/vitrin/yeni' }}
          className={`mt-5 ${buttonClasses({ variant: 'primary' })}`}
        >
          Giriş yap
        </Link>
      </div>
    );
  }

  if (editing && existing.isPending) {
    return (
      <div className="container-page mx-auto max-w-2xl py-10">
        <Skeleton lines={6} />
      </div>
    );
  }

  if (editing && existing.isError) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <p className="text-sm text-ink-500 dark:text-ink-400">Vitrin kaydı yüklenemedi.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void existing.refetch()}>
          Tekrar dene
        </Button>
      </div>
    );
  }

  const busy = save.isPending || uploadLogo.isPending || uploadCover.isPending;

  return (
    <form onSubmit={onSubmit} className="container-page mx-auto max-w-2xl space-y-5 py-10">
      <header>
        <h1 className="text-lg font-semibold">{editing ? 'Vitrin kaydını düzenle' : 'Yeni vitrin kaydı'}</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Vitrin kaydın profilinde ve Kariyer Vitrini'nde görünür.
        </p>
      </header>

      {formError ? (
        <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </p>
      ) : null}

      <Field id="project-name" label="Ad" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Sınav Çalışıcı" />

      <Field
        id="project-url"
        label="Bağlantı"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://ornek.com/proje"
        error={formError?.startsWith('url') ? 'Geçerli bir bağlantı girin' : undefined}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium text-ink-700 dark:text-ink-300">
          Kategori
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 w-full rounded-md border border-ink-300 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900"
        >
          {CATEGORY_PRESETS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="buildWith" className="text-sm font-medium text-ink-700 dark:text-ink-300">
          Nelerle geliştirildi
        </label>
        <div className="flex gap-2">
          <input
            id="buildWith"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="React, Node.js"
            className="h-10 w-full rounded-md border border-ink-300 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900"
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag}>
            <Plus className="h-4 w-4" aria-hidden />
            Ekle
          </Button>
        </div>
        {buildWith.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Eklenen etiketler">
            {buildWith.map((tag) => (
              <li key={tag} className="flex items-center gap-1 rounded-full bg-ink-100 px-2 py-1 text-xs dark:bg-ink-800">
                {tag}
                <button
                  type="button"
                  aria-label={`${tag} etiketini kaldır`}
                  onClick={() => setBuildWith(buildWith.filter((t) => t !== tag))}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="project-description" className="text-sm font-medium text-ink-700 dark:text-ink-300">
          Açıklama
        </label>
        <textarea
          id="project-description"
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-ink-300 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1 rounded-lg border border-ink-200 p-3 dark:border-ink-800">
          <p className="text-sm font-medium">Logo (1:1)</p>
          {logoUrl ? (
            <img src={logoUrl} alt="" className="mt-2 h-16 w-16 rounded object-cover" />
          ) : (
            <p className="mt-1 text-xs text-ink-500">Logo yok</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            loading={uploadLogo.isPending}
            onClick={() => logoInputRef.current?.click()}
          >
            Logo yükle
          </Button>
          {logoUrl ? (
            <Button type="button" variant="ghost" size="sm" className="ml-2" onClick={() => setLogoUrl(null)}>
              Kaldır
            </Button>
          ) : null}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Logo dosyasi"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              uploadLogo.mutate(file, {
                onSuccess: ({ file: stored }) => setLogoUrl(stored.url),
                onError: () => toast.error('Logo yüklenemedi'),
              });
            }}
          />
        </div>

        <div className="flex-1 rounded-lg border border-ink-200 p-3 dark:border-ink-800">
          <p className="text-sm font-medium">Kapak görselleri</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {coverUrls.map((cover) => (
              <li key={cover} className="relative">
                <img src={cover} alt="" className="h-16 w-24 rounded object-cover" />
                <button
                  type="button"
                  aria-label="Kapak görselini kaldır"
                  className="absolute -right-1 -top-1 rounded-full bg-ink-900 p-0.5 text-white dark:bg-white dark:text-ink-900"
                  onClick={() => setCoverUrls(coverUrls.filter((c) => c !== cover))}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            loading={uploadCover.isPending}
            disabled={coverUrls.length >= PROJECT_COVER_MAX_COUNT}
            onClick={() => coverInputRef.current?.click()}
          >
            Kapak ekle
          </Button>
          <p className="mt-1 text-xs text-ink-500">En fazla {PROJECT_COVER_MAX_COUNT} görsel.</p>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Kapak dosyasi"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              uploadCover.mutate(file, {
                onSuccess: ({ file: stored }) => setCoverUrls((prev) => [...prev, stored.url]),
                onError: () => toast.error('Kapak yüklenemedi'),
              });
            }}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={launched}
          onChange={(e) => setLaunched(e.target.checked)}
          className="h-4 w-4"
        />
        Yayında (Kariyer Vitrini'nde görünsün)
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" loading={busy}>
          {editing ? 'Kaydet' : 'Vitrin kaydı oluştur'}
        </Button>
        <Link to="/vitrin" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          Vazgeç
        </Link>
      </div>
    </form>
  );
}
