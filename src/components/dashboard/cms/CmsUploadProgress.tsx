"use client";

// Upload progress for a CMS image field. Rendered only while an upload is in
// flight; exposes a real progressbar role plus a polite live region so screen
// readers announce the percentage change.

type CmsUploadProgressProps = {
  percent: number | null;
  label?: string;
};

export default function CmsUploadProgress({
  percent,
  label = "Mengunggah gambar...",
}: CmsUploadProgressProps) {
  const value = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className="rounded-lg border border-secondary/30 bg-blue-50/60 px-3.5 py-2.5">
      <p className="text-xs font-semibold text-primary" aria-live="polite">
        {label} {value}%
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="mt-2 h-1.5 w-full overflow-hidden rounded bg-white"
      >
        <div
          className="h-1.5 rounded bg-secondary transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
