# CURRENT PROJECT STATE — BDWIKA / WIBEX

Terakhir diperbarui: 10 November 2026 (Project Documentation V1 diimplementasikan; migration `0018` APPLIED; commit/deploy dan visual browser pending Owner).

**Status proyek:** `PARTIALLY VERIFIED` — MKS dan KM V2 `IMPLEMENTED & VERIFIED` (RBAC 4 role, Owner confirmed); CST `IMPLEMENTED BUT NOT FULLY VERIFIED`; PDOC `IMPLEMENTED BUT NOT FULLY VERIFIED` (migration `0018` APPLIED, runtime visual dan commit/push pending). Bukti: `DL-2026-11-09-01`, `DL-2026-11-09-02`, `DL-2026-11-10-01`.

## 1. Repository

| Item | Nilai |
|---|---|
| Root | `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika` |
| Branch | `main` (tracking `origin/main`) |
| HEAD | `5636113` (baseline PDOC; seluruh pekerjaan PDOC belum di-commit) |
| Stack | Next.js 16.3.8 · React 19.2.8 · TypeScript 5.9.3 · Tailwind 4 · Drizzle ORM · PostgreSQL (Neon) · MongoDB · Vercel Blob |
| Node / npm | v24 · npm 10 |
| Dev server | tidak dikelola Freebuff pada E; runtime dilakukan Owner (Owner confirmed) |
| Database | `neondb` (PostgreSQL 18.6), journal file **19 entry**; migration **`0018_project_documentations` APPLIED** (Owner-confirmed) |

## 2. Working Tree (belum di-commit)

Tidak ada staged change. Tidak ada commit/push/deploy.

| Kelompok | Path | Keterangan |
|---|---|---|
| Lib KM V2 | `src/lib/knowledge-management/{access,conflict,repository,schema,service}.ts`, `knowledge.test.ts`, `repository.test.ts` (baru) | validation/service/repository V2 + 2 file test |
| API KM V2 | `src/app/api/knowledge-management/{route.ts,_helpers.ts,pic-options/route.ts,[id]/route.ts (baru),project-options/route.ts (baru)}` | 7 endpoint V2; 4 route V1 dihapus |
| Frontend KM V2 | `src/components/dashboard/knowledge-management/{KnowledgeTable,KnowledgeFormDialog (baru),KnowledgeDeleteDialog (baru),KnowledgeManagementPage (baru),types.ts (baru),types.test.ts (baru)}` | rowspan grouping, modal Add/Edit, dialog delete |
| Enhancement KM V2 (P4, A→D) | `src/components/dashboard/knowledge-management/{KnowledgeProjectCombobox (baru),KnowledgeFilterToolbar (baru),KnowledgeViewDialog (baru),knowledgeExportPdf (baru),knowledgeExportPdf.test (baru)}`; modify `KnowledgeTable`, `types.ts`, `types.test.ts`, `KnowledgeFormDialog` | View modal, PDF tabel + per-record, filter tahun/proyek, search proyek; API/schema/migration tidak berubah |
| Page KM | `src/app/dashboard/knowledge-management/{lesson-learn,best-practice,va-ve}/page.tsx` | memakai `KnowledgeManagementPage` |
| Schema DB | `src/lib/pg/schema.ts` | V2 + 4 drift fix (Sub-Fase F) |
| Migration | `drizzle/0018_project_documentations.sql` (baru), `drizzle/meta/0018_snapshot.json` (baru), `drizzle/meta/_journal.json` | journal 19 entry; `0018` **APPLIED** (Owner-confirmed) |
| Dokumentasi | `docs/development/*`, `docs/audit/05,06,07,08,13`, `docs/design/` | DL-2026-11-10-01 + sinkronisasi PDOC |
| Landing | `src/components/landing/{Navbar,About,Clients,Footer,SocialMedia}.tsx` | perubahan lama, tidak disentuh D |
| CST (P4 A–D) | `src/lib/calculation-sheet-template/*`, `src/app/api/calculation-sheet-template/*`, `src/components/dashboard/calculation-sheet-template/*`, `src/app/dashboard/calculation-sheet-template/*`, `DashboardSidebar.tsx`, `drizzle/0017_*`, `meta/0017_snapshot.json`, `permissions.ts`, `pg/schema.ts` | 1 halaman + 7 anchor, 5 endpoint, 19 test; apply `0017` tidak diverifikasi ulang pada task PDOC |
| PDOC (P4 A–D) | `src/lib/project-documentation/*`, `src/app/api/project-documentation/*`, `src/components/dashboard/project-documentation/*`, `src/app/dashboard/project-documentation/*`, `DashboardSidebar.tsx`, `drizzle/0018_*`, `meta/0018_snapshot.json`, `permissions.ts`, `pg/schema.ts` | 1 halaman + 8 kolom, 2 endpoint, 49 test (6 file); migration `0018` APPLIED |

