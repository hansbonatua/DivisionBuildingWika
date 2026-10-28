import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageMsl } from "@/lib/msl/access";
import MslEngineeringPage from "@/components/dashboard/msl/MslEngineeringPage";

// Read-only roles (Head Office) get the same page without any mutation
// controls; the flag is derived server-side from the session, never from the
// browser. The layout above already guarantees MSL view access.
export default async function MslRoutePage() {
  const user = await getCurrentUser();
  const canManage = user
    ? canManageMsl({ role: user.role, mslAccess: user.mslAccess })
    : false;

  return <MslEngineeringPage canManage={canManage} />;
}
