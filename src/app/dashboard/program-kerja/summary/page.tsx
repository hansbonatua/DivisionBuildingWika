"use client";

import Link from "next/link";

export default function ProgramKerjaSummaryPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Summary Report Program Kerja</h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Dashboard monitoring Program Kerja Engineering.
        </p>
      </div>

      <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-primary/70">
          Summary Report Program Kerja coming soon.
        </p>
        <p className="mt-2 text-sm text-primary/50">
          Fitur ini akan menyediakan ringkasan KPI, chart performa, dan ringkasan status Program Kerja.
        </p>
      </div>

      <div className="mt-6">
        <a
          href="/dashboard/program-kerja/manage"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-150 hover:bg-secondary"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
          <span>Kembali ke Kelola Program Kerja</span>
        </a>
      </div>
    </div>
  );
}