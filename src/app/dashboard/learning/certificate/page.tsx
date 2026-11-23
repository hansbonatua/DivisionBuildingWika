import LearningCardGrid from "@/components/dashboard/learning/LearningCardGrid";

export default function CertificatePage() {
  return (
    <LearningCardGrid
      type="certificate"
      title="Certificate"
      description="Sertifikasi dan pencapaian kompetensi. Klik card untuk membuka tautan sertifikat pada tab baru."
      emptyMessage="Belum ada Certificate yang dipublikasikan."
    />
  );
}
