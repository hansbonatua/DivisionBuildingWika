# P2 — Existing System Audit: Calculation Sheet Template (CST)

**Proyek:** WIBEX — Staff Engineering Digitalisasi Building
**Fase:** P2 — Existing System Audit (read-only)
**Tanggal:** 2026-11-09
**Baseline:** `main` @ `c053c48` (MKS P4 dan dokumentasi RBAC sudah ter-commit)
**Status:** Audit selesai — menunggu review Owner/ChatGPT
**P3:** Belum dimulai

---

## 0. Ruang Lingkup dan Metode

Dokumen ini memetakan pola implementasi existing yang dapat di-reuse untuk Calculation
Sheet Template (CST). Audit dilakukan **hanya dengan membaca source code**; tidak ada
source, migration, `schema.ts`, database, API, UI, atau runtime yang diubah/dijalankan.
Satu-satunya artefak dari fase ini adalah dokumen ini.

**Temuan awal:** belum ada kode CST di repo. Pencarian `calculation` (case-insensitive)
hanya menemukan komentar helper Program Kerja (`src/lib/program-kerja/summary.ts:1`).
CST sepenuhnya greenfield; yang tersedia adalah pola, bukan modul setengah jadi.

Referensi ditulis sebagai `path:line` atau `path:rentang-baris`. Nomor baris mengacu pada
`c053c48`; seluruh pekerjaan MKS P4 sudah ter-commit, sehingga baris MKS pada dokumen ini
stabil terhadap HEAD.

### Ringkasan aturan P1 yang menjadi acuan audit

| Aspek | Aturan final P1 |
|---|---|
| Kategori | 7 hardcoded, **tanpa angka prefix**: Arsitektur, Struktur, Infrastruktur, Geoteknik, Green Building, MEEP, Lainnya |
| Bentuk tabel | Flat, header kategori `colSpan` penuh |
| Mekanisme UI | **100% inline table editing** (pola MSL), tanpa modal form |
| Field | Kode (bebas), Nama, PIC (single-select Head Office), Link Evidence (URL ≤ 2048), Catatan |
| Upload file | **Tidak ada** (hanya URL) |
| RBAC | Admin & Head Office = full CRUD; Management & Project = read-only |

---

## A. Executive Summary

### A.1 Pola yang dapat di-reuse (reuse tinggi)

| Pola | Sumber | Nilai untuk CST |
|---|---|---|
| State machine inline editing per baris (unassessed → editing → saved) | `MslEngineeringPage.tsx:68-69, 253-410`; `MslTable.tsx:4-16` | **Tinggi** — inti mekanisme yang diminta P1 |
| Draft + validasi + payload terpisah dari komponen | `msl-draft.ts:29-160` | **Tinggi** — pure, mudah diuji tanpa DOM |
| Plumbing route: actor sesi, parse body, mapping domain error | `src/app/api/metode-kerja-standar/_helpers.ts` (seluruh file) | **Tinggi** — paling lengkap (401/403/404/409/400 + SQLSTATE) |
| Validasi URL evidence 2048 + http/https | `src/lib/metode-kerja-standar/schema.ts:10-22, 44-58`; `MetodeKerjaFormDialog.tsx:64, 317-323` | **Tinggi** — persis kebutuhan field CST |
| Tampilan evidence sebagai link keluar | `MetodeKerjaTable.tsx:173-186` | **Tinggi** (read-only mode) |
| PIC Head Office: sumber opsi + label `(non-aktif)` | `src/app/api/metode-kerja-standar/pic-options/route.ts`; `service.ts:744-755`; `PicMultiSelect.tsx:66-67` | **Tinggi** untuk data; komponennya multi-select, bukan single |
| Kategori hardcoded: constants + labels + slug + sidebar map | `src/lib/metode-kerja-standar/constants.ts:1-63`; `DashboardSidebar.tsx:206-241`; `src/lib/engineering-database/access.ts:8-63` | **Tinggi** — dua varian yang bisa dipilih |
| Tabel flat per kategori + konstanta kategori | `EngineeringDatabaseTable.tsx`; `EngineeringDatabaseEditor.tsx:555` | **Sedang-tinggi** — flat, tetapi edit lewat halaman form |
| Sidebar accordion top-level + submenu | `DashboardSidebar.tsx:220-241, 325-421, 725-770` | **Tinggi** |
| Guard berlapis: layout redirect → flag server page → API | `app/dashboard/metode-kerja-standar/layout.tsx:8-21`; `[disiplin]/page.tsx:28-37` | **Tinggi** |
| Permission registry terpusat + super-rule Admin | `src/lib/auth/permissions.ts:24-127` | **Tinggi** |
| Audit fields + CHECK/unique index Drizzle | `src/lib/pg/schema.ts:764-899` (MKS); `:596-682` (MSL) | **Tinggi** |

### A.2 Yang perlu dibuat baru

