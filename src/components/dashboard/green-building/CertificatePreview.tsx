import Image from "next/image";

type CertificatePreviewProps = {
  image: string;
  projectName: string;
  certificationBody: string;
  description: string;
  year: number | string;
  score: number | string;
  status: string;
};

export default function CertificatePreview({
  image,
  projectName,
  certificationBody,
  description,
  year,
  score,
  status,
}: CertificatePreviewProps) {
  return (
    <div className="p-5">
      <div className="overflow-hidden rounded-2xl border border-outline/40 bg-white shadow-sm">
        <div className="relative aspect-[16/10] w-full">
          <Image src={image} alt="Preview sertifikat" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" />
        </div>
        <div className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary">Lorem Ipsum</span>
            <span className="text-[11px] text-primary/50">Year: {year || "-"}</span>
          </div>
          <h4 className="text-lg font-bold text-primary">{projectName || "-"}</h4>
          <p className="text-xs font-semibold text-secondary">{certificationBody || "-"}</p>
          <p className="mt-1 text-sm text-primary/70">{description || "-"}</p>
          <div className="mt-3 flex items-center justify-between border-t border-outline/20 pt-3 text-[11px]">
            <span className="text-primary/50">Score: {score || 0}/100</span>
            <span className="font-semibold text-secondary">{status}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Preview mengikuti isian form secara langsung.</p>
    </div>
  );
}
