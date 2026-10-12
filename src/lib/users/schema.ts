import { z } from "zod";

// Create-user input validation. NIP stays a string: trim, never numeric.
// Password values never appear in errors/logs.
export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(200),
  nip: z.string().trim().min(1, "NIP wajib diisi").max(50),
  email: z.string().trim().toLowerCase().email("Email tidak valid").max(200),
  phone: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  position: z.string().trim().min(1, "Jabatan wajib diisi").max(100),
  role: z.enum(["Admin", "Head Office", "Project", "Management"]),
  status: z.enum(["active", "suspended"]).optional().default("active"),
  password: z.string().min(8, "Password minimal 8 karakter").max(200),
  photoUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