| Kebutuhan CST | Kondisi existing | Dampak |
|---|---|---|
| Tabel inline editing dengan **create** baris kosong di dalam tabel | MSL punya inline create, tetapi barisnya berasal dari Master Project (bukan record baru buatan user) | Komponen state baru bergaya MSL |
| PIC **single-select** di dalam sel tabel | MKS/KM hanya multi-select di modal; Engineering DB memakai `<select>` di halaman form | Komponen kecil baru (`<select>` sel) |
| Kategori 7 tanpa angka + header `colSpan` penuh | MKS 6 disiplin berkode A–F dan 3 level; Engineering DB 6 kategori berkode UPPER_SNAKE | Constants + renderer baru, pola reuse |
| Skema flat 1 tabel tanpa child | Belum ada tabel CST | Migration baru |
| API POST/PUT/DELETE per record untuk tabel flat | MKS punya shape serupa tetapi berjenjang | Route baru di namespace sendiri |
| Permission namespace CST | Belum ada | 2 permission + access helper |

### A.3 Kesimpulan

1. **Mekanisme UI** tidak perlu dirancang dari nol: MSL sudah memecahkan masalah tersulit —
   satu baris diedit pada satu waktu, draft terpisah dari data server, tombol Simpan/Batal
   per baris, dan error per baris. CST hanya perlu mengganti sumber baris (record sendiri,
   bukan Master Project) dan menambahkan tombol tambah baris.
2. **Plumbing API & validasi** paling matang ada di MKS: `_helpers.ts` memetakan seluruh
   kelas error ke status HTTP yang benar, dan schema URL evidence (≤ 2048, http/https,
   string kosong → `NULL`) bisa dipakai hampir apa adanya.
3. **Kategori hardcoded + sidebar** sudah punya dua pola: MKS (kode + slug + label di
   `SidebarItem[]`) dan Engineering DB (kode UPPER_SNAKE + label + slug). Untuk CST yang
   tanpa angka prefix, pola Engineering DB lebih dekat, tetapi sidebar MKS lebih dekat
   karena submenu dibangun dari satu array konstanta.
4. **Tidak ada** modal form, upload file, reorder, PDF, atau summary di P1 — semuanya
   sebaiknya tidak dibangun pada P3 agar scope tetap sesuai requirement.

---

## B. Audit A — Tabel Inline Editing (Referensi: MSL)

### B.1 Peta file

| File | Peran |
|---|---|
| `src/components/dashboard/msl/MslEngineeringPage.tsx` | Pemilik state: fetch, draft, simpan, hapus, guard perubahan belum tersimpan |
| `src/components/dashboard/msl/MslTable.tsx` | Presentational table; tiga status baris; input/textarea; tombol per baris |
| `src/components/dashboard/msl/msl-draft.ts` | Pure helper: parse komponen, preview, payload create/update |
| `src/lib/msl/schema.ts` | Kontrak Zod create/update (strict) |
| `src/app/api/msl/assessments/route.ts` | `POST` create |
| `src/app/api/msl/assessments/[id]/route.ts` | `PATCH` update, `DELETE` |
| `src/app/api/msl/_helpers.ts` | Actor, parse body, mapping domain error |

### B.2 Bagaimana state dikelola

MSL **tidak** memberi setiap baris state edit tersendiri. Ada satu state edit global dan
satu map draft untuk baris baru:

```ts
// MslEngineeringPage.tsx:68-70
const [editing, setEditing] = useState<MslEditingState | null>(null);
const [createDrafts, setCreateDrafts] = useState<Record<string, MslDraft>>({});
const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
```

- `MslEditingState` = `{ projectId, assessmentId, draft, initial, error }` — memuat nilai
  awal (`initial`) untuk deteksi dirty dan pembatalan.
- **Hanya satu baris tersimpan boleh diedit** pada satu waktu; selama edit terbuka, kontrol
  baris lain `disabled` (`MslTable.tsx`, `anotherRowEditing`). Alasannya eksplisit di
  komentar file: mencegah draft hilang.
- Baris **belum punya record** memakai `createDrafts[projectId]` (map), sehingga beberapa
  baris baru boleh punya isian bersamaan, tetapi hanya satu baris tersimpan yang boleh
  masuk mode edit.
- `busyProjectId` memblokir semua mutasi lain selama satu request berjalan.
- Deteksi perubahan belum tersimpan: `draftEquals` + `isEmptyDraft` (`msl-draft.ts:88-116`),
  dipakai untuk konfirmasi `window.confirm` saat ganti periode.

Handler utama (`MslEngineeringPage.tsx`):

| Handler | Baris | Perilaku |
|---|---|---|
| `handleStartEdit` | 253 | Tolak jika ada draft create; set `editing` dari `toMslDraft(assessment)` |
| `handleEditDraftChange` | 276 | Patch partial draft, reset error |
| `handleCreateDraftChange` | 282 | Patch map draft baris baru, reset error baris itu |
| `handleSaveEdit` | 290 | Validasi → `PATCH /api/msl/assessments/{id}` → ganti baris dari response |
| `handleSaveNew` | 329 | Validasi → `POST /api/msl/assessments` → isi `assessment` baris |
| `handleDelete` | 375 | `window.confirm` → `DELETE` → set `assessment: null` |

Catatan penting: **tidak ada optimistic update**. Response server yang menjadi sumber
kebenaran; baris diganti dari DTO yang dikembalikan API (`applyAssessment`).

### B.3 Validasi dan save per baris

- Validasi murni ada di `msl-draft.ts`: `parseMslComponentInput` (range + maks 2 desimal),
  `previewMslDraft` (skor/kategori live), `draftToCreatePayload` / `draftToUpdatePayload`
  (mengembalikan `null` bila tidak valid, sehingga tidak ada payload parsial yang dikirim).
