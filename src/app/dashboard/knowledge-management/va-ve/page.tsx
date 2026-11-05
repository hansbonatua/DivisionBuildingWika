import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import KnowledgeManagementPage from "@/components/dashboard/knowledge-management/KnowledgeManagementPage";

export default async function VaVePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return (
    <KnowledgeManagementPage
      knowledgeType="va_ve"
      currentUserRole={user.role}
    />
  );
}
