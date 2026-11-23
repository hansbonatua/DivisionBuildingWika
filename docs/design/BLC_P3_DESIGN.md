# P3 — Technical Design: Modul Building Learning Center (BLC)
**Proyek:** WIBEX — Staff Engineering Digitalisasi Building  
**Fase:** P3 — Technical Design (dokumen saja)  
**Tanggal:** 23 November 2026  
**Baseline:** Audit P2 (Drizzle `0029`, pola Regulation/Berkas/CMS); HEAD `d11577f`  
**Migration:** `0030_building_learning_center` — rancangan, belum dibuat/dijalankan  
**Status:** READY FOR REVIEW

## A. Ringkasan
Katalog pembelajaran Core Enterprise: **Sharing Session** (card → detail internal, video + lampiran), **Training** dan **Certificate** (card → link eksternal), plus **Admin Control** (halaman CRUD, bukan tipe konten). Keputusan yang mengikat:
- **P3-R01:** Tiga tabel — `learning_contents` (induk, `type`), `learning_categories`, `learning_attachments` (anak, hanya `sharing`).
- **P3-R02:** Thumbnail di Public Blob (`cms/learning/`), lampiran di Private Blob (`learning/`); tidak ada byte video yang disimpan.
- **P3-R03:** Video disimpan sebagai **canonical embed URL**, dirender `<iframe>`.
- **P3-R04:** Card grid untuk tiga submenu; hanya `sharing` punya route detail.
- **P3-R05:** `LEARNING_VIEW` semua role; `LEARNING_MANAGE` Admin + Head Office.
- **P3-R06:** `type` immutable setelah create; kategori adalah master table.

## B. Database Schema
```text
learning_categories 1 ─── N learning_contents 1 ─── N learning_attachments
                        (type: sharing|training|certificate)   (sharing only)
```
Lampiran menempel lewat composite FK `(content_id, content_type)`, sehingga lampiran mustahil dimiliki `training`/`certificate` — dijaga database, bukan hanya service.

