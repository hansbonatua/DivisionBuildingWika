"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  instagramAccounts,
  type SocialPost,
} from "@/lib/demo/social-media";

export type SocialPostFormValues = {
  image: string;
  account: string;
  caption: string;
  url: string;
  type: string;
  status: SocialPost["status"];
  order: number;
};

type SocialPostFormProps = {
  mode: "add" | "edit";
  initialData?: SocialPost;
  submitLabel: string;
  onSubmit: (values: SocialPostFormValues) => void;
  onValuesChange?: (values: SocialPostFormValues) => void;
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
  const [formCaption, setFormCaption] = useState(
    initialData?.caption ?? "WIKA Building project update...",
  );
  const [formUrl, setFormUrl] = useState(initialData?.url ?? "https://www.instagram.com/p/Ddsj3YCkb7r/");
  const [formType, setFormType] = useState(initialData?.type ?? TYPE_OPTIONS[0]);
  const [formStatus, setFormStatus] = useState<SocialPost["status"]>(initialData?.status ?? "Draft");
  const [formOrder, setFormOrder] = useState(initialData?.order ?? 1);
  const [previewImage, setPreviewImage] = useState(initialData?.image ?? "/asset/hero/8.jpg");

  useEffect(() => {
    onValuesChange?.({
      image: previewImage,
      account: formAccount,
      caption: formCaption,
      url: formUrl,
      type: formType,
      status: formStatus,
      order: formOrder,
    });
  }, [previewImage, formAccount, formCaption, formUrl, formType, formStatus, formOrder, onValuesChange]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (previewImage.startsWith("blob:")) {
      URL.revokeObjectURL(previewImage);
    }
    setPreviewImage(URL.createObjectURL(file));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit({
      image: previewImage,
      account: formAccount,
      caption: formCaption,
      url: formUrl,
      type: formType,
      status: formStatus,
      order: formOrder,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
      <div>
        <label htmlFor="s_image" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Instagram Image
        </label>
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-outline/60 bg-slate-100">
            <Image src={previewImage} alt="Preview postingan" fill sizes="96px" className="object-cover" />
          </div>
          <div className="flex-1">
            <input
              id="s_image"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border file:border-outline/70 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-slate-50"
            />
            <p className="mt-1 text-[11px] text-slate-400">Preview tampil otomatis sebelum save.</p>
          </div>
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
        <label htmlFor="s_caption" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Caption <span className="text-red-700">*</span>
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
        <label htmlFor="s_url" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Instagram URL
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
          onChange={(e) => setFormStatus(e.target.value as SocialPost["status"])}
          className={inputClass}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="s_order" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Display Order
        </label>
        <input
          id="s_order"
          type="number"
          min={1}
          value={formOrder}
          onChange={(e) => setFormOrder(Number(e.target.value) || 1)}
          className={inputClass}
        />
      </div>
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-outline pt-2 md:col-span-2">
        <Link
          href="/dashboard/social-media"
          className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary/70 hover:bg-slate-50"
        >
          Batal
        </Link>
        <button
          type="submit"
          className="rounded-lg bg-secondary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
