import { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code2,
  Link2,
  Link2Off,
  Undo2,
  Redo2,
} from 'lucide-react';
import { ToolbarButton } from './ToolbarButton';

const lowlight = createLowlight(common);

export interface TipTapEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function TipTapEditor({ value, onChange, placeholder }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder: placeholder ?? 'Bir şeyler yaz…' }),
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose-editor min-h-[260px] w-full focus:outline-none [&_a]:text-accent-600 [&_a]:underline dark:[&_a]:text-accent-400',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused || value === editor.getHTML()) return;
    editor.commands.setContent(value, false);
  }, [value, editor]);

  const handleBold = () => editor?.chain().focus().toggleBold().run();
  const handleItalic = () => editor?.chain().focus().toggleItalic().run();
  const handleStrike = () => editor?.chain().focus().toggleStrike().run();
  const handleH1 = () => editor?.chain().focus().toggleHeading({ level: 1 }).run();
  const handleH2 = () => editor?.chain().focus().toggleHeading({ level: 2 }).run();
  const handleBullet = () => editor?.chain().focus().toggleBulletList().run();
  const handleOrdered = () => editor?.chain().focus().toggleOrderedList().run();
  const handleQuote = () => editor?.chain().focus().toggleBlockquote().run();
  const handleCodeBlock = () => editor?.chain().focus().toggleCodeBlock().run();

  const handleLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link adresi:', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleUnsetLink = () => editor?.chain().focus().extendMarkRange('link').unsetLink().run();
  const handleUndo = () => editor?.chain().focus().undo().run();
  const handleRedo = () => editor?.chain().focus().redo().run();

  const isActive = useMemo(
    () => ({
      bold: editor?.isActive('bold') ?? false,
      italic: editor?.isActive('italic') ?? false,
      strike: editor?.isActive('strike') ?? false,
      h1: editor?.isActive('heading', { level: 1 }) ?? false,
      h2: editor?.isActive('heading', { level: 2 }) ?? false,
      bullet: editor?.isActive('bulletList') ?? false,
      ordered: editor?.isActive('orderedList') ?? false,
      quote: editor?.isActive('blockquote') ?? false,
      code: editor?.isActive('codeBlock') ?? false,
      link: editor?.isActive('link') ?? false,
    }),
    [editor],
  );

  const isLinkActive = isActive.link;

  return (
    <div className="overflow-hidden rounded-lg border border-ink-200 bg-white focus-within:border-accent-500 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-200 bg-ink-50/50 p-1.5 dark:border-ink-800 dark:bg-ink-950/40">
        <ToolbarButton label="Kalın" active={isActive.bold} onClick={handleBold} icon={<Bold className="h-4 w-4" />} />
        <ToolbarButton label="İtalik" active={isActive.italic} onClick={handleItalic} icon={<Italic className="h-4 w-4" />} />
        <ToolbarButton label="Üstü çizili" active={isActive.strike} onClick={handleStrike} icon={<Strikethrough className="h-4 w-4" />} />
        <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-800" />
        <ToolbarButton label="Başlık 1" active={isActive.h1} onClick={handleH1} icon={<Heading1 className="h-4 w-4" />} />
        <ToolbarButton label="Başlık 2" active={isActive.h2} onClick={handleH2} icon={<Heading2 className="h-4 w-4" />} />
        <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-800" />
        <ToolbarButton label="Liste" active={isActive.bullet} onClick={handleBullet} icon={<List className="h-4 w-4" />} />
        <ToolbarButton label="Numaralı liste" active={isActive.ordered} onClick={handleOrdered} icon={<ListOrdered className="h-4 w-4" />} />
        <ToolbarButton label="Alıntı" active={isActive.quote} onClick={handleQuote} icon={<Quote className="h-4 w-4" />} />
        <ToolbarButton label="Kod bloğu" active={isActive.code} onClick={handleCodeBlock} icon={<Code2 className="h-4 w-4" />} />
        <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-800" />
        <ToolbarButton
          label={isLinkActive ? 'Linki güncelle' : 'Link ekle'}
          active={isLinkActive}
          onClick={handleLink}
          icon={<Link2 className="h-4 w-4" />}
        />
        <ToolbarButton label="Linki kaldır" disabled={!isLinkActive} onClick={handleUnsetLink} icon={<Link2Off className="h-4 w-4" />} />
        <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-800" />
        <ToolbarButton label="Geri al" disabled={!editor?.can().undo()} onClick={handleUndo} icon={<Undo2 className="h-4 w-4" />} />
        <ToolbarButton label="Yinele" disabled={!editor?.can().redo()} onClick={handleRedo} icon={<Redo2 className="h-4 w-4" />} />
      </div>
      <EditorContent editor={editor} className="px-4 py-3" />
    </div>
  );
}