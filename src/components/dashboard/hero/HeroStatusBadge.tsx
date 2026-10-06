export default function HeroStatusBadge({ badge, active }: { badge: string; active: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
        active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
      }`}
    >
      {badge}
    </span>
  );
}