Jangan `reset`, `checkout --`, `stash`, atau `clean` — seluruh pekerjaan KM V2/CST/PDOC belum di-commit.

## 3. Status Pemeriksaan Terakhir

| Pemeriksaan | Perintah | Exit | Status |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | PASS |
| ESLint (file KM) | `npx eslint src/lib/knowledge-management src/app/api/knowledge-management src/components/dashboard/knowledge-management` | 0 | PASS |
| Test otomatis | `npm test` | 0 | **224/224 PASS** (56 suite; termasuk 49 test PDOC di 6 file: schema/repository/service/helper/draft/sidebar) |
| ESLint (CST + sidebar) | `npx eslint src/lib/calculation-sheet-template src/components/dashboard/calculation-sheet-template src/app/dashboard/calculation-sheet-template src/app/api/calculation-sheet-template src/components/dashboard/DashboardSidebar.tsx` | 0 | PASS |
| ESLint (PDOC + sidebar) | `npx eslint src/lib/project-documentation src/app/api/project-documentation src/components/dashboard/project-documentation src/components/dashboard/DashboardSidebar.tsx src/components/dashboard/projectDocumentationSidebar.test.ts src/app/dashboard/project-documentation` | 0 | PASS |
| Diff hygiene | `git diff --check` | 0 | PASS |
| Drift Drizzle | `npx drizzle-kit generate` | — | tidak dijalankan pada Sub-fase D; snapshot `0018` tersedia |
| Migration | `npx drizzle-kit migrate` | — | **0018 APPLIED** (Owner-confirmed); tidak dijalankan pada Sub-fase D |

## 4. Knowledge Management V2

**Status:** `IMPLEMENTED & VERIFIED` — RBAC 4 role PASS (Owner confirmed 9 November 2026).

**Enhancement 2026-11-05 (P4).** View modal read-only, PDF seluruh tabel (A4 landscape) dan per-record (A4 portrait), filter tahun, serta search proyek single-select — semuanya client-side dari record yang sudah dimuat. Kolom Aksi selalu render (Lihat semua role, Edit hanya Manage). Tidak ada endpoint, schema, atau migration baru. Static checks PASS (60/60 test); runtime Admin dan cleanup PASS (**Owner confirmed**); RBAC 4 role (Admin, Head Office, Management, Project) PASS (**Owner confirmed** 9 November 2026). Detail: `DL-2026-11-05-03`, `DL-2026-11-09-01`.

- **Model:** multiple records per project/kategori (bukan satu baris per project), form modal Add/Edit, evidence **tepat satu**, PIC **minimal satu** (Head Office), optimistic concurrency integer `version`, permanent delete.
- **Migration:** `0015_knowledge_management_v2_fresh` **APPLIED** di `neondb` (5 November 2026). Tabel V1 di-drop, V2 dibangun ulang. Data V1 = 1 test record, hilang per keputusan Owner (no backup, accepted risk).
- **Verifikasi:** API 71/73 PASS lalu dua temuan diperbaiki (updated_by null saat create; pesan validasi spesifik 20.000) dan diverifikasi runtime; concurrency 4/4 PASS; regresi 7/7 PASS (MSL, Org, Program Kerja, Master Project, User, Landing CMS, Sidebar); runtime browser Admin PASS (gate Owner).
- **RBAC:** Admin (full CRUD), Head Office (CRUD tanpa Delete), Management & Project (read-only) — semuanya **PASS** di runtime (Owner confirmed 9 November 2026). Tidak ada role yang tertunda verifikasi.
- **Catatan operasional:** `drizzle.config.ts` tidak membaca `.env.local`; export `DIRECT_URL` sebelum `npx drizzle-kit migrate` (lihat `docs/audit/13`).

