"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  instagramAccounts,
} from "@/lib/demo/social-media";

export type SocialPostFormValues = {
  platform: "instagram";
  account: string;
  caption: string;
  url: string;
  type: string;
  imageUrl: string;
  imageAlt: string;
  status: "Published" | "Draft" | "Hidden";
};

export type SocialPostFormData = SocialPostFormValues;

type SocialPostFormProps = {
  mode: "add" | "edit";
  initialData?: SocialPostFormData;
  submitLabel: string;
  onSubmit: (values: SocialPostFormValues) => void | Promise<void>;
  onValuesChange?: (values: SocialPostFormValues, previewImage: string | null) => void;
};

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

export default function SocialPostForm({
  mode,
  initialData,
  submitLabel,
  onSubmit,
  onValuesChange,
}: SocialPostFormProps) {
  const [formAccount, setFormAccount] = useState(initialData?.account ?? instagramAccounts[0].username);
  const [formCaption, setFormCaption] = useState(initialData?.caption ?? "");
  const [formUrl, setFormUrl] = useState(initialData?.url ?? "");
  const [formType, setFormType] = useState(initialData?.type ?? TYPE_OPTIONS[0]);
  const [formImageUrl, setFormImageUrl] = useState(initialData?.imageUrl ?? "");
  const [formImageAlt, setFormImageAlt] = useState(initialData?.imageAlt ?? "");
  const [formStatus, setFormStatus] = useState<"Published" | "Draft" | "Hidden">(
    initialData?.status ?? "Draft",
  );
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onValuesChange?.(
      {
        platform: "instagram",
        account: formAccount,
        caption: formCaption,
        url: formUrl,
        type: formType,
        imageUrl: formImageUrl,
        imageAlt: formImageAlt,
        status: formStatus,
      },
      previewFile,
    );
  }, [formAccount, formCaption, formUrl, formType, formImageUrl, formImageAlt, formStatus, previewFile, onValuesChange]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (previewFile?.startsWith("blob:")) {
      URL.revokeObjectURL(previewFile);
    }
    // Preview-only: object URLs are never sent to the API (see handleSubmit).
    setPreviewFile(URL.createObjectURL(file));
  }

  function handleRemovePreview(): void {
    if (previewFile?.startsWith("blob:")) {
      URL.revokeObjectURL(previewFile);
    }
    setPreviewFile(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!formAccount.trim() || !formUrl.trim() || !formImageUrl.trim()) {
      setFormError("Lengkapi account, URL postingan, dan URL gambar.");
      return;
    }
    if (formImageUrl.trim().startsWith("blob:")) {
      setFormError("Upload file permanen belum tersedia. Gunakan URL/path gambar.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        platform: "instagram",
        account: formAccount,
        caption: formCaption.trim(),
        url: formUrl.trim(),
        type: formType,
        imageUrl: formImageUrl.trim(),
        imageAlt: formImageAlt.trim(),
        status: formStatus,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan postingan.");
    } finally {
      setSubmitting(false);
    }
  }

  const canvasSrc = previewFile ?? (formImageUrl.startsWith("blob:") ? "" : formImageUrl);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
          Instagram Image
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-outline/60 bg-slate-100">
            {canvasSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={canvasSrc} alt="Preview postingan" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
              aria-label={mode === "add" ? "Pratinjau gambar postingan" : "Ganti pratinjau gambar"}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-outline/70 bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-slate-50"
            >
              {previewFile ? "Ganti Pratinjau" : "Pilih Pratinjau"}
            </button>
            {previewFile ? (
              <button
                type="button"
                onClick={handleRemovePreview}
                className="rounded-md border border-outline/70 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
              >
                Hapus Pratinjau
              </button>
            ) : null}
            <p className="w-full text-[11px] text-slate-400">
              Pratinjau bersifat lokal dan tidak tersimpan. Yang tersimpan adalah URL di bawah.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <label htmlFor="s_imageUrl" className="mb-1.5 block text-xs font-semibold text-slate-700">
            URL Gambar <span className="text-red-700">*</span>
          </label>
          <input
            id="s_imageUrl"
            type="text"
            placeholder="misal: /asset/hero/8.jpg atau https://..."
            value={formImageUrl}
            onChange={(e) => setFormImageUrl(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="mt-3">
          <label htmlFor="s_imageAlt" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Alt Text Gambar
          </label>
          <input
            id="s_imageAlt"
            type="text"
            placeholder="Deskripsi gambar untuk aksesibilitas."
            value={formImageAlt}
            onChange={(e) => setFormImageAlt(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="s_account" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Instagram Account <span className="text-red-700">*</span>
        </label>
        <select id="s_account" value={formAccount} onChange={(e) => setFormAccount(e.target.value)} className={inputClass}>
          {instagramAccounts.map((account) => (
            <option key={account.username} value={account.username}>
              {account.username} — {account.description}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="s_url" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Instagram URL <span className="text-red-700">*</span>
        </label>
        <input
          id="s_url"
          type="url"
          placeholder="https://instagram.com/p/..."
          value={formUrl}
          onChange={(e) => setFormUrl(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="s_caption" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Caption
        </label>
        <textarea
          id="s_caption"
          rows={3}
          value={formCaption}
          onChange={(e) => setFormCaption(e.target.value)}
          className="w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>
      <div>
        <label htmlFor="s_type" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Content Type
        </label>
        <select id="s_type" value={formType} onChange={(e) => setFormType(e.target.value)} className={inputClass}>
          {TYPE_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="s_status" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Publish Status
        </label>
        <select
          id="s_status"
          value={formStatus}
          onChange={(e) => setFormStatus(e.target.value as "Published" | "Draft" | "Hidden")}
          className={inputClass}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      {formError ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 md:col-span-2">
          {formError}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-outline pt-2 md:col-span-2">
        <Link
          href="/dashboard/social-media"
          className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary/70 hover:bg-slate-50"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-secondary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Menyimpan..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
