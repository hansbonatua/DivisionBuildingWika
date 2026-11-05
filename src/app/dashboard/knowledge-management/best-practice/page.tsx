import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import KnowledgeTable from "@/components/dashboard/knowledge-management/KnowledgeTable";

export default async function BestPracticePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return <KnowledgeTable knowledgeType="best_practice" currentUserRole={user.role} />;
}
