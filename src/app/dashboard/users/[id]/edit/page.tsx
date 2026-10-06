"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUserById } from "@/lib/demo/users";
import UserAvatar from "@/components/dashboard/users/UserAvatar";
import UserForm from "@/components/dashboard/users/UserForm";
import UserRoleBadge from "@/components/dashboard/users/UserRoleBadge";

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const user = getUserById(Number(id));

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit User</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">User tidak ditemukan.</p>
          <p className="mt-1 text-xs text-primary/70">ID &quot;{id}&quot; tidak ada pada data demo.</p>
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
        </div>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          {user.name} — {user.position} (ID #{user.id}). Data demo tidak disimpan permanen.
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
          onSubmit={() => router.push("/dashboard/users")}
        />
      </div>
    </div>
  );
}
