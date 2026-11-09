// Calculation Sheet Template (CST) categories.
//
// Like the six MKS disciplines, the seven CST categories are APPLICATION
// CONSTANTS — not a database master table and not a seed. `id` is the stable
// value persisted in `calculation_sheet_templates.kategori`; `label` is the
// display text. Deliberately NO numeric prefix (product decision), so labels
// are exactly the category names.
//
// This module is dependency-free so Client Components may import it directly
// (same convention as @/lib/metode-kerja-standar/constants).

export type CstCategoryId =
  | "arsitektur"
  | "struktur"
  | "infrastruktur"
  | "geoteknik"
  | "green_building"
  | "meep"
  | "lainnya";

export type CstCategory = {
  id: CstCategoryId;
  label: string;
};

// Array order = display order = sidebar order. The database CHECK constraint
// mirrors these exact ids, so changing an id here requires a migration.
export const CST_CATEGORIES: CstCategory[] = [
  { id: "arsitektur", label: "Arsitektur" },
  { id: "struktur", label: "Struktur" },
  { id: "infrastruktur", label: "Infrastruktur" },
  { id: "geoteknik", label: "Geoteknik" },
  { id: "green_building", label: "Green Building" },
  { id: "meep", label: "MEEP" },
  { id: "lainnya", label: "Lainnya" },
];

export const CST_CATEGORY_IDS: readonly CstCategoryId[] = CST_CATEGORIES.map(
  (category) => category.id,
);

const BY_ID = new Map<string, CstCategory>(
  CST_CATEGORIES.map((category) => [category.id, category]),
);

export function isCstCategoryId(value: string): value is CstCategoryId {
  return BY_ID.has(value.trim());
}

// Returns null for an unknown id so callers can fail safely (400/404) instead
// of silently falling back to a default category.
export function getCstCategory(id: string): CstCategory | null {
  return BY_ID.get(id.trim()) ?? null;
}

export function getCstCategoryLabel(id: string): string | null {
  return getCstCategory(id)?.label ?? null;
}
