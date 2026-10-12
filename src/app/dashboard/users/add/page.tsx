"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import UserForm, { type UserFormValues } from "@/components/dashboard/users/UserForm";

export default function AddUserPage() {
  const router = useRouter();

  async function handleCreate(values: UserFormValues): Promise<void> {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        nip: values.nip,
        email: values.email,
        phone: values.phone,
        position: values.position,
        role: values.role,
        status: values.status,
        password: values.password,
        photoUrl: values.photo,
      }),
    });
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
      throw new Error("Gagal menambahkan user.");
    }
    router.replace("/dashboard/users");
    router.refresh();
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
          <span className="font-bold text-secondary">Tambah User</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Tambah User</h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Buat akun CMS baru dengan NIP dan password.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-outline p-4">
          <h2 className="text-lg font-bold text-primary">User Information Form</h2>
        </div>
        <UserForm
          mode="add"
          submitLabel="Simpan User"
          onSubmit={handleCreate}
        />
      </div>
    </div>
  );
}
