import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import KnowledgeTable from "@/components/dashboard/knowledge-management/KnowledgeTable";

export default async function LessonLearnPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return <KnowledgeTable knowledgeType="lesson_learn" currentUserRole={user.role} />;
}
