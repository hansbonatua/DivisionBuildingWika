import {
  countActiveAdmins as countActiveAdminRows,
  createUser as insertUserRow,
  deleteUser as deleteUserRow,
  findUserByEmail as findUserRowByEmail,
  findUserById as findUserRowById,
  findUserByNip as findUserRowByNip,
  listUsers as listUserRows,
  updateUser as updateUserRow,
  type NewPgUser,
  type PgUser,
} from "@/lib/users/repository";
import { hashPassword } from "@/lib/auth/password";
import { deleteUserSessions } from "@/lib/auth/session";
import { ADMIN_ROLE, MANAGEMENT_ROLE } from "@/lib/users/roles";
import { assertCanManageUsers } from "@/lib/users/access";
import { isForeignKeyViolation } from "@/lib/pg/errors";
import type {
  CreateUserInput,
  ProfileUpdateInput,
  UpdateUserInput,
} from "@/lib/users/schema";
import { logActivity } from "@/lib/activity-log/service";
import type { ActivityAction } from "@/lib/pg/schema";
import {
  PublicImageStorageNotConfiguredError,
  deletePublicCmsBlob,
  headPublicCmsImage,
  isPublicImageReachable,
} from "@/lib/storage/public-image";
import {
  USER_PHOTO_ALLOWED_TYPES,
  USER_PHOTO_MAX_BYTES,
  extractPathnameFromUrl,
  isUserPhotoPathnameFor,
} from "@/lib/users/photo-storage";

// Server-only: user lookups (auth + User Control read-path) with a safe projection.
// password_hash is available internally for login verification but is never
// included in the safe user object returned to route handlers.
//
// Authorization split (RBAC consolidation Phase 3):
//   - global user administration (list/detail/create/update/status/delete)
//     requires USER_MANAGE — asserted here in the domain layer, not only in the
//     route handlers, and always before any DB work;
//   - self-service (getUserForLoginByNip, updateOwnProfile) is NOT governed by
//     USER_MANAGE and keeps its previous behaviour for every active role.

export type SafeUser = Omit<PgUser, "passwordHash">;

export function toSafeUser(user: PgUser): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

// Dashboard activity feed entry for User Control. Best-effort by design: the
// user mutation has already committed, so an audit insert failure must not be
// reported to the Admin as a failed operation — it is logged server-side.
async function logUserActivity(
  actorUserId: string,
  action: ActivityAction,
  title: string,
): Promise<void> {
  try {
    await logActivity(actorUserId, action, "USER", title);
  } catch (error) {
    console.error("Failed to record USER activity log", error);
  }
}

