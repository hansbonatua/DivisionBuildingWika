"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KnowledgeProjectOptionDto } from "@/components/dashboard/knowledge-management/types";

// Native searchable Master Project combobox used by both the Add/Edit form
// (remote mode, narrow project-options feed) and the table filter (local mode,
// options derived from the already-loaded records). No dropdown library.
//
// Remote behavior is preserved from the original form-local implementation:
// 250 ms debounce, AbortController + request id, 50-row notice, and the same
// keyboard/ARIA contract. Local mode never fetches.

const SEARCH_DEBOUNCE_MS = 250;
const PROJECT_OPTION_LIMIT = 50;
const LOCAL_OPTION_LIMIT = 50;

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";

export type KnowledgeProjectComboboxProps = {
  mode: "remote" | "local";
  value: KnowledgeProjectOptionDto | null;
  onChange: (project: KnowledgeProjectOptionDto | null) => void;
  /** Local mode only. Remote mode loads from /project-options. */
  options?: KnowledgeProjectOptionDto[];
  allowClear?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
};

function isProjectOption(value: unknown): value is KnowledgeProjectOptionDto {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as KnowledgeProjectOptionDto).project_id === "string" &&
    typeof (value as KnowledgeProjectOptionDto).name === "string" &&
    typeof (value as KnowledgeProjectOptionDto).location === "string" &&
    typeof (value as KnowledgeProjectOptionDto).year === "number"
  );
}

function optionLabel(option: KnowledgeProjectOptionDto): string {
  return `${option.name} — ${option.location} (${option.year})`;
}

export default function KnowledgeProjectCombobox({
  mode,
  value,
  onChange,
  options = [],
  allowClear = false,
  disabled = false,
  placeholder = "Cari nama atau lokasi proyek...",
  className,
  autoFocus,
  ariaLabel = "Master Project",
}: KnowledgeProjectComboboxProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  // `typed` is null until the user edits the field; while null the field shows
  // the selected project, keeping the display derived instead of synced.
  const [typed, setTyped] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [remoteOptions, setRemoteOptions] = useState<KnowledgeProjectOptionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const requestIdRef = useRef(0);

  const searchTerm = typed?.trim() ?? "";
  const displayText = typed ?? (value ? optionLabel(value) : "");
  const showList = open && !disabled;

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchTerm), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (mode !== "remote" || !open) return;
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    async function loadOptions(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query !== "") params.set("q", query);
        const suffix = params.toString();
        const response = await fetch(
          `/api/knowledge-management/project-options${suffix ? `?${suffix}` : ""}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { data?: unknown };
        if (!Array.isArray(body.data)) throw new Error("INVALID_RESPONSE");
        if (!active || requestId !== requestIdRef.current) return;
        setRemoteOptions(body.data.filter(isProjectOption));
        setHighlight(0);
      } catch {
        if (!active || controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setRemoteOptions([]);
        setError("Gagal memuat daftar Master Project.");
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }

    void loadOptions();
    return () => {
      active = false;
      controller.abort();
    };
  }, [mode, open, query]);

  const localOptions = useMemo(() => {
    if (mode !== "local") return [];
    const term = searchTerm.toLowerCase();
    if (term === "") return options;
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(term) ||
        option.location.toLowerCase().includes(term),
    );
  }, [mode, options, searchTerm]);

  const visibleOptions = mode === "local" ? localOptions : remoteOptions;

  function selectOption(option: KnowledgeProjectOptionDto): void {
    onChange(option);
    setTyped(null);
    setOpen(false);
    setHighlight(0);
  }

  function clearSelection(): void {
    onChange(null);
    setTyped(null);
    setOpen(false);
    setHighlight(0);
  }

  function resetField(): void {
    setTyped(null);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!showList) {
        setOpen(true);
        return;
      }
      setHighlight((current) =>
        Math.min(current + 1, Math.max(visibleOptions.length - 1, 0)),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" && showList && visibleOptions[highlight]) {
      event.preventDefault();
      selectOption(visibleOptions[highlight]);
      return;
    }
    if (event.key === "Escape" && showList) {
      event.preventDefault();
      event.stopPropagation();
      resetField();
      return;
    }
    if (event.key === "Tab" && showList) {
      resetField();
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && visibleOptions[highlight]
              ? `${listboxId}-${visibleOptions[highlight].project_id}`
              : undefined
          }
          autoComplete="off"
          disabled={disabled}
          data-autofocus={autoFocus ? "true" : undefined}
          value={displayText}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setTyped(event.target.value);
            setOpen(true);
            setHighlight(0);
            if (value) onChange(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => window.setTimeout(resetField, 120)}
          className={`${inputClass} ${allowClear ? "pr-16" : "pr-10"} ${className ?? ""}`}
        />
        {allowClear && value && !disabled ? (
          <button
            type="button"
            aria-label="Kosongkan pilihan proyek"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSelection}
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        ) : null}
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
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      {showList ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Pilihan Master Project"
          className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-outline bg-white shadow-lg"
        >
          {mode === "remote" && loading && visibleOptions.length === 0 ? (
            <p className="px-3 py-3 text-xs font-medium text-primary/60">Memuat proyek...</p>
          ) : error ? (
            <p role="alert" className="px-3 py-3 text-xs font-semibold text-red-700">
              {error}
            </p>
          ) : visibleOptions.length === 0 ? (
            <p className="px-3 py-3 text-xs font-medium text-primary/60">
              Tidak ada Master Project yang cocok.
            </p>
          ) : (
            <>
              {visibleOptions.map((option, index) => (
                <button
                  key={option.project_id}
                  id={`${listboxId}-${option.project_id}`}
                  type="button"
                  role="option"
                  aria-selected={value?.project_id === option.project_id}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => selectOption(option)}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors ${
                    index === highlight ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  <span className="text-xs font-semibold text-primary">{option.name}</span>
                  <span className="text-[11px] text-primary/50">
                    {option.location} · {option.year}
                  </span>
                </button>
              ))}
              {mode === "remote" && visibleOptions.length >= PROJECT_OPTION_LIMIT ? (
                <p className="border-t border-outline/60 px-3 py-2 text-[11px] text-primary/50">
                  Menampilkan maksimal {PROJECT_OPTION_LIMIT} proyek. Perjelas pencarian untuk
                  mempersempit hasil.
                </p>
              ) : null}
              {mode === "local" && visibleOptions.length >= LOCAL_OPTION_LIMIT ? (
                <p className="border-t border-outline/60 px-3 py-2 text-[11px] text-primary/50">
                  Menampilkan {visibleOptions.length} proyek. Ketik untuk mempersempit hasil.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
