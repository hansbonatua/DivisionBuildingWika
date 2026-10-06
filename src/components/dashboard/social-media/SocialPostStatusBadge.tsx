export type SocialPostStatus = "Published" | "Draft" | "Hidden";

const STATUS_PILL: Record<SocialPostStatus, string> = {
  Published: "bg-emerald-50 text-emerald-700 border-emerald-300",
  Draft: "bg-slate-100 text-slate-600 border-slate-300",
  Hidden: "bg-amber-50 text-amber-700 border-amber-300",
};

export default function SocialPostStatusBadge({ status }: { status: SocialPostStatus }) {
  return (
    <span className={`rounded border px-2 py-0.5 text-[11px] font-bold ${STATUS_PILL[status]}`}>
      {status}
    </span>
  );
}
