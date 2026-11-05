# KNOWLEDGE MANAGEMENT V2 — PHASE 2B TECHNICAL DESIGN REVISION

**Project:** BDWIKA / WIBEX  
**Phase:** 2B — Technical Design Revision  
**Date:** 5 November 2026  
**Baseline:** `main` at `c75d426620c63b7bb394f7ec65555182043c44ed`  
**Status:** DESIGN REVISED — WAITING FOR CHATGPT TECHNICAL REVIEW AND OWNER APPROVAL  
**Implementation:** NOT AUTHORIZED  
**Migration:** NOT AUTHORIZED  
**Database:** NOT CHANGED  
**Git:** NO COMMIT/PUSH/DEPLOY

> Dokumen ini adalah revisi desain, bukan implementasi. Tidak ada source code, migration, database, konfigurasi, commit, push, atau deploy yang diubah pada Phase 2B.
>
> Dokumen ini tidak menggantikan audit historis dan tidak mengubah governance atau feature register. Knowledge Management V1.1 tetap berstatus **APPROVED SPECIFICATION**, implementasinya **DITUNDA**, dan V2 mendahului V1.1 sampai V2 selesai. Catatan ini tidak mengubah status V1.1 di luar dokumen desain ini.

---

## A. Executive Summary

Knowledge Management V1 menyimpan satu record untuk setiap kombinasi Master Project + kategori melalui `UNIQUE(project_id, knowledge_type)`, mengedit content dan PIC secara inline, dan mengelola evidence sebagai baris terpisah yang boleh berjumlah nol atau lebih dari satu. Whole-record delete masih dinonaktifkan.

V2 mengubah model itu menjadi:

- banyak record per Master Project per kategori;
- tabel hanya menampilkan project yang memiliki record;
- form Add/Edit yang sama;
- Master Project immutable setelah record dibuat;
- tepat satu evidence aktif per record;
- permanent delete dari dalam form Edit;
- optimistic concurrency berbasis integer `version`;
- Record History dari backend;
- migration dengan gate Owner untuk record V1 tanpa evidence dan multi-evidence.

### A.1 Keputusan final Owner

| ID | Keputusan final | Konsekuensi desain |
|---|---|---|
| D-01 | PIC minimal satu, hanya Head Office, aktif/suspended eligible, tanpa batas maksimal | Hapus batas jumlah PIC; validasi server hanya minimum dan role |
| D-02 | Master Project tidak boleh diubah saat Edit | Project read-only; `project_id` tidak ada di body PUT; server menolak |
| D-03 | Project tanpa knowledge tidak ditampilkan | Query tabel dimulai dari `knowledge_entries`, bukan `master_projects` |
| D-04 | Optimistic concurrency integer `version` | `expected_version`; mismatch → 409; satu transaksi aggregate |
| D-05 | Record V1 tanpa evidence wajib dilengkapi sebelum migrasi | Migration blocker; inventory dan gate |
| D-06 | Multiple evidence V1: Owner memilih satu, sisanya diarsipkan | Selection register + archive table; tidak ada pemilihan otomatis |
| D-07 | V1.1 tetap APPROVED SPECIFICATION, implementasi ditunda | Catatan status di dokumen; governance/register tidak diubah |
| D-08 | Content 20.000; Evidence Name 200; Evidence URL 2.048 karakter | Zod hard limit; counter UI; error menyebut angka |
| D-09 | Migration Execution Order wajib | Urutan 11 langkah dengan sub-step 7.5 dan 9a; rollback dan gate |

### A.2 Rekomendasi arsitektur

1. Tetap memakai `knowledge_entries`, `knowledge_pics`, dan `knowledge_evidence`.
2. Hapus unique project/type.
3. Pertahankan evidence sebagai child table, tetapi jadikan **one-to-one aktif** dengan `UNIQUE(knowledge_entry_id)` dan deferred constraint trigger.
4. Tambahkan `version` integer pada `knowledge_entries`.
5. Tambahkan tabel arsip dan register pemilihan evidence untuk migration.
6. Ganti endpoint berbasis `(projectId, type)` dan evidence-per-baris dengan CRUD berbasis `entry id`.
7. Pertahankan `Route Handler → Service → Repository → PostgreSQL`.
8. Pertahankan RBAC V1; jangan ubah akses Project ke seluruh knowledge tanpa keputusan Owner.

### A.3 Blocker yang masih harus diselesaikan sebelum migration

- Record V1 dengan nol evidence harus dilengkapi oleh Owner **sebelum Step 4 selesai** dan diverifikasi ulang di Step 7.5; prasyaratnya UI V1 tetap berjalan.
- Record V1 dengan lebih dari satu evidence harus dipilih Owner; sisanya diarsipkan.
- **Freeze hanya berlaku untuk CREATE record baru** di UI V1. Edit existing, termasuk menambah evidence pada record yang belum punya, tetap diizinkan sampai Step 4 selesai.
- UI V1 harus tetap berjalan sampai Step 4 selesai agar Owner dapat melengkapi evidence. Setelah Step 4, aplikasi V1 dihentikan sementara (maintenance window) sebelum Step 5; ini bukan freeze bisnis, melainkan penghentian penulisan selama DDL/archive.
- **Prasyarat data completion:** jika UI V1 tidak dapat dijalankan, gunakan admin tool yang diotorisasi Owner; tidak boleh `INSERT` langsung ke database tanpa jejak audit.

### A.4 Status

**Design revised. No implementation. No migration. No database access. No commit, push, or deploy. Only documentation changed.**

---

## B. Requirement Traceability Matrix

| ID | Requirement | Owner decision | Technical implementation | Affected files | Acceptance criteria | Verification |
|---|---|---|---|---|---|---|
| R-01 | Tiga submenu tetap: Lesson Learn, Best Practice / KI KM, VA/VE | — | Tiga route dan tiga `knowledge_type` tetap | `src/lib/knowledge-management/schema.ts:9-21`; tiga `page.tsx` | Tiga halaman dapat dibuka sesuai role | Unit slug + browser |
| R-02 | Banyak record per project per kategori | — (Phase 2 requirement) | Hapus `UNIQUE(project_id, knowledge_type)`; insert selalu create | `src/lib/pg/schema.ts:277-307`; `drizzle/0013_knowledge_management.sql:15-27` | Dua atau lebih record pada pasangan yang sama berhasil | DB + API |
| R-03 | Tabel hanya menampilkan project yang memiliki record | D-03 | Query dari `knowledge_entries` INNER JOIN `master_projects`, filter `knowledge_type` | `src/lib/knowledge-management/repository.ts:56-111` | Project tanpa record tidak muncul | API + browser |
| R-04 | PIC minimal satu, tanpa batas jumlah | D-01 | Zod `min(1)`; hapus batas maksimum; service dedupe; trigger PIC tetap | `src/lib/knowledge-management/schema.ts:80-83`; `service.ts:100-118`; `0014` | Nol PIC ditolak; jumlah besar diterima | Unit + DB |
| R-05 | PIC hanya Head Office; suspended eligible | D-01 | Validasi role tanpa filter status; opsi mengembalikan status | `service.ts:100-118`; `repository.ts:326-338` | Non-Head Office ditolak; suspended dapat dipilih | API + DB |
| R-06 | Master Project immutable saat Edit | D-02 | `project_id` read-only; PUT strict tanpa `project_id`; trigger immutability | `schema.ts:103-117`; `repository.ts:207-229`; schema V2 | PUT dengan `project_id` → 400 | API + DB |
| R-07 | Add memakai form dan project dipilih | — | Modal Add dengan project combobox | `KnowledgeTable.tsx`; komponen baru | Add menghasilkan record baru | Browser |
| R-08 | Edit memakai form yang sama | — | Satu komponen form, mode add/edit | komponen baru | Field sama; project read-only | Browser |
| R-09 | Delete permanent dari form Edit, Manage KM | — | DELETE by id; confirmation; cascade | route `[id]`; service; UI | Record + PIC + evidence hilang; project tetap | API + DB |
| R-10 | Tepat satu evidence aktif | — | `UNIQUE(knowledge_entry_id)` + deferred trigger | schema V2; migration V2 | 0 atau 2 evidence ditolak | DB |
| R-11 | Evidence name + URL HTTP/HTTPS | D-08 | Zod + CHECK; URL absolute http/https | `schema.ts:48-67` | URL unsafe ditolak | Unit + DB |
| R-12 | Content 20.000; Evidence Name 200; URL 2.048 karakter | D-08; **Owner Decision 5 November 2026** | Zod `.max()` hard; UI counter; pesan angka | `schema.ts:52,61,76`; form baru | 20.000/200/2.048 diterima; +1 ditolak | Unit + API + browser |
| R-13 | Tabel kolom No, Project, Content, PIC, Evidence, History, Action | — | Struktur tabel V2; rowspan | `KnowledgeTable.tsx:405-634` | Kolom dan urutan sesuai | Browser |
| R-14 | Project di-merge dengan rowspan | D-03 | Group by project; `rowSpan`; recompute setelah filter | komponen tabel baru | 1 record → rowspan 1; banyak → satu cell | Unit grouping + browser |
| R-15 | Record History dari backend | — | Join `created_by`/`updated_by` ke users | repository V2 | Empat field tampil; actor bukan body | API + DB |
| R-16 | Action hanya Edit; delete tidak di tabel | — | Hapus tombol delete tabel; delete di form | `KnowledgeTable.tsx:597-634` | Tidak ada delete di baris tabel | Browser |
| R-17 | Version integer; mismatch 409 | D-04 | `version`, `expected_version`, row lock | schema V2; repository V2; service V2 | Dua update paralel: satu 200, satu 409 | API + DB |
| R-18 | Record V1 tanpa evidence sebagai blocker | D-05 | Inventory 0 evidence; gate; tidak ada dummy | migration V2 | 0 evidence tidak lolos gate | SQL |
| R-19 | Multiple evidence V1 dipilih Owner dan diarsipkan | D-06 | Selection register; archive table | migration V2 | Semua evidence asli tertelusuri | SQL + review |
| R-20 | Migration execution order | D-09 | 11 langkah dengan sub-step 7.5 dan 9a; rollback di I.10 | migration V2 | Urutan dan gate dijalankan | Review + SQL |
| R-21 | V1.1 APPROVED SPECIFICATION, ditunda | D-07 | Catatan status; tidak ubah governance/register | dokumen ini | Status V1.1 tetap | Review dokumen |
| R-22 | RBAC server-side tidak berubah | — | Permission V1 dipertahankan | `src/lib/auth/permissions.ts:90-91` | Manage hanya Admin/Head Office | API + browser |
| R-23 | Permanent delete terotorisasi | — | `assertManageAccess` di service | `service.ts:90-96` | Read-only → 403 | API |
| R-24 | Tidak ada orphan/partial data | — | Satu transaksi; FK cascade; deferred triggers | service/repository V2 | Gagal di tengah → rollback penuh | DB |

