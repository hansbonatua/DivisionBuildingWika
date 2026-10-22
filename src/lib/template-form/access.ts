import {
  ADMIN_ROLE,
  HEAD_OFFICE_ROLE,
  isUserRole,
} from "@/lib/users/roles";

const MANAGE_ROLES = [ADMIN_ROLE, HEAD_OFFICE_ROLE];

export function canViewTemplateForm(role: string): boolean {
  return isUserRole(role);
}

export function canManageTemplateForm(role: string): boolean {
  return (MANAGE_ROLES as readonly string[]).includes(role);
}
