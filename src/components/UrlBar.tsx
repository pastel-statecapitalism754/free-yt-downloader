import { useCallback, type KeyboardEvent } from 'react';
import { Loader2, Search, ClipboardPaste } from 'lucide-react';

interface Props {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export const UrlBar = ({ value, loading, onChange, onSubmit }: Props) => {
  const submit = useCallback(() => {
    if (!value.trim()) return;
    onSubmit(value.trim());
  }, [value, onSubmit]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text);
        onSubmit(text.trim());
      }
    } catch {
      /* clipboard permission may be denied */
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-red-500/50 focus-within:ring-2 focus-within:ring-red-500/20 transition">
        <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        <input
          type="text"
          inputMode="url"
          autoFocus
          spellCheck={false}
          placeholder="Paste a YouTube URL (video, Shorts, or playlist)…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-zinc-600"
        />
        <button
          type="button"
          onClick={paste}
          className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-zinc-800 transition"
        >
          <ClipboardPaste className="w-3.5 h-3.5" /> Paste
        </button>
      </div>
      <button
        type="button"
        disabled={loading || !value.trim()}
        onClick={submit}
        className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-medium inline-flex items-center gap-2 transition"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Reading…
          </>
        ) : (
          'Fetch info'
        )}
      </button>
    </div>
  );
};