---

## C. Repository Baseline

### C.1 Git baseline

| Item | Nilai |
|---|---|
| Branch | `main` |
| HEAD | `c75d426620c63b7bb394f7ec65555182043c44ed` |
| Remote | `origin/main` |
| Ahead/behind | `0 / 0` |
| `git status --short` | Kosong |
| Working tree | Clean |
| Staged | Kosong |

Verifikasi dilakukan pada awal Phase 2B. Baseline tidak berubah selama desain.

### C.2 Bukti source V1 yang relevan

- Tiga kategori dan label: `src/lib/knowledge-management/schema.ts:9-21`.
- Unique project/type V1: `src/lib/pg/schema.ts:296`; migration `drizzle/0013_knowledge_management.sql:24`.
- List V1 berasal dari seluruh Master Project via LEFT JOIN: `src/lib/knowledge-management/repository.ts:56-78`.
- Evidence V1 many, tanpa unique per entry: `src/lib/pg/schema.ts:312-329`.
- PIC V1 many dan trigger minimum: `src/lib/pg/schema.ts:336-347`; `drizzle/0014_knowledge_pic_minimum.sql:27-55`.
- PIC options tanpa filter status: `src/lib/knowledge-management/repository.ts:326-338`.
- Inline editor dan evidence per baris: `src/components/dashboard/knowledge-management/KnowledgeTable.tsx:187-359`.
- Delete record 405: `src/app/api/knowledge-management/entry/[id]/route.ts:3-16`.
- Permission KM: `src/lib/auth/permissions.ts:90-91`.
- Active user check: `src/lib/auth/current-user.ts:23-25`.
- Halaman belum punya header/deskripsi/Add: `src/app/dashboard/knowledge-management/lesson-learn/page.tsx:10`.

### C.3 Batas verifikasi

Phase 2B tidak mengakses database aktual dan tidak menjalankan query. Jumlah record, distribusi evidence, jumlah PIC, dan kualitas data V1 **belum diketahui**. Dokumen audit historis yang menyebut status migration atau data lama tidak dipakai sebagai pengganti inventory aktual.

---

## D. Existing vs Proposed Architecture

### D.1 V1

```text
KnowledgeTable (inline)
  ├─ GET  /api/knowledge-management?type=...
  ├─ PUT  /api/knowledge-management/[projectId]/[type]
  ├─ POST /api/knowledge-management/[projectId]/[type]/evidence
  ├─ PATCH/DELETE /api/knowledge-management/evidence/[id]
  └─ DELETE /api/knowledge-management/entry/[id] -> 405

Route Handler -> Service -> Repository -> PostgreSQL
```

V1 menampilkan seluruh Master Project, satu record per project/kategori, evidence 0..N, dan concurrency berbasis timestamp.

### D.2 V2

```text
KnowledgeManagementPage
  └─ KnowledgeTable (record rows + rowspan)
       ├─ GET  /api/knowledge-management?type=...
       ├─ GET  /api/knowledge-management/[id]
       ├─ GET  /api/knowledge-management/pic-options
       ├─ GET  /api/knowledge-management/project-options
       ├─ POST /api/knowledge-management?type=...
       ├─ PUT  /api/knowledge-management/[id]
       └─ DELETE /api/knowledge-management/[id]?expected_version=...

Route Handler -> Service -> Repository -> PostgreSQL
```

### D.3 Perubahan tanggung jawab

| Area | V1 | V2 |
|---|---|---|
| Identitas | `(projectId, type)` | `entry id` |
| Create | Upsert | Insert selalu |
| Project saat edit | Tidak ada form | Read-only; PUT menolak project_id |
| Daftar | Semua project | Hanya record |
| Evidence | 0..N, endpoint sendiri | Tepat satu, ikut transaksi |
| Concurrency | Timestamp content/PIC | Integer version seluruh aggregate |
| Delete | 405 | Permanent delete |
| History | Tidak tampil | Created/Updated By + Date |

### D.4 Catatan kontrak HTTP

Kontrak V2 memakai nama field yang ditetapkan Owner: `project_id`, `pic_ids`, `evidence_name`, `evidence_url`, dan `expected_version`. Route V2 memetakan kontrak HTTP ini ke tipe domain internal; service dan repository tidak perlu mengekspos nama field HTTP.

---

## E. Database Design

### E.1 `knowledge_entries`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `project_id` | uuid | NOT NULL, FK `master_projects`, `ON DELETE RESTRICT` |
| `knowledge_type` | text | NOT NULL, CHECK tiga nilai |
| `content` | text | NOT NULL, CHECK non-empty |
| `created_by` | uuid | NOT NULL, FK users, NO ACTION |
| `updated_by` | uuid | NULL, FK users, SET NULL |
| `created_at` | timestamptz | NOT NULL, default now |
| `updated_at` | timestamptz | NOT NULL, default now |
| `version` | integer | NOT NULL, default 1, CHECK `>= 1` |

Perubahan:

- hapus `knowledge_entries_project_type_unique`;
- tambah `version`;
- tambah index `(knowledge_type, project_id, created_at, id)`;
- tambah trigger yang menolak perubahan `project_id` dan `knowledge_type` setelah insert.

Trigger immutability bukan pengganti validasi API. API tetap menolak field terlarang; trigger menjaga invariant terhadap direct SQL.

### E.2 `knowledge_pics`

Tidak berubah:

```text
knowledge_pics (
  knowledge_entry_id uuid NOT NULL FK cascade,
  user_id uuid NOT NULL FK no action,
  assigned_at timestamptz NOT NULL default now(),
  PRIMARY KEY (knowledge_entry_id, user_id)
)
```

Aturan:

- minimal satu PIC;
- semua PIC harus role Head Office;
- status akun tidak difilter;
- **tidak ada batas jumlah PIC**;
- duplikat dinormalisasi service;
- trigger `0014` tetap dipertahankan.

### E.3 `knowledge_evidence` aktif

Rekomendasi tetap: **one-to-one child table**, bukan inline column.

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | uuid | PK |
| `knowledge_entry_id` | uuid | NOT NULL, UNIQUE, FK cascade |
| `name` | text | NOT NULL, CHECK non-empty |
| `url` | text | NOT NULL, CHECK `^https?://` |
| `created_at` | timestamptz | NOT NULL, default now |

Perubahan:

- tambah `UNIQUE(knowledge_entry_id)`;
- hapus `sort_order` dari tabel aktif hanya setelah Step 9 validation lulus (Step 9a);
- pertahankan cascade delete;
- tambah deferred constraint trigger untuk minimal satu evidence aktif;
- evidence existing di-update dengan `id` tetap; tidak ada `DELETE`+`INSERT` untuk evidence (lihat K.4).

`UNIQUE` menjamin maksimal satu. Trigger deferred menjamin minimal satu. Hasilnya tepat satu pada commit.

### E.4 Evaluasi ulang one-to-one child vs inline

| Kriteria | Inline | Child one-to-one |
|---|---|---|
| Max one | `NOT NULL` satu kolom | `UNIQUE` |
| Min one | otomatis | trigger deferred |
| Migration V1 | perlu copy + drop tabel | memakai tabel existing |
| Audit | menyatu dengan entry | baris evidence punya identitas |
| Query | tanpa join | satu join |
| Rollback | lebih sulit | lebih mudah |
| Rekomendasi | alternatif | **dipilih** |

Alasan: V1 sudah memiliki `knowledge_evidence`; mempertahankannya mengurangi risiko migration dan menjaga identitas evidence. Biaya satu join tidak material untuk volume Knowledge Management.

### E.5 Trigger exactly-one

Desain:

