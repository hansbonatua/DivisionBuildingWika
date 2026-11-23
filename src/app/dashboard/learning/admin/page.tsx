import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageLearning } from "@/lib/learning/access";
import LearningAdminPage from "@/components/dashboard/learning/LearningAdminPage";

export default async function LearningAdminRoute() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canManageLearning(user.role)) {
    redirect("/dashboard/learning/sharing");
  }
  return <LearningAdminPage />;
}
