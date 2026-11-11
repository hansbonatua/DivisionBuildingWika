export default function WelcomeCard({
  name,
  role,
  dateLabel,
}: {
  name: string;
  role: string;
  dateLabel: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary p-6 text-white shadow-sm sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-secondary/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
            Dashboard
          </p>
          <h1 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl">
            Selamat Datang, {name}!
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {role} · WIBEX CMS Studio
          </p>
        </div>

        <div className="flex w-fit items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-sm">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4 text-white/75"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
          <span className="text-xs font-semibold sm:text-sm">{dateLabel}</span>
        </div>
      </div>
    </section>
  );
}
