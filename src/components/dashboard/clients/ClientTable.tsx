"use client";

import Link from "next/link";
import type { ClientApiItem } from "@/components/dashboard/clients/client-api.types";
import ClientStatusBadge from "@/components/dashboard/clients/ClientStatusBadge";
import ClientLogo from "@/components/dashboard/clients/ClientLogo";

type ClientTableProps = {
  clients: ClientApiItem[];
  pendingId: string | null;
  onToggleVisibility: (id: string, nextStatus: "active" | "hidden") => void;
};

export default function ClientTable({ clients, pendingId, onToggleVisibility }: ClientTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-outline p-4">
        <div className="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-secondary"
          >
            <line x1="3" x2="21" y1="22" y2="22" />
            <line x1="6" x2="6" y1="18" y2="11" />
            <line x1="10" x2="10" y1="18" y2="11" />
            <line x1="14" x2="14" y1="18" y2="11" />
            <line x1="18" x2="18" y1="18" y2="11" />
            <polygon points="12 2 20 7 4 7" />
          </svg>
          <h2 className="text-lg font-bold text-primary">Daftar Klien &amp; Mitra</h2>
        </div>
        <span className="text-xs font-semibold text-primary/70">{clients.length} klien</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="bg-background text-[11px] uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 text-left font-bold">Logo</th>
              <th className="px-4 py-3 text-left font-bold">Client</th>
              <th className="px-4 py-3 text-left font-bold">Link</th>
              <th className="px-4 py-3 text-left font-bold">Slot</th>
              <th className="px-4 py-3 text-left font-bold">Visibility</th>
              <th className="px-4 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const isActive = client.status === "active";
              const isPending = pendingId === client._id;
              return (
                <tr
                  key={client._id}
                  className={`border-t border-outline/40 hover:bg-background/50 ${isActive ? "" : "opacity-75"}`}
                >
                  <td className="px-4 py-2.5">
                    <ClientLogo
                      logoUrl={client.logoUrl}
                      alt={client.logoAlt || client.shortName || client.name}
                      shortName={client.shortName}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="block font-bold text-primary">{client.shortName || client.name}</span>
                    <span className="block text-[11px] text-primary/50">{client.category || "—"}</span>
                  </td>
                  <td className="max-w-48 truncate px-4 py-2.5 text-primary/70">
                    {client.link ? (
                      <a href={client.link} target="_blank" rel="noopener noreferrer" className="hover:text-secondary hover:underline">
                        {client.link}
                      </a>
                    ) : (
                      <span className="text-primary/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-lg bg-background px-1.5 py-0.5 text-[10px] font-bold text-primary/70">
                      {isActive ? `#${client.sortOrder}` : "STB"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <ClientStatusBadge visible={isActive} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button
                      type="button"
                      title={isActive ? "Visibilitas Aktif" : "Nonaktif"}
                      aria-label={`Toggle visibilitas ${client.shortName || client.name}`}
                      aria-pressed={isActive}
                      disabled={isPending}
                      onClick={() => onToggleVisibility(client._id, isActive ? "hidden" : "active")}
                      className={`rounded p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isActive ? "text-secondary hover:bg-background" : "text-primary/50 hover:text-secondary"
                      }`}
                    >
                      {isActive ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4-8 11-8" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      )}
                    </button>
                    <Link
                      href={`/dashboard/clients/${client._id}/edit`}
                      className="rounded px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
