"use client";

import { useEffect, useId, useRef, useState } from "react";

// Searchable Master Project picker. The canonical Master Project is the only
// project source: this control searches GET
// /api/engineering-database/project-options (narrow feed, SQL-level LIMIT 50)
// and yields { id, name, location }. Free-text project creation does not exist.

export type ProjectOption = {
  id: string;
  name: string;
  location: string;
};

const SEARCH_DEBOUNCE_MS = 300;
const OPTION_LIMIT = 50;

function optionLabel(option: ProjectOption): string {
  return `${option.name} \u2014 ${option.location}`;
}

function isProjectOption(value: unknown): value is ProjectOption {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ProjectOption).id === "string" &&
    typeof (value as ProjectOption).name === "string" &&
    typeof (value as ProjectOption).location === "string"
  );
}

export default function EngineeringDatabaseProjectCombobox({
  id,
  value,
  onChange,
  disabled,
  invalid,
}: {
  id?: string;
  value: ProjectOption | null;
  onChange: (option: ProjectOption | null) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const generatedId = useId();
  const inputId = id ?? `project-combobox-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  // `typed` is null until the user edits the field; while it is null the field
  // shows the selected project, which keeps the display derived instead of
  // synced through an effect.
  const [typed, setTyped] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const requestIdRef = useRef(0);

  const searchTerm = typed?.trim() ?? "";
  const displayText = typed ?? (value ? optionLabel(value) : "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchTerm);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    async function loadOptions(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query !== "") {
          params.set("q", query);
        }
        const suffix = params.toString();
        const response = await fetch(
          `/api/engineering-database/project-options${suffix ? `?${suffix}` : ""}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = (await response.json()) as { data?: unknown };
        if (!Array.isArray(body.data)) {
          throw new Error("INVALID_RESPONSE");
        }
        if (!active || requestId !== requestIdRef.current) {
          return;
        }
        setOptions(body.data.filter(isProjectOption));
        setHighlight(0);
      } catch {
        if (!active || controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setOptions([]);
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
  }, [open, query]);

  function selectOption(option: ProjectOption): void {
    onChange(option);
    setTyped(null);
    setOpen(false);
    setHighlight(0);
  }

  function clearSelection(): void {
    onChange(null);
    setTyped(null);
    setOpen(false);
  }

  function resetField(): void {
    setTyped(null);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((current) => Math.min(current + 1, Math.max(options.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      if (open && options[highlight]) {
        event.preventDefault();
        selectOption(options[highlight]);
      }
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        resetField();
      }
      return;
    }
    if (event.key === "Tab") {
      if (open) {
        resetField();
      }
    }
  }

  const showList = open && !disabled;

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && options[highlight] ? `${listboxId}-${options[highlight].id}` : undefined
          }
          aria-invalid={invalid ? true : undefined}
          autoComplete="off"
          disabled={disabled}
          value={displayText}
          placeholder="Cari nama atau lokasi proyek..."
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setTyped(event.target.value);
            setOpen(true);
            if (value) {
              onChange(null);
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Deferred so an option's click lands before the field resets.
            window.setTimeout(resetField, 120);
          }}
          className={`h-10 w-full rounded-lg border bg-white px-3.5 pr-16 text-xs font-semibold text-primary placeholder:text-primary/40 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50 ${
            invalid
              ? "border-red-300 focus:border-red-500 focus:ring-red-200"
              : "border-outline/60 focus:border-secondary focus:ring-secondary/20"
          }`}
        />
        {value && !disabled ? (
          <button
            type="button"
            aria-label="Kosongkan pilihan proyek"
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
          {loading && options.length === 0 ? (
            <p className="px-3 py-3 text-xs font-medium text-primary/60">Memuat proyek...</p>
          ) : error ? (
            <p role="alert" className="px-3 py-3 text-xs font-semibold text-red-700">
              {error}
            </p>
          ) : options.length === 0 ? (
            <p className="px-3 py-3 text-xs font-medium text-primary/60">
              Tidak ada Master Project yang cocok.
            </p>
          ) : (
            <>
              {options.map((option, index) => {
                const isSelected = value?.id === option.id;
                return (
                  <button
                    key={option.id}
                    id={`${listboxId}-${option.id}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setHighlight(index)}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors ${
                      index === highlight ? "bg-blue-50" : "bg-white"
                    }`}
                  >
                    <span className="text-xs font-semibold text-primary">{option.name}</span>
                    <span className="text-[11px] text-primary/50">{option.location}</span>
                  </button>
                );
              })}
              {options.length >= OPTION_LIMIT ? (
                <p className="border-t border-outline/60 px-3 py-2 text-[11px] text-primary/50">
                  Menampilkan maksimal {OPTION_LIMIT} proyek. Perjelas pencarian untuk
                  mempersempit hasil.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
