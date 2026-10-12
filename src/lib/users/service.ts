import {
  countActiveAdmins as countActiveAdminRows,
  createUser as insertUserRow,
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
import type { CreateUserInput, UpdateUserInput } from "@/lib/users/schema";

// Server-only: user lookups (auth + User Control read-path) with a safe projection.
// password_hash is available internally for login verification but is never
// included in the safe user object returned to route handlers.

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

export async function getSafeUserById(id: string): Promise<SafeUser | null> {
  return getUserById(id);
}

export async function listSafeUsers(): Promise<SafeUser[]> {
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

export async function createSafeUser(input: CreateUserInput): Promise<SafeUser> {
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
): Promise<SafeUser> {
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
    if (target.role === "Admin") {
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
): Promise<SafeUser> {
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
      return setUserStatus(id, input.status, actorUserId);
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