function normalizeUserPhotoContentType(contentType: string): string {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

/**
 * Validates a photo_url before it is persisted.
 *
 * - empty/null clears the photo;
 * - a local `/asset/...` path is kept as-is (legacy data, never uploaded);
 * - a non-http(s) value is rejected;
 * - a public-blob URL outside THIS user's namespace is kept as-is (legacy
 *   external URL, never verified);
 * - a URL inside user-photos/{userId}/ must resolve to a stored public object
 *   with an allowed content type, the allowed size and the exact same URL.
 */
async function verifyUserPhotoUrl(
  userId: string,
  photoUrl: string | null,
): Promise<string | null> {
  if (!photoUrl) {
    return null;
  }
  const value = photoUrl.trim();
  if (value.length === 0) {
    return null;
  }
  if (value.startsWith("/")) {
    return value;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new InvalidUserPhotoError();
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new InvalidUserPhotoError();
  }
  const pathname = extractPathnameFromUrl(value);
  if (!pathname || !isUserPhotoPathnameFor(pathname, userId)) {
    return value;
  }
  try {
    const metadata = await headPublicCmsImage(pathname);
    if (!metadata) {
      throw new InvalidUserPhotoError(
        "Foto profil tidak ditemukan. Unggah ulang foto.",
      );
    }
    if (metadata.size <= 0 || metadata.size > USER_PHOTO_MAX_BYTES) {
      throw new InvalidUserPhotoError("Ukuran foto profil maksimal 2 MB.");
    }
    if (
      !(USER_PHOTO_ALLOWED_TYPES as readonly string[]).includes(
        normalizeUserPhotoContentType(metadata.contentType),
      )
    ) {
      throw new InvalidUserPhotoError(
        "Format foto profil harus JPG, PNG, atau WEBP.",
      );
    }
    if (metadata.pathname !== pathname || metadata.url !== value) {
      throw new InvalidUserPhotoError();
    }
    const reachable = await isPublicImageReachable(value);
    if (reachable !== true) {
      throw new InvalidUserPhotoError(
        "Foto profil harus tersimpan pada penyimpanan publik.",
      );
    }
    return value;
  } catch (error) {
    if (error instanceof PublicImageStorageNotConfiguredError) {
      throw new InvalidUserPhotoError();
    }
    throw error;
  }
}

/**
 * Best-effort removal of the photo a user just replaced. Only objects inside
 * this user's namespace are touched: legacy external URLs and local assets are
 * never deleted, and a failure never fails the save.
 */
async function deleteReplacedUserPhoto(
  userId: string,
  oldPhotoUrl: string | null,
  newPhotoUrl: string | null,
): Promise<void> {
  if (!oldPhotoUrl || oldPhotoUrl === newPhotoUrl) {
    return;
  }
  const pathname = extractPathnameFromUrl(oldPhotoUrl);
  if (!pathname || !isUserPhotoPathnameFor(pathname, userId)) {
    return;
  }
  try {
    await deletePublicCmsBlob(pathname);
  } catch (error) {
    console.error("Failed to delete replaced user photo", error);
  }
}

export async function getUserForLoginByNip(nip: string): Promise<PgUser | null> {
  return findUserRowByNip(nip);
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  const user = await findUserRowById(id);
  return user ? toSafeUser(user) : null;
}

// Arbitrary user detail: global administration read, Admin only.
export async function getSafeUserById(
  id: string,
  actorRole: string,
): Promise<SafeUser | null> {
  assertCanManageUsers(actorRole);
  return getUserById(id);
}

// Global user directory list: Admin only.
export async function listSafeUsers(actorRole: string): Promise<SafeUser[]> {
  assertCanManageUsers(actorRole);
  const rows = await listUserRows();
  return rows.map(toSafeUser);
}

export class DuplicateNipError extends Error {
  constructor() {
    super("NIP already exists");
    this.name = "DuplicateNipError";
  }
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("Email already exists");
    this.name = "DuplicateEmailError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User tidak ditemukan");
    this.name = "UserNotFoundError";
  }
}

export class CannotSuspendSelfError extends Error {
  constructor() {
    super("Anda tidak dapat menonaktifkan akun sendiri");
    this.name = "CannotSuspendSelfError";
  }
}

export class CannotSuspendLastAdminError extends Error {
  constructor() {
    super("Admin aktif terakhir tidak dapat dinonaktifkan");
    this.name = "CannotSuspendLastAdminError";
  }
}

export class CannotDeleteSelfError extends Error {
  constructor() {
    super("Anda tidak dapat menghapus akun sendiri");
    this.name = "CannotDeleteSelfError";
  }
}

export class CannotDeleteLastAdminError extends Error {
  constructor() {
    super("Admin aktif terakhir tidak dapat dihapus");
    this.name = "CannotDeleteLastAdminError";
  }
}

// Raised when a role change would leave the application without any active
// Admin. Demoting the only active Admin locks every remaining role out of User
// Control, so the invariant is enforced before the write — the same way
// suspend and delete are already protected.
export class CannotChangeLastAdminRoleError extends Error {
  constructor() {
    super("Admin aktif terakhir tidak dapat diubah rolenya");
    this.name = "CannotChangeLastAdminRoleError";
  }
}

