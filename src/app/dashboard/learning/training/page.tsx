import LearningCardGrid from "@/components/dashboard/learning/LearningCardGrid";

export default function TrainingPage() {
  return (
    <LearningCardGrid
      type="training"
      title="Training"
      description="Program pelatihan Building Learning Center. Klik card untuk membuka materi pada tab baru."
      emptyMessage="Belum ada program Training yang dipublikasikan."
    />
  );
}