- Pesan gagal validasi disimpan di `editing.error` atau `createErrors[projectId]`, lalu
  dirender tepat di bawah input baris tersebut (`MslTable.tsx`, `rowError`).
- Error HTTP diambil dari body `{ error: { message } }` lewat `readErrorMessage`
  (`MslEngineeringPage.tsx:28-45`) dengan fallback 401/403.
- Kontrak server strict: field identitas/derived ditolak, bukan dibuang (`src/lib/msl/schema.ts`,
  `createMslAssessmentSchema`/`updateMslAssessmentSchema`).

### B.4 Tombol Simpan/Batal per baris

MSL memakai tombol teks, bukan ikon 💾:

- Mode edit: `Simpan` (primary) + `Batal` (ghost), keduanya `disabled` saat `isBusy`
  (`MslTable.tsx`, blok `isEditingRow`).
- Baris baru: satu tombol `Simpan`; `disabled` bila ada baris lain diedit, ada request
  berjalan, atau periode sedang refresh. Ada `title` yang menjelaskan alasannya.
- Baris tersimpan (bukan edit): `Edit` + `Hapus`, hanya untuk `canManage`; read-only role
  tidak menerima tombol sama sekali.

Tombol aksi MKS punya konvensi visual yang lebih ringkas dan konsisten untuk tabel padat:
`h-7`, `shrink-0`, `text-[11px]`, `rounded-md`, border tipis (`MetodeKerjaTable.tsx`,
konstanta `actionButton`/`actionCell` di blok atas `EvidenceCell`). Untuk CST yang seluruh
barisnya bisa diedit, konvensi MKS ini lebih cocok daripada tombol MSL yang lebih besar.

### B.5 Tiga status baris (referensi render)

`MslTable.tsx:4-16` mendokumentasikan tiga status:

1. **unassessed** → input inline + `Simpan` (hanya manage role).
2. **saved** → nilai read-only + `Edit`/`Hapus`.
3. **editing** → input inline + `Simpan`/`Batal`, plus preview turunan.

CST tidak punya konsep "belum dinilai per periode", sehingga pemetaannya menjadi:

| Status CST | Padanan MSL |
|---|---|
| Baris tersimpan, belum diedit | `saved` |
| Baris tersimpan, sedang diedit | `editing` (satu per satu) |
| Baris baru (draft) | `unassessed` + `createDrafts` |
| Baris baru yang sudah dikirim | hilang dari draft, muncul sebagai `saved` |

### B.6 Adaptasi yang diperlukan untuk CST

1. **Sumber baris** bukan Master Project, melainkan record CST sendiri; karena itu
   `projectId` diganti `id` record dan draft create tidak butuh parent.
2. **Tambah baris** perlu afordans eksplisit per kategori ("+ Baris") yang menyisipkan
   draft kosong; MSL tidak punya tombol ini karena baris sudah ada.
3. **Kategori** melekat pada record, bukan pada baris tabel; draft create harus membawa
   kategori dari header tempat tombol ditekan.
4. **Validasi** tidak butuh skor/kategori turunan; hanya kode, nama, PIC, URL, catatan.
5. **Read-only role** tidak boleh menerima input/draft sama sekali (P1: Management & Project
   read-only) — cukup render nilai seperti status `saved`.

### B.7 Rekomendasi bentuk state (untuk P3, bukan implementasi)

```ts
// Satu baris diedit pada satu waktu, draft create per kategori.
type CstEditingState = { id: string; draft: CstDraft; initial: CstDraft; error: string | null };
const [editing, setEditing] = useState<CstEditingState | null>(null);
const [createDrafts, setCreateDrafts] = useState<Record<CstKategori, CstDraft | undefined>>({});
const [createErrors, setCreateErrors] = useState<Partial<Record<CstKategori, string>>>({});
const [busyId, setBusyId] = useState<string | null>(null);
```

Alasan memilih satu draft create **per kategori** (bukan map per baris): tombol tambah
hanya satu per kategori, dan ini mencegah puluhan baris kosong menggantung.

---

## C. Audit B — PIC Single-Select, URL Evidence, API & Error Mapping

### C.1 PIC inline

**Yang ada sekarang:**

| Implementasi | Lokasi | Bentuk |
|---|---|---|
| PIC multi-select MKS | `PicMultiSelect.tsx:39-67` | Search + checkbox list, dipakai di modal; opsi dari API |
| Opsi PIC MKS | `src/app/api/metode-kerja-standar/pic-options/route.ts`; `service.ts:744-755` | `GET`, hanya `assertManageActor`, mengembalikan `user_id/name/status/position` |
| Eligibility PIC | `src/lib/metode-kerja-standar/access.ts:44-50` | **Role-only** (Head Office), status suspended tetap eligible |
| Label opsi | `PicMultiSelect.tsx:66-67` | `status === "active" ? name : \`${name} (non-aktif)\`` |
| `<select>` native di editor | `EngineeringDatabaseEditor.tsx:555`; `ProgramKerjaForm.tsx:269` | Dropdown form, bukan sel tabel |
| Combobox single-select searchable | `EngineeringDatabaseProjectCombobox.tsx:48, 188, 261-283` | `role="combobox"` + listbox + keyboard highlight; dipakai di halaman, bukan sel tabel |

