import type { ProjectItem } from "@/lib/demo/projects";
import ProjectThumbIcon from "@/components/dashboard/projects/ProjectThumbIcon";

type ProjectPreviewProps = {
  title: string;
  category: string;
  location: string;
  progress: number;
  image: string | null;
  imageAlt: string;
  icon: ProjectItem["icon"];
};

export default function ProjectPreview({
  title,
  category,
  location,
  progress,
  image,
  imageAlt,
  icon,
}: ProjectPreviewProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-outline/60 bg-surface shadow-sm">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={imageAlt || title} className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-background text-primary/40">
          {icon ? <ProjectThumbIcon icon={icon} /> : null}
        </div>
      )}
      <div className="p-4">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-secondary">
          Featured Project
        </div>
        <h4 className="text-lg font-bold text-primary">{title || "—"}</h4>
        <p className="text-xs text-primary/70">{category || "—"}</p>
        <p className="text-[11px] text-primary/50">{location || "—"}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded bg-slate-200">
            <div className="h-1.5 rounded bg-secondary" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] font-bold text-primary/70">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
