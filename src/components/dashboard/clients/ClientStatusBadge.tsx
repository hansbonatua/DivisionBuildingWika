export default function ClientStatusBadge({ visible }: { visible: boolean }) {
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[11px] font-bold ${
        visible
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-slate-300 bg-slate-100 text-slate-600"
      }`}
    >
      {visible ? "Aktif" : "Nonaktif"}
    </span>
  );
}
