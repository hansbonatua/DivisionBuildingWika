import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// Feature-level access for Building Learning Center.
//
// Admin receives both permissions through the central super-application rule;
// Head Office manages; Management and Project are read-only. Account status is
// checked by the service layer, exactly like the other enterprise modules.

export class LearningForbiddenError extends Error {
  constructor(message = "Akses Building Learning Center ditolak") {
    super(message);
    this.name = "LearningForbiddenError";
  }
}

export function canViewLearning(role: string): boolean {
  return hasPermission(role, PERMISSIONS.LEARNING_VIEW);
}

export function canManageLearning(role: string): boolean {
  return hasPermission(role, PERMISSIONS.LEARNING_MANAGE);
}

export function assertLearningViewAccess(role: string): void {
  if (!canViewLearning(role)) {
    throw new LearningForbiddenError();
  }
}

export function assertLearningManageAccess(role: string): void {
  if (!canManageLearning(role)) {
    throw new LearningForbiddenError();
  }
}