// Raised when a profile photo URL fails server-side verification: a blob in the
// user's own namespace that is missing, too large, the wrong type, or not
// publicly reachable. Routes map this to 400.
export class InvalidUserPhotoError extends Error {
  constructor(message = "Foto profil tidak valid atau terlalu besar") {
    super(message);
    this.name = "InvalidUserPhotoError";
  }
}

// Raised when a user still has dependent rows, so referential integrity blocks
// the delete. References include user administration itself plus Program Kerja
// (created_by / PIC assignment), Master Project, Template & Form and
// Engineering Database. Routes map this to 409; nothing is cascaded and no
// reference is nulled out.
export class UserConflictError extends Error {
  constructor(
    message = "User tidak dapat dihapus karena masih digunakan oleh data lain.",
  ) {
    super(message);
    this.name = "UserConflictError";
  }
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "23505" &&
    typeof (error as { constraint_name?: unknown }).constraint_name === "string" &&
    ((error as { constraint_name: string }).constraint_name === constraint ||
      String((error as { detail?: unknown }).detail ?? "").includes(constraint))
  );
}

export async function createSafeUser(
  input: CreateUserInput,
  actorUserId: string,
  actorRole: string,
): Promise<SafeUser> {
  assertCanManageUsers(actorRole);
  if (await findUserRowByNip(input.nip)) {
    throw new DuplicateNipError();
  }
  if (await findUserRowByEmail(input.email)) {
    throw new DuplicateEmailError();
  }
  const passwordHash = await hashPassword(input.password);
  let created: PgUser;
  try {
    created = await insertUserRow({
      name: input.name,
      nip: input.nip,
      email: input.email,
      phone: input.phone ?? null,
      position: input.position,
      role: input.role,
      status: input.status,
      // Capability is Management-only. Any payload that tries to enable it for
      // another role is accepted but normalised to false, so no non-Management
      // user can ever be persisted with msl_access = true.
      mslAccess: input.role === MANAGEMENT_ROLE && input.mslAccess,
      passwordHash,
      photoUrl: input.photoUrl ?? null,
    });
  } catch (error) {
    // Unique-constraint backstop for check-then-insert races.
    if (isUniqueViolation(error, "users_nip_unique")) {
      throw new DuplicateNipError();
    }
    if (isUniqueViolation(error, "users_email_unique")) {
      throw new DuplicateEmailError();
    }
    throw error;
  }
  await logUserActivity(actorUserId, "CREATE", created.name);
  return toSafeUser(created);
}

export async function setUserStatus(
  targetUserId: string,
  nextStatus: "active" | "suspended",
  actorUserId: string,
  actorRole: string,
): Promise<SafeUser> {
  assertCanManageUsers(actorRole);
  const target = await findUserRowById(targetUserId);
  if (!target) {
    throw new UserNotFoundError();
  }
  if (target.status === nextStatus) {
    return toSafeUser(target);
  }
  if (nextStatus === "suspended") {
    if (targetUserId === actorUserId) {
      throw new CannotSuspendSelfError();
    }
    if (target.role === ADMIN_ROLE) {
      const activeAdmins = await countActiveAdminRows();
      if (activeAdmins <= 1) {
        throw new CannotSuspendLastAdminError();
      }
    }
    const updated = await updateUserRow(targetUserId, { status: "suspended" });
    if (!updated) {
      throw new UserNotFoundError();
    }
    await deleteUserSessions(targetUserId);
    await logUserActivity(actorUserId, "UPDATE", `${target.name} — dinonaktifkan`);
    return toSafeUser(updated);
  }
  const updated = await updateUserRow(targetUserId, { status: "active" });
  if (!updated) {
    throw new UserNotFoundError();
  }
  await logUserActivity(actorUserId, "UPDATE", `${target.name} — diaktifkan`);
  return toSafeUser(updated);
}

