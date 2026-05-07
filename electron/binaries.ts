import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { app } from 'electron';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isWin = process.platform === 'win32';
const exe = (name: string) => (isWin ? `${name}.exe` : name);

interface BinaryPair {
  ytdlp: string | null;
  ffmpeg: string | null;
}

let cached: BinaryPair | null = null;

const candidateRoots = (): string[] => {
  const roots: string[] = [];
  if (app.isPackaged) {
    roots.push(path.join(process.resourcesPath, 'bin'));
  }
  roots.push(path.join(__dirname, '..', 'resources', 'bin'));
  roots.push(path.join(process.cwd(), 'resources', 'bin'));
  return roots;
};

const findBundled = (name: string): string | null => {
  const filename = exe(name);
  for (const root of candidateRoots()) {
    const full = path.join(root, filename);
    if (fs.existsSync(full)) return full;
  }
  return null;
};

const findOnPath = async (name: string): Promise<string | null> => {
  const cmd = isWin ? 'where' : 'which';
  try {
    const { stdout } = await execFileP(cmd, [name]);
    const first = stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
    return first || null;
  } catch {
    return null;
  }
};

export const resolveBinaries = async (): Promise<BinaryPair> => {
  if (cached) return cached;
  const ytdlp = findBundled('yt-dlp') ?? (await findOnPath('yt-dlp'));
  const ffmpeg = findBundled('ffmpeg') ?? (await findOnPath('ffmpeg'));
  cached = { ytdlp, ffmpeg };
  return cached;
};

export const requireBinaries = async (): Promise<{ ytdlp: string; ffmpeg: string }> => {
  const { ytdlp, ffmpeg } = await resolveBinaries();
  if (!ytdlp) {
    throw new Error(
      'yt-dlp binary not found. Run "npm run fetch-binaries" or install yt-dlp on your PATH.',
    );
  }
  if (!ffmpeg) {
    throw new Error(
      'ffmpeg binary not found. Run "npm run fetch-binaries" or install ffmpeg on your PATH.',
    );
  }
  return { ytdlp, ffmpeg };
};
