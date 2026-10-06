"use client";

import Link from "next/link";
import Image from "next/image";
import type { CertificateItem } from "@/lib/demo/green-building";
import CertificateStatusBadge from "@/components/dashboard/green-building/CertificateStatusBadge";

type CertificateTableProps = {
  certificates: CertificateItem[];
  onDelete: (id: number) => void;
};

export default function CertificateTable({ certificates, onDelete }: CertificateTableProps) {
  const rows = [...certificates].sort((a, b) => a.displayOrder - b.displayOrder);
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
            className="text-primary"
          >
            <circle cx="12" cy="8" r="6" />
            <path d="M15.5 13 17 22l-5-3-5 3 1.5-9" />
          </svg>
          <h2 className="text-lg font-bold text-primary">GBC List Management</h2>
        </div>
        <span className="text-xs font-semibold text-primary/70">{certificates.length} sertifikat</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-xs">
          <thead>
            <tr className="bg-background text-[11px] uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 text-left font-bold">Image</th>
              <th className="px-4 py-3 text-left font-bold">Project</th>
              <th className="px-4 py-3 text-left font-bold">Certification</th>
              <th className="px-4 py-3 text-left font-bold">Level</th>
              <th className="px-4 py-3 text-left font-bold">Year</th>
              <th className="px-4 py-3 text-left font-bold">Order</th>
              <th className="px-4 py-3 text-left font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-outline/40 hover:bg-background/50">
                <td className="px-4 py-2.5">
                  <div className="relative h-12 w-16 overflow-hidden rounded border border-outline/40">
                    <Image src={row.image} alt="" fill sizes="64px" loading="lazy" className="object-cover" />
                  </div>
                </td>
                <td className="px-4 py-2.5 font-bold text-primary">{row.projectName}</td>
                <td className="px-4 py-2.5 text-primary/70">
                  {row.certificationBody}
                  <span className="text-primary/50"> • {row.certificationType}</span>
                </td>
                <td className="px-4 py-2.5 font-semibold text-secondary">{row.level}</td>
                <td className="px-4 py-2.5 text-primary/70">{row.year}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-lg bg-background px-1.5 py-0.5 text-[10px] font-bold text-primary/70">
                    #{row.displayOrder}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <CertificateStatusBadge status={row.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <Link
                    href={`/dashboard/green-building/${row.id}/edit`}
                    className="rounded px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(row.id)}
                    className="rounded px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
