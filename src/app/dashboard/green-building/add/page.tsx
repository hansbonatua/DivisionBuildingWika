"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import CertificateForm from "@/components/dashboard/green-building/CertificateForm";

export default function AddCertificatePage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <nav className="mb-2 flex items-center gap-2 text-[11px] text-primary/50" aria-label="Breadcrumb">
          <Link href="/dashboard/green-building" className="transition-colors hover:text-secondary">
            Green Building Certificate
          </Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-bold text-secondary">Tambah Sertifikat</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Tambah Sertifikat</h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Buat sertifikat green building baru. Demo: data tidak disimpan permanen.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-outline p-4">
          <h2 className="text-lg font-bold text-primary">Add GBC Form</h2>
        </div>
        <CertificateForm
          mode="add"
          submitLabel="Simpan Sertifikat"
          onSubmit={() => router.push("/dashboard/green-building")}
        />
      </div>
    </div>
  );
}