```sql
-- Maksimal satu
ALTER TABLE knowledge_evidence
  ADD CONSTRAINT knowledge_evidence_entry_unique
  UNIQUE (knowledge_entry_id);

-- Minimal satu, dievaluasi saat COMMIT
CREATE CONSTRAINT TRIGGER knowledge_entries_require_evidence_trigger
AFTER INSERT OR UPDATE ON knowledge_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION knowledge_entries_require_evidence();
```

Fungsi memeriksa keberadaan evidence aktif untuk `NEW.id`; jika tidak ada, raise `23514`.

Guard kedua:

```sql
CREATE CONSTRAINT TRIGGER knowledge_evidence_require_remaining_trigger
AFTER DELETE ON knowledge_evidence
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION knowledge_evidence_require_remaining();
```

Fungsi:

- jika parent `knowledge_entries` masih ada;
- dan tidak ada evidence aktif lain;
- raise `23514`;
- jika parent sudah dihapus karena cascade, lewati.

### E.6 Interaksi dengan trigger PIC `0014`

Trigger PIC **dibiarkan terpisah**. Alasan:

1. `0014` sudah teruji dan menjadi migration historis; jangan mengubahnya.
2. PIC dan evidence adalah invariant berbeda; pesan error harus spesifik.
3. Keduanya deferred, sehingga urutan eksekusi tidak memengaruhi hasil akhir.
4. Menggabungkan fungsi akan mempersulit audit dan rollback.

Interaksi transaksi:

- Create: insert entry, PIC, evidence → commit → kedua trigger memeriksa final state.
- Update: update entry, replace PIC, update evidence → commit → kedua trigger memeriksa final state.
- Delete: delete entry → cascade PIC/evidence → trigger anak melihat parent hilang dan skip.

**PIC replacement.** Pada update, PIC di-replace dengan `DELETE` lalu `INSERT`. Karena trigger PIC `0014` adalah `AFTER DELETE ... DEFERRABLE INITIALLY DEFERRED`, trigger tidak dievaluasi seketika saat `DELETE`; pemeriksaan ditunda ke `COMMIT`. Saat `COMMIT`, jika entry masih memiliki minimal satu PIC baru, trigger lolos. Jika service gagal `INSERT` PIC baru sebelum `COMMIT`, trigger menolak transaksi. Ini perilaku yang diinginkan.

**Evidence update.** Evidence yang sudah ada di-update dengan `UPDATE` dan `id` tetap; evidence yang belum ada di-`INSERT`. Tidak ada `DELETE`+`INSERT` untuk evidence, sehingga referensi archive tetap valid.

### E.7 Tabel arsip migration

Tambahkan **di luar relasi evidence aktif**:

```text
knowledge_evidence_archive (
  archive_id uuid PK,
  evidence_id uuid NOT NULL UNIQUE,     -- ID asli
  knowledge_entry_id uuid NOT NULL,     -- snapshot, tanpa FK ke active
  project_id uuid NOT NULL,
  knowledge_type text NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  original_sort_order integer,
  original_created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid NOT NULL,
  archive_reason text NOT NULL,
  kept_evidence_id uuid NOT NULL
)
```

Catatan:

- Tidak ada FK ke `knowledge_evidence` aktif.
- Tidak dihitung sebagai evidence aktif.
- Tetap dapat ditelusuri setelah evidence aktif dihapus.
- Retensi arsip setelah permanent delete adalah open decision (lihat O).

### E.8 Register pemilihan evidence

```text
knowledge_evidence_selection (
  entry_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('keep','archive')),
  reason text NOT NULL,
  selected_by uuid NOT NULL,
  selected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, evidence_id)
)
```

Register ini mencatat keputusan Owner, bukan memilih evidence secara otomatis. Untuk setiap entry multi-evidence, semua evidence memiliki baris; tepat satu `keep`, sisanya `archive`.

### E.9 DDL konseptual

Bukan migration final dan tidak dijalankan:

```sql
-- Step 5: additive schema
ALTER TABLE knowledge_entries
  ADD COLUMN version integer NOT NULL DEFAULT 1
  CHECK (version >= 1);

CREATE INDEX knowledge_entries_type_project_created_idx
  ON knowledge_entries (knowledge_type, project_id, created_at, id);

CREATE OR REPLACE FUNCTION knowledge_entries_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
BEFORE UPDATE ON knowledge_entries
FOR EACH ROW
EXECUTE FUNCTION knowledge_entries_immutable_fields();

-- Step 7: multiple record per project/type
ALTER TABLE knowledge_entries
  DROP CONSTRAINT knowledge_entries_project_type_unique;

-- Step 8: exactly-one evidence; trigger mengikuti E.5
ALTER TABLE knowledge_evidence
  ADD CONSTRAINT knowledge_evidence_entry_unique
  UNIQUE (knowledge_entry_id);

-- Step 9a: hanya setelah Step 9 validation lulus
ALTER TABLE knowledge_evidence
  DROP COLUMN sort_order;

-- Tabel archive dan selection mengikuti E.7/E.8.
```

Catatan: trigger immutability mempertahankan `project_id` dan `knowledge_type` sebagai identitas record. `knowledge_type` juga tidak diekspos sebagai field update pada API.

### E.10 Integritas permanent delete

- `knowledge_entries` dihapus → PIC dan evidence aktif cascade.
- `knowledge_evidence_archive` tidak cascade; arsip tetap.
- `project_id` tetap restrict; Master Project tidak terhapus.
- Semua operasi delete berada dalam transaksi; kegagalan tidak meninggalkan state parsial.

---

## F. API Contract Design

### F.1 Prinsip

- Actor selalu dari sesi server.
- Semua endpoint membaca/menulis via service.
- Semua mutasi memerlukan Manage KM.
- Create tidak pernah upsert.
- Update/delete memakai entry ID.
- `project_id` tidak ada di body PUT.
- Evidence adalah satu pasangan `evidence_name` + `evidence_url`.
- Tidak ada batas jumlah PIC.
- `version` integer; mismatch → 409.

### F.2 Enam endpoint wajib + satu pendukung

| Method | Endpoint | Permission | Fungsi |
|---|---|---|---|
| GET | `/api/knowledge-management?type=...` | View | Daftar record |
| GET | `/api/knowledge-management/[id]` | View | Detail |
| GET | `/api/knowledge-management/pic-options` | Manage | Opsi PIC |
| POST | `/api/knowledge-management?type=...` | Manage | Create |
| PUT | `/api/knowledge-management/[id]` | Manage | Update |
| DELETE | `/api/knowledge-management/[id]?expected_version=N` | Manage | Permanent delete |
| GET | `/api/knowledge-management/project-options?q=...` | Manage | Opsi project untuk Add |

Endpoint `project-options` adalah pendukung form Add karena tabel V2 tidak lagi membawa project tanpa record.

### F.3 DTO record

```json
{
  "id": "uuid",
  "project": {
    "project_id": "uuid",
    "name": "Project A",
    "location": "Jakarta",
    "year": 2026
  },
  "knowledge_type": "lesson_learn",
  "content": "Isi knowledge...",
  "pics": [
    { "user_id": "uuid", "name": "Nama PIC", "status": "active" }
  ],
  "evidence": {
    "name": "Laporan evaluasi",
    "url": "https://example.com/evidence"
  },
  "version": 3,
  "created_by": { "user_id": "uuid", "name": "Nama" },
  "created_at": "2026-11-05T01:00:00.000000Z",
  "updated_by": { "user_id": "uuid", "name": "Nama" },
  "updated_at": "2026-11-05T02:00:00.000000Z"
}
```

`updated_by` boleh `null` untuk data lama. Jika `updated_by` null karena record belum pernah diedit, `updated_at` harus sama dengan `created_at`; UI menampilkan `—` dan tidak boleh fallback ke `created_by`. Jika null karena user dihapus, gunakan keputusan OD-03. `pics` berisi seluruh PIC tanpa batas bisnis.

### F.4 GET list

```http
GET /api/knowledge-management?type=lesson_learn
```

Response `200`:

```json
{ "data": [ /* array DTO record */ ] }
```

Aturan:

- `type` wajib; salah satu dari tiga nilai.
- Dimulai dari `knowledge_entries`, bukan `master_projects`.
- Hanya record pada kategori tersebut.
- Project tanpa record tidak muncul.
- Urutan: `master_projects.year DESC`, `name ASC`, `knowledge_entries.created_at ASC`, `id ASC`.

Status: `200`, `400` tipe salah, `401`, `403`, `500`.

### F.5 GET detail

```http
GET /api/knowledge-management/[id]
```

Response `200`: satu DTO record.

Status: `200`, `400` ID bukan UUID, `401`, `403`, `404`, `500`.

### F.6 GET PIC options

```http
GET /api/knowledge-management/pic-options
```

Response:

```json
{
  "data": [
    { "user_id": "uuid", "name": "Nama", "status": "active", "position": "Engineer" }
  ]
}
```

Aturan:

- hanya Manage KM;
- role Head Office;
- semua status, termasuk suspended;
- urut nama;
- tidak ada filter status;
- tidak ada batas jumlah bisnis.

### F.7 GET project options

```http
GET /api/knowledge-management/project-options?q=jakarta
```

Response:

