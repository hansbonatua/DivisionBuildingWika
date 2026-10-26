CREATE TABLE "engineering_database_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"category" text NOT NULL,
	"file_url" text NOT NULL,
	"pic_user_id" uuid NOT NULL,
	"note" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engineering_database_entries_category_check" CHECK ("engineering_database_entries"."category" in ('ENGINEERING_DRAWING', 'ENGINEERING_DESIGN_REPORT', 'METODE_PELAKSANAAN_PEKERJAAN', 'SPESIFIKASI_TEKNIS', 'PROJECT_MASTER_SCHEDULE', 'BIM'))
);
--> statement-breakpoint
ALTER TABLE "engineering_database_entries" ADD CONSTRAINT "engineering_database_entries_project_id_master_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."master_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_database_entries" ADD CONSTRAINT "engineering_database_entries_pic_user_id_users_id_fk" FOREIGN KEY ("pic_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_database_entries" ADD CONSTRAINT "engineering_database_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "engineering_database_entries_category_project_id_idx" ON "engineering_database_entries" USING btree ("category","project_id");--> statement-breakpoint
CREATE INDEX "engineering_database_entries_project_id_idx" ON "engineering_database_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "engineering_database_entries_pic_user_id_idx" ON "engineering_database_entries" USING btree ("pic_user_id");--> statement-breakpoint
CREATE INDEX "engineering_database_entries_created_by_idx" ON "engineering_database_entries" USING btree ("created_by");