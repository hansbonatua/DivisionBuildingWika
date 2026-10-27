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
import { ADMIN_ROLE } from "@/lib/users/roles";
import { assertCanManageUsers } from "@/lib/users/access";
import { isForeignKeyViolation } from "@/lib/pg/errors";
import type {
  CreateUserInput,
  ProfileUpdateInput,
  UpdateUserInput,
} from "@/lib/users/schema";

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
  try {
    const created = await insertUserRow({
      name: input.name,
      nip: input.nip,
      email: input.email,
      phone: input.phone ?? null,
      position: input.position,
      role: input.role,
      status: input.status,
      passwordHash,
      photoUrl: input.photoUrl ?? null,
    });
    return toSafeUser(created);
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
    return toSafeUser(updated);
  }
  const updated = await updateUserRow(targetUserId, { status: "active" });
  if (!updated) {
    throw new UserNotFoundError();
  }
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
  if (input.photoUrl !== undefined) patch.photoUrl = input.photoUrl;
  const newPassword = input.password;
  if (newPassword !== undefined) {
    patch.passwordHash = await hashPassword(newPassword);
  }
  const statusChanged = input.status !== undefined && input.status !== existing.status;
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
      return setUserStatus(id, input.status, actorUserId, actorRole);
    }
    if (Object.keys(patch).length === 0) {
      // No effective changes (e.g. body contained only an empty password,
      // which means "do not change"). Return current state without touching
      // updated_at or issuing an empty UPDATE.
      return toSafeUser(current);
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
  const patch: Partial<NewPgUser> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.photoUrl !== undefined) patch.photoUrl = input.photoUrl;
  if (Object.keys(patch).length === 0) {
    return toSafeUser(existing);
  }
  const updated = await updateUserRow(userId, patch);
  if (!updated) {
    throw new UserNotFoundError();
  }
  return toSafeUser(updated);
}
