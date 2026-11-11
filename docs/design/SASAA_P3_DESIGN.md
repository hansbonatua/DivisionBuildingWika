# P3 — Technical Design: Dashboard SASAA & Kelola Foto
**Proyek:** WIBEX — Staff Engineering Digitalisasi Building
**Fase:** P3 — Technical Design · **Tanggal:** 12 November 2026
**Baseline:** `main` @ `eb77e1c`
**Input:** Audit P2 Dashboard SASAA & Kelola Foto + keputusan desain P3
**Status:** Desain selesai — menunggu review Owner/ChatGPT · **P4:** Belum dimulai
> Dokumen ini hanya desain. Tidak ada source code, migration, database, dependency,
> commit, atau push yang diubah. DDL adalah rancangan konseptual, bukan migration
> yang sudah dijalankan.
## A. Executive Summary
Dashboard SASAA adalah executive summary per proyek: header, carousel empat foto,
dan widget MSL, Engineering Database, PDOC, serta Knowledge Management.

| Area | Keputusan |
|---|---|
| Database | Tabel anak `project_photos`, bukan JSONB di `master_projects` |
| Foto | Tepat empat slot 1–4; satu baris per slot |
| Storage | Vercel Blob Public `project-photos/{projectId}/...` |
| API data | `GET /api/dashboard/sasaa/[projectId]` sebagai agregator |
| API foto | Token upload, `GET`, dan `PUT` empat foto atomik |
| Navigasi | `SASAA` dan `Kelola Foto` di bawah Master Project |
| Carousel | Custom `ProjectPhotoCarousel`, auto-play 6000 ms |
| RBAC SASAA | Admin, HO, Management, Project; semua proyek |
| RBAC foto | Admin saja via `MASTER_PROJECT_PHOTOS_MANAGE` |
| MSL | Agregat saja; tanpa record/komponen mentah |
| PDOC | Minggu terisi tahun dokumentasi terbaru, maksimal 60 |
| Dependency | Tidak ada library carousel baru |
**Di luar scope:** lebih dari empat foto, caption panjang, crop editor, versioning
foto, komentar, watermark, dan perubahan data MSL/PDOC/KM/Eng DB.
## B. Requirement Traceability

| ID | Requirement | Keputusan | Bagian |
|---|---|---|---|
| R-SASAA-01/02 | Submenu + empat role | Item sidebar + `PROJECT_ROLE` | F |
| R-SASAA-03/04 | Semua proyek + UI | Tanpa filter PIC + agregator | D–F |
| R-SASAA-05/06 | Carousel + empat foto | Custom carousel + empat slot unik | D–F |
| R-SASAA-07/08 | Foto Admin + public Blob | Permission Admin + reuse CMS | D, F |
| R-SASAA-09/10 | MSL agregat + PDOC | Agregat saja + tahun terbaru | E |
## C. Baseline dan Existing Pattern

| Item | Kondisi |
|---|---|
| HEAD / journal | `eb77e1c` / 26 entry, terakhir `0025_activity_logs` |
| Migration berikutnya | **`0026_project_photos`** |
| `DASHBOARD_SASAA_VIEW` | HO + Management; Admin via super-rule |
| `project_photos` | Belum ada |
| Master Project | Semua role dengan `MASTER_PROJECT_VIEW` melihat semua proyek |
| MSL | `msl_assessments`, unik `(project_id, assessment_month)` |
| Eng DB | `engineering_database_entries`, index `project_id` |
| PDOC | `project_documentations`, unik `(project_id, year, month)` |
| KM | `knowledge_entries`, FK `project_id` |
| Public Blob | `src/lib/storage/public-image.ts`, `CMS_BLOB_READ_WRITE_TOKEN` |
| Upload CMS | `handleUpload` + `access: "public"` |
| Carousel | Belum ada library; Hero/GreenBuilding memakai `setInterval` |
Pola yang dipakai ulang: actor dari sesi, permission terpusat, guard layout,
response `{ data }`/`{ error }`, `Cache-Control: private, no-store`,
`headPublicCmsImage()` untuk verifikasi, dan `deletePublicCmsBlob()` untuk objek
publik. Jangan memakai `deleteBlob` dari wrapper private store.
## D. Database dan Storage
### D.1 ERD
```text
master_projects 1 ──── 0..4 project_photos
users 1 ──── N project_photos (created_by, updated_by)
```
### D.2 Tabel `project_photos`

