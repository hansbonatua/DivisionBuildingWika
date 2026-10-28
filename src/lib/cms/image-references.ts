import * as clientRepository from "@/lib/clients/client.repository";
import * as greenBuildingRepository from "@/lib/green-buildings/green-building.repository";
import * as heroRepository from "@/lib/heroes/hero.repository";
import * as portfolioProjectRepository from "@/lib/portfolio-projects/portfolio-project.repository";
import * as socialPostRepository from "@/lib/social-posts/social-post.repository";

// Which CMS records still reference a stored public image pathname.
//
// Kept in one place so the orphan-cleanup helper and the cleanup route do not
// need rewriting per module: add the repository check to the list below and
// every caller picks it up.
//
// COMPLETE as of Phase D — every CMS surface that can own a landing image is
// listed here: Hero, Portfolio, Green Building, Clients, Social Media. A new
// uploader must add its check in the same change that enables its namespace,
// otherwise cleanup can delete an object that is still on the landing page.
//
// Fails CLOSED: any error while checking references must be treated as
// "still referenced", never as "safe to delete" (see image-storage.ts).

const REFERENCE_CHECKS: ReadonlyArray<(pathname: string) => Promise<boolean>> = [
  heroRepository.existsByBlobPathname,
  portfolioProjectRepository.existsByBlobPathname,
  greenBuildingRepository.existsByBlobPathname,
  clientRepository.existsByBlobPathname,
  socialPostRepository.existsByBlobPathname,
];

/** True when any CMS record still points at this stored pathname. */
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
