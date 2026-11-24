import type { SasaaGreenBuilding } from "./types";

// Green Building banner. Compact card that sits next to the photo carousel:
// certificate identity on top, status + year below, documentation link last.
// The certificate is the newest one by certificate_year (chosen on the server).

const STATUS_TONES: Record<string, string> = {
  Certified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Under Construction": "bg-amber-50 text-amber-700 border-amber-200",
  "Non-Certified": "bg-slate-100 text-slate-600 border-slate-200",
};

function statusTone(status: string): string {
  return STATUS_TONES[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

export default function GreenBuildingBanner({
  greenBuilding,
}: {
  greenBuilding: SasaaGreenBuilding | null;
}) {
  if (!greenBuilding) {
    return (
      <section
        aria-label="Sertifikasi Green Building"
        className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-outline bg-background p-8 text-center"
      >
        <p className="text-sm font-bold text-primary/60">
          Belum ada sertifikasi Green Building
        </p>
        <p className="mt-1 text-xs text-primary/45">
          Data sertifikasi akan tampil setelah dicatat pada menu Green Building
          &amp; ESG.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Sertifikasi Green Building"
      className="flex h-full min-h-64 flex-col justify-between rounded-2xl border border-outline/70 bg-white p-5 shadow-sm"
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
          Sertifikasi Green Building
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-secondary">
            {greenBuilding.lembaga}
          </span>
          <span className="rounded-full border border-outline/70 bg-background px-3 py-1 text-xs font-bold text-primary/70">
            {greenBuilding.level}
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold tracking-tight text-primary">
          {greenBuilding.certificateYear}
        </p>
        <p className="mt-1 text-xs text-primary/50">Tahun sertifikat</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusTone(
            greenBuilding.status,
          )}`}
        >
          {greenBuilding.status}
        </span>
        {greenBuilding.documentationUrl ? (
          <a
            href={greenBuilding.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Dokumentasi
          </a>
        ) : (
          <span className="text-[11px] font-semibold text-primary/40">
            Dokumentasi belum tersedia
          </span>
        )}
      </div>
    </section>
  );
}
