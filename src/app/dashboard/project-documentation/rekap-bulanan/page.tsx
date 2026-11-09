import { getCurrentUser } from "@/lib/auth/current-user";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import ProjectDocumentationPage from "@/components/dashboard/project-documentation/ProjectDocumentationPage";

// The namespace layout already enforces auth and DOCUMENTATION_VIEW. This page
// only resolves the write capability for the monthly recap client.
export default async function ProjectDocumentationRekapBulananPage() {
  const user = await getCurrentUser();
  const canManage = user
    ? hasPermission(user.role, PERMISSIONS.DOCUMENTATION_MANAGE)
    : false;

  return <ProjectDocumentationPage canManage={canManage} />;
}
