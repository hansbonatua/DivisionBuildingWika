-- 0014_knowledge_pic_minimum
-- Additive business-rule guard: a Knowledge Management record must always have
-- at least one PIC (Head Office). Zod and the service already reject an empty
-- list; this trigger keeps the invariant even for direct SQL writes.
--
-- The constraint is DEFERRABLE INITIALLY DEFERRED on purpose: the service writes
-- entry + PIC rows inside one transaction (replaceKnowledgePics deletes then
-- inserts), so the check must run at COMMIT against the final state instead of
-- after each statement.

CREATE OR REPLACE FUNCTION knowledge_entries_require_pic()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER knowledge_entries_require_pic_trigger
AFTER INSERT OR UPDATE ON knowledge_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION knowledge_entries_require_pic();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION knowledge_pics_require_remaining()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip when the parent entry itself is gone (cascade delete).
  IF EXISTS (SELECT 1 FROM knowledge_entries WHERE id = OLD.knowledge_entry_id)
     AND NOT EXISTS (
       SELECT 1 FROM knowledge_pics WHERE knowledge_entry_id = OLD.knowledge_entry_id
     )
  THEN
    RAISE EXCEPTION 'knowledge_entries % harus memiliki minimal 1 PIC', OLD.knowledge_entry_id
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER knowledge_pics_require_remaining_trigger
AFTER DELETE ON knowledge_pics
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION knowledge_pics_require_remaining();
