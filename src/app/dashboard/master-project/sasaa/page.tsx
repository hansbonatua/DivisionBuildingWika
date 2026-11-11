import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import SasaaPage from "@/components/dashboard/sasaa/SasaaPage";

export default async function SasaaRoutePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <SasaaPage
      canManagePhotos={hasPermission(
        user.role,
        PERMISSIONS.MASTER_PROJECT_PHOTOS_MANAGE,
      )}
    />
  );
}
