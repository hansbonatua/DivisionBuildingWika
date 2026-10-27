import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { isAdmin, isHeadOffice } from "@/lib/users/roles";

// Canonical units — single source of truth (matches the DB CHECK
// constraint). Dependency-free, safe to import in Client Components.
export const PROGRAM_KERJA_UNITS = ["Jumlah", "Persentase"] as const;

export type ProgramKerjaUnit = (typeof PROGRAM_KERJA_UNITS)[number];

// Access rules delegate to the central feature-permission layer. Program
// Kerja is NOT visible to the Project role.

export function canManageProgramKerja(role: string): boolean {
  return hasPermission(role, PERMISSIONS.PROGRAM_KERJA_MANAGE);
}

export function canViewProgramKerja(role: string): boolean {
  return hasPermission(role, PERMISSIONS.PROGRAM_KERJA_VIEW);
}

// Summary Report is a read surface of the same view permission (View roles and
// Summary roles are identical: Admin, Head Office, Management).
export function canViewProgramKerjaSummary(role: string): boolean {
  return hasPermission(role, PERMISSIONS.PROGRAM_KERJA_VIEW);
}

// RI updates combine two different rules:
//   feature-level  → PROGRAM_KERJA_EDIT_RI (Admin always, Head Office)
//   record-level   → Head Office must additionally be an assigned PIC
// Admin = super application: allowed for every Program Kerja record without
// being assigned as PIC (Admin can never be a PIC; PIC stays Head Office only).
export function canUpdateProgramRi(role: string, isAssignedPic: boolean): boolean {
  if (isAdmin(role)) {
    return true;
  }
  return (
    isHeadOffice(role) &&
    hasPermission(role, PERMISSIONS.PROGRAM_KERJA_EDIT_RI) &&
    isAssignedPic
  );
}

// Note/evidence follow manage-level access (PICs are Head Office by rule,
// so assigned PICs are included automatically).
export function canUpdateProgramNote(role: string): boolean {
  return canManageProgramKerja(role);
}

export function canUpdateProgramEvidence(role: string): boolean {
  return canManageProgramKerja(role);
}
