import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewGreenBuildingEsg } from "@/lib/green-building-esg/access";

// Page-level guard for the Sertifikasi submenu. Kept in addition to the
// namespace layout so the route remains protected if it is moved or nested.
export default async function SertifikasiGreenBuildingLayout({
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
