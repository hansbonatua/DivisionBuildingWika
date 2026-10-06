"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CertificateForm, { type CertificateFormValues } from "@/components/dashboard/green-building/CertificateForm";
import CertificatePreview from "@/components/dashboard/green-building/CertificatePreview";
import CertificateStatusBadge from "@/components/dashboard/green-building/CertificateStatusBadge";
import type { GreenBuildingApiItem } from "@/components/dashboard/green-building/green-building-api.types";

export default function EditCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [certificate, setCertificate] = useState<GreenBuildingApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveValues, setLiveValues] = useState<CertificateFormValues | null>(null);
  const [livePreview, setLivePreview] = useState<string | null>(null);

  async function loadCertificate(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/green-buildings/${id}`);
      if (response.status === 404) {
        setCertificate(null);
      } else if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      } else {
        const body = (await response.json()) as { data?: GreenBuildingApiItem };
        if (!body.data) {
          throw new Error("Empty response");
        }
        setCertificate(body.data);
      }
    } catch {
      setError("Gagal memuat data sertifikat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCertificate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handlePatch(values: CertificateFormValues): Promise<void> {
    const response = await fetch(`/api/green-buildings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: values.projectName,
        certificationBody: values.certificationBody,
        certificationType: values.certificationType,
        level: values.level,
        year: values.year,
        certificateNumber: values.certificateNumber,
        score: values.score,
        description: values.description,
        imageUrl: values.imageUrl,
        imageAlt: values.imageAlt,
        status: values.status,
        publishStatus: values.publishStatus,
      }),
    });
    if (!response.ok) {
      let message = "Gagal menyimpan perubahan sertifikat.";
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
    router.push("/dashboard/green-building");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Sertifikat</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data sertifikat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Sertifikat</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error}</p>
          <button
            type="button"
            onClick={() => void loadCertificate()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Sertifikat</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">Sertifikat tidak ditemukan.</p>
          <p className="mt-1 text-xs text-primary/70">ID &quot;{id}&quot; tidak ada pada database.</p>
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

  const previewImage = livePreview ?? liveValues?.imageUrl ?? certificate.imageUrl;

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
          {certificate.projectName} — {certificate.certificateNumber} (ID #{certificate._id})
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-outline p-4">
            <h2 className="text-lg font-bold text-primary">Edit GBC #{certificate.sortOrder}</h2>
          </div>
          <CertificateForm
            mode="edit"
            initialData={{
              projectName: certificate.projectName,
              certificationBody: certificate.certificationBody,
              certificationType: certificate.certificationType,
              level: certificate.level,
              year: certificate.year,
              certificateNumber: certificate.certificateNumber,
              score: certificate.score,
              description: certificate.description,
              imageUrl: certificate.imageUrl,
              imageAlt: certificate.imageAlt,
              status: certificate.status,
              publishStatus: certificate.publishStatus,
            }}
            submitLabel="Simpan Sertifikat"
            onSubmit={handlePatch}
            onValuesChange={(values, preview) => {
              setLiveValues(values);
              setLivePreview(preview);
            }}
          />
        </div>
        <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm lg:sticky lg:top-4">
          <div className="flex items-center gap-2 border-b border-outline p-4">
            <h2 className="text-lg font-bold text-primary">Preview Certificate Card</h2>
          </div>
          <CertificatePreview
            image={previewImage}
            projectName={liveValues?.projectName ?? certificate.projectName}
            certificationBody={liveValues?.certificationBody ?? certificate.certificationBody}
            description={liveValues?.description ?? certificate.description}
            year={liveValues?.year ?? certificate.year}
            score={liveValues?.score ?? certificate.score}
            status={liveValues?.status ?? certificate.status}
          />
        </div>
      </div>
    </div>
  );
}
