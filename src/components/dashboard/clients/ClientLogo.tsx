import Image from "next/image";

// Shared logo cell: real image (local via next/image, remote via plain img)
// with symbolic fallback when logoUrl is empty. Avoids over-componentization
// while keeping table + form-adjacent previews consistent.
export default function ClientLogo({
  logoUrl,
  alt,
  shortName,
}: {
  logoUrl: string;
  alt: string;
  shortName: string;
}) {
  if (!logoUrl) {
    return (
      <div className="flex h-10 w-14 flex-col items-center justify-center rounded border border-outline/60 bg-surface p-1">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-secondary">
          <line x1="3" x2="21" y1="22" y2="22" />
          <line x1="6" x2="6" y1="18" y2="11" />
          <line x1="10" x2="10" y1="18" y2="11" />
          <line x1="14" x2="14" y1="18" y2="11" />
          <line x1="18" x2="18" y1="18" y2="11" />
          <polygon points="12 2 20 7 4 7" />
        </svg>
        <span className="mt-0.5 max-w-full truncate text-[8px] font-extrabold uppercase tracking-tighter text-primary">
          {shortName}
        </span>
      </div>
    );
  }
  if (!logoUrl.startsWith("/")) {
    return (
      // Remote CMS URLs bypass next/image so no remotePatterns config is needed.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={alt}
        loading="lazy"
        className="h-10 w-14 rounded border border-outline/60 object-contain bg-surface p-1"
      />
    );
  }
  return (
    <div className="relative h-10 w-14 overflow-hidden rounded border border-outline/60 bg-surface p-1">
      <Image src={logoUrl} alt={alt} fill sizes="56px" loading="lazy" className="object-contain" />
    </div>
  );
}
