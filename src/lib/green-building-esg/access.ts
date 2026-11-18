import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// Feature-level access for Database Green Building & ESG — Sertifikasi Green
// Building. Admin receives both permissions through the central super-app
// rule; Head Office manages; Management and Project are read-only. Account
// status is checked by the service layer.

export class GreenBuildingEsgForbiddenError extends Error {
  constructor(message = "Akses Database Green Building & ESG ditolak") {
    super(message);
    this.name = "GreenBuildingEsgForbiddenError";
  }
}

export function canViewGreenBuildingEsg(role: string): boolean {
  return hasPermission(role, PERMISSIONS.GREEN_BUILDING_ESG_VIEW);
}

export function canManageGreenBuildingEsg(role: string): boolean {
  return hasPermission(role, PERMISSIONS.GREEN_BUILDING_ESG_MANAGE);
}

export function assertViewAccess(role: string): void {
  if (!canViewGreenBuildingEsg(role)) {
    throw new GreenBuildingEsgForbiddenError();
  }
}

export function assertManageAccess(role: string): void {
  if (!canManageGreenBuildingEsg(role)) {
    throw new GreenBuildingEsgForbiddenError();
  }
}
