import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewMasterProject } from "@/lib/master-project/access";

export default async function MasterProjectManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewMasterProject(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
