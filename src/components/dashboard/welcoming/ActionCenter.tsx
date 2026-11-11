import Link from "next/link";
import type { DashboardAction, DashboardActions } from "@/lib/dashboard/service";

const groupConfig = [
  {
    key: "pendingTtd",
    title: "Berkas Butuh TTD",
    description: "Menunggu tanda tangan Anda",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    key: "missingRi",
    title: "Program Kerja Belum RI",
    description: "Realisasi bulan ini belum diisi",
    tone: "bg-blue-50 text-secondary",
  },
  {
    key: "rejectedBerkas",
    title: "Berkas Ditolak",
    description: "Perlu diperbaiki dan diajukan ulang",
    tone: "bg-red-50 text-red-700",
  },
] as const;

function ActionRow({ item, tone }: { item: DashboardAction; tone: string }) {
  return (
    <Link
      href={item.href}
      className="group flex items-start gap-3 rounded-xl border border-outline/50 bg-white px-3.5 py-3 transition-colors hover:border-secondary/40 hover:bg-blue-50/40"
    >
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${tone}`}>
        {item.kind === "TTD" ? "TTD" : item.kind === "RI" ? "RI" : "!"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-primary">{item.title}</span>
        <span className="mt-0.5 block text-[11px] font-medium text-primary/50">{item.meta}</span>
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="mt-1 h-4 w-4 shrink-0 text-primary/30 transition-colors group-hover:text-secondary"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  );
}

export default function ActionCenter({ actions }: { actions: DashboardActions }) {
  const groups = groupConfig
    .map((group) => ({ ...group, items: actions[group.key] }))
    .filter((group) => group.items.length > 0);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="rounded-2xl border border-outline/70 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">Action Center</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-primary">Tindakan yang Dibutuhkan</h2>
        </div>
        <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-bold text-primary/60">
          {total} tugas
        </span>
      </div>

      {total === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-outline bg-background/40 px-5 py-8 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="m5 12 4 4L19 6" />
            </svg>
          </span>
          <p className="mt-3 text-sm font-semibold text-primary">
            Tidak ada tindakan yang dibutuhkan saat ini. Kerja bagus!
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-primary">{group.title}</h3>
                  <p className="text-[11px] text-primary/45">{group.description}</p>
                </div>
                <span className="text-[11px] font-bold text-primary/40">{group.items.length}</span>
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <ActionRow key={`${group.key}-${item.id}`} item={item} tone={group.tone} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
