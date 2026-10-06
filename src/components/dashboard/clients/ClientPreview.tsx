import ClientStatusBadge from "@/components/dashboard/clients/ClientStatusBadge";

type ClientPreviewProps = {
  shortName: string;
  link: string;
  logo: string | null;
  logoFormat: string;
  visible: boolean;
  slotLabel: string;
  clientId: string;
  updated: string | null;
};

export default function ClientPreview({
  shortName,
  link,
  logo,
  logoFormat,
  visible,
  slotLabel,
  clientId,
  updated,
}: ClientPreviewProps) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-3">
        <div className="relative flex h-20 w-36 flex-col items-center justify-center rounded border border-outline/60 bg-surface p-2 shadow-sm">
          <div className="flex h-full items-center justify-center overflow-hidden">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={`Logo ${shortName}`} className="h-full w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-secondary">
                  <line x1="3" x2="21" y1="22" y2="22" />
                  <line x1="6" x2="6" y1="18" y2="11" />
                  <line x1="10" x2="10" y1="18" y2="11" />
                  <line x1="14" x2="14" y1="18" y2="11" />
                  <line x1="18" x2="18" y1="18" y2="11" />
                  <polygon points="12 2 20 7 4 7" />
                </svg>
                <span className="mt-0.5 max-w-full truncate px-1 text-[10px] font-extrabold uppercase tracking-tighter text-primary">
                  {shortName || "—"}
                </span>
              </div>
            )}
          </div>
          <span className="absolute bottom-1 right-1 rounded bg-background px-1 font-mono text-[9px] text-primary/50">
            {logoFormat}
          </span>
        </div>
        <div className="min-w-0">
          <span className="rounded border border-outline/50 bg-surface px-2 py-1 font-mono text-[11px] text-primary/50">
            SLOT {slotLabel}
          </span>
        </div>
      </div>
      <div className="mt-4 space-y-2 border-t border-outline/40 pt-4 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-primary/50">ID</span>
          <span className="font-mono text-[11px] font-bold text-primary">{clientId}</span>
        </div>
        {updated ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-primary/50">Update</span>
            <span className="text-[11px] text-primary/70">{updated}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <span className="text-primary/50">Link</span>
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="max-w-48 truncate font-medium text-secondary hover:underline">
              {link}
            </a>
          ) : (
            <span className="text-primary/40">—</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-primary/50">Visibility</span>
          <ClientStatusBadge visible={visible} />
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Preview mengikuti isian form secara langsung.</p>
    </div>
  );
}