**Kesimpulan:** belum ada komponen PIC **single-select inline** di repo. Tidak ada gunanya
memaksa `PicMultiSelect` (multi + search + modal) ke dalam sel; terlalu berat dan semantics
berbeda. Rekomendasi: komponen kecil baru di atas `<select>` native, dengan kelas yang sama
dengan input MSL (`h-8 rounded border border-outline/60 ... text-xs`) agar konsisten dengan
sel tabel lain. Data tetap dari endpoint `pic-options` yang di-reuse polanya.

Aturan yang perlu dipertahankan:

- Opsi hanya Head Office; suspended tetap muncul dengan label `(non-aktif)`.
- Satu PIC saja (P1), sehingga simpan sebagai `pic_user_id` UUID tunggal — **bukan** tabel
  pivot seperti `metode_kerja_pic`.
- Validasi server wajib: user harus ada dan role-nya Head Office (jangan percaya UI).
- Endpoint opsi sebaiknya tetap manage-gated (seperti MKS), karena hanya manage role yang
  membuka mode edit; read-only role hanya menampilkan nama PIC dari DTO.

### C.2 URL evidence

**Sumber validasi (MKS):**

| Lapisan | Lokasi | Aturan |
|---|---|---|
| Helper murni | `src/lib/metode-kerja-standar/schema.ts:10-22` | `new URL()` + protocol `http:`/`https:` |
| Field Zod | `src/lib/metode-kerja-standar/schema.ts:44-58` | trim, maks 2048, kosong diizinkan, kosong → `NULL` |
| Konstanta UI | `MetodeKerjaFormDialog.tsx:64` | `URL_MAX = 2048` |
| Validasi submit | `MetodeKerjaFormDialog.tsx:317-323` | dua pesan terpisah: terlalu panjang vs skema salah |
| Ekstraksi error API | `MetodeKerjaFormDialog.tsx:80-99` | `details` per field → pesan pertama, lalu `error.message` |
| Render error | `MetodeKerjaFormDialog.tsx:595, 614` | **satu banner form-level** di bawah field, bukan per-field |
| CHECK database | `src/lib/pg/schema.ts:764-899` | `evidence_url is null or evidence_url ~ '^https?://'` |
| Tampilan link | `MetodeKerjaTable.tsx:173-186` | `max-w-[200px] truncate`, `target="_blank"`, `rel="noopener noreferrer"`, `title=url` |

**Yang perlu diperbaiki untuk CST (inline):** pesan error MKS hanya satu di level form.
Pada tabel inline, error harus **per baris** seperti MSL (`rowError` di bawah input baris
yang gagal), agar user tahu baris mana yang salah ketika beberapa baris terlihat sekaligus.
Rekomendasi: tampilkan error di bawah sel URL baris tersebut, dan pertahankan aturan
trim/≤2048/http(s)/kosong → `NULL` apa adanya.

**Tidak ada upload/blob:** P1 eksplisit. Jangan menambah storage key, `blob_pathname`, atau
endpoint unggah; jangan reuse pola `organization_structure`/Template & Form.

### C.3 API route dan error mapping

**MKS (paling lengkap)** — `src/app/api/metode-kerja-standar/_helpers.ts`:

| Input error | Response |
|---|---|
| `UnauthenticatedError` | `401 { error: { message: "Unauthenticated" } }` |
| `MetodeKerjaForbiddenError` | `403` pesan domain |
| `MetodeKerjaNotFoundError` | `404` |
| `MetodeKerjaConflictError` | `409` |
| `MetodeKerjaValidationError` | `400` |
| `ZodError` | `400` + `details: flatten().fieldErrors` (pesan issue pertama) |
| unique violation (23505) | `409` "Data dengan kode tersebut sudah ada" |
| FK violation (23503/23501) | `409` "Data terkait sudah tidak tersedia" |
| CHECK violation (23514) | `400` "Data tidak memenuhi aturan database" |
| lainnya | `500`, di-`console.error` dengan label route |

Semua response memakai `Cache-Control: no-store`. `getActor()` selalu dari sesi server
(`requireUser`), tidak pernah dari body/query.

**Bentuk route MKS yang relevan:**

| Route | Method | Catatan |
|---|---|---|
| `[disiplin]/route.ts` | `GET` | Detail satu disiplin |
| `[disiplin]/sub-kategori/route.ts` | `POST` | Create child; parent dari URL |
| `sub-kategori/[id]/route.ts` | `PUT`, `DELETE` | Update/hapus per record |
| `item/[id]/route.ts` | `PUT`, `DELETE` | Pola per-record yang persis dibutuhkan CST |
| `pic-options/route.ts` | `GET` | Opsi PIC |
| `reorder/route.ts` | `POST` | **Tidak dibutuhkan CST** (tidak ada reorder di P1) |

**Perbedaan MSL** (`src/app/api/msl/_helpers.ts`, `assessments/route.ts`,
`assessments/[id]/route.ts`):

- `getActor()` mengembalikan union `{ actor } | { response }` (401 dibuat di helper),
  bukan melempar error seperti MKS.
