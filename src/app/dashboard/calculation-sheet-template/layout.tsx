import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// Namespace guard for Calculation Sheet Template. The API repeats the check, so
// a stale page render can never grant a write.
export default async function CalculationSheetTemplateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!hasPermission(user.role, PERMISSIONS.CALCULATION_SHEET_VIEW)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
