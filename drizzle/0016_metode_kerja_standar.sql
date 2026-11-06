-- Metode Kerja Standar (MKS) — database foundation.
-- Enam disiplin (A–F) adalah konstanta aplikasi; tidak ada seed di sini.
-- Item tidak menyimpan disiplin sendiri: disiplin diturunkan dari sub-kategori.
-- PIC sub-kategori opsional; PIC item minimal 1 dijaga deferred trigger.

CREATE TABLE "metode_kerja_sub_kategori" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "disiplin" text NOT NULL,
  "kode" text NOT NULL,
  "nama" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "evidence_url" text,
  "note" text,
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "metode_kerja_sub_kategori_created_by_fk"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "metode_kerja_sub_kategori_updated_by_fk"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "metode_kerja_sub_kategori_disiplin_check"
    CHECK ("disiplin" IN ('A', 'B', 'C', 'D', 'E', 'F')),
  CONSTRAINT "metode_kerja_sub_kategori_kode_check"
    CHECK (length(btrim("kode")) BETWEEN 1 AND 30),
  CONSTRAINT "metode_kerja_sub_kategori_sort_check"
    CHECK ("sort_order" >= 0),
  CONSTRAINT "metode_kerja_sub_kategori_evidence_check"
    CHECK ("evidence_url" IS NULL OR "evidence_url" ~ '^https?://'),
  CONSTRAINT "metode_kerja_sub_kategori_note_check"
    CHECK ("note" IS NULL OR length("note") <= 2000)
);

CREATE INDEX "metode_kerja_sub_kategori_disiplin_sort_idx"
  ON "metode_kerja_sub_kategori" USING btree
  ("disiplin", "sort_order", "id");

CREATE UNIQUE INDEX "metode_kerja_sub_kategori_disiplin_kode_unique"
  ON "metode_kerja_sub_kategori" USING btree
  ("disiplin", (lower(btrim("kode"))));

CREATE INDEX "metode_kerja_sub_kategori_created_by_idx"
  ON "metode_kerja_sub_kategori" USING btree ("created_by");

CREATE INDEX "metode_kerja_sub_kategori_updated_by_idx"
  ON "metode_kerja_sub_kategori" USING btree ("updated_by");

CREATE TABLE "metode_kerja_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sub_kategori_id" uuid NOT NULL,
  "kode" text NOT NULL,
  "nama" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "evidence_url" text,
  "note" text,
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "metode_kerja_item_sub_kategori_id_fk"
    FOREIGN KEY ("sub_kategori_id") REFERENCES "metode_kerja_sub_kategori"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "metode_kerja_item_created_by_fk"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "metode_kerja_item_updated_by_fk"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "metode_kerja_item_kode_check"
    CHECK (length(btrim("kode")) BETWEEN 1 AND 30),
  CONSTRAINT "metode_kerja_item_sort_check"
    CHECK ("sort_order" >= 0),
  CONSTRAINT "metode_kerja_item_evidence_check"
    CHECK ("evidence_url" IS NULL OR "evidence_url" ~ '^https?://'),
  CONSTRAINT "metode_kerja_item_note_check"
    CHECK ("note" IS NULL OR length("note") <= 2000)
);

CREATE INDEX "metode_kerja_item_sub_kategori_sort_idx"
  ON "metode_kerja_item" USING btree
  ("sub_kategori_id", "sort_order", "id");

CREATE UNIQUE INDEX "metode_kerja_item_sub_kategori_kode_unique"
  ON "metode_kerja_item" USING btree
  ("sub_kategori_id", (lower(btrim("kode"))));

CREATE INDEX "metode_kerja_item_created_by_idx"
  ON "metode_kerja_item" USING btree ("created_by");

CREATE INDEX "metode_kerja_item_updated_by_idx"
  ON "metode_kerja_item" USING btree ("updated_by");

CREATE TABLE "metode_kerja_pic" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sub_kategori_id" uuid,
  "item_id" uuid,
  "user_id" uuid NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "metode_kerja_pic_sub_kategori_id_fk"
    FOREIGN KEY ("sub_kategori_id") REFERENCES "metode_kerja_sub_kategori"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "metode_kerja_pic_item_id_fk"
    FOREIGN KEY ("item_id") REFERENCES "metode_kerja_item"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "metode_kerja_pic_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "metode_kerja_pic_target_check"
    CHECK (
      (("sub_kategori_id" IS NOT NULL)::int
       + ("item_id" IS NOT NULL)::int) = 1
    )
);

CREATE UNIQUE INDEX "metode_kerja_pic_sub_kategori_user_unique"
  ON "metode_kerja_pic" USING btree ("sub_kategori_id", "user_id")
  WHERE "sub_kategori_id" IS NOT NULL;

CREATE UNIQUE INDEX "metode_kerja_pic_item_user_unique"
  ON "metode_kerja_pic" USING btree ("item_id", "user_id")
  WHERE "item_id" IS NOT NULL;

CREATE INDEX "metode_kerja_pic_sub_kategori_idx"
  ON "metode_kerja_pic" USING btree ("sub_kategori_id");

CREATE INDEX "metode_kerja_pic_item_idx"
  ON "metode_kerja_pic" USING btree ("item_id");

CREATE INDEX "metode_kerja_pic_user_idx"
  ON "metode_kerja_pic" USING btree ("user_id");

-- Item wajib memiliki minimal satu PIC. Constraint trigger ditunda agar
-- service dapat INSERT item lalu INSERT PIC dalam transaksi yang sama.
CREATE OR REPLACE FUNCTION metode_kerja_item_require_pic()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM metode_kerja_pic WHERE item_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'metode_kerja_item % harus memiliki minimal 1 PIC', NEW.id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER metode_kerja_item_require_pic_trigger
AFTER INSERT OR UPDATE ON "metode_kerja_item"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION metode_kerja_item_require_pic();

-- Menghapus PIC terakhir dari item yang masih ada harus ditolak. Jika item
-- sudah dihapus (cascade), trigger tidak boleh menghalangi penghapusan item.
CREATE OR REPLACE FUNCTION metode_kerja_pic_require_remaining()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.item_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM metode_kerja_item WHERE id = OLD.item_id)
     AND NOT EXISTS (
       SELECT 1 FROM metode_kerja_pic WHERE item_id = OLD.item_id
     ) THEN
    RAISE EXCEPTION 'metode_kerja_item % harus memiliki minimal 1 PIC',
      OLD.item_id USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;

CREATE CONSTRAINT TRIGGER metode_kerja_pic_require_remaining_trigger
AFTER DELETE ON "metode_kerja_pic"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION metode_kerja_pic_require_remaining();
