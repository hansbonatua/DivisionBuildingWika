CREATE TABLE "msl_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"engineering_value" numeric(3, 2) NOT NULL,
	"metode_kerja" numeric(3, 2) NOT NULL,
	"engineering_execution" numeric(3, 2) NOT NULL,
	"remarks" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "msl_assessments_project_unique" UNIQUE("project_id"),
	CONSTRAINT "msl_assessments_engineering_value_check" CHECK ("msl_assessments"."engineering_value" >= 1 AND "msl_assessments"."engineering_value" <= 5),
	CONSTRAINT "msl_assessments_metode_kerja_check" CHECK ("msl_assessments"."metode_kerja" >= 1 AND "msl_assessments"."metode_kerja" <= 5),
	CONSTRAINT "msl_assessments_engineering_execution_check" CHECK ("msl_assessments"."engineering_execution" >= 1 AND "msl_assessments"."engineering_execution" <= 5)
);
--> statement-breakpoint
CREATE TABLE "msl_year_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "msl_year_notes_year_unique" UNIQUE("year"),
	CONSTRAINT "msl_year_notes_year_check" CHECK ("msl_year_notes"."year" >= 2000)
);
--> statement-breakpoint
ALTER TABLE "msl_assessments" ADD CONSTRAINT "msl_assessments_project_id_master_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."master_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "msl_assessments" ADD CONSTRAINT "msl_assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "msl_assessments" ADD CONSTRAINT "msl_assessments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "msl_year_notes" ADD CONSTRAINT "msl_year_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "msl_year_notes" ADD CONSTRAINT "msl_year_notes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "msl_assessments_created_by_idx" ON "msl_assessments" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "msl_assessments_updated_by_idx" ON "msl_assessments" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "msl_year_notes_created_by_idx" ON "msl_year_notes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "msl_year_notes_updated_by_idx" ON "msl_year_notes" USING btree ("updated_by");