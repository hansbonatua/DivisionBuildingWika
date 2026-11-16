CREATE TABLE "regulation_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sub_kategori_id" uuid NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"file_pathname" text NOT NULL,
	"file_name" text NOT NULL,
	"file_mime_type" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regulation_document_kode_check" CHECK (length(btrim("regulation_document"."kode")) between 1 and 30),
	CONSTRAINT "regulation_document_nama_check" CHECK (length(btrim("regulation_document"."nama")) between 1 and 200),
	CONSTRAINT "regulation_document_sort_check" CHECK ("regulation_document"."sort_order" >= 0),
	CONSTRAINT "regulation_document_pathname_check" CHECK (length(btrim("regulation_document"."file_pathname")) between 1 and 500 and "regulation_document"."file_pathname" like 'regulation/%'),
	CONSTRAINT "regulation_document_filename_check" CHECK (length(btrim("regulation_document"."file_name")) between 1 and 255),
	CONSTRAINT "regulation_document_mime_check" CHECK (length(btrim("regulation_document"."file_mime_type")) between 1 and 200),
	CONSTRAINT "regulation_document_size_check" CHECK ("regulation_document"."file_size_bytes" between 1 and 20971520),
	CONSTRAINT "regulation_document_note_check" CHECK ("regulation_document"."note" is null or length("regulation_document"."note") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "regulation_sub_kategori" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"disiplin" text NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regulation_sub_kategori_disiplin_check" CHECK ("regulation_sub_kategori"."disiplin" in ('prosedur_wika', 'sni', 'peraturan_pemerintah', 'standar_internasional', 'lainnya')),
	CONSTRAINT "regulation_sub_kategori_kode_check" CHECK (length(btrim("regulation_sub_kategori"."kode")) between 1 and 30),
	CONSTRAINT "regulation_sub_kategori_nama_check" CHECK (length(btrim("regulation_sub_kategori"."nama")) between 1 and 200),
	CONSTRAINT "regulation_sub_kategori_sort_check" CHECK ("regulation_sub_kategori"."sort_order" >= 0),
	CONSTRAINT "regulation_sub_kategori_note_check" CHECK ("regulation_sub_kategori"."note" is null or length("regulation_sub_kategori"."note") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "regulation_document" ADD CONSTRAINT "regulation_document_sub_kategori_id_regulation_sub_kategori_id_fk" FOREIGN KEY ("sub_kategori_id") REFERENCES "public"."regulation_sub_kategori"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulation_document" ADD CONSTRAINT "regulation_document_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulation_document" ADD CONSTRAINT "regulation_document_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulation_sub_kategori" ADD CONSTRAINT "regulation_sub_kategori_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulation_sub_kategori" ADD CONSTRAINT "regulation_sub_kategori_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "regulation_document_sub_kategori_sort_idx" ON "regulation_document" USING btree ("sub_kategori_id","sort_order","id");--> statement-breakpoint
CREATE UNIQUE INDEX "regulation_document_sub_kategori_kode_unique" ON "regulation_document" USING btree ("sub_kategori_id",lower(btrim("kode")));--> statement-breakpoint
CREATE UNIQUE INDEX "regulation_document_file_pathname_unique" ON "regulation_document" USING btree ("file_pathname");--> statement-breakpoint
CREATE INDEX "regulation_document_created_by_idx" ON "regulation_document" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "regulation_document_updated_by_idx" ON "regulation_document" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "regulation_sub_kategori_disiplin_sort_idx" ON "regulation_sub_kategori" USING btree ("disiplin","sort_order","id");--> statement-breakpoint
CREATE UNIQUE INDEX "regulation_sub_kategori_disiplin_kode_unique" ON "regulation_sub_kategori" USING btree ("disiplin",lower(btrim("kode")));--> statement-breakpoint
CREATE INDEX "regulation_sub_kategori_created_by_idx" ON "regulation_sub_kategori" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "regulation_sub_kategori_updated_by_idx" ON "regulation_sub_kategori" USING btree ("updated_by");