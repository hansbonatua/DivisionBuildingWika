"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/dashboard/users/UserAvatar";
import UserForm, { type UserFormValues } from "@/components/dashboard/users/UserForm";
import UserRoleBadge from "@/components/dashboard/users/UserRoleBadge";
import UserStatusBadge from "@/components/dashboard/users/UserStatusBadge";
import type { SafeUser } from "@/lib/users/service";

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUser(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${id}`);
      if (response.status === 404) {
        setUser(null);
      } else if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      } else {
        const body = (await response.json()) as { data?: SafeUser };
        if (!body.data) {
          throw new Error("Empty response");
        }
        setUser(body.data);
      }
    } catch {
      setError("Gagal memuat data user.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handlePatch(values: UserFormValues): Promise<void> {
    const payload: Record<string, unknown> = {
      name: values.name,
      nip: values.nip,
      email: values.email,
      phone: values.phone,
      position: values.position,
      role: values.role,
      status: values.status,
      mslAccess: values.mslAccess,
      photoUrl: values.photo,
    };
    if (values.password) {
      payload.password = values.password;
    }
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.status === 404) {
      throw new Error("User tidak ditemukan.");
    }
    if (response.status === 409) {
      let message = "NIP atau email sudah terdaftar.";
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        if (body.error?.message) {
          message = body.error.message;
        }
      } catch {
        /* keep default message */
      }
      throw new Error(message);
    }
    if (response.status === 400) {
      throw new Error("Validasi gagal. Periksa kembali isian form.");
    }
    if (!response.ok) {
      throw new Error("Gagal menyimpan perubahan user.");
    }
    router.replace("/dashboard/users");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit User</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data user...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit User</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error}</p>
          <button
            type="button"
            onClick={() => void loadUser()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit User</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">User tidak ditemukan.</p>
          <p className="mt-1 text-xs text-primary/70">ID &quot;{id}&quot; tidak ada pada database.</p>
          <Link
            href="/dashboard/users"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Kembali ke User Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <nav className="mb-2 flex items-center gap-2 text-[11px] text-primary/50" aria-label="Breadcrumb">
          <Link href="/dashboard/users" className="transition-colors hover:text-secondary">
            User Directory
          </Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-bold text-secondary">Edit User</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <UserAvatar user={user} />
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit User</h1>
          <UserRoleBadge role={user.role} />
          <UserStatusBadge status={user.status} />
        </div>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          {user.name} — {user.position} ({user.nip}).
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-outline p-4">
          <h2 className="text-lg font-bold text-primary">Edit User Information</h2>
        </div>
        <UserForm
          mode="edit"
          initialData={user}
          submitLabel="Update User"
          onSubmit={handlePatch}
        />
      </div>
    </div>
  );
}
