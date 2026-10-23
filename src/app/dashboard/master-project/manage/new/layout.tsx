import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canCreateMasterProject } from "@/lib/master-project/access";

export default async function NewMasterProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canCreateMasterProject(user.role)) {
    redirect("/dashboard/master-project/manage");
  }
  return <>{children}</>;
}
