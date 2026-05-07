import { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { resolveBinaries } from './binaries.js';
import {
  fetchInfo,
  startDownload,
  cancelDownload,
  cancelAllDownloads,
} from './ytdlp.js';
import type { DownloadOptions } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

let win: BrowserWindow | null = null;

const defaultDownloadDir = (): string => {
  const downloads = path.join(os.homedir(), 'Downloads');
  const target = path.join(downloads, 'Free YT Downloader');
  try {
    fs.mkdirSync(target, { recursive: true });
  } catch {
    return downloads;
  }
  return target;
};

const createWindow = () => {
  win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    backgroundColor: '#09090b',
    title: 'Free YT Downloader',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  nativeTheme.themeSource = 'dark';

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => {
    win = null;
  });
};

app.on('window-all-closed', () => {
  cancelAllDownloads();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(() => {
  createWindow();
});

const sendToWindow = (channel: string, payload: unknown) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

ipcMain.handle('app:get-defaults', async () => {
  const bins = await resolveBinaries();
  return {
    downloadDir: defaultDownloadDir(),
    platform: process.platform,
    appVersion: app.getVersion(),
    binaries: {
      ytdlp: bins.ytdlp,
      ffmpeg: bins.ffmpeg,
      ytdlpFound: !!bins.ytdlp && fs.existsSync(bins.ytdlp),
      ffmpegFound: !!bins.ffmpeg && fs.existsSync(bins.ffmpeg),
    },
  };
});

ipcMain.handle('dialog:choose-folder', async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('shell:open-path', async (_e, target: string) => {
  if (!target) return;
  await shell.openPath(target);
});

ipcMain.handle('shell:reveal', async (_e, target: string) => {
  if (!target) return;
  shell.showItemInFolder(target);
});

ipcMain.handle('shell:open-external', async (_e, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle('yt:fetch-info', async (_e, url: string) => {
  return fetchInfo(url);
});

ipcMain.handle('yt:start-download', async (_e, opts: DownloadOptions) => {
  return startDownload(opts, (event) => sendToWindow('yt:event', event));
});

ipcMain.handle('yt:cancel', async (_e, id: string) => {
  cancelDownload(id);
});
