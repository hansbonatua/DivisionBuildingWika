CREATE TABLE "project_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"slot" smallint NOT NULL,
	"blob_url" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"alt_text" text,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_photos_project_slot_unique" UNIQUE("project_id","slot"),
	CONSTRAINT "project_photos_slot_check" CHECK ("project_photos"."slot" BETWEEN 1 AND 4),
	CONSTRAINT "project_photos_url_check" CHECK ("project_photos"."blob_url" ~ '^https://' AND length("project_photos"."blob_url") <= 2048),
	CONSTRAINT "project_photos_pathname_check" CHECK (length(btrim("project_photos"."blob_pathname")) > 0),
	CONSTRAINT "project_photos_alt_check" CHECK ("project_photos"."alt_text" IS NULL OR length("project_photos"."alt_text") <= 200),
	CONSTRAINT "project_photos_content_type_check" CHECK ("project_photos"."content_type" IN ('image/jpeg','image/png','image/webp','image/avif')),
	CONSTRAINT "project_photos_size_check" CHECK ("project_photos"."size_bytes" BETWEEN 1 AND 5242880)
);
--> statement-breakpoint
ALTER TABLE "project_photos" ADD CONSTRAINT "project_photos_project_id_master_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."master_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_photos" ADD CONSTRAINT "project_photos_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_photos" ADD CONSTRAINT "project_photos_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_photos_blob_pathname_unique" ON "project_photos" USING btree ("blob_pathname");