### B.1 DDL konseptual
> DDL berikut hanya untuk review, bukan file migration dan tidak dijalankan pada P3.
```sql
CREATE TABLE learning_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nama text NOT NULL, sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION, updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_categories_nama_check CHECK (length(btrim(nama)) BETWEEN 1 AND 80),
  CONSTRAINT learning_categories_sort_check CHECK (sort_order >= 0)
);
CREATE UNIQUE INDEX learning_categories_nama_unique ON learning_categories (lower(btrim(nama)));
CREATE INDEX learning_categories_sort_idx ON learning_categories (sort_order, id);

CREATE TABLE learning_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL, judul text NOT NULL, deskripsi text,
  kategori_id uuid NOT NULL REFERENCES learning_categories(id) ON DELETE RESTRICT,
  thumbnail_url text NOT NULL, thumbnail_pathname text NOT NULL, video_url text, external_url text,
  sort_order integer NOT NULL DEFAULT 0, created_by uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_contents_type_check CHECK (type IN ('sharing','training','certificate')),
  CONSTRAINT learning_contents_judul_check CHECK (length(btrim(judul)) BETWEEN 1 AND 200),
  CONSTRAINT learning_contents_deskripsi_check CHECK (deskripsi IS NULL OR length(deskripsi) <= 2000),
  CONSTRAINT learning_contents_sort_check CHECK (sort_order >= 0),
  CONSTRAINT learning_contents_payload_check CHECK ((type = 'sharing' AND video_url IS NOT NULL AND external_url IS NULL)
    OR (type IN ('training','certificate') AND external_url IS NOT NULL AND video_url IS NULL)),
  CONSTRAINT learning_contents_video_check CHECK (video_url IS NULL OR (length(video_url) <= 2048 AND video_url ~
    '^https://(www\.)?(youtube\.com/embed/|player\.vimeo\.com/video/)[A-Za-z0-9_-]+$')),
  CONSTRAINT learning_contents_external_check CHECK (external_url IS NULL OR (length(external_url) <= 2048 AND external_url ~ '^https?://[^[:space:]]+$')),
  CONSTRAINT learning_contents_thumbnail_check CHECK (length(thumbnail_url) <= 2048 AND thumbnail_url ~ '^https://[^[:space:]]+$'),
  CONSTRAINT learning_contents_id_type_unique UNIQUE (id, type)
);
CREATE UNIQUE INDEX learning_contents_thumbnail_pathname_unique ON learning_contents (thumbnail_pathname);
CREATE INDEX learning_contents_type_sort_idx ON learning_contents (type, sort_order, id);
CREATE INDEX learning_contents_kategori_idx ON learning_contents (kategori_id);
CREATE INDEX learning_contents_judul_trgm_idx ON learning_contents USING gin (judul gin_trgm_ops);

CREATE TABLE learning_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_id uuid NOT NULL, content_type text NOT NULL DEFAULT 'sharing',
  nama text NOT NULL, file_pathname text NOT NULL, file_name text NOT NULL, file_mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL, sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_attachments_sharing_check CHECK (content_type = 'sharing'),
  CONSTRAINT learning_attachments_nama_check CHECK (length(btrim(nama)) BETWEEN 1 AND 255),
  CONSTRAINT learning_attachments_path_check CHECK (length(file_pathname) BETWEEN 1 AND 500 AND file_pathname LIKE 'learning/%'),
  CONSTRAINT learning_attachments_size_check CHECK (file_size_bytes BETWEEN 1 AND 20971520),
  CONSTRAINT learning_attachments_parent_fk FOREIGN KEY (content_id, content_type) REFERENCES learning_contents (id, type) ON DELETE CASCADE
);
CREATE UNIQUE INDEX learning_attachments_pathname_unique ON learning_attachments (file_pathname);
CREATE INDEX learning_attachments_content_sort_idx ON learning_attachments (content_id, sort_order, id);
```
### B.2 Aturan integritas
- `type` hanya tiga nilai; kombinasi payload per tipe dijaga CHECK, service memvalidasi lebih dulu. `type` **tidak boleh berubah** setelah create.
- `kategori_id` RESTRICT: kategori terpakai tidak dapat dihapus (service 409 lebih dulu).
- `thumbnail_pathname` dan `file_pathname` UNIQUE: satu blob hanya diklaim satu row.
- Pathname tidak pernah dikembalikan ke browser; DTO hanya memuat URL publik thumbnail dan id lampiran. `thumbnail_url` diambil server dari metadata Blob (`head()`).
- Ukuran lampiran CHECK 1–20.971.520 byte; MIME divalidasi service terhadap ekstensi (legacy `.doc`/`.xls` dapat dilaporkan `application/octet-stream`).
- Audit mengikuti konvensi repo: `created_by` NO ACTION, `updated_by` SET NULL. `sort_order = max + 10` per `type`; reorder menulis `10, 20, …` dalam transaksi.

### B.3 Migration `0030_building_learning_center`
File `drizzle/0030_building_learning_center.sql`: buat tiga tabel berurutan (`learning_categories` → `learning_contents` → `learning_attachments`), lalu FK, CHECK, unique index, dan index sort. Tambah tiga `pgTable` di `src/lib/pg/schema.ts`; tanpa seed (kategori dibuat Admin); tidak mengubah tabel existing; journal `idx: 30`; `pg_trgm` sudah aktif sejak `0004`. Migration **belum dijalankan** pada P3. Rollback sebelum ada data: drop `learning_attachments` → `learning_contents` → `learning_categories`; setelah ada data, backup lebih dulu karena drop destruktif.

### B.4 Delete dan cleanup
- **Konten:** baca `thumbnail_pathname` + semua `file_pathname`, hapus row induk (anak cascade), lalu `deleteBlob`/`deletePublicCmsBlob` best-effort.
- **Lampiran tunggal:** hapus row, blob best-effort; kegagalan blob dicatat tanpa membatalkan respons. **Kategori:** hitung konten; > 0 → 409.
- **Upload gagal sebelum row dibuat:** client memanggil cleanup orphan.

