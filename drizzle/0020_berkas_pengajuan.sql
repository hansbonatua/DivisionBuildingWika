CREATE TABLE "berkas_pengajuan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"judul" text NOT NULL,
	"pemohon_id" uuid NOT NULL,
	"original_pdf_pathname" text NOT NULL,
	"original_pdf_name" text NOT NULL,
	"original_pdf_mime_type" text DEFAULT 'application/pdf' NOT NULL,
	"original_pdf_size_bytes" bigint NOT NULL,
	"original_pdf_page_count" integer NOT NULL,
	"generated_pdf_pathname" text,
	"generated_pdf_size_bytes" bigint,
	"status" text DEFAULT 'MENUNGGU_TTD_1' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "berkas_pengajuan_judul_check" CHECK (length(btrim("berkas_pengajuan"."judul")) between 1 and 200),
	CONSTRAINT "berkas_pengajuan_original_pdf_name_check" CHECK (length(btrim("berkas_pengajuan"."original_pdf_name")) between 1 and 255),
	CONSTRAINT "berkas_pengajuan_original_pdf_mime_type_check" CHECK ("berkas_pengajuan"."original_pdf_mime_type" = 'application/pdf'),
	CONSTRAINT "berkas_pengajuan_original_pdf_size_check" CHECK ("berkas_pengajuan"."original_pdf_size_bytes" between 1 and 20971520),
	CONSTRAINT "berkas_pengajuan_original_pdf_page_count_check" CHECK ("berkas_pengajuan"."original_pdf_page_count" between 1 and 200),
	CONSTRAINT "berkas_pengajuan_generated_pdf_size_check" CHECK ("berkas_pengajuan"."generated_pdf_size_bytes" is null or "berkas_pengajuan"."generated_pdf_size_bytes" between 1 and 33554432),
	CONSTRAINT "berkas_pengajuan_status_check" CHECK ("berkas_pengajuan"."status" in ('MENUNGGU_TTD_1', 'MENUNGGU_TTD_2', 'SELESAI')),
	CONSTRAINT "berkas_pengajuan_version_check" CHECK ("berkas_pengajuan"."version" >= 1),
	CONSTRAINT "berkas_pengajuan_generated_path_check" CHECK ("berkas_pengajuan"."generated_pdf_pathname" is null or "berkas_pengajuan"."generated_pdf_pathname" <> "berkas_pengajuan"."original_pdf_pathname"),
	CONSTRAINT "berkas_pengajuan_completion_check" CHECK (("berkas_pengajuan"."status" = 'SELESAI') = ("berkas_pengajuan"."completed_at" is not null)),
	CONSTRAINT "berkas_pengajuan_generated_state_check" CHECK ((
        ("berkas_pengajuan"."status" = 'SELESAI'
          and "berkas_pengajuan"."generated_pdf_pathname" is not null
          and "berkas_pengajuan"."generated_pdf_size_bytes" is not null)
        or
        ("berkas_pengajuan"."status" <> 'SELESAI'
          and "berkas_pengajuan"."generated_pdf_pathname" is null
          and "berkas_pengajuan"."generated_pdf_size_bytes" is null)
      ))
);
--> statement-breakpoint
CREATE TABLE "berkas_penyusun" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"berkas_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"nama_snapshot" text NOT NULL,
	"jabatan_snapshot" text NOT NULL,
	"urutan" integer NOT NULL,
	"ttd_pathname" text NOT NULL,
	"ttd_mime_type" text NOT NULL,
	"ttd_size_bytes" bigint NOT NULL,
	"ttd_uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "berkas_penyusun_berkas_urutan_unique" UNIQUE("berkas_id","urutan"),
	CONSTRAINT "berkas_penyusun_berkas_user_unique" UNIQUE("berkas_id","user_id"),
	CONSTRAINT "berkas_penyusun_ttd_pathname_unique" UNIQUE("ttd_pathname"),
	CONSTRAINT "berkas_penyusun_nama_snapshot_check" CHECK (length(btrim("berkas_penyusun"."nama_snapshot")) between 1 and 150),
	CONSTRAINT "berkas_penyusun_jabatan_snapshot_check" CHECK (length(btrim("berkas_penyusun"."jabatan_snapshot")) between 1 and 150),
	CONSTRAINT "berkas_penyusun_urutan_check" CHECK ("berkas_penyusun"."urutan" between 1 and 4),
	CONSTRAINT "berkas_penyusun_ttd_mime_type_check" CHECK ("berkas_penyusun"."ttd_mime_type" in ('image/png', 'image/jpeg')),
	CONSTRAINT "berkas_penyusun_ttd_size_check" CHECK ("berkas_penyusun"."ttd_size_bytes" between 1 and 2097152)
);
--> statement-breakpoint
CREATE TABLE "berkas_validasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"berkas_id" uuid NOT NULL,
	"urutan" integer NOT NULL,
	"validator_user_id" uuid NOT NULL,
	"nama_snapshot" text NOT NULL,
	"jabatan_snapshot" text NOT NULL,
	"ttd_pathname" text,
	"ttd_mime_type" text,
	"ttd_size_bytes" bigint,
	"ttd_uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "berkas_validasi_berkas_urutan_unique" UNIQUE("berkas_id","urutan"),
	CONSTRAINT "berkas_validasi_berkas_validator_unique" UNIQUE("berkas_id","validator_user_id"),
	CONSTRAINT "berkas_validasi_urutan_check" CHECK ("berkas_validasi"."urutan" in (1, 2)),
	CONSTRAINT "berkas_validasi_nama_snapshot_check" CHECK (length(btrim("berkas_validasi"."nama_snapshot")) between 1 and 150),
	CONSTRAINT "berkas_validasi_jabatan_snapshot_check" CHECK (length(btrim("berkas_validasi"."jabatan_snapshot")) between 1 and 150),
	CONSTRAINT "berkas_validasi_ttd_mime_type_check" CHECK ("berkas_validasi"."ttd_mime_type" is null or "berkas_validasi"."ttd_mime_type" in ('image/png', 'image/jpeg')),
	CONSTRAINT "berkas_validasi_ttd_size_check" CHECK ("berkas_validasi"."ttd_size_bytes" is null or "berkas_validasi"."ttd_size_bytes" between 1 and 2097152),
	CONSTRAINT "berkas_validasi_ttd_state_check" CHECK ((
        ("berkas_validasi"."ttd_pathname" is null
          and "berkas_validasi"."ttd_mime_type" is null
          and "berkas_validasi"."ttd_size_bytes" is null
          and "berkas_validasi"."ttd_uploaded_at" is null)
        or
        ("berkas_validasi"."ttd_pathname" is not null
          and "berkas_validasi"."ttd_mime_type" is not null
          and "berkas_validasi"."ttd_size_bytes" is not null
          and "berkas_validasi"."ttd_uploaded_at" is not null)
      ))
);
--> statement-breakpoint
ALTER TABLE "berkas_pengajuan" ADD CONSTRAINT "berkas_pengajuan_pemohon_id_users_id_fk" FOREIGN KEY ("pemohon_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "berkas_penyusun" ADD CONSTRAINT "berkas_penyusun_berkas_id_berkas_pengajuan_id_fk" FOREIGN KEY ("berkas_id") REFERENCES "public"."berkas_pengajuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "berkas_penyusun" ADD CONSTRAINT "berkas_penyusun_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "berkas_validasi" ADD CONSTRAINT "berkas_validasi_berkas_id_berkas_pengajuan_id_fk" FOREIGN KEY ("berkas_id") REFERENCES "public"."berkas_pengajuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "berkas_validasi" ADD CONSTRAINT "berkas_validasi_validator_user_id_users_id_fk" FOREIGN KEY ("validator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "berkas_pengajuan_original_pdf_pathname_unique" ON "berkas_pengajuan" USING btree ("original_pdf_pathname");--> statement-breakpoint
CREATE UNIQUE INDEX "berkas_pengajuan_generated_pdf_pathname_unique" ON "berkas_pengajuan" USING btree ("generated_pdf_pathname") WHERE "berkas_pengajuan"."generated_pdf_pathname" is not null;--> statement-breakpoint
CREATE INDEX "berkas_pengajuan_pemohon_created_idx" ON "berkas_pengajuan" USING btree ("pemohon_id","created_at");--> statement-breakpoint
CREATE INDEX "berkas_pengajuan_status_created_idx" ON "berkas_pengajuan" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "berkas_penyusun_user_id_idx" ON "berkas_penyusun" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "berkas_validasi_ttd_pathname_unique" ON "berkas_validasi" USING btree ("ttd_pathname") WHERE "berkas_validasi"."ttd_pathname" is not null;--> statement-breakpoint
CREATE INDEX "berkas_validasi_validator_user_id_idx" ON "berkas_validasi" USING btree ("validator_user_id");