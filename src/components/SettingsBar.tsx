import { Folder, FolderOpen } from 'lucide-react';
import type { AppDefaults } from '../types.js';

interface Props {
  outputDir: string;
  defaults: AppDefaults | null;
  onChooseFolder: () => void;
  onOpenFolder: () => void;
}

export const SettingsBar = ({ outputDir, defaults, onChooseFolder, onOpenFolder }: Props) => {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-0.5">
          Save to folder
        </div>
        <div className="text-sm font-mono truncate text-zinc-200" title={outputDir}>
          {outputDir || '—'}
        </div>
      </div>
      <button
        onClick={onChooseFolder}
        className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm inline-flex items-center gap-2 transition"
      >
        <Folder className="w-4 h-4" /> Change
      </button>
      <button
        onClick={onOpenFolder}
        disabled={!outputDir}
        className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 text-sm inline-flex items-center gap-2 transition"
      >
        <FolderOpen className="w-4 h-4" /> Open
      </button>
      {defaults?.binaries && (
        <div className="text-[11px] text-zinc-500 w-full pt-1 border-t border-zinc-800/80 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>
            yt-dlp:{' '}
            <span className={defaults.binaries.ytdlpFound ? 'text-emerald-400' : 'text-amber-400'}>
              {defaults.binaries.ytdlpFound ? defaults.binaries.ytdlp : 'not found'}
            </span>
          </span>
          <span>
            ffmpeg:{' '}
            <span className={defaults.binaries.ffmpegFound ? 'text-emerald-400' : 'text-amber-400'}>
              {defaults.binaries.ffmpegFound ? defaults.binaries.ffmpeg : 'not found'}
            </span>
          </span>
        </div>
      )}
    </div>
  );
};