| Kolom | Tipe | Null | Constraint |
|---|---|---|---|
| `id` | uuid | no | PK, default random |
| `project_id` | uuid | no | FK `master_projects.id`, `ON DELETE CASCADE` |
| `slot` | smallint | no | CHECK 1–4; unik per proyek |
| `blob_url` | text | no | https, maksimal 2048 |
| `blob_pathname` | text | no | UNIQUE; pathname objek publik |
| `alt_text` | text | yes | Maksimal 200 |
| `content_type` | text | no | JPEG/PNG/WEBP/AVIF |
| `size_bytes` | integer | no | 1–5.242.880 |
| `created_by` | uuid | no | FK `users.id`, `NO ACTION` |
| `updated_by` | uuid | yes | FK `users.id`, `SET NULL` |
| `created_at` | timestamptz | no | default `now()` |
| `updated_at` | timestamptz | no | default `now()` |
- `UNIQUE (project_id, slot)` menjamin satu baris per slot dan sekaligus menjadi
  index lookup `project_id` + `ORDER BY slot`.
- `blob_pathname` unik agar satu objek tidak diklaim dua proyek.
- Tepat empat baris tidak dapat dijamin CHECK biasa. Service wajib menerima tepat
  slot `1,2,3,4` dan menyimpannya dalam satu transaksi.
- Baris 1–3 adalah state belum lengkap; SASAA tidak menampilkan carousel final
  sampai `photosComplete = true`.
### D.3 DDL konseptual
```sql
CREATE TABLE project_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  slot smallint NOT NULL,
  blob_url text NOT NULL,
  blob_pathname text NOT NULL UNIQUE,
  alt_text text,
  content_type text NOT NULL,
  size_bytes integer NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_photos_project_slot_unique UNIQUE (project_id, slot),
  CONSTRAINT project_photos_slot_check CHECK (slot BETWEEN 1 AND 4),
  CONSTRAINT project_photos_url_check
    CHECK (blob_url ~ '^https://' AND length(blob_url) <= 2048),
  CONSTRAINT project_photos_pathname_check CHECK (length(btrim(blob_pathname)) > 0),
  CONSTRAINT project_photos_alt_check CHECK (alt_text IS NULL OR length(alt_text) <= 200),
  CONSTRAINT project_photos_content_type_check
    CHECK (content_type IN ('image/jpeg','image/png','image/webp','image/avif')),
  CONSTRAINT project_photos_size_check CHECK (size_bytes BETWEEN 1 AND 5242880)
);
```
### D.4 Migration `0026_project_photos`
- Tambahkan `projectPhotos` dan relasinya di `src/lib/pg/schema.ts`.
- Buat `drizzle/0026_project_photos.sql`: tabel, unique, CHECK, index.
- Update journal menjadi **27 entry** dan snapshot `0026`.
- Tanpa backfill, seed, atau perubahan tabel existing.
- Proyek lama tampil dengan empty state.
- Migration dijalankan pada P4, bukan P3.
- Index KM `knowledge_entries (project_id, knowledge_type)` dapat ditambahkan pada
  migration lanjutan bila query agregat melambat; index saat ini berawalan
  `knowledge_type`, tidak ideal untuk filter `project_id` saja.
### D.5 Storage
Namespace: `project-photos/{projectId}/{uploadUuid}/{slot}-{safeName}`.
- Reuse public store CMS dan `CMS_BLOB_READ_WRITE_TOKEN`.
- Format JPEG/PNG/WEBP/AVIF, maksimal 5 MB.
- Browser upload langsung ke Blob; byte tidak melewati Function.
- Server memverifikasi pathname prefix proyek, URL, MIME, ukuran, dan metadata.
- `allowOverwrite: false`, `addRandomSuffix: false`, token 10 menit.
- Public berarti siapa pun yang memiliki URL dapat mengakses; hanya gunakan foto
  proyek yang tidak sensitif.