```json
{
  "data": [
    { "project_id": "uuid", "name": "Project A", "location": "Jakarta", "year": 2026 }
  ]
}
```

Aturan: hanya Manage; pencarian opsional; batas SQL untuk performa; hanya project Master Project.

### F.8 POST create

```http
POST /api/knowledge-management?type=lesson_learn
Content-Type: application/json
```

Body:

```json
{
  "project_id": "uuid",
  "content": "Isi knowledge",
  "pic_ids": ["uuid", "uuid"],
  "evidence_name": "Laporan evaluasi",
  "evidence_url": "https://example.com/evidence"
}
```

Aturan:

- Tidak ada `version`; server memulai `version = 1`.
- Tidak ada `knowledge_type` di body; kategori berasal dari query `type`.
- `project_id` wajib.
- PIC minimal satu, tanpa batas jumlah.
- Evidence tepat satu.
- Actor dari sesi.
- Satu transaksi: entry, PIC, evidence.

Response `201`: DTO record lengkap.

Status: `201`, `400` validasi/role PIC, `401`, `403`, `404` project/PIC tidak ditemukan, `409` referensi berubah, `500`.

### F.9 PUT update

```http
PUT /api/knowledge-management/[id]
Content-Type: application/json
```

Body:

```json
{
  "content": "Isi knowledge terbaru",
  "pic_ids": ["uuid"],
  "evidence_name": "Evidence terbaru",
  "evidence_url": "https://example.com/evidence",
  "expected_version": 3
}
```

Aturan:

- `project_id` **tidak ada** dan ditolak jika dikirim.
- `projectId` juga ditolak oleh schema strict.
- `knowledge_type` tidak berubah.
- `expected_version` integer ≥ 1.
- Server lock row, compare version, update aggregate, increment version.
- `created_by`/`created_at` tidak berubah.
- `updated_by`/`updated_at` berubah.
- Semua child ditulis dalam satu transaksi.

Response `200`: DTO record terbaru.

Status: `200`, `400` validasi/role PIC, `401`, `403`, `404` record/project/PIC tidak ditemukan, `409` version/FK, `500`.

### F.10 DELETE permanent

```http
DELETE /api/knowledge-management/[id]?expected_version=3
```

Aturan:

- Tidak memakai body.
- Permission Manage KM.
- `expected_version` query untuk mencegah delete record yang sudah berubah.
- Row dikunci; version mismatch → `409`.
- Jika `SELECT ... FOR UPDATE` mengembalikan 0 baris karena row sudah dihapus transaksi lain, kembalikan `404` — bukan `500` dan bukan `409`. `409` hanya untuk version mismatch pada row yang ada.
- Delete parent; PIC/evidence aktif cascade.
- Master Project tidak dihapus.
- Arsip migration tidak dihapus oleh cascade.

Response `200`:

```json
{ "data": { "deleted": true, "id": "uuid" } }
```

Status: `200`, `400` ID/version invalid, `401`, `403`, `404` record tidak ditemukan, `409` version, `500`.

### F.11 Validation

| Field | Aturan |
|---|---|
| `project_id` | UUID; harus ada; hanya POST |
| `type` query | tiga nilai |
| `content` | trim; 1–20.000 karakter |
| `pic_ids` | array UUID; minimal 1; tanpa batas maksimum; duplikat dinormalisasi |
| PIC | semua ada; role Head Office; status tidak difilter; role salah → 400, user tidak ada → 404 |
| `evidence_name` | trim; 1–200 karakter |
| `evidence_url` | trim; 1–2.048 karakter; absolute http/https |
| `expected_version` | integer ≥ 1 untuk PUT/DELETE |
| Field asing | ditolak `.strict()` |
| Actor fields | ditolak; actor hanya sesi |

Pesan batas harus menyebut angka:

- `Content maksimal 20.000 karakter.`
- `Nama evidence maksimal 200 karakter.`
- `URL evidence maksimal 2.048 karakter.`

### F.12 Error mapping

| Domain | HTTP |
|---|---|
| Validation / Zod / JSON invalid | 400 |
| Unauthenticated | 401 |
| Forbidden / inactive | 403 |
| Not found | 404 |
| Version conflict / FK race | 409 |
| Unknown | 500 |

`23505` pada unique evidence, `23503`/`23001` pada FK, dan `23514` pada trigger harus dipetakan ke error domain yang aman; tidak ada raw database error ke klien.

**Helper `expected_version`.** Tambahkan helper di `_helpers.ts`: `parseExpectedVersion(value: unknown): number`. Route PUT memanggilnya dengan nilai body, route DELETE dengan nilai query. Aturan: wajib ada, integer ≥ 1; tidak ada atau invalid → `400`; version mismatch pada row yang ada → `409`, bukan `400`. Jika route memakai `NextRequest`, adapter tipis `parseExpectedVersionFromRequest(request, source)` boleh dipakai, tetapi body hanya boleh dibaca satu kali.

---

## G. Frontend & UI/UX Design

### G.1 Modal lebar vs halaman terpisah

**Rekomendasi: modal lebar, full-screen pada mobile.**

Alasan:

- form hanya lima kelompok field;
- pengguna tetap melihat konteks tabel;
- Add/Edit memakai komponen yang sama;
- tidak menambah route dan state navigasi;
- lebih cepat untuk entri banyak record;
- pada mobile, modal dapat memakai seluruh viewport.

Halaman terpisah tidak dipilih untuk V2 awal karena menambah kompleksitas tanpa kebutuhan bisnis.

### G.2 Struktur komponen

```text
KnowledgeManagementPage (server)
  ├─ PageHeader
  └─ KnowledgeManagementView (client)
       ├─ + Add
       ├─ KnowledgeTable
       ├─ KnowledgeFormDialog
       └─ KnowledgeDeleteDialog
```

### G.3 Form

Field:

1. Master Project
   - Add: searchable combobox.
   - Edit: read-only.
2. Kategori: read-only badge.
3. Content: textarea; counter `x / 20.000`.
4. PIC: searchable multi-select; counter jumlah terpilih; label `(non-aktif)`; minimal satu; tanpa batas jumlah.
5. Evidence Name: input; counter `x / 200`.
6. Evidence URL: input; counter `x / 2.048`; hint HTTP/HTTPS.

History (hanya Edit): Created By, Created Date, Updated By, Updated Date. Jika `updated_by` null karena record belum pernah diedit, tampilkan `—` dan `updated_at = created_at`; jangan fallback ke `created_by`. Jika null karena user dihapus, gunakan OD-03.

Tombol:

- Add: `Simpan`.
- Edit: `Simpan Perubahan`.
- Delete terpisah di area bahaya, hanya Manage.
- Batal.

### G.4 Konfirmasi delete

**Rekomendasi: dialog konfirmasi terpisah**, bukan inline dan bukan `window.confirm`.

Alasan:

- permanent delete berisiko tinggi;
- dapat menampilkan nama project dan content yang akan dihapus;
- dapat menjelaskan cascade PIC/evidence;
- fokus dan aksesibilitas dapat dikontrol;
- tetap berada di dalam alur form Edit.

Dialog meminta konfirmasi eksplisit; tombol destructive tidak menjadi tombol default.

### G.5 Setelah save berhasil

**Rekomendasi: tutup modal + refresh tabel + success toast.**

Alasan:

- tabel adalah sumber kebenaran setelah server menulis;
- record baru langsung terlihat pada group project yang benar;
- mengurangi risiko form menampilkan state lama;
- tidak ada fitur “Save & Add Another” yang tidak diminta.

Jika refresh gagal, modal tetap tertutup tetapi tampilkan error tabel dan tombol coba lagi; jangan mengklaim save gagal jika server sudah `200`.

### G.6 Indikator batas panjang

- Content: `x / 20.000`.
- Evidence Name: `x / 200`.
- Evidence URL: `x / 2.048`.
- Counter berubah amber mendekati batas dan merah saat melewati.
- Save dinonaktifkan saat melewati batas, dengan pesan spesifik.
- Jangan memotong paste secara diam-diam; biarkan pengguna melihat teks dan pesan.
- Zod/server tetap menjadi hard limit.
- Error menyebut angka, bukan pesan generik.

### G.7 Unsaved changes

- Snapshot awal form; hitung dirty.
- Batal/backdrop/Escape saat dirty → konfirmasi discard.
- `beforeunload` saat dirty.
- Dialog lain di tabel tidak aktif saat form terbuka.
- Konflik 409 tidak menutup form dan tidak menghapus draft.
- Pengguna dapat memuat ulang data terbaru atau membatalkan.

### G.8 State

| State | UI |
|---|---|
| Loading tabel | Skeleton/teks memuat |
| Empty | “Belum ada [kategori]” + CTA Add untuk Manage |
| Error tabel | Pesan + Coba Lagi |
| Loading detail | overlay/spinner; field disabled |
| Saving | tombol disabled; “Menyimpan...” |
| Success | toast `role="status"`; tabel refresh |
| 409 | banner konflik; tombol muat ulang |
| Read-only | badge Mode baca; tanpa Add/Edit/Delete |

### G.9 Aksesibilitas

- `role="dialog"`, `aria-modal`, `aria-labelledby`.
- Focus trap; Escape; focus return.
- Body scroll lock.
- Label setiap field.
- `aria-describedby` untuk error.
- `aria-live` untuk success/error.
- Tabel memakai `<th scope="col">` dan `<th scope="rowgroup">`.

