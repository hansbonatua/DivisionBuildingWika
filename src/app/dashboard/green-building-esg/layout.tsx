import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewGreenBuildingEsg } from "@/lib/green-building-esg/access";

// Namespace guard for Database Green Building & ESG. API routes remain the
// final security boundary; this guard only protects page rendering.
export default async function GreenBuildingEsgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewGreenBuildingEsg(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
