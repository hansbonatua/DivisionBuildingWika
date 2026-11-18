CREATE TABLE "project_green_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_value" text NOT NULL,
	"location" text NOT NULL,
	"certificate_year" integer NOT NULL,
	"lembaga" text NOT NULL,
	"level" text NOT NULL,
	"status" text NOT NULL,
	"documentation_url" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pgc_value_check" CHECK (length(btrim("project_green_certificates"."project_value")) between 1 and 100),
	CONSTRAINT "pgc_location_check" CHECK (length(btrim("project_green_certificates"."location")) between 1 and 200),
	CONSTRAINT "pgc_year_check" CHECK ("project_green_certificates"."certificate_year" between 2000 and 2100),
	CONSTRAINT "pgc_lembaga_check" CHECK ("project_green_certificates"."lembaga" in ('BGH','Greenship')),
	CONSTRAINT "pgc_level_check" CHECK (("project_green_certificates"."lembaga" = 'BGH' and "project_green_certificates"."level" in ('Utama','Madya','Pratama')) or ("project_green_certificates"."lembaga" = 'Greenship' and "project_green_certificates"."level" in ('Certified/Bronze','Silver','Gold','Platinum'))),
	CONSTRAINT "pgc_status_check" CHECK ("project_green_certificates"."status" in ('Certified','Non-Certified','Under Construction')),
	CONSTRAINT "pgc_documentation_check" CHECK ("project_green_certificates"."documentation_url" is null or (length(btrim("project_green_certificates"."documentation_url")) between 1 and 2048 and "project_green_certificates"."documentation_url" ~ '^https?://[^[:space:]]+$'))
);
--> statement-breakpoint
ALTER TABLE "project_green_certificates" ADD CONSTRAINT "project_green_certificates_project_id_master_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."master_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_green_certificates" ADD CONSTRAINT "project_green_certificates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_green_certificates" ADD CONSTRAINT "project_green_certificates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pgc_project_id_idx" ON "project_green_certificates" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "pgc_certificate_year_idx" ON "project_green_certificates" USING btree ("certificate_year");