- `mapDomainError` hanya memetakan 4 error domain; Zod di-parse di route masing-masing.
- Response **tidak** memakai header `Cache-Control: no-store`.
- `PATCH` menerima patch parsial + guard "body tidak boleh kosong".

**Rekomendasi CST:** ikuti MKS, bukan MSL, karena (a) mapping SQLSTATE-nya lengkap dan
relevan untuk unique kode + FK PIC, (b) `no-store` penting untuk data master yang sering
diedit, (c) `parseJsonBody(request, schema)` menghilangkan duplikasi parse Zod di setiap
route.

Usulan kontrak (detail final di P3):

| Endpoint | Method | Body | Sukses |
|---|---|---|---|
| `/api/calculation-sheet-template` | `GET` | — | `200 { data: rows[] }` |
| `/api/calculation-sheet-template` | `POST` | `kategori, kode, nama, pic_user_id, evidence_url, catatan` | `201 { data: row }` |
| `/api/calculation-sheet-template/[id]` | `PUT` | field sama **tanpa** `kategori` (immutable) | `200 { data: row }` |
| `/api/calculation-sheet-template/[id]` | `DELETE` | — | `200 { data: { deleted: true, id } }` |
| `/api/calculation-sheet-template/pic-options` | `GET` | — | `200 { data: options[] }` |

Catatan: `kategori` sebaiknya **create-only** (immutable setelah dibuat), mengikuti pola
`category` Engineering Database (`src/lib/engineering-database/schema.ts:40-63`). Memindah
kategori = hapus + buat, bukan `PUT`.

---

## D. Audit C — Database (rekomendasi skema flat)

### D.1 Konvensi existing yang harus diikuti

Dari `src/lib/pg/schema.ts` (MKS `:764-899`, MSL `:596-682`, Engineering DB):

- PK `uuid().primaryKey().defaultRandom()`.
- Audit: `created_by` **NOT NULL** + `ON DELETE no action` (authorship), `updated_by`
  **nullable** + `ON DELETE set null` (last-touch), `created_at`/`updated_at`
  `timestamp with time zone` default `now()`.
- Kode dinormalisasi uppercase oleh service (`normalizeKode`, `service.ts`), dan unique
  index memakai `lower(btrim(kode))` agar bentrok case/whitespace tertangkap database.
- URL: CHECK `~ '^https?://'`; catatan: CHECK `length <= 2000`.
- `sort_order` + index `(parent, sort_order, id)` hanya dipakai modul yang punya reorder.

### D.2 Rekomendasi tabel tunggal

Nama: **`calculation_sheet_templates`** (plural, mengikuti `metode_kerja_*`).

| Kolom | Tipe | Null | Catatan |
|---|---|---|---|
| `id` | `uuid` | no | PK, `defaultRandom()` |
| `kategori` | `text` | no | Salah satu dari 7 nilai kanonik |
| `kode` | `text` | no | 1–30 karakter setelah trim |
| `nama` | `text` | no | 1–200 karakter |
| `pic_user_id` | `uuid` | no | FK `users.id`, `ON DELETE no action` (user PIC tidak boleh hilang diam-diam) |
| `evidence_url` | `text` | yes | ≤ 2048, CHECK `^https?://` |
| `catatan` | `text` | yes | ≤ 2000 |
| `created_by` | `uuid` | no | FK users, `no action` |
| `updated_by` | `uuid` | yes | FK users, `set null` |
| `created_at` | `timestamptz` | no | `defaultNow()` |
| `updated_at` | `timestamptz` | no | `defaultNow()`, di-set service saat update |

Constraint & index yang direkomendasikan:

| Nama (usulan) | Definisi | Alasan |
|---|---|---|
| `calculation_sheet_templates_kategori_check` | `kategori in ('ARSITEKTUR','STRUKTUR','INFRASTRUKTUR','GEOTEKNIK','GREEN_BUILDING','MEEP','LAINNYA')` (atau label; lihat D.3) | Kategori hardcoded, bukan tabel master |
| `calculation_sheet_templates_kode_check` | `length(btrim(kode)) between 1 and 30` | Sama dengan MKS |
| `calculation_sheet_templates_url_check` | `evidence_url is null or evidence_url ~ '^https?://'` | Sama dengan MKS |
| `calculation_sheet_templates_catatan_check` | `catatan is null or length(catatan) <= 2000` | Sama dengan MKS |
| unique index `..._kategori_kode_unique` | `(kategori, lower(btrim(kode)))` | Kode unik per kategori — lihat OQ-02 |
| index `..._kategori_idx` | `(kategori)` | Listing per kategori |
| index `..._pic_user_idx` | `(pic_user_id)` | Lookup PIC |
| index `..._created_by_idx`, `..._updated_by_idx` | masing-masing | Konsisten dengan modul lain |

**Yang sengaja TIDAK dibuat:**

- `sort_order` — P1 tidak meminta reorder. Urutan tampil: urutan kategori kanonik, lalu
  `kode` (atau `nama`).
- Tabel child/PIC pivot — PIC tunggal cukup satu kolom FK.
- `version`/optimistic concurrency — tidak dipakai MKS maupun MSL; lihat OQ-06.
- `blob_pathname`/storage key — tidak ada upload.
- Soft delete — MKS memakai hard delete + konfirmasi.