---

## H. Table Design

### H.1 Kolom

| No | Master Project | Knowledge Content | PIC | Evidence | Record History | Action |
|---|---|---|---|---|---|---|
| 1 | Project A | Content 1 | PIC A, PIC B | Evidence 1 | Created/Updated | Edit |
| 2 | *(merged)* | Content 2 | PIC A | Evidence 2 | Created/Updated | Edit |
| 3 | *(merged)* | Content 3 | PIC C | Evidence 3 | Created/Updated | Edit |
| 4 | Project B | Content 1 | PIC B | Evidence 4 | Created/Updated | Edit |

### H.2 Rowspan

- API mengembalikan record datar terurut.
- UI mengelompokkan berdasarkan `project.project_id`.
- Satu `<tbody>` per project.
- Baris pertama memakai `<th scope="rowgroup" rowSpan={n}>`.
- Baris berikutnya tidak merender cell project.
- `n` = jumlah record project yang lolos filter/sort.
- Satu record → `rowSpan=1` (boleh dirender sebagai cell biasa; hasil visual sama).
- Jangan memakai `rowSpan=0`.

### H.3 Filter

Jika filter ditambahkan:

- filter diterapkan sebelum grouping;
- project yang tidak punya record lolos filter tidak ditampilkan;
- `rowSpan` dihitung ulang;
- tidak ada rowspan yang dipertahankan dari data lama;
- project dengan satu record tersisa → `rowSpan=1`.

### H.4 Sorting

Default:

1. tahun project DESC;
2. nama project ASC;
3. `created_at` record ASC;
4. id ASC.

Jika column sort ditambahkan, project tetap grouping utama; record tidak boleh bercampur antar-project.

### H.5 Pagination

V2 awal: **tanpa pagination**, agar rowspan tidak melintasi halaman.

Jika pagination diperlukan:

- pagination per project group;
- semua record project berada di halaman yang sama;
- group tidak boleh dipotong;
- nomor urut dihitung per halaman;
- jangan memakai pagination per record.

### H.6 Project dengan banyak record

Project dengan banyak record tetap menjadi satu merged cell dengan `rowSpan` sebesar jumlah record. Misalnya project dengan 50 record menghasilkan satu cell yang membentang 50 baris. Jika performa/tinggi tabel menjadi masalah, pagination per group adalah solusi; jangan memotong rowspan secara diam-diam.

### H.7 Isi cell

- Project: nama, lokasi, tahun; `align-top`.
- Content: `whitespace-pre-wrap`; line break dipertahankan.
- PIC: seluruh chip; label non-aktif.
- Evidence: satu link `name`, `target="_blank"`, `rel="noopener noreferrer"`.
- History: Created By, Created Date, Updated By, Updated Date; timestamp ISO dari server ditampilkan dengan format `id-ID` dan zona waktu mengikuti konfigurasi aplikasi. Jika `updated_by` null karena record belum pernah diedit, tampilkan `—` dan `updated_at = created_at`; jangan fallback ke `created_by`. Jika null karena user dihapus, gunakan OD-03.
- Action: hanya Edit; kolom disembunyikan untuk read-only.
- Delete tidak ada di tabel.

---

## I. Data Migration Strategy

### I.1 Prinsip

- Tidak ada data yang dihapus tanpa persetujuan Owner.
- Tidak ada evidence dummy.
- Tidak ada pemilihan evidence otomatis.
- Semua evidence asli harus dapat ditelusuri.
- Migration tidak dijalankan pada Phase 2B.
- Database aktual tidak diakses pada Phase 2B.

### I.2 Migration inventory

Inventory read-only minimal:

```sql
-- Kelompok 0: tanpa evidence
SELECT e.id, e.project_id, e.knowledge_type, count(ev.id) AS evidence_count
FROM knowledge_entries e
LEFT JOIN knowledge_evidence ev ON ev.knowledge_entry_id = e.id
GROUP BY e.id, e.project_id, e.knowledge_type
HAVING count(ev.id) = 0;

-- Kelompok multi-evidence
SELECT e.id, e.project_id, e.knowledge_type, count(ev.id) AS evidence_count
FROM knowledge_entries e
JOIN knowledge_evidence ev ON ev.knowledge_entry_id = e.id
GROUP BY e.id, e.project_id, e.knowledge_type
HAVING count(ev.id) > 1;

-- PIC per entry
SELECT e.id, count(p.user_id) AS pic_count
FROM knowledge_entries e
LEFT JOIN knowledge_pics p ON p.knowledge_entry_id = e.id
GROUP BY e.id
HAVING count(p.user_id) = 0;

-- PIC non-Head Office / status
SELECT e.id, u.id, u.name, u.role, u.status
FROM knowledge_entries e
JOIN knowledge_pics p ON p.knowledge_entry_id = e.id
JOIN users u ON u.id = p.user_id
WHERE u.role <> 'Head Office';
```

Inventory harus memuat:

- entry_id;
- project_id dan nama project;
- knowledge_type;
- evidence_count;
- pic_count;
- classification: `BLOCKED_NO_EVIDENCE`, `OWNER_SELECTION_REQUIRED`, `READY`;
- tanggal audit dan auditor.

### I.3 Evidence selection register

Kolom wajib:

| Kolom | Isi |
|---|---|
| `entry_id` | record |
| `evidence_id` | evidence asli |
| `url` | URL evidence |
| `decision` | `keep` atau `archive` |
| `reason` | alasan Owner |
| `selected_by` | penanggung jawab |
| `selected_at` | waktu keputusan |

Aturan:

- Untuk setiap entry multi-evidence, tepat satu `keep`.
- Tidak boleh memilih berdasarkan urutan database.
- Keputusan harus eksplisit per evidence.
- Register disimpan sebelum archive dipindahkan.
- Register dapat berupa artefak terkontrol (CSV/Markdown bertanda tangan) pada gate step 2; tabel `knowledge_evidence_selection` dibuat pada step 5 dan diisi dari register sebelum step 6. Ini menjaga urutan D-09 tanpa melakukan DDL sebelum gate Owner.

### I.4 Archive register

`knowledge_evidence_archive` mencatat:

- ID evidence asli;
- entry/project/type snapshot;
- name/url;
- original sort order dan created_at;
- archived_at/by;
- reason;
- kept_evidence_id.

Arsip:

- berada di luar `knowledge_evidence` aktif;
- tidak dihitung sebagai evidence aktif;
- tidak menjadi input query V2;
- tetap dapat direkonsiliasi.

### I.5 Data reconciliation

Sebelum archive:

```text
jumlah evidence aktif = jumlah evidence asli
jumlah keep = jumlah entry multi-evidence
jumlah archive = jumlah evidence asli - jumlah keep
```

Setelah archive:

```text
active_evidence_count = entry_count
sum(active_evidence) + sum(archive_evidence) = original_evidence_count
tidak ada entry dengan 0 evidence
tidak ada entry dengan >1 evidence aktif
```

Query rekonsiliasi sebelum archive:

```sql
SELECT
  (SELECT count(*) FROM knowledge_entries) AS entry_count,
  (SELECT count(*) FROM knowledge_evidence) AS evidence_count,
  (SELECT count(*) FROM knowledge_evidence_selection WHERE decision = 'keep') AS keep_count,
  (SELECT count(*) FROM knowledge_evidence_selection WHERE decision = 'archive') AS archive_count;
```

Query rekonsiliasi setelah archive:

```sql
SELECT
  (SELECT count(*) FROM knowledge_entries) AS entry_count,
  (SELECT count(*) FROM knowledge_evidence) AS active_evidence_count,
  (SELECT count(*) FROM knowledge_evidence_archive) AS archived_evidence_count,
  (SELECT count(*) FROM knowledge_evidence) + (SELECT count(*) FROM knowledge_evidence_archive) AS reconciled_total;

-- Harus 0 baris
SELECT e.id, count(ev.id) AS active_count
FROM knowledge_entries e
LEFT JOIN knowledge_evidence ev ON ev.knowledge_entry_id = e.id
GROUP BY e.id
HAVING count(ev.id) <> 1;
```

Setelah archive, `active_evidence_count` harus sama dengan `entry_count`, dan `reconciled_total` harus sama dengan jumlah evidence asli sebelum archive.

### I.6 Pre-migration validation

- 0 record tanpa evidence.
- 0 record multi-evidence.
- 0 record tanpa PIC.
- 0 PIC non-Head Office.
- 0 project invalid.
- 0 evidence URL invalid.
- 0 content kosong.
- 0 duplikat active evidence.
- Semua selection register lengkap.
- Semua archive row terverifikasi.

Query minimal:

```sql
-- Record tanpa PIC
SELECT e.id
FROM knowledge_entries e
LEFT JOIN knowledge_pics p ON p.knowledge_entry_id = e.id
GROUP BY e.id
HAVING count(p.user_id) = 0;

-- PIC bukan Head Office
SELECT e.id
FROM knowledge_entries e
JOIN knowledge_pics p ON p.knowledge_entry_id = e.id
JOIN users u ON u.id = p.user_id
WHERE u.role <> 'Head Office';

-- Content kosong / URL tidak aman
SELECT id FROM knowledge_entries WHERE length(btrim(content)) = 0;
SELECT id FROM knowledge_evidence WHERE url !~* '^https?://';

-- Duplikat active evidence (harus 0 setelah constraint)
SELECT knowledge_entry_id, count(*)
FROM knowledge_evidence
GROUP BY knowledge_entry_id
HAVING count(*) > 1;
```

