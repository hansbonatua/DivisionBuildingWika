import {
  createUser as insertUserRow,
  findUserByEmail as findUserRowByEmail,
  findUserById as findUserRowById,
  findUserByNip as findUserRowByNip,
  listUsers as listUserRows,
  type PgUser,
} from "@/lib/users/repository";
import { hashPassword } from "@/lib/auth/password";
import type { CreateUserInput } from "@/lib/users/schema";

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
