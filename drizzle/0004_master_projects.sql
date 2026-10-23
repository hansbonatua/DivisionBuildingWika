CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TABLE "master_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"pic_user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "master_projects" ADD CONSTRAINT "master_projects_pic_user_id_users_id_fk" FOREIGN KEY ("pic_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_projects" ADD CONSTRAINT "master_projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "master_projects_pic_user_id_idx" ON "master_projects" USING btree ("pic_user_id");--> statement-breakpoint
CREATE INDEX "master_projects_created_by_idx" ON "master_projects" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "master_projects_name_location_ci_unique" ON "master_projects" USING btree (lower(btrim("name")),lower(btrim("location")));--> statement-breakpoint
CREATE INDEX "master_projects_name_trgm_idx" ON "master_projects" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "master_projects_location_trgm_idx" ON "master_projects" USING gin ("location" gin_trgm_ops);