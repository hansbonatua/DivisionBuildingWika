import type { ReactNode } from "react";

export type StatKey = "projects" | "berkas" | "msl" | "users";

const icons: Record<StatKey, ReactNode> = {
  projects: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M9 20v-6h6v6M3 20h18" />
    </svg>
  ),
  berkas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M7 3h7l4 4v14H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  msl: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M4 20V4M4 20h17" />
      <path d="m7 16 3.5-4 3 2 5-7" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 0 1 0 5.8M17 14c2.3.5 4 2.5 4 5" />
    </svg>
  ),
};

const tones: Record<StatKey, string> = {
  projects: "bg-blue-50 text-secondary",
  berkas: "bg-emerald-50 text-emerald-700",
  msl: "bg-amber-50 text-amber-700",
  users: "bg-violet-50 text-violet-700",
};

export default function StatCard({
  statKey,
  label,
  value,
  hint,
  unavailable = false,
}: {
  statKey: StatKey;
  label: string;
  value: string;
  hint: string;
  unavailable?: boolean;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-outline/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-primary/55">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[statKey]}`}>
          {icons[statKey]}
        </span>
      </div>
      <p
        className={`mt-5 text-3xl font-bold tracking-tight ${
          unavailable ? "text-primary/35" : "text-primary"
        }`}
      >
        {value}
      </p>
      <p className="mt-auto pt-2 text-xs font-medium text-primary/50">{hint}</p>
    </article>
  );
}
