import * as clientRepository from "@/lib/clients/client.repository";
import * as greenBuildingRepository from "@/lib/green-buildings/green-building.repository";
import * as heroRepository from "@/lib/heroes/hero.repository";
import * as organizationStructureRepository from "@/lib/organization-structure/repository";
import * as portfolioProjectRepository from "@/lib/portfolio-projects/portfolio-project.repository";
import * as socialPostRepository from "@/lib/social-posts/social-post.repository";

// Which records still reference a stored public image pathname.
//
// Kept in one place so the orphan-cleanup helper and the cleanup route do not
// need rewriting per module: add the repository check to the list below and
// every caller picks it up.
//
// COMPLETE as of Struktur Organisasi Phase 1 — every surface that can own a
// public CMS blob is listed here: Hero, Portfolio, Green Building, Clients,
// Social Media and Struktur Organisasi. A new uploader must add its check in the
// same change that enables its namespace, otherwise cleanup can delete an object
// that is still in use (for Struktur Organisasi that would remove the live
// organization chart).
//
// Fails CLOSED: any error while checking references must be treated as
// "still referenced", never as "safe to delete" (see image-storage.ts). The
// Struktur Organisasi check reads PostgreSQL, so a database outage blocks
// cleanup instead of allowing a destructive delete — the intended direction.

const REFERENCE_CHECKS: ReadonlyArray<(pathname: string) => Promise<boolean>> = [
  heroRepository.existsByBlobPathname,
  portfolioProjectRepository.existsByBlobPathname,
  greenBuildingRepository.existsByBlobPathname,
  clientRepository.existsByBlobPathname,
  socialPostRepository.existsByBlobPathname,
  organizationStructureRepository.existsByBlobPathname,
];

/** True when any record still points at this stored pathname. */
export async function isCmsImagePathnameReferenced(
  pathname: string,
): Promise<boolean> {
  for (const check of REFERENCE_CHECKS) {
    if (await check(pathname)) {
      return true;
    }
  }
  return false;
}
