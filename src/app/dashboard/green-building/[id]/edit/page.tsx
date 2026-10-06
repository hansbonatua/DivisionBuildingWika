"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCertificateById } from "@/lib/demo/green-building";
import CertificateForm, { type CertificateFormValues } from "@/components/dashboard/green-building/CertificateForm";
import CertificatePreview from "@/components/dashboard/green-building/CertificatePreview";
import CertificateStatusBadge from "@/components/dashboard/green-building/CertificateStatusBadge";

export default function EditCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const certificate = getCertificateById(Number(id));
  const [liveValues, setLiveValues] = useState<CertificateFormValues | null>(null);

  if (!certificate) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Sertifikat</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">Sertifikat tidak ditemukan.</p>
          <p className="mt-1 text-xs text-primary/70">ID &quot;{id}&quot; tidak ada pada data demo.</p>
          <Link
            href="/dashboard/green-building"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Kembali ke Green Building
          </Link>
        </div>
      </div>
    );
  }

  const preview = liveValues ?? {
    image: certificate.image,
    projectName: certificate.projectName,
    certificationBody: certificate.certificationBody,
    certificationType: certificate.certificationType,
    level: certificate.level,
    year: certificate.year,
    certificateNumber: certificate.certificateNumber,
    score: certificate.score,
    description: certificate.description,
    status: certificate.status,
    expiryDate: certificate.expiryDate,
    displayOrder: certificate.displayOrder,
    publishStatus: certificate.publishStatus,
  };

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
          <span className="font-bold text-secondary">Edit Sertifikat</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Sertifikat</h1>
          <CertificateStatusBadge status={certificate.status} />
        </div>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          {certificate.projectName} — {certificate.certificateNumber} (ID #{certificate.id}). Demo: perubahan
          tidak disimpan permanen.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-outline p-4">
            <h2 className="text-lg font-bold text-primary">Edit GBC #{certificate.id}</h2>
          </div>
          <CertificateForm
            mode="edit"
            initialData={certificate}
            submitLabel="Simpan Sertifikat"
            onSubmit={() => router.push("/dashboard/green-building")}
            onValuesChange={setLiveValues}
          />
        </div>
        <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm lg:sticky lg:top-4">
          <div className="flex items-center gap-2 border-b border-outline p-4">
            <h2 className="text-lg font-bold text-primary">Preview Certificate Card</h2>
          </div>
          <CertificatePreview
            image={preview.image}
            projectName={preview.projectName}
            certificationBody={preview.certificationBody}
            description={preview.description}
            year={preview.year}
            score={preview.score}
            status={preview.status}
          />
        </div>
      </div>
    </div>
  );
}
