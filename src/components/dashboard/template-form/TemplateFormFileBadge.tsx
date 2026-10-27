import type { TemplateFormFileKind } from "@/lib/template-form/file-meta";
import { templateFormFileKindLabel } from "@/lib/template-form/file-meta";

// Small shared badge for Template & Form source/type. Static class map so the
// Tailwind compiler keeps every variant.

const KIND_STYLES: Record<TemplateFormFileKind, string> = {
  link: "border-blue-200 bg-blue-50 text-secondary",
  pdf: "border-red-200 bg-red-50 text-red-700",
  word: "border-blue-200 bg-blue-50 text-blue-700",
  excel: "border-emerald-200 bg-emerald-50 text-emerald-700",
  powerpoint: "border-orange-200 bg-orange-50 text-orange-700",
  file: "border-outline bg-background text-primary/60",
};

export default function TemplateFormFileBadge({
  kind,
}: {
  kind: TemplateFormFileKind;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${KIND_STYLES[kind]}`}
    >
      {templateFormFileKindLabel(kind)}
    </span>
  );
}
