import { CheckCircle2, FolderOpen, Loader2, Music2, Trash2, Video, X, XCircle } from 'lucide-react';

export interface DownloadJob {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'error' | 'canceled';
  title: string;
  thumbnail: string;
  url: string;
  outputDir: string;
  outputFile?: string | null;
  kind: 'video' | 'audio';
  percent?: number;
  speed?: string | null;
  eta?: string | null;
  sizeTotal?: string | null;
  stage?: 'video' | 'audio' | 'merge' | 'postprocess' | 'unknown';
  error?: string;
  startedAt?: number;
  logs: string[];
}

interface Props {
  jobs: DownloadJob[];
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}

export const DownloadList = ({ jobs, onCancel, onRemove }: Props) => {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
        No downloads yet. Paste a YouTube URL above to begin.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-zinc-500 px-1">Downloads</div>
      {jobs.map((job) => (
        <JobRow key={job.id} job={job} onCancel={onCancel} onRemove={onRemove} />
      ))}
    </div>
  );
};

const stageLabel = (stage?: DownloadJob['stage']): string => {
  switch (stage) {
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'merge':
      return 'Merging';
    case 'postprocess':
      return 'Processing';
    default:
      return '';
  }
};

const JobRow = ({
  job,
  onCancel,
  onRemove,
}: {
  job: DownloadJob;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  const active = job.status === 'queued' || job.status === 'running';
  const pct = Math.max(0, Math.min(100, job.percent ?? 0));

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex gap-3 items-stretch">
      {job.thumbnail ? (
        <img
          src={job.thumbnail}
          alt=""
          referrerPolicy="no-referrer"
          className="w-24 h-14 rounded-md object-cover flex-shrink-0 bg-zinc-800"
        />
      ) : (
        <div className="w-24 h-14 rounded-md bg-zinc-800 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {job.kind === 'audio' ? (
            <Music2 className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
          ) : (
            <Video className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
          )}
          <div className="text-sm font-medium truncate">{job.title}</div>
        </div>

        <div className="mt-1.5 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full transition-all ${
              job.status === 'error'
                ? 'bg-red-500'
                : job.status === 'canceled'
                  ? 'bg-zinc-600'
                  : job.status === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${job.status === 'completed' ? 100 : pct}%` }}
          />
        </div>

        <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
          <StatusBadge job={job} />
          {active && stageLabel(job.stage) && <span>{stageLabel(job.stage)}</span>}
          {active && job.speed && <span>{job.speed}</span>}
          {active && job.eta && <span>ETA {job.eta}</span>}
          {active && job.sizeTotal && <span>{job.sizeTotal}</span>}
          {job.status === 'error' && job.error && (
            <span className="text-red-300 truncate" title={job.error}>
              {job.error}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {job.status === 'completed' && job.outputFile && (
          <IconBtn
            title="Reveal in folder"
            onClick={() => window.app.revealInFolder(job.outputFile!)}
          >
            <FolderOpen className="w-4 h-4" />
          </IconBtn>
        )}
        {active && (
          <IconBtn title="Cancel" onClick={() => onCancel(job.id)}>
            <X className="w-4 h-4" />
          </IconBtn>
        )}
        {!active && (
          <IconBtn title="Remove" onClick={() => onRemove(job.id)}>
            <Trash2 className="w-4 h-4" />
          </IconBtn>
        )}
      </div>
    </div>
  );
};

const StatusBadge = ({ job }: { job: DownloadJob }) => {
  switch (job.status) {
    case 'queued':
      return (
        <span className="inline-flex items-center gap-1 text-zinc-300">
          <Loader2 className="w-3 h-3 animate-spin" /> Queued
        </span>
      );
    case 'running':
      return (
        <span className="inline-flex items-center gap-1 text-zinc-200">
          <Loader2 className="w-3 h-3 animate-spin" /> {job.percent?.toFixed(1) ?? '0'}%
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 text-emerald-300">
          <CheckCircle2 className="w-3 h-3" /> Done
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 text-red-300">
          <XCircle className="w-3 h-3" /> Error
        </span>
      );
    case 'canceled':
      return <span className="text-zinc-500">Canceled</span>;
  }
};

const IconBtn = ({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="w-8 h-8 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 inline-flex items-center justify-center transition"
  >
    {children}
  </button>
);
