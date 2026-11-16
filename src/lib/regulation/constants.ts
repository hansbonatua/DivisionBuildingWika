export const REGULATION_DISCIPLINES = [
  {
    key: "prosedur_wika",
    slug: "prosedur-wika",
    name: "Prosedur WIKA",
    sortOrder: 10,
  },
  { key: "sni", slug: "sni", name: "SNI", sortOrder: 20 },
  {
    key: "peraturan_pemerintah",
    slug: "peraturan-pemerintah",
    name: "Peraturan Pemerintah",
    sortOrder: 30,
  },
  {
    key: "standar_internasional",
    slug: "standar-internasional",
    name: "Standar Internasional",
    sortOrder: 40,
  },
  { key: "lainnya", slug: "lainnya", name: "Lainnya", sortOrder: 50 },
] as const;

export type RegulationDisiplinKey =
  (typeof REGULATION_DISCIPLINES)[number]["key"];

export type RegulationDisiplin = (typeof REGULATION_DISCIPLINES)[number];

const BY_KEY = new Map<string, RegulationDisiplin>(
  REGULATION_DISCIPLINES.map((disiplin) => [disiplin.key, disiplin]),
);
const BY_SLUG = new Map<string, RegulationDisiplin>(
  REGULATION_DISCIPLINES.map((disiplin) => [disiplin.slug, disiplin]),
);

export function isRegulationDisiplinKey(
  value: string,
): value is RegulationDisiplinKey {
  return BY_KEY.has(value.trim());
}

export function getRegulationDisiplinByKey(
  key: string,
): RegulationDisiplin | null {
  return BY_KEY.get(key.trim()) ?? null;
}

export function getRegulationDisiplinBySlug(
  slug: string,
): RegulationDisiplin | null {
  return BY_SLUG.get(slug.trim()) ?? null;
}