## C. Storage Policy
### C.1 Thumbnail — Public Blob
Store publik (`CMS_BLOB_READ_WRITE_TOKEN`), wrapper `src/lib/storage/public-image.ts`. Path `cms/learning/{upload-uuid}/{sanitized-file-name}`. Tambahan wajib di `src/lib/cms/storage-path.ts`: modul `learning` pada `CMS_UPLOAD_MODULES`, `CMS_UPLOAD_PREFIX_BY_MODULE`, `isCmsUploadPathname()`, dan `isCmsBlobPathname()` (tanpa yang terakhir, cleanup menolak objek BLC). Batas 5 MB; `image/png|jpeg|webp`; `allowOverwrite: false`, `addRandomSuffix: false`, cache immutable. Alasan: dirender langsung di card grid, cache CDN, tanpa proxy per gambar.

### C.2 Lampiran — Private Blob
Store privat (`BLOB_READ_WRITE_TOKEN`), wrapper `src/lib/storage/blob.ts`. Path `learning/{upload-uuid}/{sanitized-file-name}`; prefix `learning/` tidak dipakai modul lain. Batas 20 MB; ekstensi `pdf, doc, docx, xls, xlsx, ppt, pptx, zip` dengan allowlist MIME per ekstensi (pola `src/lib/regulation/storage.ts`, policy terpisah). Alasan: modul terbuka untuk **semua role yang login**, bukan publik internet; URL Blob publik permanen dan tidak dapat dicabut.

### C.3 Video
Tidak ada blob video. Yang disimpan hanya canonical embed URL; byte tetap di YouTube/Vimeo. Batas 2048 karakter dan CHECK bentuk kanonik (§H).

### C.4 Alur upload
1. Admin/HO memilih file; client memeriksa ekstensi dan ukuran.
2. Client membangun pathname (`buildLearningBlobPathname`) lalu meminta token ke `POST /api/learning/upload-token` dengan `clientPayload`.
3. Server memeriksa `LEARNING_MANAGE`, konfigurasi token, jenis payload, dan pathname; token dibatasi content-type, ukuran, `allowOverwrite: false`, `addRandomSuffix: false`, berlaku 10 menit. Thumbnail memakai token store publik, lampiran token store privat (tanpa fallback antar-store).
4. Browser mengunggah langsung ke Blob; byte tidak melewati Next.js.
5. Client mengirim metadata + pathname ke endpoint create/update.
6. Server memverifikasi setiap pathname: `headBlob`/`headPublicCmsImage` → objek ada, pathname sama, ukuran dalam batas, MIME cocok ekstensi.
7. Thumbnail wajib **publik** (`isPublicImageReachable`); lampiran wajib **privat** (`isBlobPubliclyReachable === false`). Probe `null` = tak terverifikasi → 400.
8. `file_mime_type`, `file_size_bytes`, dan `thumbnail_url` diambil dari metadata Blob; row ditulis dalam satu transaksi. Kegagalan setelah upload → client cleanup orphan.