export async function updateSafeUser(
  id: string,
  input: UpdateUserInput,
  actorUserId: string,
  actorRole: string,
): Promise<SafeUser> {
  assertCanManageUsers(actorRole);
  const existing = await findUserRowById(id);
  if (!existing) {
    throw new UserNotFoundError();
  }
  if (input.nip !== undefined && input.nip !== existing.nip) {
    const clash = await findUserRowByNip(input.nip);
    if (clash && clash.id !== id) {
      throw new DuplicateNipError();
    }
  }
  if (input.email !== undefined && input.email !== existing.email) {
    const clash = await findUserRowByEmail(input.email);
    if (clash && clash.id !== id) {
      throw new DuplicateEmailError();
    }
  }
  const patch: Partial<NewPgUser> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.nip !== undefined) patch.nip = input.nip;
  if (input.email !== undefined) patch.email = input.email;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.position !== undefined) patch.position = input.position;
  if (input.role !== undefined) patch.role = input.role;
  // Profile photos in this user's namespace are verified against the stored
  // object before anything is written; local /asset paths and external URLs
  // stay untouched for backwards compatibility.
  const verifiedPhotoUrl =
    input.photoUrl !== undefined
      ? await verifyUserPhotoUrl(id, input.photoUrl)
      : undefined;
  if (verifiedPhotoUrl !== undefined) patch.photoUrl = verifiedPhotoUrl;
  // Capability is resolved against the RESULTING role, not the current one:
  //   Management -> Management (flag omitted)   => unchanged
  //   anything   -> Management + mslAccess      => supplied value
  //   Management -> anything else               => forced false (no stale flag)
  //   non-Management + mslAccess: true          => ignored (stays false)
  const resultingRole = input.role ?? existing.role;
  // Last-active-Admin protection for role changes. Only a demotion of an
  // ACTIVE Admin counts: a suspended Admin holds no active privilege, and
  // re-sending the same role is not a change at all.
  if (
    existing.role === ADMIN_ROLE &&
    resultingRole !== ADMIN_ROLE &&
    existing.status === "active"
  ) {
    const activeAdmins = await countActiveAdminRows();
    if (activeAdmins <= 1) {
      throw new CannotChangeLastAdminRoleError();
    }
  }
  if (resultingRole === MANAGEMENT_ROLE) {
    if (input.mslAccess !== undefined) {
      patch.mslAccess = input.mslAccess;
    }
  } else if (existing.mslAccess) {
    patch.mslAccess = false;
  }
  const newPassword = input.password;
  if (newPassword !== undefined) {
    patch.passwordHash = await hashPassword(newPassword);
  }
  const statusChanged = input.status !== undefined && input.status !== existing.status;
  // Human-readable change notes for the dashboard activity feed. Only fields
  // that actually change are listed, so an idempotent PATCH stays silent.
  const changeNotes: string[] = [];
  if (input.role !== undefined && input.role !== existing.role) {
    changeNotes.push(`role ${existing.role} → ${input.role}`);
  }
  if (newPassword !== undefined) {
    changeNotes.push("password diubah");
  }
  const otherFieldsChanged =
    (input.name !== undefined && input.name !== existing.name) ||
    (input.nip !== undefined && input.nip !== existing.nip) ||
    (input.email !== undefined && input.email !== existing.email) ||
    (input.phone !== undefined && input.phone !== existing.phone) ||
    (input.position !== undefined && input.position !== existing.position) ||
    (input.photoUrl !== undefined && input.photoUrl !== existing.photoUrl) ||
    (input.mslAccess !== undefined && patch.mslAccess !== undefined);
  if (otherFieldsChanged) {
    changeNotes.push("data diperbarui");
  }
  const changeTitle =
    changeNotes.length > 0
      ? `${existing.name} — ${changeNotes.join(", ")}`
      : existing.name;
  try {
    let current = existing;
    if (Object.keys(patch).length > 0) {
      const updated = await updateUserRow(id, patch);
      if (!updated) {
        throw new UserNotFoundError();
      }
      current = updated;
    }
    if (newPassword !== undefined) {
      await deleteUserSessions(id);
    }
    // Status transitions always flow through the safety-aware path so
    // generic PATCH can never bypass self/last-admin protection or
    // session revocation — including mixed field+status payloads.
    if (statusChanged && input.status !== undefined) {
      const statusUpdated = await setUserStatus(id, input.status, actorUserId, actorRole);
      if (changeNotes.length > 0) {
        await logUserActivity(actorUserId, "UPDATE", changeTitle);
      }
      if (verifiedPhotoUrl !== undefined) {
        await deleteReplacedUserPhoto(id, existing.photoUrl, verifiedPhotoUrl);
      }
      return statusUpdated;
    }
    if (Object.keys(patch).length === 0) {
      // No effective changes (e.g. body contained only an empty password,
      // which means "do not change"). Return current state without touching
      // updated_at or issuing an empty UPDATE.
      return toSafeUser(current);
    }
    await logUserActivity(actorUserId, "UPDATE", changeTitle);
    if (verifiedPhotoUrl !== undefined) {
      await deleteReplacedUserPhoto(id, existing.photoUrl, verifiedPhotoUrl);
    }
    return toSafeUser(current);
  } catch (error) {
    if (
      error instanceof UserNotFoundError ||
      error instanceof CannotSuspendSelfError ||
      error instanceof CannotSuspendLastAdminError
    ) {
      throw error;
    }
    if (isUniqueViolation(error, "users_nip_unique")) {
      throw new DuplicateNipError();
    }
    if (isUniqueViolation(error, "users_email_unique")) {
      throw new DuplicateEmailError();
    }
    throw error;
  }
}

