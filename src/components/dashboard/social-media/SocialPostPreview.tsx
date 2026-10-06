import Image from "next/image";
import SocialPostStatusBadge from "@/components/dashboard/social-media/SocialPostStatusBadge";

type SocialPostPreviewProps = {
  image: string;
  account: string;
  caption: string;
  url: string;
  type: string;
  status: "Published" | "Draft" | "Hidden";
};

export default function SocialPostPreview({
  image,
  account,
  caption,
  url,
  type,
  status,
}: SocialPostPreviewProps) {
  return (
    <div className="p-5">
      <div className="overflow-hidden rounded-2xl border border-outline/40 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-outline/20 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary">
            {account.charAt(1).toUpperCase()}
          </div>
          <span className="truncate text-sm font-bold text-primary">{account || "-"}</span>
        </div>
        <div className="relative aspect-[16/10] w-full bg-slate-100">
          {image ? (
            <Image src={image} alt="Preview postingan" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" />
          ) : null}
        </div>
        <div className="p-4">
          <p className="text-sm leading-relaxed text-primary/70">{caption || "-"}</p>
          <div className="mt-3 flex items-center justify-between border-t border-outline/20 pt-3">
            <span className="text-[11px] text-primary/50">• {type}</span>
            <SocialPostStatusBadge status={status} />
          </div>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline"
            >
              Lihat Postingan
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17 17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </a>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Preview mengikuti isian form secara langsung.</p>
    </div>
  );
}
