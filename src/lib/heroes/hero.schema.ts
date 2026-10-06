import { z } from "zod";

export const createHeroSchema = z.object({
  title: z.string().trim().min(1, "Title wajib diisi").max(120),
  projectName: z.string().trim().min(1, "Project name wajib diisi").max(120),
  location: z.string().trim().min(1, "Location wajib diisi").max(160),
  imageUrl: z.string().trim().min(1, "Image URL wajib diisi"),
  imageAlt: z.string().trim().max(200).default(""),
  description: z.string().trim().max(500).default(""),
  status: z.enum(["active", "standby"]),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateHeroSchema = z
  .object({
    title: z.string().trim().min(1, "Title wajib diisi").max(120).optional(),
    projectName: z.string().trim().min(1, "Project name wajib diisi").max(120).optional(),
    location: z.string().trim().min(1, "Location wajib diisi").max(160).optional(),
    imageUrl: z.string().trim().min(1, "Image URL wajib diisi").optional(),
    // NOTE: no .default() here — defaults would be injected for absent keys
    // and wipe stored values on partial PATCH. See createHeroSchema instead.
    imageAlt: z.string().trim().max(200).optional(),
    description: z.string().trim().max(500).optional(),
    status: z.enum(["active", "standby"]).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type CreateHeroInput = z.infer<typeof createHeroSchema>;
export type UpdateHeroInput = z.infer<typeof updateHeroSchema>;
