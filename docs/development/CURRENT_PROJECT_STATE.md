# CURRENT PROJECT STATE — BDWIKA / WIBEX

Terakhir diperbarui: 10 November 2026 (PDOC V1 + Monthly Delta dan CST `IMPLEMENTED & VERIFIED`; runtime browser 4 role PASS, Owner-confirmed 10 November 2026; migration `0017`, `0018`, dan **0019 APPLIED**; WIBEX Governance & Workflow **APPROVED & EFFECTIVE**, Owner Hans, 10 November 2026).

**Status proyek:** `PARTIALLY VERIFIED` — MKS, KM V2, PDOC, dan CST `IMPLEMENTED & VERIFIED` (RBAC 4 role, Owner confirmed); modul lain mengikuti status masing-masing. Bukti: `DL-2026-11-09-01`, `DL-2026-11-09-02`, `DL-2026-11-10-03`, `DL-2026-11-10-04`, `DL-2026-11-10-05`.

**Tata kelola:** WIBEX Development Governance dan WIBEX Engineering Workflow **APPROVED & EFFECTIVE** — disetujui Owner (Hans), 10 November 2026.

## 1. Repository

| Item | Nilai |
|---|---|
| Root | `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika` |
| Branch | `main` (tracking `origin/main`) |
| Baseline fitur | `a7527e1` — `feat: project documentation monthly recap and summary report` |
| HEAD / origin/main | `8cfef26` — `chore: align sidebar text and elevate PDOC status to verified` |
| Stack | Next.js 16.3.8 · React 19.2.8 · TypeScript 5.9.3 · Tailwind 4 · Drizzle ORM · PostgreSQL (Neon) · MongoDB · Vercel Blob |
| Node / npm | v24 · npm 10 |
| Dev server | tidak dikelola Freebuff pada E; runtime dilakukan Owner (Owner confirmed) |
| Database | `neondb` (PostgreSQL 18.6), journal file **20 entry**; `0017_calculation_sheet_templates` **APPLIED** (Owner-confirmed melalui runtime 10 November 2026); `0018_project_documentations` **APPLIED**; **0019 APPLIED** — `0019_project_documentation_period` (Owner-confirmed 10 November 2026) |

## 2. Working Tree (clean at baseline)

Baseline verifikasi: `HEAD` = `origin/main` = `8cfef26`; working tree clean sebelum pass dokumentasi CST. Pass ini hanya mengubah dokumentasi dan **tidak** di-commit.

| Item | Nilai |
|---|---|
| Commit fitur PDOC | `a7527e1` — `feat: project documentation monthly recap and summary report` |
| Commit fitur CST | `5636113` — `feat: core enterprise calculation sheet template v-1` |
| Commit dokumentasi PDOC | `062f8d4` — `docs: mark PDOC 0019 migration applied` |
| Baseline dokumentasi/UI | `8cfef26` — `chore: align sidebar text and elevate PDOC status to verified` |
| Range fitur PDOC | `5636113..a7527e1`; 41 file, +15.396 / −29 |
| Isi commit PDOC | PDOC V1 + Monthly Delta, migration `0018`/`0019`, halaman Rekap Bulanan + Summary, sidebar accordion, dan sinkronisasi dokumen |
| Status remote | `8cfef26` sudah di-push ke `origin/main` |
| Migration | `0017` **APPLIED** (Owner-confirmed melalui runtime); `0018` **APPLIED** (Owner-confirmed); `0019` **APPLIED** (Owner-confirmed 10 November 2026) |

Detail file historis sebelum commit tersedia di Git history; jangan menyalin tabel working tree lama sebagai kondisi saat ini.

## 3. Status Pemeriksaan Terakhir

