-- Calculation Sheet Template (CST) — flat master reference.
-- Tujuh kategori adalah konstanta aplikasi; tidak ada seed dan tidak ada tabel
-- kategori. `kategori` menyimpan id stabil (lowercase), bukan label tampilan.
-- kode unik PER KATEGORI (case/whitespace insensitive); PIC tunggal Head Office.
-- Evidence hanya URL (tanpa upload/blob). Tidak ada sort_order/reorder, tidak
-- ada kolom version (tanpa optimistic concurrency).
--
-- Migration ini ADITIF: hanya membuat tabel baru. Tabel MKS/MSL/KM tidak
-- disentuh. Snapshot 0017 juga memuat tabel MKS yang sebelumnya belum punya
-- snapshot 0016, sehingga generate berikutnya tidak akan membuat ulang MKS.

CREATE TABLE "calculation_sheet_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kategori" text NOT NULL,
  "kode" text NOT NULL,
  "nama" text NOT NULL,
  "pic_user_id" uuid NOT NULL,
  "evidence_url" text,
  "catatan" text,
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "calculation_sheet_templates_kategori_check"
    CHECK ("kategori" in ('arsitektur', 'struktur', 'infrastruktur', 'geoteknik', 'green_building', 'meep', 'lainnya')),
  CONSTRAINT "calculation_sheet_templates_kode_check"
    CHECK (length(btrim("kode")) between 1 and 30),
  CONSTRAINT "calculation_sheet_templates_nama_check"
    CHECK (length(btrim("nama")) between 1 and 200),
  CONSTRAINT "calculation_sheet_templates_evidence_check"
    CHECK ("evidence_url" is null or ("evidence_url" ~ '^https?://' and length("evidence_url") <= 2048)),
  CONSTRAINT "calculation_sheet_templates_catatan_check"
    CHECK ("catatan" is null or length("catatan") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "calculation_sheet_templates" ADD CONSTRAINT "calculation_sheet_templates_pic_user_id_users_id_fk" FOREIGN KEY ("pic_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculation_sheet_templates" ADD CONSTRAINT "calculation_sheet_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculation_sheet_templates" ADD CONSTRAINT "calculation_sheet_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calculation_sheet_templates_kategori_kode_unique" ON "calculation_sheet_templates" USING btree ("kategori",lower(btrim("kode")));--> statement-breakpoint
CREATE INDEX "calculation_sheet_templates_kategori_idx" ON "calculation_sheet_templates" USING btree ("kategori");--> statement-breakpoint
CREATE INDEX "calculation_sheet_templates_kode_idx" ON "calculation_sheet_templates" USING btree ("kode");--> statement-breakpoint
CREATE INDEX "calculation_sheet_templates_pic_user_idx" ON "calculation_sheet_templates" USING btree ("pic_user_id");--> statement-breakpoint
CREATE INDEX "calculation_sheet_templates_created_by_idx" ON "calculation_sheet_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "calculation_sheet_templates_updated_by_idx" ON "calculation_sheet_templates" USING btree ("updated_by");