### C.5 Download lampiran
Route hanya menerima **record id**, bukan pathname/URL. Service memeriksa `LEARNING_VIEW`, row, dan induk bertipe `sharing`, lalu stream `openBlobDownload` (`access: "private"` dipatok server). Header: `Content-Type`, `Content-Disposition: attachment` (helper sanitasi existing), `Content-Length`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`.

## D. API Contract
### D.1 Konvensi
Base `/api/learning`; `getActor()` + actor `status === "active"`; sukses `{ data, meta? }`; error `{ error: { message, details? } }`; semua response `Cache-Control: private, no-store`; UUID divalidasi sebelum service; body snake_case dan `.strict()`; pathname, audit field, dan `sort_order` tidak diterima sebagai field bebas pada update metadata.

### D.2 Endpoint
| Method | Path | Permission | Sukses | Error utama |
|---|---|---|---|---|
| GET | `/api/learning/contents?type=&category=&q=&page=` | VIEW | 200 | 400,401,403,500 |
| GET | `/api/learning/contents/[id]` | VIEW | 200 | 400,401,403,404,500 |
| POST | `/api/learning/contents` | MANAGE | 201 | 400,401,403,404,409,503,500 |
| PATCH | `/api/learning/contents/[id]` | MANAGE | 200 | 400,401,403,404,409,503,500 |
| DELETE | `/api/learning/contents/[id]` | MANAGE | 200 | 401,403,404,500 |
| POST | `/api/learning/reorder` | MANAGE | 200 | 400,401,403,404,409,500 |
| GET | `/api/learning/categories` | VIEW | 200 | 401,403,500 |
| POST | `/api/learning/categories` | MANAGE | 201 | 400,401,403,409,500 |
| PATCH | `/api/learning/categories/[id]` | MANAGE | 200 | 400,401,403,404,409,500 |
| DELETE | `/api/learning/categories/[id]` | MANAGE | 200 | 401,403,404,409,500 |
| POST | `/api/learning/upload-token` | MANAGE | 200 | 400,401,403,503,500 |
| POST | `/api/learning/upload/cleanup` | MANAGE | 200 | 400,401,403,409,500 |
| GET | `/api/learning/attachments/[id]/file` | VIEW | 200 | 400,401,403,404,500 |

### D.3 Kontrak utama
**GET `/contents`** — `type` wajib (`sharing|training|certificate`), `category` UUID opsional, `q` ≤ 200 karakter (ILIKE judul, `%`/`_` di-escape), `page` ≥ 1, `limit` tetap 24. `meta: { total, page, page_size, available_categories }`.
```json
{ "data": [{
  "id": "uuid", "type": "sharing", "judul": "ERP untuk Project",
  "deskripsi": "Ringkasan sesi", "kategori": { "id": "uuid", "nama": "ERP" },
  "thumbnail_url": "https://…/cms/learning/….webp", "external_url": null,
  "sort_order": 10, "attachment_count": 3, "updated_at": "2026-11-12T09:00:00.000Z"
}], "meta": { "total": 1, "page": 1, "page_size": 24, "available_categories": [] } }
```
**GET `/contents/[id]`** menambahkan `video_embed_url` dan `attachments[]` (`{ id, nama, file_name, file_mime_type, file_size_bytes, sort_order }`). Tanpa pathname. `training`/`certificate` mengembalikan `attachments: []`.

**POST `/contents`** menerima `{ type, judul, deskripsi?, kategori_id, thumbnail_pathname, video_url?, external_url?, attachments?: [{ nama, file_name, file_pathname, file_mime_type, file_size_bytes }] }`. Server menurunkan `thumbnail_url` dari metadata Blob, menormalkan `video_url` (§H), dan menolak `attachments` tidak kosong untuk tipe non-`sharing` (400). `sort_order = max + 10`.

**PATCH `/contents/[id]`** menerima field yang sama kecuali `type` (ditolak 400 bila dikirim berbeda). Lampiran bersifat **replace-set**: array yang dikirim menjadi daftar final; pathname yang hilang dihapus setelah commit, pathname baru diverifikasi lebih dulu. Tanpa `attachments`, daftar lampiran tidak berubah. Body kosong → 400.

**DELETE `/contents/[id]`** mengembalikan `{ data: { deleted: true, id } }`.

**Kategori** — `POST` menerima `{ nama, sort_order? }`; nama di-trim, unik case-insensitive (409 disertai id kategori existing agar UI dapat memakainya). `PATCH` menerima `{ nama?, sort_order? }`. `DELETE` → 409 bila masih dipakai.

**POST `/upload-token`** memakai `handleUpload`; `clientPayload` = `{ kind: "thumbnail" | "attachment", upload_id }` (Zod `.strict()`); `kind` menentukan store, allowlist, dan batas ukuran. Server tidak menerima byte.

**POST `/reorder`** menerima `{ type, ordered_ids }`; daftar harus lengkap, tanpa duplikat, hanya milik `type` tersebut; tidak lengkap → 409.

### D.4 Error mapping
| Kondisi | HTTP |
|---|---|
| Tidak login / sesi tidak valid | 401 |
| Role atau status tidak berhak | 403 |
| Body, UUID, tipe, pathname, atau URL tidak valid; blob tidak ada / MIME / path / akses store salah | 400 |
| Konten/lampiran/kategori tidak ditemukan | 404 |
| Kategori duplikat atau terpakai, reorder tidak lengkap | 409 |
| Token storage belum dikonfigurasi | 503 |
| Error tak terduga | 500 |

`23505` → 409; `23503`/`23001` → 409; `23514` → 400.

## E. UI Component Design
### E.1 Komponen baru
```text
LearningCardGrid.tsx      grid + filter + pagination (dipakai 3 submenu)
LearningCard.tsx          thumbnail, kategori, judul, meta, aksi
LearningDetailPage.tsx    video embed + deskripsi + daftar lampiran
LearningAdminPage.tsx     tab per tipe + tab kategori, tabel CRUD
LearningFormDialog.tsx    metadata + thumbnail + video/external URL + lampiran
ThumbnailField.tsx        pilih gambar, preview, progress, hapus
AttachmentField.tsx       multi-file, daftar, progress per file, retry
CategoryPicker.tsx        pilih kategori + “Buat kategori baru”
LearningDeleteDialog.tsx  konfirmasi + peringatan cleanup file
```
Tidak ada komponen modul lain yang diimpor; hanya primitive UI umum dan helper storage/route yang dipakai ulang.

### E.2 Wireframe card grid (Sharing / Training / Certificate)
```text
┌ Building Learning Center · Sharing Session ───────────────────────────┐
│ Sesi berbagi pengetahuan internal WIKA.     [ Cari… ]  [ Kategori ▾ ] │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │                 │
│ │  thumbnail  │ │ │  thumbnail  │ │ │  thumbnail  │ │                 │
│ │ Soft Skill  │ │ │ ERP         │ │ │ HSE         │ │                 │
│ │ Judul sesi… │ │ │ Judul sesi… │ │ │ Judul sesi… │ │                 │
│ │ 12 Nov · 3f │ │ │ 03 Nov · 1f │ │ │ 28 Okt · 2f │ │                 │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │                 │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```
1/2/3/4 kolom (`sm`/`lg`/`xl`), thumbnail 16:9 `object-cover`, judul maksimal 2 baris. `sharing` → `Link` ke `/dashboard/learning/sharing/[id]`; `training` dan `certificate` → `<a target="_blank" rel="noopener noreferrer">` ke `external_url` dengan ikon eksternal. Seluruh card adalah target klik, bukan hanya judul.

### E.3 Wireframe halaman detail (Sharing)
```text
┌ ← Sharing Session                                                     │
│ ┌──────────────────────────────────────┬─────────────────────────────┐ │
│ │        <iframe> video 16:9           │ Kategori   Soft Skill       │ │
│ │        YouTube / Vimeo embed         │ Diperbarui 12 Nov 2026      │ │
│ └──────────────────────────────────────┴─────────────────────────────┘ │
│ Judul Sesi Sharing · Deskripsi sesi (teks biasa, baris dipertahankan). │
│ Lampiran (3)                                                           │
│  📄 Materi Sesi.pdf        PDF · 2,1 MB                     [ Unduh ] │
│  📊 Rekap Data.xlsx        XLSX · 840 KB                    [ Unduh ] │
└────────────────────────────────────────────────────────────────────────┘
```
Unduh memakai `GET /attachments/[id]/file` (id, bukan pathname). Video memakai `<iframe>` dengan `src` hasil normalisasi server, `loading="lazy"`, `allowFullScreen`, `referrerPolicy="strict-origin-when-cross-origin"`, rasio 16:9. Tanpa lampiran: “Belum ada lampiran pada sesi ini.” Tipe selain `sharing` tidak memiliki route detail.

### E.4 Wireframe Admin Control
```text
┌ Admin Control ──────────────────────────────────────────────────────────┐
│ [ Sharing ] [ Training ] [ Certificate ] [ Kategori ]      [ + Tambah ] │
├────┬───────────────────────┬────────────┬──────────────┬────────┬───────┤
│ #  │ Judul                 │ Kategori   │ Media        │ Urutan │ Aksi  │
│ 1  │ ERP untuk Project     │ ERP        │ Video + 3 file│ 10    │ ⋮     │
│ 2  │ Pelatihan HSE Dasar   │ HSE        │ Link eksternal│ 20    │ ⋮     │
└────┴───────────────────────┴────────────┴──────────────┴────────┴───────┘
┌ Tambah Konten ──────────────────────────────────────────────────────────┐
│ Tipe       ( ) Sharing  ( ) Training  ( ) Certificate                   │
│ Judul      [                                                         ]  │
│ Kategori   [ ERP ▾ ]  [+ Kategori baru]                                 │
│ Thumbnail  [ Pilih gambar ] PNG/JPG/WebP · maks. 5 MB · pratinjau 16:9  │
│ Video URL  [ https://youtube.com/watch?v=… ]      ← hanya Sharing       │
│ Link       [ https://… ]                    ← Training / Certificate    │
│ Lampiran   [ Tambah file ] PDF/DOC/XLS/PPT/ZIP · maks. 20 MB/file       │
│            materi.pdf 2,1 MB ✓ · rekap.xlsx 840 KB ⏳ 60% · [×]         │
│                                  [ Batal ]   [ Simpan ]                 │
└─────────────────────────────────────────────────────────────────────────┘
```
Tab Kategori memakai tabel kecil (nama, jumlah konten, urutan, aksi) dan hanya menghapus kategori tanpa konten. Dialog menampilkan field sesuai `type`; mengganti tipe pada mode edit tidak diizinkan (field disabled dengan keterangan). Tombol mutasi hanya dirender untuk `LEARNING_MANAGE`.

### E.5 State, empty state, aksesibilitas
| State | Perilaku |
|---|---|
| Initial load / error awal | Skeleton card (6) atau baris tabel; error → alert + “Coba Lagi” |
| Error saat data tampil | Data lama dipertahankan + toast |
| Empty (view / manage) | “Belum ada konten pada submenu ini.”; CTA hanya untuk manage |
| Upload berjalan | Progress per file, tombol simpan disabled |
| Simpan gagal | Pesan di dialog; file terunggah dibersihkan bila row tidak dibuat |
| Redirect eksternal | `target="_blank"` + `rel="noopener noreferrer"` |

Grid memakai `role="list"`/`listitem`; card adalah elemen interaktif tunggal dengan nama aksesibel = judul. Dialog `role="dialog"`, `aria-modal`, focus trap, Escape, restore focus. Progress upload diumumkan `aria-live="polite"`. Thumbnail punya `alt` = judul; gambar rusak menampilkan placeholder abu-abu.

## F. Navigasi Sidebar
Accordion **“Building Learning Center”** di grup Core Enterprise, setelah **Knowledge Management** dan sebelum **Project Documentation** (kedekatan domain; urutan akhir adalah keputusan produk dan hanya mengubah array menu).
```text
Core Enterprise
├─ Knowledge Management
├─ Building Learning Center
│  ├─ Sharing Session
│  ├─ Training
│  ├─ Certificate
│  └─ Admin Control        ← hanya bila canManageLearning
└─ Project Documentation
```
```text
/dashboard/learning                  → redirect /sharing
/dashboard/learning/sharing          /dashboard/learning/sharing/[id]
/dashboard/learning/training         /dashboard/learning/certificate
/dashboard/learning/admin            → guard LEARNING_MANAGE
```
`showLearning = canViewLearning(role)`; `showCoreEnterprise` harus menyertakannya. `learningOpen` masuk `SidebarAccordionState` dan hanya terbuka pada path aktif; `isLearningPath()` mencocokkan root + descendant. Panel `id="learning-menu"` dengan `aria-controls`/`aria-expanded`. Label dan href berasal dari satu konstanta domain (`LEARNING_TYPES`) agar sidebar, route, dan `type` database tidak drift.

## G. RBAC
```text
LEARNING_VIEW     → semua role
LEARNING_MANAGE   → Admin (super-application) + Head Office
```
| Permission | Head Office | Management | Project |
|---|---:|---:|---:|
| `LEARNING_VIEW` | ✅ | ✅ | ✅ |
| `LEARNING_MANAGE` | ✅ | ❌ | ❌ |

| Lapisan | Aturan |
|---|---|
| `layout.tsx` | Auth + `LEARNING_VIEW`; redirect `/login` atau `/dashboard` |
| `/dashboard/learning/admin` | `LEARNING_MANAGE`; redirect `/dashboard/learning/sharing` |
| API GET + download | `LEARNING_VIEW` |
| API create/update/delete/reorder/kategori/upload | `LEARNING_MANAGE` |
| UI | Tombol mutasi & submenu Admin hanya untuk manage; UI bukan otorisasi |

`LEARNING_DELETE` tidak dibuat: delete termasuk `LEARNING_MANAGE`, sesuai keputusan “Admin Control khusus Admin/HO”. Permission terpisah baru diperlukan bila kebijakan delete berubah.

## H. Validasi URL Video & Keamanan XSS
### H.1 Normalisasi (server, `src/lib/learning/video.ts`)
1. Trim; tolak spasi/karakter kontrol; panjang ≤ 2048; **wajib `https:`**.
2. Parse dengan `new URL()` dalam `try/catch`; host di-lowercase, `www.` dibuang.
3. Allowlist host: `youtube.com`, `m.youtube.com`, `youtu.be`, `vimeo.com`, `player.vimeo.com`. Host lain (termasuk subdomain tak dikenal) → 400.
4. Ekstrak id dengan regex ketat, bukan pencarian longgar:
   - YouTube: `youtu.be/{id}`, `/watch?v={id}`, `/embed/{id}`, `/shorts/{id}`; id harus `^[A-Za-z0-9_-]{11}$`.
   - Vimeo: `vimeo.com/{id}`, `player.vimeo.com/video/{id}`; id `^[0-9]{1,12}$`.
5. **Bangun ulang** URL kanonik dari konstanta + id: `https://www.youtube.com/embed/{id}` atau `https://player.vimeo.com/video/{id}`. Query/hash/parameter asli dibuang; hanya hasil bangun-ulang yang disimpan.
6. Id tidak valid, URL playlist/channel, atau host tidak dikenal → 400: “URL video harus berupa tautan YouTube atau Vimeo yang valid.”

CHECK §B.1 memvalidasi **bentuk kanonik**, sehingga nilai tetap sah walau ditulis lewat jalur lain.

### H.2 Mengapa ini mencegah XSS
- URL mentah tidak pernah dirender: `src` iframe = template konstan + id yang sudah dicocokkan regex sempit (`[A-Za-z0-9_-]{11}` / `[0-9]{1,12}`), sehingga `"`, `<`, `>`, `'`, `javascript:`, dan `data:` mustahil lolos.
- Tidak ada `dangerouslySetInnerHTML`; judul, deskripsi, nama kategori, dan nama lampiran dirender sebagai teks React (auto-escape). Deskripsi tanpa HTML/Markdown, hanya baris baru.
- `external_url` divalidasi protokol (`http`/`https`) sebelum disimpan dan dirender sebagai `href` dengan `rel="noopener noreferrer"`; `javascript:`/`data:` ditolak Zod **dan** CHECK.
- `thumbnail_url` tidak diterima dari client: server mengambil `url` dari metadata Blob setelah `head()`, sehingga URL arbitrer tidak bisa masuk.
- `Content-Disposition` lampiran memakai helper sanitasi existing; nama file tidak pernah masuk header mentah.
- `X-Frame-Options: DENY` tetap berlaku untuk halaman kita. Saat CSP ditambahkan nanti, `frame-src` harus mengizinkan `https://www.youtube.com https://player.vimeo.com`; `sandbox` pada iframe sebaiknya tidak dipakai (player YouTube butuh script + same-origin) atau dibatasi `allow-scripts allow-same-origin allow-presentation`.

## I. Acceptance Criteria dan Gate
- Tiga tabel baru; tidak ada perubahan tabel existing; `type` immutable.
- Migration `0030_building_learning_center` hanya rancangan pada P3, belum dijalankan.
- Empat submenu tampil (Admin Control hanya untuk manage); root redirect ke `/sharing`.
- Card `training`/`certificate` membuka tab baru; card `sharing` membuka detail internal.
- Detail memutar video via `<iframe>` dari URL kanonik dan mengunduh lampiran via id.
- Thumbnail publik di `cms/learning/`; lampiran privat di `learning/`; pathname tidak pernah ada di response.
- Lampiran hanya untuk `sharing`, dijaga service + composite FK.
- URL non-YouTube/Vimeo, `javascript:`, `data:`, dan URL non-https ditolak 400.
- `LEARNING_VIEW` semua role; `LEARNING_MANAGE` Admin + HO; Management/Project read-only.
- `tsc`, ESLint, test terkait, dan build dijalankan pada P4, bukan P3.

**Status akhir P3:** READY FOR REVIEW. Tidak ada kode implementasi, migration, database write, commit, atau push pada fase ini.