export async function deleteUserSafely(
  targetUserId: string,
  actorUserId: string,
  actorRole: string,
): Promise<{ deleted: true; id: string }> {
  assertCanManageUsers(actorRole);
  const target = await findUserRowById(targetUserId);
  if (!target) {
    throw new UserNotFoundError();
  }
  if (targetUserId === actorUserId) {
    throw new CannotDeleteSelfError();
  }
  if (target.role === ADMIN_ROLE && target.status === "active") {
    const activeAdmins = await countActiveAdminRows();
    if (activeAdmins <= 1) {
      throw new CannotDeleteLastAdminError();
    }
  }
  // Hard delete first, so a REFUSED delete stays a true no-op: a user who is
  // still referenced must not be logged out by the attempt. Sessions are
  // revoked only once the row is actually gone, and the FK cascade
  // (sessions.user_id ON DELETE CASCADE) already removed them with the row.
  let deleted: boolean;
  try {
    const row = await deleteUserRow(targetUserId);
    deleted = row !== null;
  } catch (error) {
    // The safety checks above passed, so the only expected DB refusal is a
    // remaining reference. Surface a domain conflict (409) and leave both the
    // user and the referencing rows untouched.
    if (isForeignKeyViolation(error)) {
      throw new UserConflictError();
    }
    throw error;
  }
  if (!deleted) {
    throw new UserNotFoundError();
  }
  await deleteUserSessions(targetUserId);
  await logUserActivity(actorUserId, "DELETE", target.name);
  return { deleted: true, id: targetUserId };
}

export async function updateOwnProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<SafeUser> {
  const existing = await findUserRowById(userId);
  if (!existing) {
    throw new UserNotFoundError();
  }
  // Only self-editable fields are ever written; role/status/nip/email/
  // position cannot reach the database through this path by construction.
  const verifiedPhotoUrl =
    input.photoUrl !== undefined
      ? await verifyUserPhotoUrl(userId, input.photoUrl)
      : undefined;
  const patch: Partial<NewPgUser> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (verifiedPhotoUrl !== undefined) patch.photoUrl = verifiedPhotoUrl;
  if (Object.keys(patch).length === 0) {
    return toSafeUser(existing);
  }
  const updated = await updateUserRow(userId, patch);
  if (!updated) {
    throw new UserNotFoundError();
  }
  if (verifiedPhotoUrl !== undefined) {
    await deleteReplacedUserPhoto(userId, existing.photoUrl, verifiedPhotoUrl);
  }
  return toSafeUser(updated);
}
