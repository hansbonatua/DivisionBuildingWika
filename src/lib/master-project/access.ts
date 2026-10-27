import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// Access rules delegate to the central feature-permission layer.
// Admin is granted every permission by the super-application rule; the
// non-Admin mapping keeps Head Office / Project / Management as before.

export function canViewMasterProject(role: string): boolean {
  return hasPermission(role, PERMISSIONS.MASTER_PROJECT_VIEW);
}

export function canCreateMasterProject(role: string): boolean {
  return hasPermission(role, PERMISSIONS.MASTER_PROJECT_CREATE);
}

export function canEditMasterProject(role: string): boolean {
  return hasPermission(role, PERMISSIONS.MASTER_PROJECT_EDIT);
}

export function canDeleteMasterProject(role: string): boolean {
  return hasPermission(role, PERMISSIONS.MASTER_PROJECT_DELETE);
}