### D.3 Penyimpanan kategori: label vs kode

| Opsi | Kelebihan | Kekurangan |
|---|---|---|
| Simpan **kode** (`ARSITEKTUR`, `GREEN_BUILDING`, …) + label di constants | Stabil, tidak perlu migration saat copy berubah; CHECK sederhana; sama dengan pola Engineering DB | Perlu mapping label di UI |
| Simpan **label** (`Arsitektur`, `Green Building`, …) | Tidak perlu mapping; kategori langsung terbaca di DB | Perubahan copy = migration; rawan beda kapitalisasi |

**Rekomendasi:** simpan kode kanonik, label + slug di
`src/lib/calculation-sheet-template/constants.ts`. Ini juga membuat deep-link anchor
sidebar (`#green-building`) stabil.

### D.4 Uniqueness kode

P1 menyebut kode "bebas tanpa prefix kategori". Belum jelas apakah kode harus unik global
atau per kategori. Rekomendasi awal: **unik per kategori** (pola MKS per disiplin), karena
tanpa prefix dua kategori sangat mungkin memakai kode yang sama (`A.1`, `01`). Ini keputusan
bisnis — masuk OQ-02.

### D.5 Proses migration (untuk P3)

- Journal saat ini **17 entry** (`0000`–`0016`); migration berikutnya `0017`.
- Perubahan `schema.ts` → `npx drizzle-kit generate` (jangan menulis `_journal.json` manual).
- `psql` tidak tersedia di environment ini; apply migration harus lewat prosedur existing
  (`drizzle-kit migrate` dengan `DIRECT_URL`, lihat `docs/audit/13`).
- P3 harus menulis rollback (`DROP TABLE`) dan menyatakan migration **belum dijalankan**
  sampai ada otorisasi.

---

## E. Audit E — Sidebar, Kategori Hardcoded, dan RBAC

### E.1 Pola kategori hardcoded

**MKS** — `src/lib/metode-kerja-standar/constants.ts:1-63`:

```ts
export type Disiplin = { code: "A" | ...; slug: string; name: string; sortOrder: number };
export const DISIPLIN_LIST: Disiplin[] = [ ... ];
```

- Satu array menjadi sumber untuk: validasi kode (`isDisiplinCode`), lookup (`getDisiplinByCode`/
  `BySlug`), dan sidebar (`DashboardSidebar.tsx:220-241` memetakan `DISIPLIN_LIST`).
- Komentar file menegaskan: konstanta aplikasi, **bukan** seed database; `F. Lainnya`
  selalu ada.
- UI menampilkan `${code}. ${name}`; CST **tidak** boleh meniru prefix angka/kode ini
  (P1: tanpa angka prefix).

**Engineering DB** — `src/lib/engineering-database/access.ts:8-63`:

- Tiga map: `ENGINEERING_DATABASE_CATEGORIES` (kode), `..._LABELS`, `..._SLUGS`.
- Helper `engineeringDatabaseCategoryFromSlug` mengembalikan `null` untuk slug tak dikenal
  sehingga page bisa `notFound()`.

**Rekomendasi CST:** satu file constants berisi array objek
`{ code, label, slug }` (7 item) + helper `isCstKategori`, `cstKategoriBySlug`,
`cstKategoriByCode`. Ini lebih ringkas daripada tiga map terpisah dan cukup untuk 7 item
statis.

### E.2 Mekanisme sidebar (file:line)

| Bagian | Lokasi | Keterangan |
|---|---|---|
| Definisi menu KM | `DashboardSidebar.tsx:173-205` | Array `SidebarItem[]` top-level lain |
| Definisi menu MKS | `DashboardSidebar.tsx:206-241` | Summary + map `DISIPLIN_LIST` |
| Helper path | `DashboardSidebar.tsx:243-253` | `isMetodeKerjaPath` |
| Tipe visibility | `DashboardSidebar.tsx:325-340` | `showProgramKerja`, `showKnowledgeManagement`, `showMetodeKerja`, … |
| `getSidebarVisibility` | `DashboardSidebar.tsx:342-380` | Memanggil access helper per modul; `showCoreEnterprise` = OR seluruh modul |
| Accordion state | `DashboardSidebar.tsx:383-421` | Setiap modul punya flag; initial state route-driven |
| State komponen | `DashboardSidebar.tsx:461-470` | `useState` dari initial accordion |
| Render accordion MKS | `DashboardSidebar.tsx:725-770` | Tombol `aria-expanded`/`aria-controls` + `<nav aria-label>` dari array |

**Langkah menambah CST** (mengikuti pola ini): tambah `calculationSheetMenu` (7 item),
`isCalculationSheetPath`, `showCalculationSheet` + masukkan ke `showCoreEnterprise`,
`calculationSheetOpen` + initial state, lalu blok render accordion yang identik dengan MKS.

### E.3 7 submenu vs satu halaman

P1 meminta **dua hal yang bisa dibaca berbeda**:

1. "Tabel Flat dengan Header Kategori membentang penuh (`colSpan`)" → satu tabel dengan
   7 header kategori.
2. "Menambah menu di sidebar dengan 7 submenu" → 7 entri navigasi.

Opsi:

| Opsi | Bentuk | Konsekuensi |
|---|---|---|
| **A. Satu halaman + 7 anchor** | Satu page merender 7 section; submenu sidebar menuju `#slug` | Satu fetch, satu state edit, inline tambah per kategori; anchor mulus; tidak ada duplikasi kode |
| **B. Tujuh route** | `/dashboard/calculation-sheet-template/[kategori]` | Isolasi per kategori, tetapi 7 halaman + guard + fetch berulang untuk data yang sama |
| **C. Satu halaman tanpa submenu** | Hanya 1 menu top-level | Tidak memenuhi P1 secara harfiah |

**Rekomendasi:** **Opsi A**, karena paling sesuai dengan "tabel flat" dan tetap memberi
7 submenu. Ini keputusan P3/Owner — masuk OQ-01.

### E.4 RBAC

**Permission existing** — `src/lib/auth/permissions.ts`:

- `METODE_KERJA_VIEW` (baris 46) / `METODE_KERJA_MANAGE` (47) / `METODE_KERJA_DELETE` (48).
- Role map (baris 100-102): VIEW = Head Office, Project, Management; MANAGE = Head Office;
  DELETE = `[]` (Admin-only via super rule).
- Admin otomatis lolos semua permission lewat `hasPermission` (baris ~120-127).

**Usulan CST:**

| Permission | Non-Admin roles | Alasan |
|---|---|---|
| `CALCULATION_SHEET_VIEW` | Head Office, Project, Management | P1: semua role boleh membaca |
| `CALCULATION_SHEET_MANAGE` | Head Office | P1: HO full CRUD (termasuk delete) |

Tidak perlu `CALCULATION_SHEET_DELETE` karena P1 memberi HO delete. Jika kelak delete
dipisah, tambahkan permission ketiga dengan pola MKS (empty role list = Admin-only).

**Guard berlapis yang harus ditiru:**

1. `layout.tsx` namespace → `redirect("/login")` bila tanpa sesi, `redirect("/dashboard")`
   bila tanpa VIEW (`app/dashboard/metode-kerja-standar/layout.tsx:8-21`).
2. Server page menghitung `canManage` dari sesi dan mengirimkannya ke Client Component
   (`[disiplin]/page.tsx:28-37`); browser tidak pernah mengirim role.
3. API memanggil `assertViewActor`/`assertManageActor` di service sebelum menyentuh DB
   (`src/lib/metode-kerja-standar/service.ts`, blok `assert*`).
4. Read-only role: tanpa tombol/input, bukan sekadar `disabled` (MKS page menampilkan badge
   "Mode baca" untuk non-manage).

**Eligibility PIC** (untuk `pic_user_id`): role Head Office saja, status tidak difilter,
label `(non-aktif)` — reuse `isEligibleMetodeKerjaPic` (`access.ts:44-50`) sebagai acuan,
tetapi implementasikan helper CST sendiri agar modul tidak saling bergantung.

---

## F. Rekomendasi Komponen Baru

| Komponen/file | Peran | Dasar reuse |
|---|---|---|
| `src/lib/calculation-sheet-template/constants.ts` | 7 kategori (code/label/slug) + helper lookup | MKS `constants.ts`; Engineering DB `access.ts:8-63` |
| `src/lib/calculation-sheet-template/schema.ts` | Zod create/update + `isSafeCstUrl` | MKS `schema.ts:10-61` (URL) |
| `src/lib/calculation-sheet-template/access.ts` | `canView`/`canManage` + assert + eligibility PIC | MKS `access.ts:1-50` |
| `src/lib/calculation-sheet-template/repository.ts` | Query flat + insert/update/delete | MKS `repository.ts` (pola) |
| `src/lib/calculation-sheet-template/service.ts` | Actor assert, normalisasi, mapping error, DTO | MKS `service.ts` |
| `src/app/api/calculation-sheet-template/_helpers.ts` | Actor, parse body, mapping SQLSTATE | **MKS `_helpers.ts` hampir apa adanya** |
| Route `.../route.ts` & `.../[id]/route.ts` & `.../pic-options/route.ts` | GET/POST/PUT/DELETE | MKS route per-record |
| `src/app/dashboard/calculation-sheet-template/layout.tsx` | Guard VIEW | MKS `layout.tsx` |
| `src/app/dashboard/calculation-sheet-template/page.tsx` | Resolve `canManage` server-side | MKS `[disiplin]/page.tsx` |
| `src/components/dashboard/calculation-sheet-template/CalculationSheetPage.tsx` | Fetch, state edit/draft, simpan/hapus, feedback | MSL `MslEngineeringPage.tsx:68-410` |
| `.../CalculationSheetTable.tsx` | Tabel flat, header kategori `colSpan`, baris inline | MSL `MslTable.tsx` + MKS `MetodeKerjaTable.tsx` |
| `.../CalculationSheetPicSelect.tsx` | Single-select PIC di sel | `<select>` native (`EngineeringDatabaseEditor.tsx:555`) |
| `.../calculation-sheet-draft.ts` | Pure: draft kosong, parse/validate, payload, dirty | MSL `msl-draft.ts:29-160` |
| Test `*.test.ts` (pure) | Draft/validasi/URL/kategori/row mapping | Runner `node --import tsx --test`, tanpa jsdom |

