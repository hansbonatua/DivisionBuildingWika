import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// Namespace guard for Project Documentation. The API repeats the check, so a
// stale page render can never grant a write.
export default async function ProjectDocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!hasPermission(user.role, PERMISSIONS.DOCUMENTATION_VIEW)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
