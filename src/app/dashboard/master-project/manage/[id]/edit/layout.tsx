import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canEditMasterProject } from "@/lib/master-project/access";

export default async function EditMasterProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canEditMasterProject(user.role)) {
    redirect("/dashboard/master-project/manage");
  }
  return <>{children}</>;
}
