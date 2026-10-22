import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canViewTemplateForm } from "@/lib/template-form/access";
import TemplateFormTable from "@/components/dashboard/template-form/TemplateFormTable";

export default async function TemplateFormPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewTemplateForm(user.role)) {
    redirect("/dashboard");
  }
  return <TemplateFormTable currentUserRole={user.role} />;
}
