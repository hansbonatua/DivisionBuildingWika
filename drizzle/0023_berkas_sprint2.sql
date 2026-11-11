ALTER TABLE "berkas_pengajuan" DROP CONSTRAINT "berkas_pengajuan_status_check";--> statement-breakpoint
ALTER TABLE "berkas_pengajuan" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "berkas_pengajuan" ADD COLUMN "rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "berkas_pengajuan" ADD COLUMN "rejected_by" uuid;--> statement-breakpoint
ALTER TABLE "berkas_pengajuan" ADD COLUMN "revision_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "berkas_pengajuan" ADD CONSTRAINT "berkas_pengajuan_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "berkas_pengajuan_kode_seri_unique" ON "berkas_pengajuan" USING btree ("kode_seri") WHERE "berkas_pengajuan"."kode_seri" is not null;--> statement-breakpoint
ALTER TABLE "berkas_pengajuan" ADD CONSTRAINT "berkas_pengajuan_rejection_reason_check" CHECK ("berkas_pengajuan"."rejection_reason" is null or length(btrim("berkas_pengajuan"."rejection_reason")) between 1 and 2000);--> statement-breakpoint
ALTER TABLE "berkas_pengajuan" ADD CONSTRAINT "berkas_pengajuan_revision_count_check" CHECK ("berkas_pengajuan"."revision_count" >= 0);--> statement-breakpoint
ALTER TABLE "berkas_pengajuan" ADD CONSTRAINT "berkas_pengajuan_rejection_state_check" CHECK ("berkas_pengajuan"."status" <> 'DITOLAK' or ("berkas_pengajuan"."rejected_at" is not null and "berkas_pengajuan"."rejected_by" is not null and "berkas_pengajuan"."rejection_reason" is not null));--> statement-breakpoint
ALTER TABLE "berkas_pengajuan" ADD CONSTRAINT "berkas_pengajuan_status_check" CHECK ("berkas_pengajuan"."status" in ('MENUNGGU_TTD_1', 'MENUNGGU_TTD_2', 'SELESAI', 'DITOLAK'));