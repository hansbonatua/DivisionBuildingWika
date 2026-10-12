import {
  findUserById as findUserRowById,
  findUserByNip as findUserRowByNip,
  listUsers as listUserRows,
  type PgUser,
} from "@/lib/users/repository";

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
