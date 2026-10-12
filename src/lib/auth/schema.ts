import { z } from "zod";

// Login input validation (NIP + password credential).
// NIP stays a string: trim, non-empty, never converted to number.
// Password values never appear in errors/logs.
export const loginSchema = z.object({
  nip: z
    .string()
    .trim()
    .min(1, "NIP wajib diisi")
    .max(50),
  password: z.string().min(1, "Password wajib diisi").max(200),
  remember: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;
