-- Struktur Organisasi (V1) — ONE active organization chart image.
--
-- Singleton is a DATABASE guarantee, not an application convention: the row
-- always has singleton = true, CHECK(singleton) rejects false and
-- UNIQUE(singleton) rejects a second row. "No chart yet" is the absence of a
-- row, so no is_active/version/valid-from columns and no history table exist.
--
-- Storage identity is blob_pathname (namespace cms/organization/ in the PUBLIC
-- CMS blob store). It is stored next to image_url on purpose: cleanup may only
-- delete an object this row provably owns, never an arbitrary URL.
--
-- Actor convention:
--   created_by  NOT NULL, ON DELETE NO ACTION -> authorship is never orphaned;
--   updated_by  NULL,     ON DELETE SET NULL  -> last-touch pointer never pins
--                                                a user to this global row.
--
-- Hand-written (same style as 0011) because drizzle/meta stops at the 0010
-- snapshot: a blind `drizzle-kit generate` would re-emit earlier deltas.

CREATE TABLE "organization_structure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton" boolean DEFAULT true NOT NULL,
	"image_url" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"file_name" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_structure" ADD CONSTRAINT "organization_structure_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_structure" ADD CONSTRAINT "organization_structure_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_structure_singleton_unique" ON "organization_structure" USING btree ("singleton");--> statement-breakpoint
CREATE INDEX "organization_structure_created_by_idx" ON "organization_structure" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "organization_structure" ADD CONSTRAINT "organization_structure_singleton_check" CHECK ("organization_structure"."singleton");--> statement-breakpoint
ALTER TABLE "organization_structure" ADD CONSTRAINT "organization_structure_image_url_check" CHECK (length(btrim("organization_structure"."image_url")) > 0);--> statement-breakpoint
ALTER TABLE "organization_structure" ADD CONSTRAINT "organization_structure_blob_pathname_check" CHECK (length(btrim("organization_structure"."blob_pathname")) > 0);
