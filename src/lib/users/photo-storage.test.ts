import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  USER_PHOTO_MAX_BYTES,
  USER_PHOTO_NAMESPACE,
  buildUserPhotoPathname,
  extractPathnameFromUrl,
  isUserPhotoPathnameFor,
  parseUserPhotoPathname,
  sanitizeUserPhotoName,
  userPhotoExtension,
} from "./photo-storage";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const UPLOAD_ID = "33333333-3333-4333-8333-333333333333";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("user photo storage", () => {
  it("uses a 2 MB limit and its own namespace", () => {
    assert.equal(USER_PHOTO_NAMESPACE, "user-photos");
    assert.equal(USER_PHOTO_MAX_BYTES, 2 * 1024 * 1024);
  });

  it("builds user-photos/{userId}/{uuid}/avatar-{safeName}.{ext}", () => {
    const pathname = buildUserPhotoPathname(USER_ID, "Foto Profil Saya.PNG");

    assert.notEqual(pathname, null);
    const parsed = parseUserPhotoPathname(pathname as string);
    assert.notEqual(parsed, null);
    assert.equal(parsed?.userId, USER_ID);
    assert.equal(parsed?.fileName, "avatar-foto-profil-saya.png");
    assert.equal(UUID_RE.test(parsed?.uploadUuid ?? ""), true);
    assert.equal(
      (pathname as string).startsWith(`user-photos/${USER_ID}/`),
      true,
    );
  });

  it("normalizes jpeg to jpg and sanitizes the file stem", () => {
    assert.equal(userPhotoExtension("Foto.JPEG"), "jpg");
    assert.equal(sanitizeUserPhotoName("  Budi   Santoso!!.jpeg"), "budi-santoso");

    const pathname = buildUserPhotoPathname(USER_ID, "Budi Santoso.jpeg");
    assert.equal(pathname?.endsWith("/avatar-budi-santoso.jpg"), true);
  });

  it("caps the safe stem at 40 characters", () => {
    const longName = `${"a".repeat(80)}.jpg`;
    const safe = sanitizeUserPhotoName(longName);
    assert.equal(safe?.length, 40);

    const pathname = buildUserPhotoPathname(USER_ID, longName);
    assert.equal(parseUserPhotoPathname(pathname as string) !== null, true);
  });

  it("falls back to the plain avatar base name when the stem is empty", () => {
    const pathname = buildUserPhotoPathname(USER_ID, "---.webp");
    assert.equal(pathname?.endsWith("/avatar.webp"), true);
  });

  it("rejects unsupported extensions and unknown user ids", () => {
    assert.equal(buildUserPhotoPathname(USER_ID, "foto.svg"), null);
    assert.equal(buildUserPhotoPathname(USER_ID, "foto.gif"), null);
    assert.equal(buildUserPhotoPathname(USER_ID, "foto"), null);
    assert.equal(buildUserPhotoPathname("not-a-uuid", "foto.png"), null);
  });

  it("parses only well-formed pathnames in this namespace", () => {
    assert.deepEqual(
      parseUserPhotoPathname(`user-photos/${USER_ID}/${UPLOAD_ID}/avatar-budi.jpg`),
      { userId: USER_ID, uploadUuid: UPLOAD_ID, fileName: "avatar-budi.jpg" },
    );

    assert.equal(parseUserPhotoPathname(""), null);
    assert.equal(parseUserPhotoPathname("cms/hero/x/y.jpg"), null);
    assert.equal(parseUserPhotoPathname("project-photos/x/y/1-a.jpg"), null);
    assert.equal(
      parseUserPhotoPathname(`user-photos/${USER_ID}/${UPLOAD_ID}/foto.jpg`),
      null,
    );
    assert.equal(
      parseUserPhotoPathname(`user-photos/${USER_ID}/${UPLOAD_ID}/avatar-budi.svg`),
      null,
    );
    assert.equal(
      parseUserPhotoPathname(`user-photos/${USER_ID}/${UPLOAD_ID}/avatar-budi.jpg/extra`),
      null,
    );
    assert.equal(
      parseUserPhotoPathname(`user-photos/not-a-uuid/${UPLOAD_ID}/avatar-budi.jpg`),
      null,
    );
  });

  it("matches a pathname against the owning user only", () => {
    const pathname = `user-photos/${USER_ID}/${UPLOAD_ID}/avatar-budi.jpg`;

    assert.equal(isUserPhotoPathnameFor(pathname, USER_ID), true);
    assert.equal(isUserPhotoPathnameFor(pathname, OTHER_ID), false);
    assert.equal(isUserPhotoPathnameFor("cms/hero/x/y.jpg", USER_ID), false);
  });

  it("extracts the pathname from a public Vercel Blob URL", () => {
    const url = `https://bdwika-cms.public.blob.vercel-storage.com/user-photos/${USER_ID}/${UPLOAD_ID}/avatar-budi.jpg`;

    assert.equal(
      extractPathnameFromUrl(url),
      `user-photos/${USER_ID}/${UPLOAD_ID}/avatar-budi.jpg`,
    );
    assert.equal(extractPathnameFromUrl("https://example.com/foto.jpg"), null);
    assert.equal(extractPathnameFromUrl("/asset/profil/budi.jpg"), null);
    assert.equal(extractPathnameFromUrl("ftp://blob.public.blob.vercel-storage.com/x"), null);
    assert.equal(extractPathnameFromUrl("not a url"), null);
  });

  it("decodes encoded file segments", () => {
    const url = `https://bdwika-cms.public.blob.vercel-storage.com/user-photos/${USER_ID}/${UPLOAD_ID}/avatar-budi%20santoso.jpg`;
    assert.equal(
      extractPathnameFromUrl(url),
      `user-photos/${USER_ID}/${UPLOAD_ID}/avatar-budi santoso.jpg`,
    );
  });
});
