import {
  MSL_CATEGORY_LEGEND,
  MSL_CATEGORY_LABELS,
  MSL_CATEGORY_TONES,
  type MslCategory,
} from "@/lib/msl/score";

// Category presentation shared by the legend and the table badges. Colours come
// from the pure engine's semantic tones (single source of truth), mapped onto
// the existing dashboard vocabulary (border-*-200 / bg-*-50 / text-*-700).
// TIDAK_PEDULI keeps a neutral fallback in case legacy data ever carries it, but
// it is intentionally absent from the main legend.

const TONE_CLASSES: Record<string, string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
};

export function mslCategoryChipClass(category: MslCategory): string {
  return TONE_CLASSES[MSL_CATEGORY_TONES[category]] ?? TONE_CLASSES.neutral;
}

export function MslCategoryBadge({ category }: { category: MslCategory }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-[11px] font-bold ${mslCategoryChipClass(category)}`}
    >
      {MSL_CATEGORY_LABELS[category]}
    </span>
  );
}

// Compact legend: label plus one chip per main category. Text is always shown,
// so the category is never conveyed by colour alone.
export default function MslLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-primary/50">
        Kategori
      </span>
      {MSL_CATEGORY_LEGEND.map((item) => (
        <span
          key={item.category}
          className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[item.tone] ?? TONE_CLASSES.neutral}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
