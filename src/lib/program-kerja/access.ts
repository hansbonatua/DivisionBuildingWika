import type { UserRole } from "@/lib/users/roles";
import { ADMIN_ROLE, HEAD_OFFICE_ROLE } from "@/lib/users/roles";

// Canonical units — single source of truth (matches the DB CHECK
// constraint). Dependency-free, safe to import in Client Components.
export const PROGRAM_KERJA_UNITS = ["Jumlah", "Persentase"] as const;

export type ProgramKerjaUnit = (typeof PROGRAM_KERJA_UNITS)[number];

// Kelola Program Kerja access (Phase 2). Summary access is NOT defined here
// (Summary Report comes in a later phase). Project has no access at all.

// Roles allowed to manage (table/create/edit/delete/note/evidence).
const MANAGE_ROLES: readonly UserRole[] = [ADMIN_ROLE, HEAD_OFFICE_ROLE];

export function canManageProgramKerja(role: string): boolean {
  return (MANAGE_ROLES as readonly string[]).includes(role);
}

// RI updates additionally require record-level PIC assignment on top of
// the Head Office role. Admin without assignment is denied; Head Office
// without assignment is denied.
export function canUpdateProgramRi(role: string, isAssignedPic: boolean): boolean {
  return role === HEAD_OFFICE_ROLE && isAssignedPic;
}

// Note/evidence follow manage-level access (PICs are Head Office by rule,
// so assigned PICs are included automatically).
export function canUpdateProgramNote(role: string): boolean {
  return canManageProgramKerja(role);
}

export function canUpdateProgramEvidence(role: string): boolean {
  return canManageProgramKerja(role);
}
