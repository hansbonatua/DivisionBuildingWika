-- Drop V1 tables (children first, parent last)
DROP TABLE IF EXISTS "knowledge_evidence" CASCADE;
DROP TABLE IF EXISTS "knowledge_pics" CASCADE;
DROP TABLE IF EXISTS "knowledge_entries" CASCADE;

-- Recreate knowledge_entries V2
CREATE TABLE "knowledge_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "knowledge_type" text NOT NULL,
  "content" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "knowledge_entries_project_id_master_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "master_projects"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "knowledge_entries_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "knowledge_entries_updated_by_users_id_fk"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "knowledge_entries_knowledge_type_check"
    CHECK ("knowledge_type" IN ('lesson_learn', 'best_practice', 'va_ve')),
  CONSTRAINT "knowledge_entries_content_check"
    CHECK (length(btrim("content")) > 0),
  CONSTRAINT "knowledge_entries_version_check"
    CHECK ("version" >= 1)
);

CREATE INDEX "knowledge_entries_type_project_created_idx"
  ON "knowledge_entries" USING btree
  ("knowledge_type", "project_id", "created_at", "id");

CREATE INDEX "knowledge_entries_created_by_idx"
  ON "knowledge_entries" USING btree ("created_by");

-- Immutability trigger
CREATE OR REPLACE FUNCTION knowledge_entries_immutable_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.knowledge_type IS DISTINCT FROM OLD.knowledge_type THEN
    RAISE EXCEPTION 'project_id dan knowledge_type tidak dapat diubah'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER knowledge_entries_immutable_fields_trigger
BEFORE UPDATE ON "knowledge_entries"
FOR EACH ROW EXECUTE FUNCTION knowledge_entries_immutable_fields();

-- knowledge_pics
CREATE TABLE "knowledge_pics" (
  "knowledge_entry_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "knowledge_pics_knowledge_entry_id_user_id_pk"
    PRIMARY KEY ("knowledge_entry_id", "user_id"),
  CONSTRAINT "knowledge_pics_knowledge_entry_id_fk"
    FOREIGN KEY ("knowledge_entry_id") REFERENCES "knowledge_entries"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "knowledge_pics_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE OR REPLACE FUNCTION knowledge_entries_require_pic()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM knowledge_pics WHERE knowledge_entry_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'knowledge_entries % harus memiliki minimal 1 PIC', NEW.id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER knowledge_entries_require_pic_trigger
AFTER INSERT OR UPDATE ON "knowledge_entries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION knowledge_entries_require_pic();

CREATE OR REPLACE FUNCTION knowledge_pics_require_remaining()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM knowledge_entries WHERE id = OLD.knowledge_entry_id)
     AND NOT EXISTS (
       SELECT 1 FROM knowledge_pics WHERE knowledge_entry_id = OLD.knowledge_entry_id
     ) THEN
    RAISE EXCEPTION 'knowledge_entries % harus memiliki minimal 1 PIC',
      OLD.knowledge_entry_id USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;

CREATE CONSTRAINT TRIGGER knowledge_pics_require_remaining_trigger
AFTER DELETE ON "knowledge_pics"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION knowledge_pics_require_remaining();

-- knowledge_evidence (V2: one-to-one, no sort_order)
CREATE TABLE "knowledge_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "knowledge_entry_id" uuid NOT NULL,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "knowledge_evidence_knowledge_entry_id_fk"
    FOREIGN KEY ("knowledge_entry_id") REFERENCES "knowledge_entries"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "knowledge_evidence_entry_unique"
    UNIQUE ("knowledge_entry_id"),
  CONSTRAINT "knowledge_evidence_name_check"
    CHECK (length(btrim("name")) > 0),
  CONSTRAINT "knowledge_evidence_url_check"
    CHECK ("url" ~ '^https?://')
);

CREATE OR REPLACE FUNCTION knowledge_entries_require_evidence()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM knowledge_evidence WHERE knowledge_entry_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'knowledge_entries % harus memiliki tepat 1 evidence', NEW.id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER knowledge_entries_require_evidence_trigger
AFTER INSERT OR UPDATE ON "knowledge_entries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION knowledge_entries_require_evidence();

CREATE OR REPLACE FUNCTION knowledge_evidence_require_remaining()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM knowledge_entries WHERE id = OLD.knowledge_entry_id)
     AND NOT EXISTS (
       SELECT 1 FROM knowledge_evidence WHERE knowledge_entry_id = OLD.knowledge_entry_id
     ) THEN
    RAISE EXCEPTION 'knowledge_entries % harus memiliki tepat 1 evidence',
      OLD.knowledge_entry_id USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;

CREATE CONSTRAINT TRIGGER knowledge_evidence_require_remaining_trigger
AFTER DELETE ON "knowledge_evidence"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION knowledge_evidence_require_remaining();

-- Archive table
CREATE TABLE "knowledge_evidence_archive" (
  "archive_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "evidence_id" uuid NOT NULL,
  "knowledge_entry_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "knowledge_type" text NOT NULL,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "original_sort_order" integer,
  "original_created_at" timestamp with time zone NOT NULL,
  "archived_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_by" uuid NOT NULL,
  "archive_reason" text NOT NULL,
  "kept_evidence_id" uuid NOT NULL,
  CONSTRAINT "knowledge_evidence_archive_evidence_id_unique"
    UNIQUE ("evidence_id")
);

-- Selection table
CREATE TABLE "knowledge_evidence_selection" (
  "entry_id" uuid NOT NULL,
  "evidence_id" uuid NOT NULL,
  "decision" text NOT NULL,
  "reason" text NOT NULL,
  "selected_by" uuid NOT NULL,
  "selected_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "knowledge_evidence_selection_pk"
    PRIMARY KEY ("entry_id", "evidence_id"),
  CONSTRAINT "knowledge_evidence_selection_decision_check"
    CHECK ("decision" IN ('keep', 'archive'))
);

