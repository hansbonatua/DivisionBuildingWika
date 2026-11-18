CREATE TABLE "project_esg_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"documentation_url" text,
	"month_1_status" text,
	"month_2_status" text,
	"month_3_status" text,
	"month_4_status" text,
	"month_5_status" text,
	"month_6_status" text,
	"month_7_status" text,
	"month_8_status" text,
	"month_9_status" text,
	"month_10_status" text,
	"month_11_status" text,
	"month_12_status" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pea_project_year_unique" UNIQUE("project_id","year"),
	CONSTRAINT "pea_year_check" CHECK ("project_esg_assessments"."year" between 2000 and 2100),
	CONSTRAINT "pea_month_1_status_check" CHECK ("project_esg_assessments"."month_1_status" is null or "project_esg_assessments"."month_1_status" in ('Complete','Half')),
	CONSTRAINT "pea_month_2_status_check" CHECK ("project_esg_assessments"."month_2_status" is null or "project_esg_assessments"."month_2_status" in ('Complete','Half')),
	CONSTRAINT "pea_month_3_status_check" CHECK ("project_esg_assessments"."month_3_status" is null or "project_esg_assessments"."month_3_status" in ('Complete','Half')),
	CONSTRAINT "pea_month_4_status_check" CHECK ("project_esg_assessments"."month_4_status" is null or "project_esg_assessments"."month_4_status" in ('Complete','Half')),
	CONSTRAINT "pea_month_5_status_check" CHECK ("project_esg_assessments"."month_5_status" is null or "project_esg_assessments"."month_5_status" in ('Complete','Half')),
	CONSTRAINT "pea_month_6_status_check" CHECK ("project_esg_assessments"."month_6_status" is null or "project_esg_assessments"."month_6_status" in ('Complete','Half')),
	CONSTRAINT "pea_month_7_status_check" CHECK ("project_esg_assessments"."month_7_status" is null or "project_esg_assessments"."month_7_status" in ('Complete','Half')),
	CONSTRAINT "pea_month_8_status_check" CHECK ("project_esg_assessments"."month_8_status" is null or "project_esg_assessments"."month_8_status" in ('Complete','Half')),
	CONSTRAINT "pea_month_9_status_check" CHECK ("project_esg_assessments"."month_9_status" is null or "project_esg_assessments"."month_9_status" in ('Complete','Half')),
	CONSTRAINT "pea_month_10_status_check" CHECK ("project_esg_assessments"."month_10_status" is null or "project_esg_assessments"."month_10_status" in ('Complete','Half')),
	CONSTRAINT "pea_month_11_status_check" CHECK ("project_esg_assessments"."month_11_status" is null or "project_esg_assessments"."month_11_status" in ('Complete','Half')),
	CONSTRAINT "pea_month_12_status_check" CHECK ("project_esg_assessments"."month_12_status" is null or "project_esg_assessments"."month_12_status" in ('Complete','Half')),
	CONSTRAINT "pea_documentation_check" CHECK ("project_esg_assessments"."documentation_url" is null or (length(btrim("project_esg_assessments"."documentation_url")) between 1 and 2048 and "project_esg_assessments"."documentation_url" ~ '^https?://[^[:space:]]+$'))
);
--> statement-breakpoint
ALTER TABLE "project_esg_assessments" ADD CONSTRAINT "project_esg_assessments_project_id_master_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."master_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_esg_assessments" ADD CONSTRAINT "project_esg_assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_esg_assessments" ADD CONSTRAINT "project_esg_assessments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pea_year_idx" ON "project_esg_assessments" USING btree ("year");