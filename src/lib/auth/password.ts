import bcrypt from "bcryptjs";

// Server-only module: password hashing must never run in Client Components.
// Never log passwords. Never return hashes to client code.

const BCRYPT_COST = 12;

// Fixed bcrypt hash of a random, throwaway value that exists nowhere else.
//
// Purpose: an unknown NIP must pay the SAME bcrypt work as a wrong password on
// a real account, so response timing cannot reveal whether an account exists.
// It is a static module constant, never generated per request, and it is not a
// credential: the plaintext was discarded at generation time, so no password a
// user could type will ever verify against it.
//
// If BCRYPT_COST above ever changes, regenerate this hash with the same cost.
export const DUMMY_PASSWORD_HASH =
  "$2b$12$IPQG2MNTpwAzRQcQNY3NjewUB.BJbpJxxN1Kf2psGkC0XJDCdJ8y.";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
