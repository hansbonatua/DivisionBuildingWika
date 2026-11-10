import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// Feature-level access for Berkas delegates to the central permission layer.
// Record-level rules (Project sees only its own submissions) live in the
// service, not here.

export function canViewBerkas(role: string): boolean {
  return hasPermission(role, PERMISSIONS.BERKAS_VIEW);
}

export function canCreateBerkas(role: string): boolean {
  return hasPermission(role, PERMISSIONS.BERKAS_CREATE);
}

export function canValidateBerkas(role: string): boolean {
  return hasPermission(role, PERMISSIONS.BERKAS_VALIDATE);
}

export function canDownloadBerkas(role: string): boolean {
  return hasPermission(role, PERMISSIONS.BERKAS_DOWNLOAD);
}

export function canDeleteBerkas(role: string): boolean {
  return hasPermission(role, PERMISSIONS.BERKAS_DELETE);
}
