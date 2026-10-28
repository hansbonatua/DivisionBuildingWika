// MSL Engineering — pure score & category engine.
//
// Dependency-free on purpose: no database, no server-only imports, no side
// effects. The exact same module is used by the future repository/service layer
// and by Client Components, so the number a user sees and the category the
// backend stores/permission-checks can never disagree.
//
// Two derived values, zero stored duplicates:
//   engineering_value, metode_kerja, engineering_execution
//        -> score (2 decimals)
//        -> category (band of the ROUNDED score)

// Canonical category keys — single source of truth. These exact strings are
// what the MSL module stores/exposes later; UI labels come from
// MSL_CATEGORY_LABELS, never from ad-hoc literals.
export const MSL_CATEGORIES = [
  "TIDAK_PEDULI",
  "PEDULI",
  "TAHAP_BELAJAR",
  "KOMPETEN",
  "PENGAJAR",
  "BERINOVASI",
] as const;

export type MslCategory = (typeof MSL_CATEGORIES)[number];

export const MSL_CATEGORY_LABELS: Record<MslCategory, string> = {
  TIDAK_PEDULI: "Tidak Peduli",
  PEDULI: "Peduli",
  TAHAP_BELAJAR: "Tahap Belajar",
  KOMPETEN: "Kompeten",
  PENGAJAR: "Pengajar",
  BERINOVASI: "Berinovasi",
};

// Semantic tone per category for the future UI (legend + badges). Token names
// only — no Tailwind classes or components in this phase.
export const MSL_CATEGORY_TONES: Record<MslCategory, string> = {
  TIDAK_PEDULI: "neutral",
  PEDULI: "amber",
  TAHAP_BELAJAR: "orange",
  KOMPETEN: "emerald",
  PENGAJAR: "blue",
  BERINOVASI: "sky",
};

// Main legend for V1. TIDAK_PEDULI is a reserved/legacy band: normal input is
// >= 1, so it cannot be reached through the assessment form and is therefore
// deliberately left out of the legend.
export const MSL_CATEGORY_LEGEND: ReadonlyArray<{
  category: MslCategory;
  label: string;
  tone: string;
}> = MSL_CATEGORIES.filter((category) => category !== "TIDAK_PEDULI").map(
  (category) => ({
    category,
    label: MSL_CATEGORY_LABELS[category],
    tone: MSL_CATEGORY_TONES[category],
  }),
);

// Input scale: 1.00 – 5.00, at most two decimals. 0 is not a valid rating.
export const MSL_COMPONENT_MIN = 1;
export const MSL_COMPONENT_MAX = 5;
export const MSL_SCORE_DECIMALS = 2;

export type MslScoreComponents = {
  engineeringValue: number;
  metodeKerja: number;
  engineeringExecution: number;
};

// Integer-cent arithmetic keeps the average free of binary-float drift, so the
// canonical score is always a clean two-decimal number (never 2.999999999).
// Every component is already normalized to two decimals by the input contract,
// which is why the per-component rounding is lossless here.
function toCents(value: number): number {
  return Math.round(value * 100);
}

function normalizeToTwoDecimals(value: number): number {
  return Math.round(toCents(value)) / 100;
}

/**
 * Canonical MSL score: equally weighted average of the three components,
 * rounded to two decimals. `(a + b + c) / 3`.
 */
export function computeMslScore({
  engineeringValue,
  metodeKerja,
  engineeringExecution,
}: MslScoreComponents): number {
  const totalCents =
    toCents(engineeringValue) + toCents(metodeKerja) + toCents(engineeringExecution);
  // totalCents / 3 can only end in .0, .333… or .666…, so the integer rounding
  // never has to resolve an exact .5 tie.
  return Math.round(totalCents / 3) / 100;
}

/**
 * Category band of the ROUNDED score (locked rules):
 *
 *   score < 1.00                 -> Tidak Peduli  (reserved)
 *   1.00 <= score < 2.00         -> Peduli
 *   2.00 <= score < 3.00         -> Tahap Belajar
 *   3.00 <= score < 4.00         -> Kompeten
 *   4.00 <= score < 5.00         -> Pengajar
 *   score === 5.00               -> Berinovasi
 *
 * The input is normalized to two decimals first, so a raw average of
 * 2.996666… is categorized as Kompeten (3.00), never as Tahap Belajar —
 * the displayed score and the category always agree.
 */
export function categorizeMslScore(score: number): MslCategory {
  if (!Number.isFinite(score)) {
    // Unreachable behind the DB CHECK constraints; the reserved bucket keeps a
    // malformed value from being ranked as the highest category.
    return "TIDAK_PEDULI";
  }
  const canonical = normalizeToTwoDecimals(score);
  if (canonical < 1) return "TIDAK_PEDULI";
  if (canonical < 2) return "PEDULI";
  if (canonical < 3) return "TAHAP_BELAJAR";
  if (canonical < 4) return "KOMPETEN";
  if (canonical < 5) return "PENGAJAR";
  return "BERINOVASI";
}

/** Two-decimal display form, e.g. 4 -> "4.00", 3.75 -> "3.75". */
export function formatMslScore(score: number): string {
  return normalizeToTwoDecimals(score).toFixed(MSL_SCORE_DECIMALS);
}