| Pemeriksaan | Perintah | Exit | Status |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | PASS |
| ESLint (file KM) | `npx eslint src/lib/knowledge-management src/app/api/knowledge-management src/components/dashboard/knowledge-management` | 0 | PASS |
| Test otomatis | `npm test` | 0 | **233/233 PASS** (59 suite; termasuk 58 test PDOC di 6 file: schema/repository/service/helper/draft/sidebar) |
| ESLint (CST + sidebar) | `npx eslint src/lib/calculation-sheet-template src/components/dashboard/calculation-sheet-template src/app/dashboard/calculation-sheet-template src/app/api/calculation-sheet-template src/components/dashboard/DashboardSidebar.tsx` | 0 | PASS |
| ESLint (PDOC + sidebar) | `npx eslint src/lib/project-documentation src/app/api/project-documentation src/components/dashboard/project-documentation src/components/dashboard/DashboardSidebar.tsx src/components/dashboard/projectDocumentationSidebar.test.ts src/app/dashboard/project-documentation` | 0 | PASS |
| Diff hygiene | `git diff --check` | 0 | PASS |
| Drift Drizzle | `npx drizzle-kit generate` | — | tidak dijalankan pada task dokumentasi; snapshot `0019` tersedia |
| Migration | `npx drizzle-kit migrate` | — | **0017 APPLIED** (Owner-confirmed melalui runtime), **0018 APPLIED**, dan **0019 APPLIED** (Owner-confirmed 10 November 2026); tidak dijalankan pada task ini |
| Runtime CST | Browser, 4 role | — | **PASS** (Owner-confirmed 10 November 2026) |
| Runtime PDOC | Browser desktop + mobile, 4 role | — | **PASS** (Owner-confirmed 10 November 2026) |

## 4. Knowledge Management V2

**Status:** `IMPLEMENTED & VERIFIED` — RBAC 4 role PASS (Owner confirmed 9 November 2026).

**Enhancement 2026-11-05 (P4).** View modal read-only, PDF seluruh tabel (A4 landscape) dan per-record (A4 portrait), filter tahun, serta search proyek single-select — semuanya client-side dari record yang sudah dimuat. Kolom Aksi selalu render (Lihat semua role, Edit hanya Manage). Tidak ada endpoint, schema, atau migration baru. Static checks PASS (60/60 test); runtime Admin dan cleanup PASS (**Owner confirmed**); RBAC 4 role (Admin, Head Office, Management, Project) PASS (**Owner confirmed** 9 November 2026). Detail: `DL-2026-11-05-03`, `DL-2026-11-09-01`.

- **Model:** multiple records per project/kategori (bukan satu baris per project), form modal Add/Edit, evidence **tepat satu**, PIC **minimal satu** (Head Office), optimistic concurrency integer `version`, permanent delete.
- **Migration:** `0015_knowledge_management_v2_fresh` **APPLIED** di `neondb` (5 November 2026). Tabel V1 di-drop, V2 dibangun ulang. Data V1 = 1 test record, hilang per keputusan Owner (no backup, accepted risk).
- **Verifikasi:** API 71/73 PASS lalu dua temuan diperbaiki (updated_by null saat create; pesan validasi spesifik 20.000) dan diverifikasi runtime; concurrency 4/4 PASS; regresi 7/7 PASS (MSL, Org, Program Kerja, Master Project, User, Landing CMS, Sidebar); runtime browser Admin PASS (gate Owner).
- **RBAC:** Admin (full CRUD), Head Office (CRUD tanpa Delete), Management & Project (read-only) — semuanya **PASS** di runtime (Owner confirmed 9 November 2026). Tidak ada role yang tertunda verifikasi.
- **Catatan operasional:** `drizzle.config.ts` tidak membaca `.env.local`; export `DIRECT_URL` sebelum `npx drizzle-kit migrate` (lihat `docs/audit/13`).

## 5. Kondisi yang Perlu Diketahui

- WIBEX Development Governance dan Engineering Workflow resmi berlaku sebagai **APPROVED & EFFECTIVE** (Owner Hans, 10 November 2026); tidak ada perubahan aturan pada pass ini.
- PDOC V1 + Monthly Delta sudah di-commit dan di-push (`a7527e1`); working tree bersih sebelum sinkronisasi dokumentasi P8.
- Database KM dalam keadaan bersih: `knowledge_entries/pics/evidence = 0`, tidak ada project `ZZ-KM-TEST-*` (cleanup runtime **Owner confirmed**).
- Tidak ada user baru, suspend, atau reset password selama pengujian; baseline user 10 akun tidak berubah.
- Modul MSL dan Struktur Organisasi protected — tidak disentuh.
- Feed publik Green Building masih 0 item (empty state).
- `schema.ts` mencakup PDOC periodik; snapshot `0019_snapshot.json` tersedia. Status drift schema tidak diuji ulang pada task dokumentasi ini.

