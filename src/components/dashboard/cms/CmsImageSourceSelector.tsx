"use client";

import {
  CMS_IMAGE_SOURCE_LABELS,
  CMS_IMAGE_SOURCE_TYPES,
  type CmsImageSelectionType,
} from "@/lib/cms/image-source";

// "Sumber Gambar" selector shared by every CMS image field (Hero, Portfolio,
// Green Building, Clients, Social Media). Exactly one source is active at a
// time; the guidance text underneath is per-module and guidance-only (no pixel
// validation). Modules that show a logo rather than a photo pass logo labels;
// Social Media passes `options` to add its third, image-free state.

type CmsImageSourceSelectorProps = {
  // Unique radio-group name; several forms can be mounted in one page tree.
  name: string;
  value: CmsImageSelectionType;
  onChange: (next: CmsImageSelectionType) => void;
  guidance: string;
  disabled?: boolean;
  label?: string;
  // Per-module wording for the options (defaults to the Gambar labels).
  labels?: Partial<Record<CmsImageSelectionType, string>>;
  // Which options to render (defaults to the two upload-bearing sources).
  options?: readonly CmsImageSelectionType[];
};

export default function CmsImageSourceSelector({
  name,
  value,
  onChange,
  guidance,
  disabled = false,
  label = "Sumber Gambar",
  labels = CMS_IMAGE_SOURCE_LABELS,
  options = CMS_IMAGE_SOURCE_TYPES,
}: CmsImageSourceSelectorProps) {
  return (
    <div className="rounded-lg border border-outline/60 bg-background/40 p-3.5">
      <fieldset disabled={disabled}>
        <legend className="mb-2 block text-xs font-semibold text-slate-700">
          {label} <span className="text-red-700">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = value === option;
            return (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "border-secondary bg-white text-primary shadow-sm"
                    : "border-outline/60 bg-white/60 text-primary/70 hover:border-secondary/50"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name={name}
                  value={option}
                  checked={active}
                  onChange={() => onChange(option)}
                  className="h-3.5 w-3.5 accent-secondary"
                />
                <span>{labels[option] ?? option}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">{guidance}</p>
      </fieldset>
    </div>
  );
}
