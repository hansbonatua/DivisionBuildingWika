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

  return (
    <BerkasVerifikasiPage
      isAdmin={isAdmin(user.role)}
      canValidate={canValidateBerkas(user.role)}
    />
  );
}
