import { contextBridge, ipcRenderer } from 'electron';
import type { DownloadEvent, DownloadOptions, VideoInfo } from './types.js';

interface AppDefaults {
  downloadDir: string;
  platform: NodeJS.Platform;
  appVersion: string;
  binaries: {
    ytdlp: string | null;
    ffmpeg: string | null;
    ytdlpFound: boolean;
    ffmpegFound: boolean;
  };
}

const api = {
  getDefaults: (): Promise<AppDefaults> => ipcRenderer.invoke('app:get-defaults'),
  chooseFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:choose-folder'),
  openPath: (target: string): Promise<void> => ipcRenderer.invoke('shell:open-path', target),
  revealInFolder: (target: string): Promise<void> => ipcRenderer.invoke('shell:reveal', target),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:open-external', url),
  fetchInfo: (url: string): Promise<VideoInfo> => ipcRenderer.invoke('yt:fetch-info', url),
  startDownload: (opts: DownloadOptions): Promise<{ id: string }> =>
    ipcRenderer.invoke('yt:start-download', opts),
  cancel: (id: string): Promise<void> => ipcRenderer.invoke('yt:cancel', id),
  onEvent: (handler: (event: DownloadEvent) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: DownloadEvent) => handler(payload);
    ipcRenderer.on('yt:event', listener);
    return () => ipcRenderer.removeListener('yt:event', listener);
  },
};

contextBridge.exposeInMainWorld('app', api);

export type AppApi = typeof api;