### I.7 Post-migration validation

- exactly one active evidence per entry;
- unique active evidence terbukti;
- minimal satu PIC per entry;
- version ≥ 1;
- tidak ada orphan PIC/evidence;
- semua record memiliki project valid;
- archive count + active count sesuai;
- tidak ada record yang hilang.

Query minimal:

```sql
-- Exactly one active evidence
SELECT e.id, count(ev.id) AS active_count
FROM knowledge_entries e
LEFT JOIN knowledge_evidence ev ON ev.knowledge_entry_id = e.id
GROUP BY e.id
HAVING count(ev.id) <> 1;

-- Version invalid
SELECT id FROM knowledge_entries WHERE version < 1;

-- Active evidence orphan (harus 0; FK seharusnya mencegah)
SELECT ev.id
FROM knowledge_evidence ev
LEFT JOIN knowledge_entries e ON e.id = ev.knowledge_entry_id
WHERE e.id IS NULL;

-- PIC orphan (harus 0; FK seharusnya mencegah)
SELECT p.knowledge_entry_id
FROM knowledge_pics p
LEFT JOIN knowledge_entries e ON e.id = p.knowledge_entry_id
WHERE e.id IS NULL;
```

### I.8 Rollback strategy

- Backup penuh sebelum langkah pertama.
- Matriks rollback per langkah ada di I.10; analisis kegagalan ada di I.11.
- Setiap langkah DDL memiliki rollback point.
- Archive memungkinkan restore evidence yang dipindahkan.
- Drop unique project/type hanya di-rollback jika belum ada multiple record baru.
- Restore backup adalah rollback terakhir jika rollback parsial tidak aman.
- Rollback aplikasi harus mempertimbangkan bahwa V1 tidak memahami multiple record.

### I.9 MIGRATION EXECUTION ORDER

Urutan ini terdiri dari **Step 1–11**, dengan sub-step **7.5** (pre-constraint validation) dan **9a** (drop `sort_order`). Rollback bukan langkah bernomor; seluruh rollback ada di I.10.

Mekanisme Step 3: Owner melengkapi evidence untuk record 0-evidence melalui **UI V1 mode edit existing**, sementara CREATE record baru dibekukan. Jika UI V1 tidak dapat dijalankan, gunakan admin tool yang diotorisasi Owner; **tidak boleh INSERT langsung ke database tanpa jejak audit**. UI V1 tetap berjalan sampai Step 4 selesai.

| # | Aksi | Alasan urutan | Data berubah/hilang | Jenis | Gate |
|---|---|---|---|---|---|
| 1 | Pre-flight audit read-only; inventaris 0/1/>1 evidence dan PIC | Harus tahu kondisi awal sebelum menyentuh schema | Tidak ada | Read-only | Tidak |
| 2 | Owner selection gate untuk multi-evidence; catat di register terkontrol | Keputusan Owner harus ada sebelum archive; tidak boleh otomatis; belum perlu DDL | Tidak ada | Gate | **Ya** |
| 3 | Data completion untuk record 0 evidence melalui UI V1 edit existing; CREATE dibekukan | Exactly-one tidak dapat ditegakkan jika masih 0; tidak boleh dummy | Evidence baru ditambahkan | Additive data | **Ya** |
| 4 | Re-verifikasi pre-migration | Pastikan 0 pelanggaran sebelum DDL dan sebelum maintenance window | Tidak ada | Read-only | **Ya** |
| 5 | DDL additive: `version`, archive table, selection table, index, immutability trigger | Struktur harus ada sebelum memindahkan evidence | Tidak ada data entry hilang | Additive schema | Tidak |
| 6 | Impor selection register; pindahkan extra evidence ke archive | Unique evidence belum boleh ditambahkan sebelum extra dipindahkan; register sudah disetujui di Step 2 | Evidence aktif berkurang; arsip bertambah | Destructive ke active, preservatif ke archive | Tidak; memakai keputusan Step 2 |
| 7 | Drop `UNIQUE(project_id, knowledge_type)` | Multiple record harus diizinkan sebelum app V2 | Tidak ada data; constraint hilang | Destructive constraint | Tidak |
| 7.5 | **Pre-constraint validation**: setiap entry tepat satu evidence aktif dan minimal satu PIC | Constraint belum boleh dipasang jika data masih melanggar; jangan mengandalkan constraint untuk menemukan error | Tidak ada | Read-only | **Ya; wajib lulus** |
| 8 | Tambah `UNIQUE(knowledge_entry_id)` dan deferred exactly-one trigger | Prasyarat: Step 7.5 lulus; unique/trigger baru aman dipasang setelah data bersih | Tidak ada data | Additive constraint | **Ya; Step 7.5 lulus** |
| 9 | **Post-constraint validation**: constraint ada, exactly-one, PIC minimal, archive count, no orphan, version | Verifikasi setelah constraint terpasang, sebelum kolom lama dihapus | Tidak ada | Read-only | **Ya; wajib lulus** |
| 9a | Drop `knowledge_evidence.sort_order` | Hanya setelah Step 9 lulus; kolom urutan tidak lagi bermakna karena arsip sudah memisahkan data lama | Kolom aktif hilang; `sort_order` evidence yang diarsipkan tersimpan sebagai `original_sort_order`, evidence aktif tidak | Destructive kolom | **Ya; hanya setelah Step 9** |
| 10 | Application deploy V2 | Aplikasi baru harus memakai schema baru; bukan bagian migration | Tidak ada data schema | Deployment | Owner release gate |
| 11 | Post-migration validation | Audit akhir setelah app berjalan | Tidak ada jika sukses | Read-only | Tidak |

Catatan penting:

- Step 2 dan 3 adalah gate; migration tidak boleh lanjut jika gagal.
- Step 6 tidak boleh dijalankan tanpa selection register lengkap.
- Step 7 tidak boleh dijalankan sebelum archive Step 6 selesai.
- Step 7.5 wajib lulus sebelum Step 8; jika ada pelanggaran, STOP dan kembali ke Step 2/3, jangan memaksakan constraint.
- Step 8 tidak boleh dijalankan jika masih ada 0 evidence atau multi-evidence.
- Step 9 adalah validasi setelah constraint; Step 9a hanya dijalankan jika Step 9 lulus.
- Step 10 bukan bagian DDL, tetapi harus dicatat sebagai langkah deployment terpisah.
- **V1 create dibekukan selama Step 2–4; edit existing tetap diizinkan.** Setelah Step 4, UI V1 dihentikan sementara sebelum Step 5 (maintenance window) agar tidak ada penulisan baru selama DDL/archive.

**Query Step 7.5 (harus 0 baris; jika ada baris, STOP):**

```sql
SELECT e.id,
       count(DISTINCT ev.id) AS active_evidence_count,
       count(DISTINCT p.user_id) AS pic_count
FROM knowledge_entries e
LEFT JOIN knowledge_evidence ev ON ev.knowledge_entry_id = e.id
LEFT JOIN knowledge_pics p ON p.knowledge_entry_id = e.id
GROUP BY e.id
HAVING count(DISTINCT ev.id) <> 1
    OR count(DISTINCT p.user_id) = 0;
```

**Verifikasi Step 9:** ulangi query di atas (harus 0 baris) dan pastikan constraint/trigger berikut ada: `knowledge_evidence_entry_unique`, `knowledge_entries_require_evidence_trigger`, `knowledge_evidence_require_remaining_trigger`, serta trigger immutability. Jika ada yang hilang atau query mengembalikan baris, jangan jalankan Step 9a.

### I.10 Rollback Matrix

| Step | Aksi Rollback | Data dipulihkan | Catatan |
|---|---|---|---|
| 1 | Tidak ada; hentikan proses | Tidak ada | Read-only |
| 2 | Revisi register sebelum DDL | Tidak ada | Keputusan belum diterapkan |
| 3 | Hapus evidence yang salah; restore backup jika perlu | Evidence yang ditambahkan | Gunakan jejak audit; jangan hapus evidence existing |
| 4 | Tidak ada; STOP | Tidak ada | Kembali ke Step 2/3 |
| 5 | Drop trigger, index, tabel selection/archive, dan kolom `version` | Tidak ada data entry | Aman sebelum archive terisi |
| 6 | Kembalikan baris archive ke active; hapus baris archive | Evidence aktif | Rekonsiliasi ulang; jangan lanjut jika parsial |
| 7 | Recreate unique project/type | Tidak ada | Hanya jika belum ada multiple record baru |
| 7.5 | Tidak ada; STOP | Tidak ada | Kembali ke Step 2/3; constraint belum dipasang |
| 8 | Drop unique dan trigger exactly-one | Tidak ada | Perbaiki data sebelum retry |
| 9 | Tidak ada; perbaiki data/constraint | Tidak ada | Jangan lanjut ke Step 9a |
| 9a | `ADD COLUMN sort_order integer NULL` | Tidak otomatis; restore manual dari archive/backup | Evidence arsip memiliki `original_sort_order`; evidence aktif tidak |
| 10 | Redeploy app V1 | Tidak ada data schema | V1 tidak memahami multiple record; rollback terbatas |
| 11 | Rollback app; restore backup bila integritas gagal | Sesuai backup | Audit dan dokumentasikan |

