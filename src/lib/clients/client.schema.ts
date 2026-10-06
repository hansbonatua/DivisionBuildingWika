import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name wajib diisi").max(120),
  shortName: z.string().trim().max(120).default(""),
  category: z.string().trim().max(160).default(""),
  link: z.string().trim().max(500).default(""),
  logoUrl: z.string().trim().min(1, "Logo URL wajib diisi"),
  logoAlt: z.string().trim().max(200).default(""),
  status: z.enum(["active", "hidden"]),
  sortOrder: z.number().int().min(0).optional(),
});

// NOTE: default-free optionals (Hero Phase 2C lesson) — .partial() over
// .default() fields would inject defaults for absent keys and wipe stored
// values on partial PATCH. Omitted fields must remain omitted here.
export const updateClientSchema = z
  .object({
    name: z.string().trim().min(1, "Name wajib diisi").max(120).optional(),
    shortName: z.string().trim().max(120).optional(),
    category: z.string().trim().max(160).optional(),
    link: z.string().trim().max(500).optional(),
    logoUrl: z.string().trim().min(1, "Logo URL wajib diisi").optional(),
    logoAlt: z.string().trim().max(200).optional(),
    status: z.enum(["active", "hidden"]).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
