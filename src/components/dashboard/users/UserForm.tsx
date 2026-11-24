"use client";

import { useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { POSITION_OPTIONS } from "@/lib/users/options";
import {
  USER_PHOTO_ALLOWED_TYPES,
  USER_PHOTO_MAX_BYTES,
  buildUserPhotoPathname,
} from "@/lib/users/photo-storage";
import { ROLE_OPTIONS, isUserRole, type UserRole } from "@/lib/users/roles";

export type UserFormValues = {
  photo: string;
  name: string;
  phone: string;
  nip: string;
  email: string;
  position: string;
  role: UserRole;
  status: "active" | "suspended";
  // Management-only capability. Always submitted (false for every other role)
  // so the backend never has to guess; the server is still authoritative.
  mslAccess: boolean;
  password: string;
};

// Initial form data: SafeUser rows (real edit) or legacy CmsUser rows (mock
// callers pending migration). Password hashes are never passed in.
export type UserFormInitialData = {
  // Required for a photo upload: the pathname is scoped to this user id.
  id?: string;
  photo?: string | null;
  photoUrl?: string | null;
  name?: string;
  phone?: string | null;
  nip?: string | null;
  email?: string;
  position?: string;
  role?: string;
  status?: string;
  mslAccess?: boolean;
};

type UserFormProps = {
  mode: "add" | "edit";
  initialData?: UserFormInitialData;
  submitLabel: string;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
  formTitle?: string;
  cancelHref?: string;
  roleReadOnly?: boolean;
};

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

// Maps SDK/HTTP failures to something an admin can act on. Never surfaces a
// token, a store name or a raw SDK message.
function userPhotoUploadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/too large|maximum size|size limit/i.test(message)) {
    return "Ukuran foto melebihi batas 2 MB.";
  }
  if (/content type|not allowed|unsupported/i.test(message)) {
    return "Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.";
  }
  if (/unauthori|forbidden|401|403/i.test(message)) {
    return "Sesi Anda tidak memiliki izin mengunggah foto.";
  }
  return "Gagal mengunggah foto. Periksa koneksi lalu coba lagi.";
}

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
  const [formEmail, setFormEmail] = useState(initialData?.email ?? "");
  const [formPosition, setFormPosition] = useState(initialData?.position ?? POSITION_OPTIONS[0]);
  const [formRole, setFormRole] = useState<UserRole>(
    initialData?.role && isUserRole(initialData.role) ? initialData.role : "Project",
  );
  const [formStatus, setFormStatus] = useState<"active" | "suspended">(
    initialData?.status === "suspended" ? "suspended" : "active",
  );
  const [formMslAccess, setFormMslAccess] = useState(initialData?.mslAccess === true);
  const [formPassword, setFormPassword] = useState("");
  const initialPhotoUrl =
    initialData?.photoUrl && !initialData.photoUrl.startsWith("blob:")
      ? initialData.photoUrl
      : initialData?.photo && !initialData.photo.startsWith("blob:")
        ? initialData.photo
        : "";
  const [formPhotoUrl, setFormPhotoUrl] = useState(initialPhotoUrl);
  const [showPassword, setShowPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(initialPhotoUrl);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Photo upload state: the file is uploaded when the form is submitted, so a
  // cancelled edit never leaves an orphan object behind.
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploadError(null);
    if (!(USER_PHOTO_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      setUploadError("Format foto harus JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > USER_PHOTO_MAX_BYTES) {
      setUploadError("Ukuran foto maksimal 2 MB.");
      return;
    }
    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPendingPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || uploading) {
      return;
    }
    if (!formName.trim() || !formNip.trim() || !formEmail.trim()) {
      setFormError("Lengkapi nama, NIP, dan email.");
      return;
    }
    if (mode === "add" && !formPassword) {
      setFormError("Lengkapi nama, NIP, email, dan password.");
      return;
    }

    // Upload first, then submit the persisted URL. The form never sends a local
    // blob: preview, and a failed upload aborts the submit (the selected file
    // stays so it can be retried without re-picking).
    let nextPhotoUrl = formPhotoUrl.trim();
    if (pendingPhotoFile) {
      const userId = initialData?.id;
      if (!userId) {
        setUploadError("Simpan user dulu, lalu upload foto di halaman Edit.");
        return;
      }
      const pathname = buildUserPhotoPathname(userId, pendingPhotoFile.name);
      if (!pathname) {
        setUploadError("Nama atau format file foto tidak valid.");
        return;
      }
      setFormError(null);
      setUploadError(null);
      setSubmitting(true);
      setUploading(true);
      setUploadPercent(0);
      try {
        const blob = await upload(pathname, pendingPhotoFile, {
          access: "public",
          contentType: pendingPhotoFile.type,
          handleUploadUrl: "/api/users/photo/upload-token",
          clientPayload: JSON.stringify({ userId }),
          multipart: false,
          onUploadProgress: (event) => {
            const percentage = Number(event.percentage);
            if (Number.isFinite(percentage)) {
              setUploadPercent(Math.max(0, Math.min(100, Math.round(percentage))));
            }
          },
        });
        nextPhotoUrl = blob.url;
        setFormPhotoUrl(blob.url);
        setPhotoPreview(blob.url);
        setPendingPhotoFile(null);
      } catch (error) {
        setUploadPercent(null);
        setUploadError(userPhotoUploadErrorMessage(error));
        setSubmitting(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    const persistentPhoto = nextPhotoUrl.startsWith("blob:") ? "" : nextPhotoUrl;
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        photo: persistentPhoto,
        name: formName.trim(),
        phone: formPhone.trim(),
        nip: formNip.trim(),
        email: formEmail.trim(),
        position: formPosition,
        role: formRole,
        status: formStatus,
        mslAccess: formRole === "Management" ? formMslAccess : false,
        password: formPassword,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan user.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="p-5">
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
                disabled={mode === "add"}
                onChange={handleFileChange}
                className="w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border file:border-outline/70 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              />
              {mode === "add" ? (
                <p className="mt-1 text-[11px] text-slate-400">
                  Simpan user dulu, lalu upload foto di halaman Edit.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  JPG/PNG/WEBP maksimal 2 MB. Foto diunggah saat Simpan.
                </p>
              )}
              {uploadError ? (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-red-700">
                  {uploadError}
                </p>
              ) : null}
              {uploading ? (
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadPercent ?? 0}
                >
                  <div
                    className="h-full rounded-full bg-secondary transition-all"
                    style={{ width: `${uploadPercent ?? 0}%` }}
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-3">
            <label htmlFor="u_photoUrl" className="mb-1.5 block text-xs font-semibold text-slate-700">
              URL Foto
            </label>
            <input
              id="u_photoUrl"
              type="text"
              placeholder="misal: /asset/profil/nama.jpg atau https://..."
              value={formPhotoUrl}
              onChange={(e) => {
                // Typing a URL replaces any pending file: only one source wins.
                setPendingPhotoFile(null);
                setUploadError(null);
                setFormPhotoUrl(e.target.value);
                if (!e.target.value.startsWith("blob:")) {
                  setPhotoPreview(e.target.value);
                }
              }}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              URL ini menang atas file yang dipilih; kosongkan untuk menghapus foto.
            </p>
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
            NIP <span className="text-red-700">*</span>
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
          <label htmlFor="u_email" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Email <span className="text-red-700">*</span>
          </label>
          <input
            id="u_email"
            type="email"
            placeholder="nama@wika.co.id"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            autoComplete="email"
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
              onChange={(e) => {
                if (isUserRole(e.target.value)) {
                  setFormRole(e.target.value);
                  // Capability is Management-only: leaving the role clears the
                  // toggle state instead of carrying a hidden `true` along.
                  if (e.target.value !== "Management") {
                    setFormMslAccess(false);
                  }
                }
              }}
              className={inputClass}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          )}
        </div>
        {formRole === "Management" ? (
          <div>
            <label htmlFor="u_msl" className="mb-1.5 block text-xs font-semibold text-slate-700">
              MSL Engineering Access
            </label>
            <button
              id="u_msl"
              type="button"
              role="switch"
              aria-checked={formMslAccess}
              onClick={() => setFormMslAccess((prev) => !prev)}
              className={`inline-flex h-10 w-full items-center justify-between rounded-lg border px-3.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-secondary/20 ${
                formMslAccess
                  ? "border-secondary/40 bg-blue-50 text-secondary"
                  : "border-outline/60 bg-white text-slate-500"
              }`}
            >
              <span>{formMslAccess ? "Aktif" : "Nonaktif"}</span>
              <span
                aria-hidden="true"
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  formMslAccess ? "bg-secondary" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    formMslAccess ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
            <p className="mt-1 text-[11px] text-slate-400">
              Hanya tersedia untuk role Management. Admin selalu memiliki akses penuh.
            </p>
          </div>
        ) : null}
        <div>
          <label htmlFor="u_password" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Password {mode === "add" ? <span className="text-red-700">*</span> : null}
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
          <p className="mt-1 text-[11px] text-slate-400">
            {mode === "add"
              ? "Minimal 8 karakter."
              : "Kosongkan jika tidak ingin mengubah password."}
          </p>
        </div>
        <div>
          <label htmlFor="u_status" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Status
          </label>
          <select
            id="u_status"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value as "active" | "suspended")}
            className={inputClass}
          >
            <option value="active">active</option>
            <option value="suspended">suspended</option>
          </select>
        </div>
      </div>
      {formError ? (
        <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {formError}
        </p>
      ) : null}
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-outline pt-4">
        <Link
          href={cancelHref}
          className="rounded-lg border border-outline bg-white px-4 py-2.5 text-xs font-bold text-primary/70 hover:bg-slate-50"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="rounded-lg bg-secondary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? "Mengunggah..." : submitting ? "Menyimpan..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
