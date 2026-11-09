CREATE TABLE "project_documentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"week_1_url" text,
	"week_1_updated_by" uuid,
	"week_1_updated_at" timestamp with time zone,
	"week_2_url" text,
	"week_2_updated_by" uuid,
	"week_2_updated_at" timestamp with time zone,
	"week_3_url" text,
	"week_3_updated_by" uuid,
	"week_3_updated_at" timestamp with time zone,
	"week_4_url" text,
	"week_4_updated_by" uuid,
	"week_4_updated_at" timestamp with time zone,
	"week_5_url" text,
	"week_5_updated_by" uuid,
	"week_5_updated_at" timestamp with time zone,
	"catatan" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_documentations_week_1_url_check" CHECK ("project_documentations"."week_1_url" is null or ("project_documentations"."week_1_url" ~ '^https?://' and length("project_documentations"."week_1_url") <= 2048)),
	CONSTRAINT "project_documentations_week_2_url_check" CHECK ("project_documentations"."week_2_url" is null or ("project_documentations"."week_2_url" ~ '^https?://' and length("project_documentations"."week_2_url") <= 2048)),
	CONSTRAINT "project_documentations_week_3_url_check" CHECK ("project_documentations"."week_3_url" is null or ("project_documentations"."week_3_url" ~ '^https?://' and length("project_documentations"."week_3_url") <= 2048)),
	CONSTRAINT "project_documentations_week_4_url_check" CHECK ("project_documentations"."week_4_url" is null or ("project_documentations"."week_4_url" ~ '^https?://' and length("project_documentations"."week_4_url") <= 2048)),
	CONSTRAINT "project_documentations_week_5_url_check" CHECK ("project_documentations"."week_5_url" is null or ("project_documentations"."week_5_url" ~ '^https?://' and length("project_documentations"."week_5_url") <= 2048)),
	CONSTRAINT "project_documentations_catatan_check" CHECK ("project_documentations"."catatan" is null or length("project_documentations"."catatan") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "project_documentations" ADD CONSTRAINT "project_documentations_project_id_master_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."master_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documentations" ADD CONSTRAINT "project_documentations_week_1_updated_by_users_id_fk" FOREIGN KEY ("week_1_updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documentations" ADD CONSTRAINT "project_documentations_week_2_updated_by_users_id_fk" FOREIGN KEY ("week_2_updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documentations" ADD CONSTRAINT "project_documentations_week_3_updated_by_users_id_fk" FOREIGN KEY ("week_3_updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documentations" ADD CONSTRAINT "project_documentations_week_4_updated_by_users_id_fk" FOREIGN KEY ("week_4_updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documentations" ADD CONSTRAINT "project_documentations_week_5_updated_by_users_id_fk" FOREIGN KEY ("week_5_updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documentations" ADD CONSTRAINT "project_documentations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documentations" ADD CONSTRAINT "project_documentations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_documentations_project_id_unique" ON "project_documentations" USING btree ("project_id");