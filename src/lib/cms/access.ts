import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// Landing Page CMS (Hero Banner, Our Project, Green Building Certificate,
// Media Sosial, Our Client) access helper — the single rule shared by every
// CMS namespace instead of five duplicated Admin checks.
//
// Dependency-free so Client Components (sidebar) can import it. CMS_MANAGE is
// Admin-only, so Admin is allowed by the super-application rule and every
// other role — including unknown role strings — is denied.
//
// Public landing content reads (/api/*/public) are NOT governed by this
// helper and must stay reachable without a session.

export function canManageCms(role: string): boolean {
  return hasPermission(role, PERMISSIONS.CMS_MANAGE);
}

// Actor shape passed from CMS route handlers into their service functions so
// the domain layer can enforce CMS_MANAGE itself (never route guards alone).
export type CmsActor = {
  id: string;
  role: string;
};

export class CmsForbiddenError extends Error {
  constructor(message = "Akses Landing Page CMS hanya untuk Admin") {
    super(message);
    this.name = "CmsForbiddenError";
  }
}

export function assertCanManageCms(role: string): void {
  if (!canManageCms(role)) {
    throw new CmsForbiddenError();
  }
}
