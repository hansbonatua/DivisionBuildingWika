"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/storage/upload-client";
import {
  USER_PHOTO_ALLOWED_TYPES,
  USER_PHOTO_MAX_BYTES,
  buildUserPhotoPathname,
} from "@/lib/users/photo-storage";
import type { SafeUser } from "@/lib/users/service";

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

const readOnlyClass =
  "h-10 w-full cursor-not-allowed rounded-lg border border-outline/60 bg-slate-50 px-3.5 text-xs font-semibold text-slate-500";

// Maps SDK/HTTP failures to something the user can act on. Never surfaces a
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
      <div className={readOnlyClass + " flex items-center"}>{value || "-"}</div>
      <p className="mt-1 text-[11px] text-slate-400">Dikelola oleh administrator.</p>
    </div>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Photo upload state: the file is uploaded on submit, so cancelling the form
  // never leaves an orphan object behind.
  const [photoPreview, setPhotoPreview] = useState("");
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function loadProfile(): Promise<void> {
    // State is only touched after the request settles. Setting it synchronously
    // here would make the mount effect trigger a cascading render.
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = (await response.json()) as { user?: SafeUser };
      if (!body.user) {
        throw new Error("Empty response");
      }
      setUser(body.user);
      setFormName(body.user.name);
      setFormPhone(body.user.phone ?? "");
      setFormPhotoUrl(body.user.photoUrl ?? "");
      setPhotoPreview(body.user.photoUrl ?? "");
    } catch {
      setError("Gagal memuat data profil.");
    } finally {
      setLoading(false);
    }
  }

  // Mount fetch uses promise callbacks (not a synchronous setState from the
  // effect body) so the first render is never cascaded by the loader.
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<{ user?: SafeUser }>;
      })
      .then((body) => {
        if (!active) return;
        if (!body.user) {
          setError("Gagal memuat data profil.");
          return;
        }
        setUser(body.user);
        setFormName(body.user.name);
        setFormPhone(body.user.phone ?? "");
        setFormPhotoUrl(body.user.photoUrl ?? "");
        setPhotoPreview(body.user.photoUrl ?? "");
      })
      .catch(() => {
        if (active) {
          setError("Gagal memuat data profil.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

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

  function handleRemovePhoto(): void {
    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPendingPhotoFile(null);
    setUploadError(null);
    setUploadPercent(null);
    setFormPhotoUrl("");
    setPhotoPreview("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || uploading) {
      return;
    }
    if (!formName.trim()) {
      setFormError("Lengkapi nama.");
      return;
    }

    // Upload first, then PATCH the persisted URL. The profile edit page loads
    // its own actor through GET /api/auth/me, so `user.id` is already available
    // and no extra request is needed for the upload pathname.
    let nextPhotoUrl = formPhotoUrl.trim();
    if (pendingPhotoFile) {
      const actorUserId = user?.id;
      if (!actorUserId) {
        setUploadError("Gagal memuat identitas akun. Muat ulang halaman lalu coba lagi.");
        return;
      }
      const pathname = buildUserPhotoPathname(actorUserId, pendingPhotoFile.name);
      if (!pathname) {
        setUploadError("Nama atau format file foto tidak valid.");
        return;
      }
      setFormError(null);
      setUploadError(null);
      setSaved(false);
      setSubmitting(true);
      setUploading(true);
      setUploadPercent(0);
      try {
        const blob = await uploadFile(
          pendingPhotoFile,
          "/api/users/photo/upload-token",
          {
            pathname,
            contentType: pendingPhotoFile.type,
            clientPayload: { userId: actorUserId },
            onProgress: (percentage) => {
              setUploadPercent(Math.max(0, Math.min(100, Math.round(percentage))));
            },
          },
        );
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

    setFormError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          // Empty string is normalized to null by profileUpdateSchema, which is
          // how "remove photo" is expressed.
          photoUrl: nextPhotoUrl,
        }),
      });
      if (response.status === 400) {
        setFormError("Validasi gagal. Periksa kembali isian.");
        return;
      }
      if (!response.ok) {
        setFormError("Gagal menyimpan perubahan profil.");
        return;
      }
      const body = (await response.json()) as { user?: SafeUser };
      if (body.user) {
        setUser(body.user);
        setPhotoPreview(body.user.photoUrl ?? "");
      }
      setSaved(true);
      router.refresh();
    } catch {
      setFormError("Gagal menyimpan perubahan profil.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Profile</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data profil...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Profile</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error ?? "Profil tidak ditemukan."}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              void loadProfile();
            }}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <nav className="mb-2 flex items-center gap-2 text-[11px] text-primary/50" aria-label="Breadcrumb">
          <span>Profile</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-bold text-secondary">Edit Profile</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Profile</h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Perbarui informasi akun dan profil Anda.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-outline p-4">
          <h2 className="text-lg font-bold text-primary">Profile Information</h2>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="p-5">
          <section className="mb-5 flex flex-col gap-4 rounded-lg border border-outline/60 bg-background/40 p-4 sm:flex-row sm:items-center">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline/60 bg-slate-100">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Preview foto profil" className="h-full w-full object-cover" />
              ) : (
                <svg
                  width="32"
                  height="32"
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
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-700">Foto Profil</p>
              <p className="mt-1 text-[11px] text-slate-400">
                JPG/PNG/WEBP maksimal 2 MB. Foto diunggah saat Simpan.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label
                  htmlFor="p_photo"
                  className="cursor-pointer rounded-lg border border-outline bg-white px-3.5 py-2 text-xs font-bold text-primary hover:bg-slate-50"
                >
                  Pilih Foto
                </label>
                <input
                  id="p_photo"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={!photoPreview}
                  className="rounded-lg border border-outline bg-white px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hapus Foto
                </button>
              </div>
              {uploadError ? (
                <p role="alert" className="mt-2 text-[11px] font-semibold text-red-700">
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
          </section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="p_name" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Nama <span className="text-red-700">*</span>
              </label>
              <input
                id="p_name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="p_phone" className="mb-1.5 block text-xs font-semibold text-slate-700">
                No Telp
              </label>
              <input
                id="p_phone"
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="p_photoUrl" className="mb-1.5 block text-xs font-semibold text-slate-700">
                URL Foto
              </label>
              <input
                id="p_photoUrl"
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
            <ReadOnlyField label="NIP" value={user.nip ?? ""} />
            <ReadOnlyField label="Email" value={user.email} />
            <ReadOnlyField label="Jabatan" value={user.position} />
            <ReadOnlyField label="Role" value={user.role} />
            <div className="md:col-span-2">
              <ReadOnlyField label="Status" value={user.status} />
            </div>
          </div>
          {formError ? (
            <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
              {formError}
            </p>
          ) : null}
          {saved ? (
            <p role="status" className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-700">
              Profil berhasil diperbarui.
            </p>
          ) : null}
          <div className="mt-4 flex items-center justify-end gap-3 border-t border-outline pt-4">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="rounded-lg bg-secondary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Mengunggah..." : submitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
