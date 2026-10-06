import type { CertificateItem } from "@/lib/demo/green-building";

const STATUS_PILL: Record<CertificateItem["status"], string> = {
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-300",
  Pending: "bg-amber-50 text-amber-700 border-amber-300",
  Expired: "bg-slate-100 text-slate-600 border-slate-300",
};

export default function CertificateStatusBadge({ status }: { status: CertificateItem["status"] }) {
  return (
    <span className={`rounded border px-2 py-0.5 text-[11px] font-bold ${STATUS_PILL[status]}`}>
      {status}
    </span>
  );
}
