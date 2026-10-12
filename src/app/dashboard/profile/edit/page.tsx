"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SafeUser } from "@/lib/users/service";

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

const readOnlyClass =
  "h-10 w-full cursor-not-allowed rounded-lg border border-outline/60 bg-slate-50 px-3.5 text-xs font-semibold text-slate-500";

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

  async function loadProfile(): Promise<void> {
    setLoading(true);
    setError(null);
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
    } catch {
      setError("Gagal memuat data profil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }
    if (!formName.trim()) {
      setFormError("Lengkapi nama.");
      return;
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
          photoUrl: formPhotoUrl.trim(),
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
            onClick={() => void loadProfile()}
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
                onChange={(e) => setFormPhotoUrl(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Yang tersimpan hanya URL di atas.
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
              disabled={submitting}
              className="rounded-lg bg-secondary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
