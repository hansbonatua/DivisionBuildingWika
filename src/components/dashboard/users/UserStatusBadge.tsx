const STATUS_STYLES: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  suspended: "border-red-200 bg-red-50 text-red-700",
};

export default function UserStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "border-outline/60 bg-background text-primary/70";
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-[11px] font-bold ${style}`}
    >
      {status}
    </span>
  );
}
