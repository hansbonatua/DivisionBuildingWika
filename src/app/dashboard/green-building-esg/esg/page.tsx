import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageGreenBuildingEsg } from "@/lib/green-building-esg/access";
import EsgPage from "@/components/dashboard/green-building-esg/EsgPage";

export default async function EsgAssessmentPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return <EsgPage canManage={canManageGreenBuildingEsg(user.role)} />;
}
