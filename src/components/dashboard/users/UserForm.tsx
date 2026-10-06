"use client";

import { useState } from "react";
import Link from "next/link";
import { POSITION_OPTIONS, ROLE_OPTIONS, type CmsUser } from "@/lib/demo/users";

export type UserFormValues = {
  photo: string;
  name: string;
  phone: string;
  nip: string;
  position: string;
  role: string;
  password: string;
};

type UserFormProps = {
  mode: "add" | "edit";
  initialData?: CmsUser;
  submitLabel: string;
  onSubmit: (values: UserFormValues) => void;
  formTitle?: string;
  cancelHref?: string;
  roleReadOnly?: boolean;
};

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

export default function UserForm({
  mode,
  initialData,
  submitLabel,
  onSubmit,
  formTitle,
  cancelHref = "/dashboard/users",
  roleReadOnly = false,
}: UserFormProps) {
  const [formName, setFormName] = useState(initialData?.name ?? "");
  const [formPhone, setFormPhone] = useState(initialData?.phone ?? "");
  const [formNip, setFormNip] = useState(initialData?.nip ?? "");
  const [formPosition, setFormPosition] = useState(initialData?.position ?? POSITION_OPTIONS[0]);
  const [formRole, setFormRole] = useState(initialData?.role ?? "Project");
  const [formPassword, setFormPassword] = useState(initialData?.password ?? "******");
  const [showPassword, setShowPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(initialData?.photo ?? "");

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit({
      photo: photoPreview,
      name: formName,
      phone: formPhone,
      nip: formNip,
      position: formPosition,
      role: formRole,
      password: formPassword,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="p-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        {formTitle ?? (mode === "add" ? "User Information Form" : "Edit User Information")}
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="u_photo" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Profile Photo (JPG/PNG/WebP)
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline/60 bg-slate-100">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Preview foto" className="h-full w-full object-cover" />
              ) : (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="text-slate-400"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <input
                id="u_photo"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border file:border-outline/70 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-slate-50"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Preview otomatis; pilih ulang untuk replace image.
              </p>
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="u_name" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Nama <span className="text-red-700">*</span>
          </label>
          <input
            id="u_name"
            type="text"
            placeholder="Nama User"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="u_phone" className="mb-1.5 block text-xs font-semibold text-slate-700">
            No Telp
          </label>
          <input
            id="u_phone"
            type="tel"
            placeholder="081234567"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="u_nip" className="mb-1.5 block text-xs font-semibold text-slate-700">
            NIP
          </label>
          <input
            id="u_nip"
            type="text"
            placeholder="123456"
            value={formNip}
            onChange={(e) => setFormNip(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="u_position" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Jabatan
          </label>
          <select
            id="u_position"
            value={formPosition}
            onChange={(e) => setFormPosition(e.target.value)}
            className={inputClass}
          >
            {POSITION_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="u_role" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Role
          </label>
          {roleReadOnly ? (
            <>
              <input
                id="u_role"
                type="text"
                value={formRole}
                readOnly
                disabled
                className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`}
              />
              <p className="mt-1 text-[11px] text-slate-400">Role dikelola oleh administrator.</p>
            </>
          ) : (
            <select
              id="u_role"
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              className={inputClass}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label htmlFor="u_password" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="u_password"
              type={showPassword ? "text" : "password"}
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              autoComplete="new-password"
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-primary"
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4-8 11-8" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Demo: nilai tidak disimpan aman.</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-outline pt-4">
        <Link
          href={cancelHref}
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
