"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CertificateTable from "@/components/dashboard/green-building/CertificateTable";
import type { GreenBuildingApiItem } from "@/components/dashboard/green-building/green-building-api.types";

export default function GreenBuildingIndexPage() {
  const [certificates, setCertificates] = useState<GreenBuildingApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadCertificates(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/green-buildings");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = (await response.json()) as { data?: GreenBuildingApiItem[] };
      setCertificates(Array.isArray(body.data) ? body.data : []);
    } catch {
      setError("Gagal memuat data sertifikat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCertificates();
  }, []);

  async function handleDelete(id: string): Promise<void> {
    if (deletingId !== null) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/green-buildings/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setCertificates((prev) => prev.filter((certificate) => certificate._id !== id));
    } catch {
      setError("Gagal menghapus sertifikat.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Sustainability CMS
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Green Building Certificates</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Green Building Certificate Management
          </h1>
          <p className="max-w-3xl text-base text-primary/70">
            Manage sustainability certification, rating, and green building achievements.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/dashboard/green-building/add"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-150 hover:bg-secondary"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            <span>Tambah Sertifikat</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data sertifikat...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error}</p>
          <button
            type="button"
            onClick={() => void loadCertificates()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : certificates.length === 0 ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Belum ada data sertifikat.</p>
        </div>
      ) : (
        <CertificateTable
          certificates={certificates}
          deletingId={deletingId}
          onDelete={(id) => void handleDelete(id)}
        />
      )}
    </div>
  );
}
