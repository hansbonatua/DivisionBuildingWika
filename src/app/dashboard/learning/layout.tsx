import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewLearning } from "@/lib/learning/access";

// Module-level guard: every BLC route (public pages, detail, admin) requires
// LEARNING_VIEW. Admin Control adds its own LEARNING_MANAGE check.
export default async function LearningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewLearning(user.role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
