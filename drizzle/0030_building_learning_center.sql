CREATE TABLE "learning_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"content_type" text DEFAULT 'sharing' NOT NULL,
	"nama" text NOT NULL,
	"file_pathname" text NOT NULL,
	"file_name" text NOT NULL,
	"file_mime_type" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_attachments_sharing_check" CHECK ("learning_attachments"."content_type" = 'sharing'),
	CONSTRAINT "learning_attachments_nama_check" CHECK (length(btrim("learning_attachments"."nama")) between 1 and 255),
	CONSTRAINT "learning_attachments_path_check" CHECK (length("learning_attachments"."file_pathname") between 1 and 500 and "learning_attachments"."file_pathname" like 'learning/%'),
	CONSTRAINT "learning_attachments_size_check" CHECK ("learning_attachments"."file_size_bytes" between 1 and 20971520)
);
--> statement-breakpoint
CREATE TABLE "learning_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_categories_nama_check" CHECK (length(btrim("learning_categories"."nama")) between 1 and 80),
	CONSTRAINT "learning_categories_sort_check" CHECK ("learning_categories"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "learning_contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"judul" text NOT NULL,
	"deskripsi" text,
	"kategori_id" uuid NOT NULL,
	"thumbnail_url" text NOT NULL,
	"thumbnail_pathname" text NOT NULL,
	"video_url" text,
	"external_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_contents_id_type_unique" UNIQUE("id","type"),
	CONSTRAINT "learning_contents_type_check" CHECK ("learning_contents"."type" in ('sharing', 'training', 'certificate')),
	CONSTRAINT "learning_contents_judul_check" CHECK (length(btrim("learning_contents"."judul")) between 1 and 200),
	CONSTRAINT "learning_contents_deskripsi_check" CHECK ("learning_contents"."deskripsi" is null or length("learning_contents"."deskripsi") <= 2000),
	CONSTRAINT "learning_contents_sort_check" CHECK ("learning_contents"."sort_order" >= 0),
	CONSTRAINT "learning_contents_payload_check" CHECK ((
        ("learning_contents"."type" = 'sharing'
          and "learning_contents"."video_url" is not null
          and "learning_contents"."external_url" is null)
        or
        ("learning_contents"."type" in ('training', 'certificate')
          and "learning_contents"."external_url" is not null
          and "learning_contents"."video_url" is null)
      )),
	CONSTRAINT "learning_contents_video_check" CHECK ("learning_contents"."video_url" is null or (
        length("learning_contents"."video_url") <= 2048
        and "learning_contents"."video_url" ~ '^https://(www[.])?(youtube[.]com/embed/|player[.]vimeo[.]com/video/)[A-Za-z0-9_-]+$'
      )),
	CONSTRAINT "learning_contents_external_check" CHECK ("learning_contents"."external_url" is null or (
        length("learning_contents"."external_url") <= 2048
        and "learning_contents"."external_url" ~ '^https?://[^[:space:]]+$'
      )),
	CONSTRAINT "learning_contents_thumbnail_check" CHECK (length("learning_contents"."thumbnail_url") <= 2048 and "learning_contents"."thumbnail_url" ~ '^https://[^[:space:]]+$')
);
--> statement-breakpoint
ALTER TABLE "learning_attachments" ADD CONSTRAINT "learning_attachments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_attachments" ADD CONSTRAINT "learning_attachments_parent_fk" FOREIGN KEY ("content_id","content_type") REFERENCES "public"."learning_contents"("id","type") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_categories" ADD CONSTRAINT "learning_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_categories" ADD CONSTRAINT "learning_categories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_contents" ADD CONSTRAINT "learning_contents_kategori_id_learning_categories_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."learning_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_contents" ADD CONSTRAINT "learning_contents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_contents" ADD CONSTRAINT "learning_contents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "learning_attachments_pathname_unique" ON "learning_attachments" USING btree ("file_pathname");--> statement-breakpoint
CREATE INDEX "learning_attachments_content_sort_idx" ON "learning_attachments" USING btree ("content_id","sort_order","id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_categories_nama_unique" ON "learning_categories" USING btree (lower(btrim("nama")));--> statement-breakpoint
CREATE INDEX "learning_categories_sort_idx" ON "learning_categories" USING btree ("sort_order","id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_contents_thumbnail_pathname_unique" ON "learning_contents" USING btree ("thumbnail_pathname");--> statement-breakpoint
CREATE INDEX "learning_contents_type_sort_idx" ON "learning_contents" USING btree ("type","sort_order","id");--> statement-breakpoint
CREATE INDEX "learning_contents_kategori_idx" ON "learning_contents" USING btree ("kategori_id");--> statement-breakpoint
CREATE INDEX "learning_contents_judul_trgm_idx" ON "learning_contents" USING gin ("judul" gin_trgm_ops);