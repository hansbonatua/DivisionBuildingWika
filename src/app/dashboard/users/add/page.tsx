"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import UserForm from "@/components/dashboard/users/UserForm";

export default function AddUserPage() {
  const router = useRouter();

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
          Buat akun CMS baru. Data demo tidak disimpan permanen.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-outline p-4">
          <h2 className="text-lg font-bold text-primary">User Information Form</h2>
        </div>
        <UserForm
          mode="add"
          submitLabel="Simpan User"
          onSubmit={() => router.push("/dashboard/users")}
        />
      </div>
    </div>
  );
}