## 5. Kondisi yang Perlu Diketahui

- Seluruh pekerjaan PDOC (A–D) dan dokumentasi E belum di-commit; HEAD `5636113`.
- Database KM dalam keadaan bersih: `knowledge_entries/pics/evidence = 0`, tidak ada project `ZZ-KM-TEST-*` (cleanup runtime **Owner confirmed**).
- Tidak ada user baru, suspend, atau reset password selama pengujian; baseline user 10 akun tidak berubah.
- Modul MSL dan Struktur Organisasi protected — tidak disentuh.
- Feed publik Green Building masih 0 item (empty state).
- `schema.ts` mencakup PDOC; snapshot `0018_snapshot.json` tersedia. Status drift schema tidak diuji ulang pada Sub-fase D.
- Migration `0018_project_documentations` **APPLIED** (Owner-confirmed); runtime PDOC dan commit/push final masih pending Owner.

## 6. Metode Kerja Standar (P4)

**Status:** `IMPLEMENTED & VERIFIED` — static checks PASS, migration APPLIED, runtime fitur + UI tabel PASS; RBAC 4 role PASS (Owner confirmed 9 November 2026).

- **Cakupan:** 3 tabel domain (sub-kategori, item, PIC), 10 route API, 7 komponen frontend + exporter PDF, route `/dashboard/metode-kerja-standar/{summary,[disiplin]}`.
- **Migration:** `0016_metode_kerja_standar` **APPLIED**; journal 17 entry; object terverifikasi (3 tabel, 16 index, 2 constraint trigger, CHECK disiplin A–F, unique kode per disiplin).
- **Sidebar:** sejak 8 November 2026, KM dan MKS sama-sama route-driven (default collapsed). Keputusan ini menggantikan perilaku awal DL-2026-11-04-15; visibilitas per role tidak berubah.
- **Tabel:** 7 kolom `Sub-Kategori | Item | PIC | Evidence | Catatan | Jumlah | Aksi`; sel Sub-Kategori di-merge `rowSpan={items.length + 1}` (rel `bg-blue-50`, border bawah tunggal), baris ringkas (`py-2`), tombol aksi seragam `h-7` tanpa pembungkusan, kolom Aksi 240px, `min-w` 1290px. **Summary Report** memakai pengelompokan ala Program Kerja: Disiplin menjadi baris header `colSpan` penuh (navy, teks putih), Sub-Kategori di-merge `rowSpan` sesuai jumlah item yang lolos filter, 5 kolom (Sub-Kategori, Item, PIC, Evidence, Status) di UI dan PDF (PDF mencetak label sub-kategori sekali karena `rowSpan` bisa terpotong page break).
- **Detail:** `docs/design/MKS_P4_FINALIZATION.md`; keputusan `DL-2026-11-08-01`.
- **Known limitation:** tidak ada auto-collapse antar-route dalam satu sesi. RBAC 4 role sudah PASS (9 November 2026).

## 7. Calculation Sheet Template (P4, 9 November 2026)

**Status:** `IMPLEMENTED BUT NOT FULLY VERIFIED` — static checks PASS; migration `0017` belum di-apply; runtime API/DB dan visual browser **belum diuji**.

