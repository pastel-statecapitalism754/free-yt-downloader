#!/usr/bin/env node
import { mkdir, writeFile, chmod, rm, readdir, rename, stat } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BIN_DIR = path.join(ROOT, 'resources', 'bin');

const argv = process.argv.slice(2);
const argFor = (key) => {
  const idx = argv.indexOf(`--${key}`);
  return idx >= 0 ? argv[idx + 1] : null;
};

const targetPlatform = argFor('platform') ?? process.platform;
const targetArch = argFor('arch') ?? process.arch;
const force = argv.includes('--force');

const log = (...a) => console.log('[binaries]', ...a);

const ensureDir = async (dir) => {
  await mkdir(dir, { recursive: true });
};

const download = async (url, dest) => {
  log('downloading', url);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  if (!res.body) throw new Error(`empty body for ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
};

const ytDlpUrl = (platform, arch) => {
  const base = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download';
  if (platform === 'win32') return { url: `${base}/yt-dlp.exe`, name: 'yt-dlp.exe' };
  if (platform === 'darwin') return { url: `${base}/yt-dlp_macos`, name: 'yt-dlp' };
  if (platform === 'linux') {
    if (arch === 'arm64') return { url: `${base}/yt-dlp_linux_aarch64`, name: 'yt-dlp' };
    if (arch === 'arm') return { url: `${base}/yt-dlp_linux_armv7l`, name: 'yt-dlp' };
    return { url: `${base}/yt-dlp_linux`, name: 'yt-dlp' };
  }
  throw new Error(`unsupported platform: ${platform}`);
};

const ffmpegSource = (platform, arch) => {
  if (platform === 'darwin') {
    return {
      url: 'https://www.osxexperts.net/ffmpeg711arm.zip',
      altUrl: 'https://evermeet.cx/ffmpeg/getrelease/zip',
      kind: 'zip',
      member: 'ffmpeg',
      name: 'ffmpeg',
    };
  }
  if (platform === 'linux') {
    const archSlug =
      arch === 'arm64' ? 'arm64' : arch === 'arm' ? 'armhf' : arch === 'ia32' ? 'i686' : 'amd64';
    return {
      url: `https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-${archSlug}-static.tar.xz`,
      kind: 'tar.xz',
      member: 'ffmpeg',
      name: 'ffmpeg',
    };
  }
  if (platform === 'win32') {
    return {
      url: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
      kind: 'zip',
      member: 'ffmpeg.exe',
      name: 'ffmpeg.exe',
    };
  }
  throw new Error(`unsupported platform: ${platform}`);
};

const extractZip = async (zipPath, member, destPath) => {
  const tmp = path.join(BIN_DIR, '.unzip');
  await rm(tmp, { recursive: true, force: true });
  await ensureDir(tmp);

  const usePwsh = process.platform === 'win32';
  const result = usePwsh
    ? spawnSync(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          `Expand-Archive -LiteralPath "${zipPath}" -DestinationPath "${tmp}" -Force`,
        ],
        { stdio: 'inherit' },
      )
    : spawnSync('unzip', ['-o', zipPath, '-d', tmp], { stdio: 'inherit' });

  if (result.status !== 0) {
    throw new Error('failed to extract zip (need `unzip` on Linux/macOS, or PowerShell on Windows)');
  }

  const found = await findFile(tmp, member);
  if (!found) throw new Error(`could not locate ${member} in ${zipPath}`);
  await rename(found, destPath);
  await rm(tmp, { recursive: true, force: true });
};

const extractTarXz = async (archivePath, member, destPath) => {
  const tmp = path.join(BIN_DIR, '.untar');
  await rm(tmp, { recursive: true, force: true });
  await ensureDir(tmp);
  const result = spawnSync('tar', ['-xJf', archivePath, '-C', tmp], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('failed to extract tar.xz (need `tar` with xz support)');
  const found = await findFile(tmp, member);
  if (!found) throw new Error(`could not locate ${member} in ${archivePath}`);
  await rename(found, destPath);
  await rm(tmp, { recursive: true, force: true });
};

const findFile = async (dir, name) => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findFile(full, name);
      if (nested) return nested;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
};

const fetchYtDlp = async (platform, arch) => {
  const { url, name } = ytDlpUrl(platform, arch);
  const dest = path.join(BIN_DIR, name);
  if (existsSync(dest) && !force) {
    log('yt-dlp already present, skipping (use --force to redownload)');
    return;
  }
  await download(url, dest);
  await chmod(dest, 0o755).catch(() => {});
  log('yt-dlp ready at', dest);
};

const fetchFfmpeg = async (platform, arch) => {
  const dest = path.join(BIN_DIR, platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (existsSync(dest) && !force) {
    log('ffmpeg already present, skipping (use --force to redownload)');
    return;
  }
  const src = ffmpegSource(platform, arch);
  const archivePath = path.join(BIN_DIR, `.ffmpeg-archive`);
  let downloaded = false;
  try {
    await download(src.url, archivePath);
    downloaded = true;
  } catch (err) {
    if (src.altUrl) {
      log('primary ffmpeg URL failed, trying fallback…');
      await download(src.altUrl, archivePath);
      downloaded = true;
    } else {
      throw err;
    }
  }
  if (!downloaded) throw new Error('ffmpeg download failed');

  const tmpExtract = path.join(BIN_DIR, '.ffmpeg-out');
  await rm(tmpExtract, { recursive: true, force: true });

  if (src.kind === 'zip') {
    await extractZip(archivePath, src.member, dest);
  } else if (src.kind === 'tar.xz') {
    await extractTarXz(archivePath, src.member, dest);
  }
  await rm(archivePath, { force: true });
  await chmod(dest, 0o755).catch(() => {});
  const stats = await stat(dest);
  log(`ffmpeg ready at ${dest} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
};

const main = async () => {
  log(`platform=${targetPlatform} arch=${targetArch}`);
  await ensureDir(BIN_DIR);
  await fetchYtDlp(targetPlatform, targetArch);
  await fetchFfmpeg(targetPlatform, targetArch);
  log('done.');
};

main().catch((err) => {
  console.error('[binaries] failed:', err.message);
  process.exit(1);
});
