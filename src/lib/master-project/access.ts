import {
  ADMIN_ROLE,
  HEAD_OFFICE_ROLE,
  PROJECT_ROLE,
  isUserRole,
} from "@/lib/users/roles";

const CREATE_ROLES = [ADMIN_ROLE, HEAD_OFFICE_ROLE];
const EDIT_ROLES = [ADMIN_ROLE, HEAD_OFFICE_ROLE, PROJECT_ROLE];
const DELETE_ROLES = [ADMIN_ROLE, HEAD_OFFICE_ROLE];

export function canViewMasterProject(role: string): boolean {
  return isUserRole(role);
}

export function canCreateMasterProject(role: string): boolean {
  return (CREATE_ROLES as readonly string[]).includes(role);
}

export function canEditMasterProject(role: string): boolean {
  return (EDIT_ROLES as readonly string[]).includes(role);
}

export function canDeleteMasterProject(role: string): boolean {
  return (DELETE_ROLES as readonly string[]).includes(role);
}