### I.11 Failure Mode Analysis

| Skenario | Step terdeteksi | Aksi | Rollback |
|---|---|---|---|
| Step 6 gagal di tengah archive | 6 | Hentikan; jangan jalankan Step 7; periksa baris archive dan active | Transaksi rollback; jika sudah commit parsial, kembalikan archive ke active dan rekonsiliasi |
| Step 7.5 mendeteksi pelanggaran | 7.5 | STOP; kembalikan ke Step 2/3; jangan pasang constraint | Tidak ada perubahan schema |
| Step 8 gagal karena race condition | 8 | Hentikan; gunakan maintenance lock; ulangi Step 7.5 sebelum retry | Drop constraint/trigger jika sempat terpasang; tidak ada data berubah |
| Step 10 deploy gagal setelah schema berubah | 10 | Pertahankan schema; rollback app; jangan drop kolom/tabel secara refleks | Redeploy V1; jika multiple record sudah ada, rollback terbatas dan perlu keputusan Owner |
| Step 11 post-validation gagal | 11 | Hentikan traffic V2; investigasi; rollback app jika perlu | Restore backup jika integritas data tidak dapat dipulihkan |

---

## J. Authentication & RBAC

### J.1 Matriks

| Role | View | Manage | Create | Edit | Delete |
|---|---:|---:|---:|---:|---:|
| Admin | Ya | Ya | Ya | Ya | Ya |
| Head Office | Ya | Ya | Ya | Ya | Ya |
| Management | Ya | Tidak | Tidak | Tidak | Tidak |
| Project | Ya | Tidak | Tidak | Tidak | Tidak |
| Suspended | Tidak dapat login | — | — | — | — |

Sumber: `src/lib/auth/permissions.ts:90-91`; active check `src/lib/auth/current-user.ts:23-25`; access helper `src/lib/knowledge-management/access.ts:9-15`.

### J.2 Aturan server

- Semua route memakai `getActor()`.
- Mutation memakai `assertManageAccess`.
- Actor tidak dari body.
- Project tidak dapat dipindahkan lewat PUT.
- Delete hanya Manage.
- UI hiding bukan security boundary.
- PIC options dan project options hanya Manage.

### J.3 PIC suspended

- Status tidak difilter.
- User suspended tetap eligible.
- User suspended tidak dapat login.
- Label `(non-aktif)` pada UI.
- Ini final D-01, bukan gap.

### J.4 Project visibility

Akses Project ke seluruh knowledge tetap seperti V1. Tidak ada perubahan sampai keputusan Owner berikutnya; KM-GAP-13 tetap open.

---

## K. Concurrency & Data Integrity

### K.1 Version

`knowledge_entries.version` integer, mulai 1, naik setiap update berhasil.

Update:

```text
BEGIN
  SELECT ... FOR UPDATE WHERE id = $1
  IF not found -> 404
  IF version != expected_version -> 409
  UPDATE content, updated_by, updated_at, version = version + 1
  replace PIC
  update evidence
COMMIT
```

### K.2 Create

```text
BEGIN
  INSERT entry (version = 1, created_by, updated_by)
  INSERT PIC
  INSERT evidence
COMMIT
```

Tidak ada `expected_version` pada create.

### K.3 Delete

```text
BEGIN
  SELECT ... FOR UPDATE
  IF not found -> 404
  IF version != expected_version -> 409
  DELETE entry
  -- cascade PIC/evidence
COMMIT
```

Jika `SELECT ... FOR UPDATE` mengembalikan 0 baris karena row sudah dihapus transaksi lain, kembalikan `404`; `409` hanya untuk version mismatch pada row yang ada.

### K.4 Exactly-one saat transaksi

- `UNIQUE` mencegah evidence kedua.
- Deferred trigger mencegah commit tanpa evidence.
- Create/update menulis semua child sebelum commit.
- Pada update, evidence existing di-`UPDATE` dengan `id` tetap; evidence yang belum ada di-`INSERT`. Tidak ada `DELETE`+`INSERT` untuk evidence, karena evidence adalah bagian aggregate entry, bukan entity independen.
- Delete cascade membuat trigger anak skip.
- Kegagalan salah satu langkah membatalkan seluruh transaksi.

### K.5 Interaksi dengan trigger PIC

- Trigger PIC `0014` tetap terpisah.
- Keduanya deferred; final-state check.
- Jangan menggabungkan tanpa migration khusus.
- Pesan error PIC dan evidence harus berbeda.
- Pada update, PIC di-replace dengan `DELETE` lalu `INSERT`. Trigger `0014` adalah `AFTER DELETE ... DEFERRABLE INITIALLY DEFERRED`, sehingga tidak dievaluasi seketika saat `DELETE`; pemeriksaan ditunda ke `COMMIT`. Jika entry masih memiliki minimal satu PIC baru saat commit, trigger lolos. Jika `INSERT` PIC baru gagal, trigger menolak transaksi. Ini perilaku yang diinginkan.
- Update evidence mengikuti pola yang sama seperti K.4: `UPDATE` untuk evidence existing, `INSERT` jika belum ada; tidak ada `DELETE`+`INSERT`.

### K.6 Draft

- Dirty guard.
- `beforeunload`.
- 409 tidak menutup form.
- Tidak ada auto-save.
- Double submit dicegah dengan disable tombol.

### K.7 Duplicate create

Multiple record adalah fitur, jadi duplicate content bukan pelanggaran schema. UI mencegah double submit; tidak ada unique project/type yang dikembalikan.

---

## L. Regression Impact Analysis

| Area | Dampak | Tindakan |
|---|---|---|
| Master Project | FK restrict tetap; project dengan knowledge tidak dapat dihapus | Tidak diubah |
| Program Kerja | Terpisah | Tidak disentuh |
| User Directory | PIC FK; user dengan assignment tidak dapat dihapus | Tidak diubah |
| Sidebar | Tiga link KM | Tidak diubah |
| Auth | Session + active check | Tidak diubah |
| PostgreSQL | Schema/migration KM | Backup + test migration |
| API lama | Endpoint project/type/evidence dihapus | UI harus pindah ke endpoint ID |
| Engineering Database | Master Project + restrict | Tidak diubah |
| MSL Engineering | Protected | Tidak boleh diubah |
| Struktur Organisasi | Protected | Tidak boleh diubah |
| Dokumentasi | Status V1.1 tetap | Hanya catatan di dokumen ini |
| Existing test | Test V1 inline/timestamp perlu diganti | Update test V2 |

Endpoint lama:

- `PUT /[projectId]/[type]`
- `POST /[projectId]/[type]/evidence`
- `PATCH/DELETE /evidence/[id]`
- `DELETE /entry/[id]`

Tidak ditemukan consumer lain di source selain `KnowledgeTable`; verifikasi ulang sebelum removal.

---

## M. Testing Strategy

### M.1 Unit

- URL safety.
- content 20.000 diterima / 20.001 ditolak.
- evidence name 200/201.
- URL 2.048/2.049.
- PIC minimal satu; jumlah besar tanpa batas; suspended eligible.
- PUT schema menolak `project_id` dan `projectId`.
- version comparison.
- grouping/rowspan.
- format history.

### M.2 API

- 401, 403, 400, 404, 409, 201, 200.
- create dua record pada project/type sama.
- update content/PIC/evidence.
- update dengan `project_id` → 400.
- stale version → 409.
- delete cascade.
- delete stale → 409.
- actor dari sesi.
- record history.

### M.3 Database

- multiple record.
- unique active evidence.
- trigger 0 evidence.
- trigger PIC.
- delete last evidence ditolak.
- cascade.
- master project restrict.
- version.
- immutable project/type trigger.
- archive not counted.

### M.4 Migration

- inventory 0/1/>1.
- selection register.
- archive.
- pre/post validation.
- rollback.
- no data loss.

### M.5 Browser

- Admin/Head Office CRUD.
- Management/Project read-only.
- modal/focus/escape/dirty.
- rowspan single/multiple.
- counters.
- 409.
- delete confirmation.
- responsive.

### M.6 Status

Semua test di atas **belum dijalankan** pada Phase 2B.

---

## N. File Impact Inventory

