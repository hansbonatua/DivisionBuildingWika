import bcrypt from "bcryptjs";

// Server-only module: password hashing must never run in Client Components.
// Never log passwords. Never return hashes to client code.

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
