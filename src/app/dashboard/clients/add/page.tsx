"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ClientForm, { type ClientFormValues } from "@/components/dashboard/clients/ClientForm";

export default function AddClientPage() {
  const router = useRouter();

  async function handleCreate(values: ClientFormValues): Promise<void> {
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        shortName: values.shortName,
        category: values.category,
        link: values.link,
        logoUrl: values.logoUrl,
        logoAlt: values.logoAlt,
        status: "active",
      }),
    });
    if (!response.ok) {
      let message = "Gagal menambahkan client.";
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
    router.push("/dashboard/clients");
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-outline/40 pb-2">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-primary/50" aria-label="Breadcrumb">
          <Link href="/dashboard/clients" className="transition-colors hover:text-secondary">
            Our Client
          </Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-bold text-primary">Tambah Client</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Tambah Client / Mitra</h1>
        <p className="mt-1 max-w-3xl text-sm text-primary/70">
          Tambah klien atau mitra baru. Status awal: Aktif.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline/60 bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-outline/60 bg-background px-5 py-4">
          <h2 className="text-sm font-bold text-primary">Detail Klien &amp; Mitra Baru</h2>
        </div>
        <ClientForm mode="add" submitLabel="Simpan Client" onSubmit={handleCreate} />
      </div>
    </div>
  );
}
