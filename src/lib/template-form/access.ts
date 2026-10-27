import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// Access rules delegate to the central feature-permission layer.
// View = every canonical role; manage = Admin (super application) + Head Office.

export function canViewTemplateForm(role: string): boolean {
  return hasPermission(role, PERMISSIONS.TEMPLATE_FORM_VIEW);
}

export function canManageTemplateForm(role: string): boolean {
  return hasPermission(role, PERMISSIONS.TEMPLATE_FORM_MANAGE);
}