- Penggantian foto: commit database dulu, lalu hapus blob lama best-effort.
## E. API Contract
### E.1 Konvensi
- Auth cookie sesi; actor tidak diterima dari body/query.
- Data: `DASHBOARD_SASAA_VIEW`; foto: `MASTER_PROJECT_PHOTOS_MANAGE`.
- ID wajib UUID; proyek tidak ada → 404.
- Response data `Cache-Control: private, no-store`.
- Project role tidak difilter PIC; semua proyek boleh dibaca.
- Error: `{ "error": { "code": "...", "message": "..." } }`.
### E.2 `GET /api/dashboard/sasaa`
Dropdown saja:
```json
{"data":[{"id":"uuid","name":"Gedung A","location":"Jakarta","year":2026,
"pic":{"id":"uuid","name":"Budi"}}]}
```
### E.3 `GET /api/dashboard/sasaa/[projectId]`
```json
{
  "data": {
    "project": {"id":"uuid","name":"Gedung A","location":"Jakarta","year":2026,
      "pic":{"id":"uuid","name":"Budi"}},
    "photos": [
      {"slot":1,"url":"https://...","alt":"Gedung A - foto 1"},
      {"slot":2,"url":"https://...","alt":"Gedung A - foto 2"},
      {"slot":3,"url":"https://...","alt":"Gedung A - foto 3"},
      {"slot":4,"url":"https://...","alt":"Gedung A - foto 4"}
    ],
    "photosComplete": true,
    "metrics": {
      "msl": {"averageScore":4.21,"category":"Baik","assessedMonths":8,"latestMonth":10},
      "engineeringDatabase": {"totalEntries":14,"categoriesCovered":4,"totalCategories":6},
      "pdoc": {"year":2026,"completedWeeks":38,"totalWeeks":60,"documentedMonths":9},
      "knowledge": {"total":12,"lessonLearn":5,"bestPractice":4,"vaVe":3}
    }
  }
}
```
Definisi widget:

| Widget | Definisi |
|---|---|
| MSL | Rata-rata skor kanonis seluruh assessment; kategori dari skor rata-rata; jumlah bulan dinilai; bulan terbaru |
| Eng DB | Jumlah entry dan kategori unik terisi dari 6 kategori |
| PDOC | Minggu terisi pada tahun dokumentasi terbaru, maksimal 5 × 12 = 60 |
| KM | Total entry dan rincian Lesson Learn, Best Practice, VA/VE |
Nilai kosong memakai `null`/`0`, bukan data rekaan. PDOC selalu menyertakan `year`.
### E.4 Query agregator
1. Ambil proyek dengan `getProjectRef(projectId)`; jika tidak ada → 404.
2. Setelah itu jalankan paralel:
```text
Promise.all([photos, aggregateMsl, aggregateEngDb, aggregatePdoc, aggregateKm])
```
Tidak boleh ada query per bulan/kategori/record. MSL mengambil maksimum 12 baris
lalu memakai `computeMslScore`; PDOC maksimum 12 baris per tahun; Eng DB dan KM
memakai `COUNT`/`GROUP BY` di database.
### E.5 Token upload foto
`POST /api/master-project/photos/upload`
Browser memakai `upload(pathname, file, { access: "public", handleUploadUrl,
clientPayload })`; payload minimal `{ "projectId": "uuid", "slot": 1 }`.
Route wajib memeriksa permission Admin, proyek valid, slot 1–4, pathname dalam
namespace proyek, MIME/ukuran, public CMS token, `allowOverwrite: false`,
`addRandomSuffix: false`, dan masa berlaku 10 menit. Error: 400/401/403/503.
### E.6 `GET /api/master-project/[id]/photos`
```json
{"data":{"project":{"id":"uuid","name":"Gedung A"},
"photos":[{"slot":1,"url":"https://...","alt":"Gedung A - foto 1"}],
"photosComplete":false}}
```
### E.7 `PUT /api/master-project/[id]/photos`
Request:
```json
{"photos":[
  {"slot":1,"url":"https://...","pathname":"project-photos/..."},
  {"slot":2,"url":"https://...","pathname":"project-photos/..."},
  {"slot":3,"url":"https://...","pathname":"project-photos/..."},
  {"slot":4,"url":"https://...","pathname":"project-photos/..."}
]}
```
Validasi: permission Admin; UUID dan proyek ada; tepat empat slot unik `1..4`;
semua pathname di namespace proyek; `headPublicCmsImage()` memverifikasi URL,
pathname, MIME, ukuran; pathname tidak diklaim proyek lain; transaksi menghapus
empat baris lama lalu menyisipkan empat baris baru; setelah commit hapus blob lama
best-effort kecuali pathname masih dipakai.
Response `200`:
```json
{"data":{"projectId":"uuid","photosComplete":true,
"updatedAt":"2026-11-12T06:00:00.000Z"}}
```
Error: 401 tanpa sesi; 403 bukan Admin; 404 proyek; 400 slot/path/MIME tidak valid;
409 pathname dipakai; 502/503 storage gagal.
## F. UI, Navigasi, dan RBAC
### F.1 Permission
```text
DASHBOARD_SASAA_VIEW:
  Admin (super-rule), Head Office, Management, Project
MASTER_PROJECT_PHOTOS_MANAGE:
  Admin (super-rule); daftar non-Admin kosong
```
`DASHBOARD_SASAA_VIEW` adalah read model tersendiri. Widget MSL hanya agregat dan
tidak membuka `MSL_VIEW` atau record mentah. Ini pengecualian produk yang harus
disetujui Owner.
### F.2 Sidebar
`masterProjectMenu`:
1. `SASAA` → `/dashboard/master-project/sasaa`
2. `Kelola Project` → `/dashboard/master-project/manage`
3. `Kelola Foto` → `/dashboard/master-project/photos`
Filter SASAA dengan `DASHBOARD_SASAA_VIEW`, Kelola Foto dengan
`MASTER_PROJECT_PHOTOS_MANAGE`, Kelola Project dengan `MASTER_PROJECT_VIEW`.
Jangan memakai literal `role === "Admin"`. Accordion sudah auto-open untuk prefix
`/dashboard/master-project`, jadi tidak perlu state baru.
### F.3 Route dan guard
```text
src/app/dashboard/master-project/sasaa/{layout,page}.tsx
src/app/dashboard/master-project/photos/{layout,page}.tsx
```
Layout SASAA memeriksa `DASHBOARD_SASAA_VIEW`; layout foto memeriksa
`MASTER_PROJECT_PHOTOS_MANAGE`. Belum login → `/login`; tidak berhak → `/dashboard`.
### F.4 Halaman SASAA
```text
┌────────────────────────────────────────────────────────────┐
│ [Dropdown Proyek ▼]  Gedung A · Jakarta · 2026 · PIC: Budi │
├─────────────────────────────────────────┬──────────────────┤
│                                         │ MSL              │
│          Foto Proyek 1/4                │ 4,21 · Baik · 8  │
│          [<]  ● ○ ○ ○  [>]              ├──────────────────┤
│                                         │ Eng DB           │
│                                         │ 14 · 4/6 kategori│
│                                         ├──────────────────┤
│                                         │ PDOC 2026        │
│                                         │ 38/60 · 9 bulan  │
│                                         ├──────────────────┤
│                                         │ KM               │
│                                         │ 12 · 5/4/3       │
└─────────────────────────────────────────┴──────────────────┘
```
Komponen: `SasaaPage` (client page, dropdown, fetch, loading/error),
`ProjectHeader`, `ProjectPhotoCarousel`, `SasaaStatsGrid`, `SasaaStatCard`, dan
`SasaaSkeleton`. Grid widget 1 kolom mobile, 2 tablet, 4 desktop.
### F.5 `ProjectPhotoCarousel`
- Empat slide diurutkan `slot`; auto-play `setInterval` 6000 ms.
- Reset timer setelah navigasi manual.
- Tombol previous/next, empat indikator, hitungan `01/04`.
- Pause saat hover/focus; lanjut saat keluar/blur.
- `prefers-reduced-motion: reduce` → tanpa auto-play, navigasi manual tetap.
- Cleanup interval saat unmount/proyek berubah.
- Remote Blob memakai `<img>` seperti Hero/GreenBuilding; tanpa `remotePatterns`.
- Alt fallback `"<nama proyek> - foto <slot>"`; tidak ada slide rekaan.
### F.6 Empty state

