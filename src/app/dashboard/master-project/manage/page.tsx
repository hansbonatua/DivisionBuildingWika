import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewMasterProject } from "@/lib/master-project/access";
import MasterProjectTable from "@/components/dashboard/master-project/MasterProjectTable";

export default async function MasterProjectManagePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewMasterProject(user.role)) {
    redirect("/dashboard");
  }
  return <MasterProjectTable currentUserRole={user.role} />;
}