- **Cakupan:** master reference flat satu halaman, tujuh kategori kanonik tanpa prefix (Arsitektur, Struktur, Infrastruktur, Geoteknik, Green Building, MEEP, Lainnya), tabel inline 6 kolom, tanpa modal/upload/reorder/PDF.
- **Model:** `calculation_sheet_templates`; kode unik per kategori, satu PIC Head Office, evidence URL opsional (`http`/`https`, ≤2.048), catatan ≤2.000. Tanpa optimistic concurrency.
- **API:** `GET` list flat, `POST` create (201), `PUT`/`DELETE` per id, `GET pic-options` (Manage-only) — seluruhnya `Cache-Control: no-store`.
- **RBAC:** `CALCULATION_SHEET_VIEW` (Admin, Head Office, Management, Project); `CALCULATION_SHEET_MANAGE` (Admin, Head Office, termasuk delete). Layout guard + API service sama-sama menegakkan.
- **UI:** 7 `<tbody>` dengan header kategori `colSpan={6}` dan anchor id; satu baris edit dan satu create draft pada satu waktu; error validasi/API tampil di bawah baris; submenu sidebar mengikuti hash.
- **Migration:** `drizzle/0017_calculation_sheet_templates.sql` + snapshot tersedia; status apply `0017` tidak diverifikasi ulang pada task PDOC.
- **Verifikasi:** `tsc` PASS, `eslint` PASS, `npm test` **174/174 PASS**, `git diff --check` PASS. Tidak ada perubahan source pada Sub-fase D CST.
- **Detail:** `docs/design/CST_P2_AUDIT.md`, `docs/design/CST_P3_TECHNICAL_DESIGN.md`, `DL-2026-11-09-02`.

## 8. Project Documentation (P4, 10 November 2026)

**Status:** `IMPLEMENTED BUT NOT FULLY VERIFIED` — static checks PASS; migration `0018` APPLIED (Owner-confirmed); visual browser dan commit/push pending Owner.

- **Cakupan:** satu halaman `/dashboard/project-documentation`, tabel 8 kolom (Nama Proyek, Minggu 1–5, Catatan, Aksi), inline edit satu baris, search nama project, dan PDF A4 landscape.
- **Model:** `project_documentations` dengan `project_id` UNIQUE, lima URL minggu, audit per minggu, `catatan`, dan audit level baris. Master Project tetap menjadi sumber baris; tidak ada create/delete project dari PDOC.
- **API:** `GET /api/project-documentation` + `PUT /api/project-documentation/[projectId]`. PUT bersifat upsert; field opsional, URL kosong menjadi `NULL`, dan URL yang dikosongkan menghapus pasangan audit minggu tersebut.
- **RBAC:** `DOCUMENTATION_VIEW` (4 role), `DOCUMENTATION_MANAGE` (Admin, Head Office, Project); Management read-only. Project dapat mengelola seluruh project tanpa ownership.
- **UI:** link memakai ikon 🔗 dan metadata `Oleh: [Nama], [Tanggal id-ID]`; URL kosong tampil `—`; error validasi tampil di bawah baris; PDF tidak mencetak metadata uploader.
- **Migration:** `0018_project_documentations` **APPLIED** (Owner-confirmed); journal 19 entry.
- **Verifikasi:** `tsc` PASS, `eslint` PASS, `npm test` **224/224 PASS**, `git diff --check` PASS. Runtime API/browser empat role **NOT RUN**.
- **Detail:** `DL-2026-11-10-01`, `docs/design/PDOC_P2_AUDIT.md`, `docs/design/PDOC_P3_TECHNICAL_DESIGN.md`.

## 9. Langkah Berikutnya

1. Owner melakukan uji visual PDOC: tabel inline, audit per minggu, search, PDF, dan RBAC empat role (desktop + mobile).
2. Owner menjalankan commit/push final setelah visual test; tidak ada deploy pada instruksi ini.
3. Final acceptance Owner/ChatGPT atas `DL-2026-11-10-01`; status PDOC dinaikkan setelah runtime PASS.
4. Runtime CST tetap menjadi pekerjaan terpisah dan tidak dinaikkan statusnya oleh task PDOC ini.