**Tidak perlu dibuat:** modal form, komponen upload/blob, endpoint reorder, exporter PDF,
halaman summary, komponen PIC multi-select baru.

**Komponen yang sengaja TIDAK diekstrak:** jangan refactor `PicMultiSelect`, `MslTable`,
atau `MetodeKerjaTable` menjadi komponen generik pada fase CST. Ketiganya dipakai modul
yang sudah `IMPLEMENTED & VERIFIED`; mengekstrak sekarang menambah risiko regresi tanpa
kebutuhan P1. Duplikasi terkelola lebih murah (pola yang sudah dipakai MKS saat menyalin
picker KM, lihat komentar `PicMultiSelect.tsx:9-17`).

---

## G. Risiko dan Open Questions untuk P3

### G.1 Risiko

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R-01 | Inline editing tanpa guard perubahan dapat menghilangkan draft saat navigasi | Kehilangan ketikan user | Tiru MSL: hanya satu baris edit, `dirty` + konfirmasi, `beforeunload` bila perlu |
| R-02 | Create row di dalam tabel rawan baris kosong ganda | Data sampah | Satu draft create per kategori, tombol Simpan/Batal eksplisit |
| R-03 | Kategori disimpan sebagai label lalu copy berubah | Migration tidak perlu; tetapi konsistensi CHECK | Simpan kode kanonik + label di constants |
| R-04 | Kode duplikat tanpa prefix | 409 membingungkan bila scope unik tidak jelas | Putuskan scope (OQ-02), pesan error sebut kategori |
| R-05 | PIC dihapus user-nya | Record yatim / gagal delete user | FK `no action` (tolak hapus user) seperti MKS |
| R-06 | URL sangat panjang merusak layout tabel | Baris melebar | `truncate` + `max-w` + `title` seperti `EvidenceCell` |
| R-07 | Dua user mengedit record sama | Last-write-wins menimpa | Terima + dokumentasikan, atau token `updated_at` (OQ-06) |
| R-08 | Menambah komponen generik/refactor modul stabil | Regresi MKS/MSL | Duplikasi terkelola, tanpa refactor |
| R-09 | Migration dijalankan tanpa backup | Data loss | P3 tulis rollback; apply hanya dengan otorisasi |
| R-10 | Sidebar 7 submenu dianggap 7 halaman | Scope/effort membengkak | Putuskan OQ-01 sebelum P3 |

### G.2 Open questions (butuh keputusan Owner/ChatGPT)

| # | Pertanyaan | Rekomendasi audit |
|---|---|---|
| OQ-01 | 7 submenu = 7 route, atau 1 halaman dengan 7 anchor? | **1 halaman + 7 anchor** (Opsi A) |
| OQ-02 | Kode unik global atau per kategori? | **Per kategori** (`(kategori, lower(kode))`) |
| OQ-03 | Kategori disimpan sebagai label atau kode? | **Kode kanonik** + label di constants |
| OQ-04 | Apakah `pic_user_id` wajib? | **Wajib** (P1 mencantumkan PIC sebagai field; MKS item juga wajib ≥1 PIC) |
| OQ-05 | Apakah evidence URL wajib? | **Opsional** (seperti MKS); kosong → `NULL` |
| OQ-06 | Perlu optimistic concurrency? | **Tidak** untuk V1; audit `updated_at` cukup |
| OQ-07 | Apakah HO benar-benar boleh Delete? | **Ya** sesuai P1; cukup satu permission MANAGE |
| OQ-08 | Perlu reorder manual? | **Tidak**; urut kategori kanonik lalu kode |
| OQ-09 | Perlu PDF/export? | **Tidak** di P1; jangan bangun |
| OQ-10 | Kategori bisa diubah setelah record dibuat? | **Tidak** (create-only), seperti Engineering DB |
| OQ-11 | Apakah "Lainnya" selalu tampil walau kosong? | **Ya**, seperti MKS `F. Lainnya` |
| OQ-12 | Batas panjang catatan? | **2000** (konsisten MKS/MSL) |

---

## H. Verifikasi Fase P2

| Pemeriksaan | Hasil |
|---|---|
| Source code diubah | **Tidak** — hanya `docs/design/CST_P2_AUDIT.md` yang ditambahkan |
| Dokumentasi lain diubah | **Tidak** |
| Implementasi / migration / API / UI | **Tidak ada** |
| Commit / push / deploy | **Tidak ada** |
| Runtime dijalankan | **Tidak** (audit baca kode saja) |
| Kode CST existing | **Tidak ada** — pencarian `calculation` hanya menemukan komentar Program Kerja |

**Catatan baseline:** HEAD audit adalah `c053c48`; seluruh pekerjaan MKS P4
(`MetodeKerjaTable.tsx`, `MetodeKerjaSummaryPage.tsx`, `metodeKerjaExportPdf.ts`, helper
summary, test, dan dokumen) sudah ter-commit pada `22258c6`/`9dd9f5d`/`c053c48`. Working
tree sebelum audit bersih, dan satu-satunya perubahan setelah audit adalah dokumen ini.

**Handoff:** dokumen ini siap direview Owner/ChatGPT. Jika PASS → lanjut P3 Technical
Design (format mengikuti `docs/design/MKS_P3_TECHNICAL_DESIGN.md`).
