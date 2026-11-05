import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";

// Feature-level access for Knowledge Management V2.
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

// PIC eligibility is role-only by decision D-01. Account status is
// deliberately ignored, so a suspended Head Office user remains assignable
// and is rendered with the UI's "(non-aktif)" label.
export function isEligibleKnowledgePic(user: {
  role: string;
  status: string;
}): boolean {
  return user.role === HEAD_OFFICE_ROLE;
}
