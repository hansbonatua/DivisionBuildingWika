"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ClientApiItem } from "@/components/dashboard/clients/client-api.types";
import ClientTable from "@/components/dashboard/clients/ClientTable";

export default function ClientsIndexPage() {
  const [clients, setClients] = useState<ClientApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function loadClients(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/clients");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = (await response.json()) as { data?: ClientApiItem[] };
      setClients(Array.isArray(body.data) ? body.data : []);
    } catch {
      setError("Gagal memuat data client.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  async function handleToggleVisibility(id: string, nextStatus: "active" | "hidden"): Promise<void> {
    if (pendingId !== null) {
      return;
    }
    setPendingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setClients((prev) =>
        prev.map((client) => (client._id === id ? { ...client, status: nextStatus } : client)),
      );
    } catch {
      setError("Gagal mengubah status client.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline/40 pb-2 md:flex-row md:items-center">
        <div>
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-primary/50" aria-label="Breadcrumb">
            <span>Landing Page CMS</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span>Menu Konten</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span className="font-bold text-primary">Our Client</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Manajemen Session Our Client</h1>
            <span className="rounded border border-secondary/20 bg-background px-2 py-0.5 text-xs font-semibold text-secondary">
              {clients.length} Rekanan
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-primary/70">
            Kelola logo korporat klien, instansi kementerian, BUMN, dan mitra internasional yang tampil pada
            section logo showcase dan strip banner landing page WIBEX.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/dashboard/clients/add"
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            <span>Tambah Client</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data client...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error}</p>
          <button
            type="button"
            onClick={() => void loadClients()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Belum ada data client.</p>
        </div>
      ) : (
        <ClientTable
          clients={clients}
          pendingId={pendingId}
          onToggleVisibility={(id, next) => void handleToggleVisibility(id, next)}
        />
      )}
    </div>
  );
}