## 6. Metode Kerja Standar (P4)

**Status:** `IMPLEMENTED & VERIFIED` — static checks PASS, migration APPLIED, runtime fitur + UI tabel PASS; RBAC 4 role PASS (Owner confirmed 9 November 2026).

- **Cakupan:** 3 tabel domain (sub-kategori, item, PIC), 10 route API, 7 komponen frontend + exporter PDF, route `/dashboard/metode-kerja-standar/{summary,[disiplin]}`.
- **Migration:** `0016_metode_kerja_standar` **APPLIED**; journal 17 entry; object terverifikasi (3 tabel, 16 index, 2 constraint trigger, CHECK disiplin A–F, unique kode per disiplin).
- **Sidebar:** sejak 8 November 2026, KM dan MKS sama-sama route-driven (default collapsed). Keputusan ini menggantikan perilaku awal DL-2026-11-04-15; visibilitas per role tidak berubah.
- **Tabel:** 7 kolom `Sub-Kategori | Item | PIC | Evidence | Catatan | Jumlah | Aksi`; sel Sub-Kategori di-merge `rowSpan={items.length + 1}` (rel `bg-blue-50`, border bawah tunggal), baris ringkas (`py-2`), tombol aksi seragam `h-7` tanpa pembungkusan, kolom Aksi 240px, `min-w` 1290px. **Summary Report** memakai pengelompokan ala Program Kerja: Disiplin menjadi baris header `colSpan` penuh (navy, teks putih), Sub-Kategori di-merge `rowSpan` sesuai jumlah item yang lolos filter, 5 kolom (Sub-Kategori, Item, PIC, Evidence, Status) di UI dan PDF (PDF mencetak label sub-kategori sekali karena `rowSpan` bisa terpotong page break).
- **Detail:** `docs/design/MKS_P4_FINALIZATION.md`; keputusan `DL-2026-11-08-01`.
- **Known limitation:** tidak ada auto-collapse antar-route dalam satu sesi. RBAC 4 role sudah PASS (9 November 2026).

## 7. Calculation Sheet Template (P4, 10 November 2026)

**Status:** **`IMPLEMENTED & VERIFIED`** — static checks PASS; migration `0017` **APPLIED** (terbukti dari runtime CRUD); runtime browser 4 role PASS (Owner-confirmed 10 November 2026).

- **Cakupan:** master reference flat, tujuh kategori kanonik tanpa prefix (Arsitektur, Struktur, Infrastruktur, Geoteknik, Green Building, MEEP, Lainnya), halaman Summary Report + route per kategori, tabel inline 6 kolom, dan header kategori `colSpan={6}`.
- **Model:** `calculation_sheet_templates`; kode unik per kategori, satu PIC Head Office, evidence URL opsional (`http`/`https`, ≤2.048), catatan ≤2.000. Tanpa optimistic concurrency.
- **API:** `GET` list flat, `POST` create (201), `PUT`/`DELETE` per id, `GET pic-options` (Manage-only) — seluruhnya `Cache-Control: no-store`.
- **RBAC:** `CALCULATION_SHEET_VIEW` (Admin, Head Office, Management, Project); `CALCULATION_SHEET_MANAGE` (Admin, Head Office, termasuk delete). Layout guard + API service sama-sama menegakkan.
- **UI:** satu tabel inline per kategori; satu baris edit dan satu create draft pada satu waktu; error validasi/API tampil di bawah baris; navigasi sidebar per kategori membuka accordion CST. Summary Report menyediakan rekap lintas kategori dan PDF client-side.
- **Migration:** `drizzle/0017_calculation_sheet_templates.sql` + snapshot tersedia; `0017` **APPLIED** (Owner-confirmed melalui runtime 10 November 2026); journal 20 entry.
- **Verifikasi:** `tsc` PASS, `eslint` PASS, `npm test` **233/233 PASS**, `git diff --check` PASS. Runtime browser 4 role **PASS** (Owner-confirmed 10 November 2026): tujuh kategori + header `colSpan` + sidebar; inline Create/Edit/Delete; URL invalid ditolak; duplikasi kode ditolak; Admin/Head Office manage, Management/Project read-only.
- **Detail:** `DL-2026-11-10-04` (runtime PASS); `DL-2026-11-09-02` (historis); `docs/design/CST_P2_AUDIT.md`, `docs/design/CST_P3_TECHNICAL_DESIGN.md`.

