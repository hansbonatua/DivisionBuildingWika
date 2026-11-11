import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canValidateBerkas } from "@/lib/berkas/access";
import { isAdmin } from "@/lib/users/roles";
import BerkasVerifikasiPage from "@/components/dashboard/berkas/BerkasVerifikasiPage";

export default async function BerkasVerifikasiRoute() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const canValidate = canValidateBerkas(user.role);
  if (!canValidate) {
    redirect("/dashboard/berkas/ajukan");
  }

  return (
    <BerkasVerifikasiPage
      isAdmin={isAdmin(user.role)}
      canValidate={canValidate}
    />
  );
}
