import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// Feature-level access for Standard & Regulation. Admin is granted both
// permissions by the central super-application rule; Head Office manages,
// Management and Project are read-only. Account status is checked by service.

export class RegulationForbiddenError extends Error {
  constructor(message = "Akses Standard & Regulation ditolak") {
    super(message);
    this.name = "RegulationForbiddenError";
  }
}

export function canViewRegulation(role: string): boolean {
  return hasPermission(role, PERMISSIONS.REGULATION_VIEW);
}

export function canManageRegulation(role: string): boolean {
  return hasPermission(role, PERMISSIONS.REGULATION_MANAGE);
}

export function assertRegulationViewAccess(role: string): void {
  if (!canViewRegulation(role)) {
    throw new RegulationForbiddenError();
  }
}

export function assertRegulationManageAccess(role: string): void {
  if (!canManageRegulation(role)) {
    throw new RegulationForbiddenError();
  }
}
