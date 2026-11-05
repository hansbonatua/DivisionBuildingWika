import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// Feature-level access for Knowledge Management V1.
//
// Admin is granted both permissions by the central super-application rule.
// Head Office manages; Management and Project are read-only. Program Kerja
// access is a DIFFERENT permission and is deliberately untouched here.

export function canViewKnowledgeManagement(role: string): boolean {
  return hasPermission(role, PERMISSIONS.KNOWLEDGE_MANAGEMENT_VIEW);
}

export function canManageKnowledgeManagement(role: string): boolean {
  return hasPermission(role, PERMISSIONS.KNOWLEDGE_MANAGEMENT_MANAGE);
}
