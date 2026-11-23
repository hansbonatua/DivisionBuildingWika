import LearningCardGrid from "@/components/dashboard/learning/LearningCardGrid";

export default function SharingSessionPage() {
  return (
    <LearningCardGrid
      type="sharing"
      title="Sharing Session"
      description="Rekaman sesi berbagi pengetahuan internal. Klik card untuk membuka video dan lampirannya."
      emptyMessage="Belum ada Sharing Session yang dipublikasikan."
    />
  );
}
