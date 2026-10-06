"use client";

import Link from "next/link";
import type { HeroApiItem } from "@/components/dashboard/hero/hero-api.types";
import HeroStatusBadge from "@/components/dashboard/hero/HeroStatusBadge";

type HeroTableProps = {
  heroes: HeroApiItem[];
  onDelete: (id: string) => void;
};

export default function HeroTable({ heroes, onDelete }: HeroTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-outline p-4">
        <div className="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-secondary"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <h2 className="text-lg font-bold text-primary">Daftar Slide Hero</h2>
        </div>
        <span className="text-xs font-semibold text-primary/70">{heroes.length} slide</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="bg-background text-[11px] uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 text-left font-bold">Slide</th>
              <th className="px-4 py-3 text-left font-bold">Featured Project</th>
              <th className="px-4 py-3 text-left font-bold">Location</th>
              <th className="px-4 py-3 text-left font-bold">Order</th>
              <th className="px-4 py-3 text-left font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {heroes.map((hero) => (
              <tr key={hero._id} className="border-t border-outline/40 hover:bg-background/50">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                      {hero.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={hero.imageUrl} alt={hero.imageAlt || hero.title} className="h-full w-full object-cover" />
                      ) : null}
                      <div className="absolute inset-0 bg-primary/20" />
                    </div>
                    <span className="whitespace-nowrap font-bold text-primary">{hero.title}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-primary/70">{hero.projectName}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-primary/70">{hero.location}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-lg bg-background px-1.5 py-0.5 text-[10px] font-bold text-primary/70">
                    #{hero.sortOrder}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <HeroStatusBadge
                    badge={hero.status === "active" ? hero.title : "STANDBY"}
                    active={hero.status === "active"}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <Link
                    href={`/dashboard/hero/${hero._id}/edit`}
                    className="rounded px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(hero._id)}
                    className="rounded px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
