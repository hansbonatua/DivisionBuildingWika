ALTER TABLE "template_forms" ALTER COLUMN "file_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "template_forms" ADD COLUMN "source_type" text DEFAULT 'link' NOT NULL;--> statement-breakpoint
ALTER TABLE "template_forms" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "template_forms" ADD COLUMN "file_mime_type" text;--> statement-breakpoint
ALTER TABLE "template_forms" ADD COLUMN "file_size_bytes" bigint;--> statement-breakpoint
ALTER TABLE "template_forms" ADD COLUMN "blob_pathname" text;--> statement-breakpoint
CREATE UNIQUE INDEX "template_forms_blob_pathname_unique" ON "template_forms" USING btree ("blob_pathname") WHERE "template_forms"."blob_pathname" is not null;--> statement-breakpoint
ALTER TABLE "template_forms" ADD CONSTRAINT "template_forms_source_type_check" CHECK ("template_forms"."source_type" in ('link', 'upload'));--> statement-breakpoint
ALTER TABLE "template_forms" ADD CONSTRAINT "template_forms_source_integrity_check" CHECK ((
        ("template_forms"."source_type" = 'link'
          and "template_forms"."file_url" is not null
          and "template_forms"."blob_pathname" is null)
        or
        ("template_forms"."source_type" = 'upload'
          and "template_forms"."file_url" is null
          and "template_forms"."blob_pathname" is not null
          and "template_forms"."file_name" is not null)
      ));--> statement-breakpoint
ALTER TABLE "template_forms" ADD CONSTRAINT "template_forms_file_size_check" CHECK ("template_forms"."file_size_bytes" is null or "template_forms"."file_size_bytes" > 0);