| Grup | File | Perubahan | Alasan | Kompleksitas |
|---|---|---|---|---|
| Database schema | `src/lib/pg/schema.ts:277-347` | Modify | hapus unique, version, evidence unique, archive tables | Tinggi |
| Migration | `drizzle/0015_knowledge_management_v2.sql` | Add | migration V2 | Tinggi |
| Migration meta | `drizzle/meta/_journal.json`; snapshot | Modify/Add | journal/snapshot; snapshot 0014 perlu diperbaiki | Sedang |
| API list/create | `src/app/api/knowledge-management/route.ts:7-37` | Modify | GET record-only + POST | Tinggi |
| API detail | `src/app/api/knowledge-management/[id]/route.ts` | Add | GET/PUT/DELETE | Tinggi |
| API options | `.../project-options/route.ts` | Add | project picker | Rendah |
| API PIC | `.../pic-options/route.ts` | Modify | snake_case DTO / no max | Rendah |
| API helper | `src/app/api/knowledge-management/_helpers.ts:30-42` | Modify | error/version mapping + `parseExpectedVersion` | Sedang |
| API lama | `[projectId]/[type]/route.ts`, evidence routes, entry route | Delete | kontrak V2 | Sedang |
| Service | `src/lib/knowledge-management/service.ts:90-305` | Modify | aggregate create/update/delete | Tinggi |
| Repository | `src/lib/knowledge-management/repository.ts:41-338` | Modify | record query, lock, version, archive | Tinggi |
| Validation | `src/lib/knowledge-management/schema.ts:48-119` | Modify | snake_case, limits, no max PIC | Tinggi |
| Conflict | `src/lib/knowledge-management/conflict.ts` | Modify/Delete | version replaces timestamp | Rendah |
| Table | `src/components/dashboard/knowledge-management/KnowledgeTable.tsx:4-634` | Rewrite | record rows, rowspan | Tinggi |
| Form | `.../KnowledgeFormDialog.tsx` | Add | Add/Edit | Tinggi |
| Delete dialog | `.../KnowledgeDeleteDialog.tsx` | Add | confirmation | Sedang |
| Page header | `.../KnowledgeManagementPage.tsx` | Add | title/description | Rendah |
| Pages | tiga `page.tsx:10` | Modify | render V2 | Rendah |
| Permission | `src/lib/auth/permissions.ts:90-91` | No change | RBAC tetap | Rendah |
| Tests | `src/lib/knowledge-management/knowledge.test.ts`; test V2 baru | Modify/Add | boundary/version/grouping | Tinggi |
| Docs | `docs/design/KNOWLEDGE_MANAGEMENT_V2_PHASE2B_TECHNICAL_DESIGN.md` | Add | dokumen ini | Sedang |
| Docs governance | `FEATURE_REGISTER`, governance | No change | D-07 | Rendah |

---

## O. Technical Risks & Open Decisions Register

### O.1 Final business decisions

D-01 sampai D-09 sudah final dan tidak perlu diputuskan ulang.

### O.2 Rekomendasi teknis (bukan keputusan bisnis)

| ID | Rekomendasi | Alasan |
|---|---|---|
| TR-01 | Evidence one-to-one child | kompatibel V1, audit, constraint |
| TR-02 | Version integer | eksplisit, seluruh aggregate |
| TR-03 | Trigger PIC dan evidence terpisah | audit dan error spesifik |
| TR-04 | Archive table terpisah | arsip tidak dihitung aktif |
| TR-05 | Modal lebar | konteks tabel, mobile full-screen |
| TR-06 | Dialog delete terpisah | permanent delete berisiko |
| TR-07 | API snake_case | sesuai field Owner |
| TR-08 | DELETE memakai `expected_version` query | mencegah delete stale; tidak memakai body |

### O.3 Asumsi teknis sementara

| ID | Asumsi | Dampak jika salah |
|---|---|---|
| AS-01 | V1 create dibekukan selama Step 2–4; edit existing tetap diizinkan sampai Step 4, lalu maintenance window | jika tidak, muncul pelanggaran baru atau data tidak dapat dilengkapi |
| AS-02 | Tidak ada consumer API eksternal | endpoint lama dapat dihapus |
| AS-03 | Volume data dapat dimuat tanpa pagination | jika besar, perlu group pagination |
| AS-04 | Semua record V1 dapat dilengkapi/dipilih Owner | jika tidak, migration ditunda |

### O.4 Unknown

| ID | Unknown |
|---|---|
| UN-01 | jumlah aktual record 0/1/>1 evidence |
| UN-02 | jumlah PIC aktual dan role/status |
| UN-03 | kualitas data V1 |
| UN-04 | status snapshot Drizzle 0014 |
| UN-05 | hasil runtime empat role |
| UN-06 | retensi arsip setelah permanent delete |

### O.5 Open decisions

| ID | Keputusan | Rekomendasi | Status |
|---|---|---|---|
| OD-01 | Apakah DELETE wajib `expected_version`? | Ya, query | Perlu konfirmasi review |
| OD-02 | Retensi arsip setelah record V2 dihapus | Audit-only, retensi terpisah | **OPEN** |
| OD-03 | Tampilan history jika `updated_by` user dihapus | Tampilkan `—` atau snapshot nama | **OPEN** |
| OD-04 | Mekanisme freeze V1 selama cleanup | CREATE dibekukan; edit existing sampai Step 4; maintenance window setelahnya | **OPEN** |
| OD-05 | Pagination/filter tabel | Tanpa pagination awal; group pagination jika perlu | **OPEN** |
| OD-06 | Akses Project ke seluruh knowledge | Tetap V1; KM-GAP-13 | **OPEN** |
| OD-07 | Apakah arsip boleh diekspos di UI | Tidak untuk V2 awal | **OPEN** |

### O.6 Risiko

| Risiko | Level | Mitigasi |
|---|---|---|
| 0 evidence V1 | Tinggi | gate D-05 |
| multi evidence V1 | Tinggi | selection gate D-06 |
| V1 create selama cleanup | Tinggi | freeze CREATE; edit existing sampai Step 4; maintenance window |
| migration rollback setelah multiple record | Tinggi | backup + maintenance |
| snapshot Drizzle tidak lengkap | Sedang | perbaiki sebelum generate |
| API contract berubah | Sedang | UI satu repo |
| rowspan + pagination | Sedang | group pagination |
| volume PIC besar | Rendah | UI scroll/search; no business max |
| test integration belum ada | Sedang | test plan |

---

## P. Implementation Plan

1. **Design review** — ChatGPT review dokumen ini; Owner menyetujui open decisions.
2. **Preflight** — backup, inventory 0/1/>1 evidence, PIC, freeze V1 CREATE (edit existing tetap diizinkan sampai Step 4).
3. **Owner gates** — selection multi-evidence; completion 0 evidence; re-verify.
4. **Schema/migration** — additive DDL, archive, selection, drop unique, pre-constraint validation (7.5), exactly-one, post-constraint validation (9), drop `sort_order` (9a); test on isolated DB.
5. **Backend** — validation, repository lock/version, service aggregate, API V2.
6. **Frontend** — table/rowspan, form, delete dialog, counters, dirty guard.
7. **Tests** — unit, API, DB, migration, browser, four roles, concurrency.
8. **Deployment** — only with Owner approval; migration before app; post-validation.
9. **Documentation** — update feature register/master log only in a separate approved task; D-07 forbids changing them here.

Tidak ada langkah yang boleh dimulai sebelum Owner menyatakan **“Siap dikembangkan.”**

---

## Q. Acceptance Criteria

### Q.1 Business

- [ ] Tiga submenu tetap.
- [ ] Banyak record per project/kategori.
- [ ] Tabel hanya menampilkan project yang punya record.
- [ ] Add/Edit form sama.
- [ ] Project read-only saat Edit.
- [ ] PIC minimal satu, Head Office, suspended eligible, tanpa batas jumlah.
- [ ] Tepat satu evidence: name + HTTP/HTTPS URL.
- [ ] Content max 20.000; name max 200; URL max 2.048; error menyebut angka.
- [ ] Delete permanent dari form Edit, Manage KM, konfirmasi.
- [ ] Record History empat field dari backend.
- [ ] Action hanya Edit.
- [ ] Rowspan benar untuk 1/banyak record.
- [ ] V1.1 tetap APPROVED SPECIFICATION dan ditunda.

### Q.2 API/security

- [ ] POST tanpa version; version=1.
- [ ] PUT tanpa `project_id`; field itu ditolak.
- [ ] DELETE tanpa body; permission Manage.
- [ ] Actor dari sesi.
- [ ] 401/403/400/404/409/201/200 sesuai.
- [ ] Version mismatch → 409.
- [ ] Read-only tidak dapat mutate.

### Q.3 Database

- [ ] Multiple record.
- [ ] Exactly-one evidence.
- [ ] PIC minimal.
- [ ] Cascade.
- [ ] Master Project restrict.
- [ ] History metadata.
- [ ] Version.
- [ ] Archive terpisah.
- [ ] No orphan/partial.

### Q.4 Migration

- [ ] Inventory 0/1/>1.
- [ ] Selection register.
- [ ] Archive register.
- [ ] Pre-DDL, pre-constraint (7.5), dan post-constraint (9) validation.
- [ ] 11-step order dengan sub-step 7.5 dan 9a.
- [ ] Rollback matrix dan failure mode analysis.
- [ ] No data loss.
- [ ] 0 evidence blocker.
- [ ] Multi-evidence Owner gate.

### Q.5 Quality

- [ ] TypeScript.
- [ ] Lint file KM.
- [ ] Build.
- [ ] Unit/API/DB/browser.
- [ ] Four roles.
- [ ] Concurrency.
- [ ] Regression Master Project, Program Kerja, User, Sidebar.
- [ ] MSL/Org untouched.
- [ ] No claim PASS for unrun tests.

---

## Status Akhir

**Design revised for Owner decisions D-01 through D-09 and the Phase 2B technical review remediation.**

**No implementation. No migration. No database change. No commit/push/deploy.**

**Waiting for ChatGPT technical review and explicit Owner statement: “Siap dikembangkan.”**
