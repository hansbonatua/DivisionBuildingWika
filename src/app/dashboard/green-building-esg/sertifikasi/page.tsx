import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageGreenBuildingEsg } from "@/lib/green-building-esg/access";
import SertifikasiPage from "@/components/dashboard/green-building-esg/SertifikasiPage";

export default async function SertifikasiGreenBuildingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return (
    <SertifikasiPage canManage={canManageGreenBuildingEsg(user.role)} />
  );
}
