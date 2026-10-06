import type { ProjectItem } from "@/lib/demo/projects";

const STATUS_PILL: Record<ProjectItem["status"], string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-300",
  Draft: "bg-slate-100 text-slate-600 border-slate-300",
};

export default function ProjectStatusBadge({ status }: { status: ProjectItem["status"] }) {
  return (
    <span className={`rounded border px-2 py-0.5 text-[11px] font-bold ${STATUS_PILL[status]}`}>
      {status}
    </span>
  );
}
