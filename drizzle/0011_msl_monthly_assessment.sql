-- MSL Engineering V2.1 — MONTHLY assessments + component range 0.00–5.00.
--
-- Identity change: one assessment per project PER MONTH.
--   before: UNIQUE(project_id)
--   after : UNIQUE(project_id, assessment_month)
--
-- YEAR is still not stored here: it keeps coming from master_projects.year.
--
-- BACKFILL POLICY (explicit business decision, NOT derived data):
--   every assessment created before the monthly dimension existed is attributed
--   to SEPTEMBER (month = 9). It is intentionally NOT taken from created_at and
--   NOT from the current month.
--
-- Statement order matters and is fixed:
--   1. add assessment_month nullable
--   2. backfill existing rows to 9
--   3. set NOT NULL
--   4. CHECK month 1..12
--   5. drop UNIQUE(project_id)
--   6. add UNIQUE(project_id, assessment_month)
--   7. drop the three old 1..5 component CHECKs
--   8. add the three new 0..5 component CHECKs
--
-- The old migration 0010 is intentionally left untouched.

ALTER TABLE "msl_assessments" ADD COLUMN "assessment_month" integer;--> statement-breakpoint
UPDATE "msl_assessments" SET "assessment_month" = 9 WHERE "assessment_month" IS NULL;--> statement-breakpoint
ALTER TABLE "msl_assessments" ALTER COLUMN "assessment_month" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "msl_assessments" ADD CONSTRAINT "msl_assessments_month_check" CHECK ("msl_assessments"."assessment_month" BETWEEN 1 AND 12);--> statement-breakpoint
ALTER TABLE "msl_assessments" DROP CONSTRAINT "msl_assessments_project_unique";--> statement-breakpoint
ALTER TABLE "msl_assessments" ADD CONSTRAINT "msl_assessments_project_month_unique" UNIQUE("project_id","assessment_month");--> statement-breakpoint
ALTER TABLE "msl_assessments" DROP CONSTRAINT "msl_assessments_engineering_value_check";--> statement-breakpoint
ALTER TABLE "msl_assessments" ADD CONSTRAINT "msl_assessments_engineering_value_check" CHECK ("msl_assessments"."engineering_value" >= 0 AND "msl_assessments"."engineering_value" <= 5);--> statement-breakpoint
ALTER TABLE "msl_assessments" DROP CONSTRAINT "msl_assessments_metode_kerja_check";--> statement-breakpoint
ALTER TABLE "msl_assessments" ADD CONSTRAINT "msl_assessments_metode_kerja_check" CHECK ("msl_assessments"."metode_kerja" >= 0 AND "msl_assessments"."metode_kerja" <= 5);--> statement-breakpoint
ALTER TABLE "msl_assessments" DROP CONSTRAINT "msl_assessments_engineering_execution_check";--> statement-breakpoint
ALTER TABLE "msl_assessments" ADD CONSTRAINT "msl_assessments_engineering_execution_check" CHECK ("msl_assessments"."engineering_execution" >= 0 AND "msl_assessments"."engineering_execution" <= 5);
