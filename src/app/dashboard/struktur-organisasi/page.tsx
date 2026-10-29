import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  canManageOrganizationStructure,
  canViewOrganizationStructure,
} from "@/lib/organization-structure/access";
import OrganizationStructurePage from "@/components/dashboard/organization-structure/OrganizationStructurePage";

// `canManage` is derived from the server session only — the browser never
// decides whether the Admin controls exist. The API remains the security
// boundary: it re-checks ORGANIZATION_STRUCTURE_MANAGE on every mutation.
export default async function StrukturOrganisasiRoutePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canViewOrganizationStructure(user.role)) {
    redirect("/dashboard");
  }

  return (
    <OrganizationStructurePage
      canManage={canManageOrganizationStructure(user.role)}
    />
  );
}
