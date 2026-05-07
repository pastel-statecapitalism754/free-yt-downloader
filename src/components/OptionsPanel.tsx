import { Download, Music2, Video } from 'lucide-react';
import type {
  DownloadKind,
  SponsorBlockCategory,
  SponsorBlockMode,
  VideoInfo,
} from '../types.js';

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

interface Props {
  info: VideoInfo;
  state: UiState;
  onChange: (next: UiState) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

const HEIGHT_PRESETS = [2160, 1440, 1080, 720, 480, 360];
const AUDIO_FORMATS: Array<DownloadKind & { kind: 'audio' }> = [
  { kind: 'audio', format: 'mp3', bitrateKbps: 192 },
  { kind: 'audio', format: 'm4a', bitrateKbps: 192 },
  { kind: 'audio', format: 'opus', bitrateKbps: 160 },
];

const SPONSOR_OPTIONS: Array<{ id: SponsorBlockCategory; label: string }> = [
  { id: 'sponsor', label: 'Sponsor' },
  { id: 'selfpromo', label: 'Self promo' },
  { id: 'intro', label: 'Intro' },
  { id: 'outro', label: 'Outro' },
  { id: 'preview', label: 'Preview/recap' },
  { id: 'filler', label: 'Filler' },
  { id: 'interaction', label: 'Subscribe begs' },
  { id: 'music_offtopic', label: 'Non-music (music videos)' },
];

export const OptionsPanel = ({ info, state, onChange, onSubmit, canSubmit }: Props) => {
  const isAudio = state.selection.kind === 'audio';
  const maxAvailable = info.formats.maxHeight || 1080;

  const setKind = (kind: 'video' | 'audio') => {
    if (kind === 'audio') {
      onChange({
        ...state,
        selection: { kind: 'audio', format: 'mp3', bitrateKbps: 192 },
      });
    } else {
      onChange({
        ...state,
        selection: {
          kind: 'video',
          maxHeight: Math.min(1080, maxAvailable),
          preferHdr: false,
          fps60: info.formats.has60fps,
        },
      });
    }
  };

  const setHeight = (h: number) => {
    if (state.selection.kind !== 'video') return;
    onChange({ ...state, selection: { ...state.selection, maxHeight: h } });
  };

  const setVideoBool = (key: 'preferHdr' | 'fps60', val: boolean) => {
    if (state.selection.kind !== 'video') return;
    onChange({ ...state, selection: { ...state.selection, [key]: val } });
  };

  const setAudio = (audio: DownloadKind & { kind: 'audio' }) => {
    onChange({ ...state, selection: audio });
  };

  const toggleSponsor = (cat: SponsorBlockCategory) => {
    const has = state.sponsorCategories.includes(cat);
    onChange({
      ...state,
      sponsorCategories: has
        ? state.sponsorCategories.filter((c) => c !== cat)
        : [...state.sponsorCategories, cat],
    });
  };

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <KindButton
          active={!isAudio}
          icon={<Video className="w-4 h-4" />}
          title="Video"
          subtitle="MP4 with audio"
          onClick={() => setKind('video')}
        />
        <KindButton
          active={isAudio}
          icon={<Music2 className="w-4 h-4" />}
          title="Audio only"
          subtitle="MP3 / M4A / Opus"
          onClick={() => setKind('audio')}
        />
      </div>

      {!isAudio && state.selection.kind === 'video' && (
        <div className="space-y-3">
          <Section label="Resolution">
            <div className="flex flex-wrap gap-1.5">
              {HEIGHT_PRESETS.map((h) => {
                const disabled = maxAvailable > 0 && h > maxAvailable;
                const active = state.selection.kind === 'video' && state.selection.maxHeight === h;
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={disabled}
                    onClick={() => setHeight(h)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      active
                        ? 'bg-red-600 border-red-500 text-white'
                        : disabled
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                    }`}
                  >
                    {h}p{h >= 2160 ? ' (4K)' : h >= 1440 ? ' (2K)' : ''}
                  </button>
                );
              })}
            </div>
          </Section>

          <div className="flex gap-4">
            <Toggle
              label="60 fps"
              checked={state.selection.fps60}
              disabled={!info.formats.has60fps}
              onChange={(v) => setVideoBool('fps60', v)}
              hint={info.formats.has60fps ? null : 'Not available'}
            />
            <Toggle
              label="HDR"
              checked={state.selection.preferHdr}
              disabled={!info.formats.hasHdr}
              onChange={(v) => setVideoBool('preferHdr', v)}
              hint={info.formats.hasHdr ? null : 'Not available'}
            />
          </div>
        </div>
      )}

      {isAudio && state.selection.kind === 'audio' && (
        <Section label="Audio format">
          <div className="flex flex-wrap gap-1.5">
            {AUDIO_FORMATS.map((a) => {
              const active =
                state.selection.kind === 'audio' && state.selection.format === a.format;
              return (
                <button
                  key={a.format}
                  type="button"
                  onClick={() => setAudio(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    active
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  {a.format.toUpperCase()} · {a.bitrateKbps}k
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section label="Subtitles & metadata">
        <div className="flex flex-wrap gap-x-5 gap-y-2 items-center">
          <Toggle
            label="Embed subtitles"
            checked={state.embedSubtitles}
            onChange={(v) => onChange({ ...state, embedSubtitles: v })}
          />
          <Toggle
            label="Embed thumbnail"
            checked={state.embedThumbnail}
            onChange={(v) => onChange({ ...state, embedThumbnail: v })}
          />
          <Toggle
            label="Embed chapters"
            checked={state.embedChapters}
            onChange={(v) => onChange({ ...state, embedChapters: v })}
          />
        </div>
        {state.embedSubtitles && (
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs text-zinc-400">Languages</label>
            <input
              type="text"
              value={state.subtitleLangs}
              onChange={(e) => onChange({ ...state, subtitleLangs: e.target.value })}
              placeholder="en, es, fr"
              className="px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs outline-none focus:border-red-500/50 w-48"
            />
            <span className="text-xs text-zinc-500">comma-separated, or `all`</span>
          </div>
        )}
      </Section>

      <Section label="SponsorBlock">
        <div className="flex gap-1.5 mb-2">
          {(['off', 'mark', 'remove'] as SponsorBlockMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ ...state, sponsorMode: mode })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                state.sponsorMode === mode
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {mode === 'off' ? 'Off' : mode === 'mark' ? 'Mark as chapters' : 'Cut from file'}
            </button>
          ))}
        </div>
        {state.sponsorMode !== 'off' && (
          <div className="flex flex-wrap gap-1.5">
            {SPONSOR_OPTIONS.map((opt) => {
              const active = state.sponsorCategories.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleSponsor(opt.id)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition ${
                    active
                      ? 'bg-emerald-700/40 border-emerald-600/60 text-emerald-100'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {info.isPlaylist && (
        <Section label="Playlist">
          <Toggle
            label={`Download all ${info.playlistCount ?? ''} videos in playlist`}
            checked={state.playlist}
            onChange={(v) => onChange({ ...state, playlist: v })}
          />
        </Section>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="w-full px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition"
      >
        <Download className="w-4 h-4" /> Download
      </button>
    </div>
  );
};

const KindButton = ({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left p-3 rounded-lg border transition ${
      active
        ? 'bg-red-600/15 border-red-500/60 ring-1 ring-red-500/30'
        : 'bg-zinc-800/60 border-zinc-700 hover:bg-zinc-800'
    }`}
  >
    <div className="flex items-center gap-2 text-sm font-medium">
      {icon} {title}
    </div>
    <div className="text-xs text-zinc-400 mt-0.5">{subtitle}</div>
  </button>
);

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1.5">
      {label}
    </div>
    {children}
  </div>
);

const Toggle = ({
  label,
  checked,
  onChange,
  disabled = false,
  hint = null,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string | null;
}) => (
  <label
    className={`inline-flex items-center gap-2 text-sm ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="accent-red-500 w-4 h-4"
    />
    <span>{label}</span>
    {hint && <span className="text-xs text-zinc-500">({hint})</span>}
  </label>
);
