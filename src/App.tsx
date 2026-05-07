import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import type {
  AppDefaults,
  DownloadEvent,
  DownloadKind,
  DownloadOptions,
  SponsorBlockCategory,
  SponsorBlockMode,
  VideoInfo,
} from './types.js';
import { UrlBar } from './components/UrlBar.js';
import { VideoPreview } from './components/VideoPreview.js';
import { OptionsPanel } from './components/OptionsPanel.js';
import { DownloadList, type DownloadJob } from './components/DownloadList.js';
import { SettingsBar } from './components/SettingsBar.js';

const newId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

interface UiState {
  selection: DownloadKind;
  embedSubtitles: boolean;
  subtitleLangs: string;
  embedThumbnail: boolean;
  embedChapters: boolean;
  sponsorMode: SponsorBlockMode;
  sponsorCategories: SponsorBlockCategory[];
  playlist: boolean;
}

const defaultUiState = (): UiState => ({
  selection: { kind: 'video', maxHeight: 1080, preferHdr: false, fps60: true },
  embedSubtitles: true,
  subtitleLangs: 'en',
  embedThumbnail: true,
  embedChapters: true,
  sponsorMode: 'remove',
  sponsorCategories: ['sponsor', 'selfpromo'],
  playlist: false,
});

export const App = () => {
  const [defaults, setDefaults] = useState<AppDefaults | null>(null);
  const [outputDir, setOutputDir] = useState<string>('');
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [ui, setUi] = useState<UiState>(defaultUiState());
  const [downloads, setDownloads] = useState<Record<string, DownloadJob>>({});
  const lastFetchedUrl = useRef<string>('');

  useEffect(() => {
    void window.app.getDefaults().then((d) => {
      setDefaults(d);
      setOutputDir(d.downloadDir);
    });
    const off = window.app.onEvent(handleEvent);
    return off;
  }, []);

  const handleEvent = useCallback((evt: DownloadEvent) => {
    setDownloads((prev) => {
      const job = prev[evt.id];
      if (!job && evt.type !== 'queued' && evt.type !== 'started') return prev;
      const next = { ...prev };
      const current = job ?? ({} as DownloadJob);
      switch (evt.type) {
        case 'queued':
          next[evt.id] = { ...current, status: 'queued', logs: current.logs ?? [] };
          break;
        case 'started':
          next[evt.id] = { ...current, status: 'running', logs: current.logs ?? [] };
          break;
        case 'progress':
          next[evt.id] = {
            ...current,
            status: 'running',
            percent: evt.percent,
            speed: evt.speed,
            eta: evt.eta,
            sizeTotal: evt.sizeTotal,
            stage: evt.stage,
          };
          break;
        case 'log': {
          const logs = (current.logs ?? []).concat(evt.line).slice(-200);
          next[evt.id] = { ...current, logs };
          break;
        }
        case 'completed':
          next[evt.id] = {
            ...current,
            status: 'completed',
            percent: 100,
            outputFile: evt.outputFile,
          };
          break;
        case 'error':
          next[evt.id] = { ...current, status: 'error', error: evt.message };
          break;
        case 'canceled':
          next[evt.id] = { ...current, status: 'canceled' };
          break;
      }
      return next;
    });
  }, []);

  const fetchInfo = useCallback(async (target: string) => {
    if (!target.trim()) return;
    setLoadingInfo(true);
    setInfoError(null);
    setInfo(null);
    lastFetchedUrl.current = target;
    try {
      const result = await window.app.fetchInfo(target.trim());
      if (lastFetchedUrl.current !== target) return;
      setInfo(result);
      setUi((prev) => {
        if (prev.selection.kind !== 'video') return prev;
        const prevSel = prev.selection;
        const max = result.formats.maxHeight || 1080;
        const target = Math.min(prevSel.maxHeight, max);
        return {
          ...prev,
          selection: {
            kind: 'video',
            maxHeight: target || max,
            preferHdr: prevSel.preferHdr && result.formats.hasHdr,
            fps60: prevSel.fps60 && result.formats.has60fps,
          },
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setInfoError(message);
    } finally {
      setLoadingInfo(false);
    }
  }, []);

  const onUrlSubmit = useCallback(
    (target: string) => {
      setUrl(target);
      void fetchInfo(target);
    },
    [fetchInfo],
  );

  const startDownload = useCallback(async () => {
    if (!info || !outputDir) return;
    const id = newId();
    const opts: DownloadOptions = {
      id,
      url,
      outputDir,
      selection: ui.selection,
      embedSubtitles: ui.embedSubtitles,
      subtitleLangs: ui.subtitleLangs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      embedThumbnail: ui.embedThumbnail,
      embedChapters: ui.embedChapters,
      sponsorBlock: { mode: ui.sponsorMode, categories: ui.sponsorCategories },
      playlist: ui.playlist && info.isPlaylist,
    };
    setDownloads((prev) => ({
      ...prev,
      [id]: {
        id,
        status: 'queued',
        title: info.title,
        thumbnail: info.thumbnail,
        url,
        outputDir,
        kind: ui.selection.kind,
        logs: [],
      },
    }));
    try {
      await window.app.startDownload(opts);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDownloads((prev) => ({
        ...prev,
        [id]: { ...prev[id], status: 'error', error: message },
      }));
    }
  }, [info, outputDir, ui, url]);

  const cancel = useCallback((id: string) => {
    void window.app.cancel(id);
  }, []);

  const removeJob = useCallback((id: string) => {
    setDownloads((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const chooseFolder = useCallback(async () => {
    const picked = await window.app.chooseFolder();
    if (picked) setOutputDir(picked);
  }, []);

  const downloadList = useMemo(
    () =>
      Object.values(downloads).sort(
        (a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0) || a.id.localeCompare(b.id),
      ),
    [downloads],
  );

  const binariesMissing =
    defaults &&
    (!defaults.binaries.ytdlpFound || !defaults.binaries.ffmpegFound);

  const canDownload = !!info && !loadingInfo && !!outputDir;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <header className="titlebar-drag flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md shadow-red-900/40">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Free YT Downloader</h1>
            <p className="text-xs text-zinc-500 leading-tight">
              4K · 1080p60 · HDR · MP3 · Subtitles · SponsorBlock
            </p>
          </div>
        </div>
        <div className="titlebar-nodrag flex items-center gap-2 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            No telemetry
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            No login
          </span>
        </div>
      </header>

      {binariesMissing && (
        <div className="px-5 py-3 bg-amber-950/40 border-b border-amber-900 text-amber-200 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            yt-dlp or ffmpeg was not found. Run{' '}
            <code className="px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-100 font-mono text-xs">
              npm run fetch-binaries
            </code>{' '}
            or install them on your PATH.
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <UrlBar
          value={url}
          loading={loadingInfo}
          onChange={setUrl}
          onSubmit={onUrlSubmit}
        />

        {infoError && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
            <div className="font-semibold mb-1">Could not read this URL</div>
            <div className="text-red-300/80 break-words">{infoError}</div>
          </div>
        )}

        {info && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <VideoPreview info={info} />
            </div>
            <div className="lg:col-span-3">
              <OptionsPanel
                info={info}
                state={ui}
                onChange={setUi}
                onSubmit={startDownload}
                canSubmit={canDownload}
              />
            </div>
          </div>
        )}

        <SettingsBar
          outputDir={outputDir}
          defaults={defaults}
          onChooseFolder={chooseFolder}
          onOpenFolder={() => outputDir && window.app.openPath(outputDir)}
        />

        <DownloadList jobs={downloadList} onCancel={cancel} onRemove={removeJob} />
      </main>

      <footer className="px-5 py-3 border-t border-zinc-900 text-xs text-zinc-500 flex items-center justify-between">
        <span>Free, open-source. Powered by yt-dlp + ffmpeg. v{defaults?.appVersion ?? '0.1.0'}</span>
        <button
          className="hover:text-zinc-300 transition"
          onClick={() => window.app.openExternal('https://github.com/yt-dlp/yt-dlp')}
        >
          About yt-dlp ↗
        </button>
      </footer>
    </div>
  );
};
