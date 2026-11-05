import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewKnowledgeManagement } from "@/lib/knowledge-management/access";

// Namespace guard for Knowledge Management V1. It lives OUTSIDE
// /dashboard/program-kerja on purpose: that layout is gated by
// PROGRAM_KERJA_VIEW (no Project access) and must not be weakened. The sidebar
// still renders this module nested under the Program Kerja group.
export default async function KnowledgeManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewKnowledgeManagement(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
