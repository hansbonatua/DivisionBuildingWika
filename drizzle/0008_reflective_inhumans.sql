-- Master Project: canonical single project year (MSL Engineering V1 dependency).
--
-- Hand-edited from the generated `ADD COLUMN "year" integer NOT NULL`, which
-- would fail on any database that already holds master_projects rows. Adding
-- the column nullable, backfilling, then tightening to NOT NULL keeps the
-- migration safe for environments with existing data while still ending in the
-- same final shape (NOT NULL + CHECK + index).
--
-- Backfill rule: the year of an existing project is derived from its own
-- created_at. No business value is invented beyond that.
ALTER TABLE "master_projects" ADD COLUMN "year" integer;--> statement-breakpoint
UPDATE "master_projects"
SET "year" = EXTRACT(YEAR FROM "created_at")::int
WHERE "year" IS NULL;--> statement-breakpoint
ALTER TABLE "master_projects" ALTER COLUMN "year" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "master_projects" ADD CONSTRAINT "master_projects_year_check" CHECK ("master_projects"."year" >= 2000);--> statement-breakpoint
CREATE INDEX "master_projects_year_idx" ON "master_projects" USING btree ("year");
