"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import UserForm from "@/components/dashboard/users/UserForm";
import { getUserById } from "@/lib/demo/users";

const profileFallback = {
  id: 0,
  photo: "",
  name: "R. Triyanto S.T.",
  phone: "",
  nip: "",
  position: "Senior Expert",
  role: "Superadmin CMS",
  password: "******",
};

export default function EditProfilePage() {
  const router = useRouter();
  const demoUser = getUserById(1);
  const initialData = {
    ...(demoUser ?? profileFallback),
    name: "R. Triyanto S.T.",
    role: "Superadmin CMS",
  };

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
          Perbarui informasi akun dan profil Anda. Data demo tidak disimpan permanen.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-outline p-4">
          <h2 className="text-lg font-bold text-primary">Profile Information</h2>
        </div>
        <UserForm
          mode="edit"
          initialData={initialData}
          formTitle="Profile Information"
          cancelHref="/dashboard"
          roleReadOnly
          submitLabel="Simpan Perubahan"
          onSubmit={() => router.push("/dashboard")}
        />
      </div>
    </div>
  );
}
