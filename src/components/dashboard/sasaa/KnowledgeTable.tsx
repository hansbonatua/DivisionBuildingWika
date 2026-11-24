"use client";

import { useState } from "react";
import {
  readApiErrorMessage,
  type SasaaKnowledgeCategoryKey,
  type SasaaKnowledgePage,
} from "./types";

// Knowledge Management block: three submenus in the left column, up to three
// bullet items each in the right column. Paging is server-driven through
// GET /api/dashboard/sasaa/[projectId]/knowledge?page=N, so the initial payload
// stays small and the table never loads every record.

const ROWS: ReadonlyArray<{ key: SasaaKnowledgeCategoryKey; label: string }> = [
  { key: "lesson_learn", label: "LL" },
  { key: "va_ve", label: "VA/VE" },
  { key: "best_practice", label: "KI/KM" },
];

const MAX_ITEMS = 3;

function knowledgeEndpoint(projectId: string, page: number): string {
  return `/api/dashboard/sasaa/${encodeURIComponent(projectId)}/knowledge?page=${page}`;
}

export default function KnowledgeTable({
  initial,
  projectId,
}: {
  initial: SasaaKnowledgePage;
  projectId: string;
}) {
  const [page, setPage] = useState<SasaaKnowledgePage>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empty = page.counts.total === 0;

  async function goTo(target: number): Promise<void> {
    if (loading || target < 1) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(knowledgeEndpoint(projectId, target), {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          await readApiErrorMessage(response, "Gagal memuat knowledge."),
        );
      }
      const body = (await response.json()) as { data?: SasaaKnowledgePage };
      if (!body.data || !body.data.byCategory) {
        throw new Error("Respons knowledge tidak valid.");
      }
      const next = body.data;
      const hasAnyItem = ROWS.some(
        (row) => (next.byCategory[row.key] ?? []).length > 0,
      );
      // A page with no rows in any submenu is a dead end (the counts say there
      // is nothing to show): fall back to page 1 instead of trapping the user
      // on an empty page with no way back.
      setPage(hasAnyItem ? next : { ...next, page: 1 });
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Gagal memuat knowledge.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="sasaa-knowledge-title"
      className="rounded-2xl border border-outline/70 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="sasaa-knowledge-title" className="text-sm font-bold text-primary">
            Knowledge Management
          </h2>
          <p className="mt-0.5 text-xs text-primary/50">
            {page.counts.total} catatan · {page.perCategory} per kategori per halaman
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void goTo(page.page - 1)}
            disabled={page.page <= 1 || loading}
            className="rounded-lg border border-outline px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs font-semibold text-primary/60">
            Hal. {page.page}
          </span>
          <button
            type="button"
            onClick={() => void goTo(page.page + 1)}
            disabled={!page.hasMore || loading}
            className="rounded-lg border border-outline px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {empty ? (
        <p className="mt-4 rounded-xl border border-dashed border-outline bg-background p-6 text-center text-xs font-semibold text-primary/55">
          Belum ada knowledge untuk proyek ini
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-outline/70">
          <table className="w-full table-fixed border-collapse text-left">
            <tbody>
              {ROWS.map((row) => {
                const items = (page.byCategory[row.key] ?? []).slice(0, MAX_ITEMS);
                return (
                  <tr key={row.key} className="border-b border-outline/60 last:border-b-0">
                    <th
                      scope="row"
                      className="w-24 border-r border-outline/60 bg-background px-3 py-3 align-top text-xs font-bold text-primary"
                    >
                      {row.label}
                    </th>
                    <td className="px-3 py-3 align-top">
                      {items.length === 0 ? (
                        <span className="text-xs text-primary/40">—</span>
                      ) : (
                        <ul className="space-y-1.5">
                          {items.map((item) => (
                            <li
                              key={item.id}
                              className="flex gap-1.5 text-xs leading-relaxed text-primary/75"
                            >
                              <span aria-hidden="true" className="text-primary/40">
                                •
                              </span>
                              <span className="line-clamp-2">{item.content}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
