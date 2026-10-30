// Our Project / Portfolio Project category — single source of truth.
//
// The stored value IS the display label: `portfolio_projects.category` is a
// single string that the landing badge renders verbatim. There is no slug and
// no lookup table, so these strings are the contract shared by the CMS form,
// the Zod validation and the data migration. Renaming a label therefore means
// migrating documents, exactly like changing an enum key would.
//
// Dependency-free on purpose: imported by the Client Component form, the
// server-side Zod schema and the one-off migration script. It must never import
// the MongoDB driver, auth or any server-only module.

export const PROJECT_CATEGORY_LABELS = [
  "Gedung Publik & Pemerintah",
  "Commercial High-Rise",
  "Residensial",
  "Gedung Pendidikan",
  "Gedung Kesehatan",
  "Gedung Peribadatan",
  "Gedung Olahraga",
  "Gedung Industri & Logistik",
  "Fasilitas Transportasi",
  "Infrastruktur",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORY_LABELS)[number];

// Type guard for code that holds an arbitrary stored string (legacy documents,
// API payloads). Zod uses the tuple directly; React uses this.
export function isProjectCategory(value: string): value is ProjectCategory {
  return (PROJECT_CATEGORY_LABELS as readonly string[]).includes(value);
}
