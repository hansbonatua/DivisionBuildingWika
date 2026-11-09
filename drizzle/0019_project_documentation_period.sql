ALTER TABLE "project_documentations" ADD COLUMN "year" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "project_documentations" ADD COLUMN "month" integer NOT NULL;--> statement-breakpoint
DROP INDEX "project_documentations_project_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_documentations_project_period_unique" ON "project_documentations" USING btree ("project_id","year","month");--> statement-breakpoint
CREATE INDEX "project_documentations_year_month_idx" ON "project_documentations" USING btree ("year","month");--> statement-breakpoint
ALTER TABLE "project_documentations" ADD CONSTRAINT "project_documentations_month_check" CHECK ("project_documentations"."month" BETWEEN 1 AND 12);--> statement-breakpoint
ALTER TABLE "project_documentations" ADD CONSTRAINT "project_documentations_year_check" CHECK ("project_documentations"."year" >= 2000);