| Kondisi | Tampilan |
|---|---|
| Foto < 4 | “Foto proyek belum lengkap (2/4)” + CTA Admin |
| Tidak ada foto | “Belum ada foto proyek” + CTA Admin |
| API gagal | “Data proyek gagal dimuat” + Coba lagi |
| Tidak ada proyek | “Belum ada Master Project” |
| MSL kosong | `—` + “Belum ada penilaian MSL” |
| PDOC kosong | `0/60` + “Belum ada dokumentasi tahun ini” |
| KM/Eng DB kosong | `0` + label kosong |
Foto parsial hanya tampil di Kelola Foto, bukan sebagai carousel final SASAA.
### F.7 Halaman Kelola Foto
Dropdown proyek; empat slot upload dengan preview, nama file, dan tombol ganti;
tombol `Simpan 4 Foto` aktif hanya jika keempat slot terisi; progress/error per
slot; upload langsung ke Blob Public; simpan metadata setelah semua selesai;
client membersihkan blob baru jika `PUT` gagal.
## G. Integrasi `deleteMasterProject`
1. Sebelum transaksi, ambil `project_photos.blob_pathname` proyek.
2. Jalankan transaksi delete seperti sekarang.
3. Jika ditolak FK modul lain, rollback dan jangan hapus blob.
4. Jika berhasil, baris foto ikut cascade.
5. Setelah commit, hapus blob best-effort dengan `deletePublicCmsBlob`.
6. Jangan hapus pathname yang masih dirujuk baris lain.
7. Kegagalan blob hanya dicatat; delete database tetap sukses.
8. Blob yang tertinggal dapat dibersihkan oleh sweep orphan berkala.
Penggantian foto memakai urutan sama: commit database dahulu, lalu hapus blob lama.
## H. File Impact dan Acceptance Criteria

| Area | File |
|---|---|
| Schema/migration | `src/lib/pg/schema.ts`, `drizzle/0026_project_photos.sql`, journal, snapshot |
| Storage | helper pathname/verifikasi foto; reuse `public-image` |
| Repository/service | `src/lib/project-photos/*` |
| SASAA read model | `src/lib/sasaa/{repository,service,access}.ts` |
| API | `src/app/api/dashboard/sasaa/**`, `src/app/api/master-project/**/photos/**` |
| RBAC/sidebar | `src/lib/auth/permissions.ts`, `DashboardSidebar.tsx` |
| UI | `src/app/dashboard/master-project/{sasaa,photos}/**`, komponen terkait |
| Test | unit pathname/agregasi/DTO, route auth, carousel reducer murni |
Acceptance criteria:
- [ ] Migration `0026_project_photos` membuat tabel, unique slot, CHECK, index.
- [ ] Hanya Admin dapat melihat menu dan mengakses endpoint foto.
- [ ] `PUT` menolak request yang bukan tepat empat slot.
- [ ] Semua foto diverifikasi ke public Blob sebelum disimpan.
- [ ] Project role melihat semua proyek pada dropdown SASAA.
- [ ] Agregator lookup proyek lalu query paralel, tanpa N+1.
- [ ] MSL hanya agregat; PDOC menyertakan tahun dan 38/60.
- [ ] Carousel 6000 ms dan menghormati `prefers-reduced-motion`.
- [ ] Foto kurang dari empat menampilkan empty state.
- [ ] Delete database gagal tidak menghapus blob; delete sukses membersihkan blob.
- [ ] `tsc`, ESLint, test, dan `git diff --check` PASS pada P4.
## I. Risks dan Open Decisions

| Risiko | Mitigasi |
|---|---|
| Project melihat agregat MSL | Hanya average/category/months; persetujuan Owner |
| PDOC tahun beda dari proyek | Selalu tampilkan `pdoc.year` |
| Empat foto tidak dijamin CHECK | Validasi service + unique slot + empty state |
| Foto publik dapat diakses via URL | Hanya foto non-sensitif; Admin-only upload |
| Blob orphan | Delete setelah commit + sweep berkala |
| Pathname salah proyek | Prefix projectId + verifikasi `head` + unique |
| KM query per proyek | Index lanjutan `(project_id, knowledge_type)` |
| Dua Admin mengedit bersamaan | Transaksi replace + refresh; versioning di luar V1 |
**Open decision non-blocking:** foto parsial hanya terlihat di Kelola Foto, dan
sweep orphan dijalankan manual pada V1.
