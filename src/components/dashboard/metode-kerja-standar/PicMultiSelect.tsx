"use client";

import { useEffect, useMemo, useState } from "react";

export type PicOption = {
  user_id: string;
  name: string;
  status: string;
  position: string;
};

// PIC picker for Metode Kerja Standar.
//
// D-D-04: this is intentionally a duplicate of the Knowledge Management V2
// picker instead of an extracted shared component. The KM picker is wired into
// KnowledgeFormDialog state and cannot be lifted without touching that frozen
// module, so MKS gets its own copy with a clean, minimal API. Extracting a
// shared <PicMultiSelect> is recorded tech debt for after MKS is stable.
//
// Eligibility (Head Office only) is enforced by the API. This component renders
// exactly what /api/metode-kerja-standar/pic-options returns and keeps
// suspended users selectable, labelled "(non-aktif)".

export function mergePicOptions(
  current: PicOption[],
  incoming: PicOption[],
): PicOption[] {
  const byId = new Map(current.map((option) => [option.user_id, option]));
  for (const option of incoming) {
    byId.set(option.user_id, option);
  }
  return [...byId.values()];
}

export function filterPicOptions(
  options: PicOption[],
  term: string,
): PicOption[] {
  const needle = term.trim().toLowerCase();
  if (needle === "") return options;
  return options.filter(
    (option) =>
      option.name.toLowerCase().includes(needle) ||
      option.position.toLowerCase().includes(needle),
  );
}

export function togglePicId(ids: readonly string[], userId: string): string[] {
  return ids.includes(userId)
    ? ids.filter((id) => id !== userId)
    : [...ids, userId];
}

export function picOptionLabel(option: PicOption): string {
  return option.status === "active" ? option.name : `${option.name} (non-aktif)`;
}

export default function PicMultiSelect({
  id,
  value,
  onChange,
  initialOptions,
  disabled = false,
  required = false,
  hint,
}: {
  id: string;
  value: string[];
  onChange: (ids: string[]) => void;
  initialOptions?: PicOption[];
  disabled?: boolean;
  required?: boolean;
  hint?: string;
}) {
  const searchId = `${id}-search`;
  const [options, setOptions] = useState<PicOption[]>(initialOptions ?? []);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadPicOptions(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/metode-kerja-standar/pic-options", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          if (active) {
            setError("Anda tidak memiliki akses ke daftar PIC.");
          }
          return;
        }
        if (!response.ok) throw new Error("LOAD_FAILED");
        const body = (await response.json()) as { data?: unknown };
        if (!Array.isArray(body.data)) throw new Error("INVALID_RESPONSE");

        const incoming: PicOption[] = [];
        for (const item of body.data) {
          if (typeof item !== "object" || item === null) continue;
          const candidate = item as Partial<PicOption>;
          if (
            typeof candidate.user_id === "string" &&
            typeof candidate.name === "string" &&
            typeof candidate.status === "string"
          ) {
            incoming.push({
              user_id: candidate.user_id,
              name: candidate.name,
              status: candidate.status,
              position:
                typeof candidate.position === "string" ? candidate.position : "",
            });
          }
        }
        if (active) {
          setOptions((current) => mergePicOptions(current, incoming));
        }
      } catch {
        if (!active || controller.signal.aborted) return;
        setError("Gagal memuat daftar PIC.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPicOptions();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  const filtered = useMemo(
    () => filterPicOptions(options, search),
    [options, search],
  );
  const selected = useMemo(
    () =>
      value.map((userId) => ({
        userId,
        option: options.find((option) => option.user_id === userId) ?? null,
      })),
    [options, value],
  );

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">
          PIC{required ? <span className="text-red-700"> *</span> : null}
        </span>
        <span
          className={`text-[11px] font-semibold ${
            required && value.length === 0 ? "text-amber-700" : "text-primary/50"
          }`}
        >
          {value.length} dipilih
        </span>
      </div>

      {selected.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {selected.map(({ userId, option }) => (
            <li key={userId}>
              <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-primary/75">
                <span>{option ? picOptionLabel(option) : "PIC tidak dikenal"}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(value.filter((id) => id !== userId))}
                  aria-label={`Hapus PIC ${option?.name ?? userId}`}
                  className="rounded-full px-1 text-primary/40 transition-colors hover:bg-white hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <label htmlFor={searchId} className="sr-only">
        Cari PIC
      </label>
      <input
        id={searchId}
        type="search"
        value={search}
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Cari nama PIC..."
        className="mb-2 h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50"
      />

      <div className="max-h-44 overflow-y-auto rounded-lg border border-outline/60 bg-white p-2">
        {loading && options.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-primary/50">Memuat opsi PIC...</p>
        ) : error ? (
          <div className="flex flex-wrap items-center gap-2 px-1 py-2">
            <p role="alert" className="text-[11px] font-semibold text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => setReloadToken((token) => token + 1)}
              className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700"
            >
              Coba Lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-primary/50">
            {options.length === 0
              ? "Belum ada PIC Head Office."
              : "Tidak ada PIC yang cocok dengan pencarian."}
          </p>
        ) : (
          filtered.map((option) => (
            <label
              key={option.user_id}
              className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1.5 text-[11px] font-medium text-primary/80 hover:bg-background"
            >
              <input
                type="checkbox"
                checked={value.includes(option.user_id)}
                disabled={disabled}
                onChange={() => onChange(togglePicId(value, option.user_id))}
                className="mt-0.5"
              />
              <span>
                {option.name}
                {option.status !== "active" ? (
                  <span className="ml-1 text-primary/40">(non-aktif)</span>
                ) : null}
                {option.status === "active" && option.position.trim() !== "" ? (
                  <span className="ml-1 text-primary/40">· {option.position}</span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>

      <p className="mt-1 text-[11px] text-primary/45">
        {hint ?? "Hanya user Head Office. Status suspended tetap dapat dipilih."}
      </p>
    </div>
  );
}
