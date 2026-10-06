"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ClientForm, { type ClientFormValues } from "@/components/dashboard/clients/ClientForm";
import ClientPreview from "@/components/dashboard/clients/ClientPreview";
import ClientStatusBadge from "@/components/dashboard/clients/ClientStatusBadge";
import type { ClientApiItem } from "@/components/dashboard/clients/client-api.types";

type LiveValues = ClientFormValues & { previewLogo: string | null };

function formatFromUrl(url: string): string {
  const ext = url.split("?")[0].split(".").pop() ?? "";
  return ext.length > 0 && ext.length <= 5 ? ext.toUpperCase() : "IMG";
}

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<ClientApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveValues, setLiveValues] = useState<LiveValues | null>(null);

  async function loadClient(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${id}`);
      if (response.status === 404) {
        setClient(null);
      } else if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      } else {
        const body = (await response.json()) as { data?: ClientApiItem };
        if (!body.data) {
          throw new Error("Empty response");
        }
        setClient(body.data);
      }
    } catch {
      setError("Gagal memuat data client.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handlePatch(values: ClientFormValues): Promise<void> {
    const response = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        shortName: values.shortName,
        category: values.category,
        link: values.link,
        logoUrl: values.logoUrl,
        logoAlt: values.logoAlt,
        status: values.status,
      }),
    });
    if (!response.ok) {
      let message = "Gagal menyimpan perubahan client.";
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline/40 pb-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Client</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data client...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline/40 pb-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Client</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error}</p>
          <button
            type="button"
            onClick={() => void loadClient()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline/40 pb-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Client</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">Client tidak ditemukan.</p>
          <p className="mt-1 text-xs text-primary/70">ID &quot;{id}&quot; tidak ada pada database.</p>
          <Link
            href="/dashboard/clients"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Kembali ke Our Client
          </Link>
        </div>
      </div>
    );
  }

  const previewLogo = liveValues?.previewLogo ?? null;
  const previewLogoUrl = liveValues?.logoUrl ?? client.logoUrl;

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
          <span className="font-bold text-primary">Edit Client</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Client / Partner</h1>
          <ClientStatusBadge visible={client.status === "active"} />
        </div>
        <p className="mt-1 max-w-3xl text-sm text-primary/70">
          ID: {client._id} • Slot #{client.sortOrder}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="overflow-hidden rounded-lg border border-outline/60 bg-surface shadow-sm lg:col-span-7">
          <div className="flex items-center gap-2 border-b border-outline/60 bg-background px-5 py-4">
            <h2 className="text-sm font-bold text-primary">Edit Detail Klien &amp; Mitra Unggulan</h2>
          </div>
          <ClientForm
            mode="edit"
            initialData={{
              name: client.name,
              shortName: client.shortName,
              category: client.category,
              link: client.link,
              logoUrl: client.logoUrl,
              logoAlt: client.logoAlt,
              status: client.status,
            }}
            submitLabel="Update & Publish"
            onSubmit={handlePatch}
            onValuesChange={setLiveValues}
          />
        </div>
        <div className="overflow-hidden rounded-lg border border-outline/60 bg-surface shadow-sm lg:col-span-5 lg:sticky lg:top-4">
          <div className="flex items-center gap-2 border-b border-outline/60 bg-background px-5 py-4">
            <h2 className="text-sm font-bold text-primary">Preview Logo</h2>
          </div>
          <ClientPreview
            shortName={liveValues?.shortName || liveValues?.name || client.shortName}
            link={liveValues?.link ?? client.link}
            logo={previewLogo ?? previewLogoUrl}
            logoFormat={previewLogo ? "UPLOAD" : formatFromUrl(previewLogoUrl)}
            visible={(liveValues?.status ?? client.status) === "active"}
            slotLabel={`#${client.sortOrder}`}
            clientId={client._id}
            updated={null}
          />
        </div>
      </div>
    </div>
  );
}
