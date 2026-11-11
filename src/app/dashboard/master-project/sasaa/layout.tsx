import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

export default async function SasaaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!hasPermission(user.role, PERMISSIONS.DASHBOARD_SASAA_VIEW)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
