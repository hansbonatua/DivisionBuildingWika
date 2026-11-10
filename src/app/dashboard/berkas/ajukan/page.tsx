import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canCreateBerkas } from "@/lib/berkas/access";
import BerkasAjukanPage from "@/components/dashboard/berkas/BerkasAjukanPage";

export default async function BerkasAjukanRoute() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <BerkasAjukanPage
      currentUser={{ id: user.id, name: user.name, position: user.position }}
      canCreate={canCreateBerkas(user.role)}
    />
  );
}
