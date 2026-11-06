import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";

// Feature-level access for Metode Kerja Standar.
//
// Admin is granted all three permissions by the central super-application
// rule. Head Office may create/edit but not delete; Management and Project are
// read-only. Status is checked by the service before these role assertions.

export class MetodeKerjaForbiddenError extends Error {
  constructor(message = "Akses Metode Kerja Standar ditolak") {
    super(message);
    this.name = "MetodeKerjaForbiddenError";
  }
}

export function canViewMetodeKerja(role: string): boolean {
  return hasPermission(role, PERMISSIONS.METODE_KERJA_VIEW);
}

export function canManageMetodeKerja(role: string): boolean {
  return hasPermission(role, PERMISSIONS.METODE_KERJA_MANAGE);
}

export function canDeleteMetodeKerja(role: string): boolean {
  return hasPermission(role, PERMISSIONS.METODE_KERJA_DELETE);
}

export function assertViewAccess(role: string): void {
  if (!canViewMetodeKerja(role)) {
    throw new MetodeKerjaForbiddenError();
  }
}

export function assertManageAccess(role: string): void {
  if (!canManageMetodeKerja(role)) {
    throw new MetodeKerjaForbiddenError();
  }
}

export function assertDeleteAccess(role: string): void {
  if (!canDeleteMetodeKerja(role)) {
    throw new MetodeKerjaForbiddenError();
  }
}

// PIC eligibility is role-only: suspended Head Office users remain assignable
// and are rendered with the UI's "(non-aktif)" label.
export function isEligibleMetodeKerjaPic(user: {
  role: string;
  status: string;
}): boolean {
  return user.role === HEAD_OFFICE_ROLE;
}
