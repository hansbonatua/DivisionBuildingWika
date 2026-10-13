import { z } from "zod";
import { USER_ROLES } from "@/lib/users/roles";

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
  role: z.enum(USER_ROLES),
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

// Update-user input validation. Every field optional; empty password means
// "do not change password". Completely empty bodies are rejected.
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi").max(200).optional(),
    nip: z.string().trim().min(1, "NIP wajib diisi").max(50).optional(),
    email: z.string().trim().toLowerCase().email("Email tidak valid").max(200).optional(),
    phone: z
      .string()
      .trim()
      .max(50)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    position: z.string().trim().min(1, "Jabatan wajib diisi").max(100).optional(),
    role: z.enum(USER_ROLES).optional(),
    status: z.enum(["active", "suspended"]).optional(),
    password: z
      .string()
      .max(200)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined))
      .refine((value) => value === undefined || value.length >= 8, {
        message: "Password minimal 8 karakter",
      }),
    photoUrl: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Self-profile update validation. Only name/phone/photoUrl are accepted —
// administrative fields (nip/email/position/role/status) are rejected by
// shape (stripped) and must never be applied from this input.
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(200).optional(),
  phone: z
    .string()
    .trim()
    .max(50)
    .nullable()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  photoUrl: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
