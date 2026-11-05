-- Knowledge Management V1 (Core Enterprise).
--
-- ONE shared table for the three submenus (Lesson Learn, Best Practice / KI KM,
-- VA/VE). UNIQUE(project_id, knowledge_type) is the "at most one record per
-- project per submenu" rule, enforced by PostgreSQL.
--
-- project_id is ON DELETE RESTRICT: a Master Project that already carries
-- knowledge cannot be hard-deleted, so user-entered knowledge is never silently
-- destroyed (Master Project maps 23503/23001 to a 409 conflict).
--
-- Note: drizzle-kit's snapshot chain was missing 0011/0012, so a plain
-- `generate` also re-emitted the already-applied organization_structure and
-- msl_assessments changes. Those statements were removed here; this migration
-- only adds the Knowledge Management objects.
CREATE TABLE "knowledge_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"knowledge_type" text NOT NULL,
	"content" text NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_entries_project_type_unique" UNIQUE("project_id","knowledge_type"),
	CONSTRAINT "knowledge_entries_type_check" CHECK ("knowledge_entries"."knowledge_type" in ('lesson_learn', 'best_practice', 'va_ve')),
	CONSTRAINT "knowledge_entries_content_check" CHECK (length(btrim("knowledge_entries"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "knowledge_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_entry_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_evidence_name_check" CHECK (length(btrim("knowledge_evidence"."name")) > 0),
	CONSTRAINT "knowledge_evidence_url_check" CHECK ("knowledge_evidence"."url" ~* '^https?://')
);
--> statement-breakpoint
CREATE TABLE "knowledge_pics" (
	"knowledge_entry_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_pics_knowledge_entry_id_user_id_pk" PRIMARY KEY("knowledge_entry_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_project_id_master_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."master_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_evidence" ADD CONSTRAINT "knowledge_evidence_knowledge_entry_id_knowledge_entries_id_fk" FOREIGN KEY ("knowledge_entry_id") REFERENCES "public"."knowledge_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_pics" ADD CONSTRAINT "knowledge_pics_knowledge_entry_id_knowledge_entries_id_fk" FOREIGN KEY ("knowledge_entry_id") REFERENCES "public"."knowledge_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_pics" ADD CONSTRAINT "knowledge_pics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_entries_type_idx" ON "knowledge_entries" USING btree ("knowledge_type");--> statement-breakpoint
CREATE INDEX "knowledge_entries_created_by_idx" ON "knowledge_entries" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "knowledge_evidence_entry_id_idx" ON "knowledge_evidence" USING btree ("knowledge_entry_id");