## 8. Project Documentation (P4 + Monthly Delta, 10 November 2026)

**Status:** `IMPLEMENTED & VERIFIED` — static checks PASS; commit fitur `a7527e1`; dokumentasi `062f8d4`; migration `0018` + `0019` APPLIED; runtime browser 4 role PASS (Owner-confirmed 10 November 2026).

- **Cakupan:** PDOC V1 + Monthly Delta. Root `/dashboard/project-documentation` redirect ke `/rekap-bulanan`; halaman rekap memiliki filter Tahun/Bulan; halaman `/summary` menampilkan matriks 12 bulan; sidebar berupa accordion dengan submenu **Rekap Bulanan** dan **Summary Report**.
- **Model:** `project_documentations` beridentitas `(project_id, year, month)` dengan unique composite; lima URL minggu, audit per minggu, `catatan`, dan audit level baris. Master Project tetap menjadi sumber baris; summary menampilkan semua project, termasuk `0/5`.
- **API:** tiga endpoint: `GET /api/project-documentation?year&month`, `PUT /api/project-documentation/[projectId]/[year]/[month]`, dan `GET /api/project-documentation/summary?year`. PUT bersifat upsert per periode; field opsional; URL kosong menjadi `NULL`; periode berasal dari path/query, bukan body.
- **RBAC:** `DOCUMENTATION_VIEW` (Admin, Head Office, Management, Project); `DOCUMENTATION_MANAGE` (Admin, Head Office, Project). Management read-only; Admin, Head Office, dan Project dapat mengelola.
- **UI:** tabel 8 kolom, inline edit, audit per minggu, search, dan PDF A4 landscape pada Rekap Bulanan; filter tahun/bulan memicu fetch ulang. Summary read-only memakai warna 5/5 hijau, 1–4/5 amber, 0/5 abu-abu.
- **Runtime PASS (Owner, 4 role):** filter tahun/bulan dan tabel semua project; simpan 5 URL + catatan dengan audit per minggu; URL kosong tampil `—` dan URL invalid menampilkan error per baris; simpan tanpa perubahan tidak mengubah timestamp; Summary 12 bulan dengan `0/5`; PDF A4 landscape dengan filter line periode; Management read-only sedangkan Admin/Head Office/Project manage; sidebar accordion terbuka pada kedua route; desktop + mobile.
- **Migration:** `0018_project_documentations` **APPLIED** (Owner-confirmed); `0019_project_documentation_period` **APPLIED** (Owner-confirmed 10 November 2026); journal 20 entry.
- **Verifikasi:** `tsc` PASS, `eslint` PASS, `npm test` **233/233 PASS** (59 suite; 58 test PDOC di 6 file), `git diff --check` PASS. Runtime visual + RBAC 4 role **PASS** (Owner-confirmed 10 November 2026).
- **Detail:** `DL-2026-11-10-03` (runtime PASS), `DL-2026-11-10-02` (historis), `DL-2026-11-10-01` (historis), `docs/design/PDOC_MONTHLY_IMPACT_ANALYSIS.md`, `docs/design/PDOC_P3_DELTA_MONTHLY.md`.

## 9. Langkah Berikutnya

1. Final acceptance Owner/ChatGPT atas `DL-2026-11-10-03` dan `DL-2026-11-10-04`.
