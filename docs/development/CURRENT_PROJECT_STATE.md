# CURRENT PROJECT STATE — BDWIKA / WIBEX

Terakhir diperbarui: 12 November 2026 (Modul Berkas Sprint 1 & 2 + final polish `IMPLEMENTED & VERIFIED` — Sprint 1 runtime Vercel PASS, Owner-confirmed 10 November 2026; Sprint 2/final polish static checks PASS (251/251, 60 suite); migration `0020`–`0023` **APPLIED**; PDOC V1 + Monthly Delta dan CST `IMPLEMENTED & VERIFIED`; runtime browser 4 role PDOC/CST PASS, Owner-confirmed 10 November 2026; WIBEX Governance & Workflow **APPROVED & EFFECTIVE**, Owner Hans, 10 November 2026).

**Status proyek:** `PARTIALLY VERIFIED` — MKS, KM V2, PDOC, CST, dan **Berkas** `IMPLEMENTED & VERIFIED` (RBAC 4 role, Owner confirmed; Berkas Sprint 1 diuji Owner di Vercel; Sprint 2/final polish static checks PASS). Bukti: `DL-2026-11-09-01`, `DL-2026-11-09-02`, `DL-2026-11-10-03`, `DL-2026-11-10-04`, `DL-2026-11-10-05`, `DL-2026-11-10-06`, `DL-2026-11-10-07`, `DL-2026-11-12-03`.

**Tata kelola:** WIBEX Development Governance dan WIBEX Engineering Workflow **APPROVED & EFFECTIVE** — disetujui Owner (Hans), 10 November 2026.

## 1. Repository

| Item | Nilai |
|---|---|
| Root | `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika` |
| Branch | `main` (tracking `origin/main`) |
| Baseline fitur | `a7527e1` — `feat: project documentation monthly recap and summary report` |
| HEAD | `0805776` — `style(berkas): move serial code to top right corner of pdf` (remote-tracking tidak di-fetch pada pass ini) |
| Stack | Next.js 16.3.8 · React 19.2.8 · TypeScript 5.9.3 · Tailwind 4 · Drizzle ORM · PostgreSQL (Neon) · MongoDB · Vercel Blob |
| Node / npm | v24 · npm 10 |
| Dev server | tidak dikelola Freebuff pada E; runtime dilakukan Owner (Owner confirmed) |
| Database | `neondb` (PostgreSQL 18.6), journal file **24 entry**; `0017_calculation_sheet_templates` **APPLIED** (Owner-confirmed melalui runtime 10 November 2026); `0018_project_documentations` **APPLIED**; **0019 APPLIED** — `0019_project_documentation_period`; **`0020_berkas_pengajuan`, `0021_berkas_catatan`, `0022_berkas_kode_seri`, dan `0023_berkas_sprint2` APPLIED** (`0020`–`0022` Owner-confirmed melalui runtime Vercel 10 November 2026; `0023` mengikuti konfirmasi database Sprint 2 sudah dimigrasi) |

## 2. Working Tree (Sprint 2/final polish belum di-commit; HEAD `0805776`)

Baseline verifikasi: `HEAD` = `0805776`; working tree masih memuat perubahan kode Sprint 2 Berkas dan final polish yang belum di-commit. Pass dokumentasi ini hanya mengubah tiga dokumen development dan **tidak** melakukan commit/push.

| Item | Nilai |
|---|---|
| Commit fitur PDOC | `a7527e1` — `feat: project documentation monthly recap and summary report` |
| Commit fitur CST | `5636113` — `feat: core enterprise calculation sheet template v-1` |
| Commit dokumentasi PDOC | `062f8d4` — `docs: mark PDOC 0019 migration applied` |
| Commit fitur Berkas | `1668685` — `feat(berkas): implement ajukan and verifikasi modules with pdf watermark` (41 file, +15.037 / −1) |
| Commit Berkas — layout cover | `a85d26f` — `fix(berkas): refine pdf cover layout to match standard pptx and use new logo` |
| Commit Berkas — strict grid | `bb0dfdd` — `fix(berkas): implement strict grid layout for pdf cover to prevent text overlap` |
| Commit Berkas — kode seri, landscape, delete | `d3813b3` — `feat(berkas): add serial code, landscape pdf, and admin delete` |
| Commit Berkas — reposisi kode seri | `0805776` — `style(berkas): move serial code to top right corner of pdf` |
| Baseline dokumentasi/UI | `8cfef26` — `chore: align sidebar text and elevate PDOC status to verified` |
| Range fitur PDOC | `5636113..a7527e1`; 41 file, +15.396 / −29 |
| Isi commit PDOC | PDOC V1 + Monthly Delta, migration `0018`/`0019`, halaman Rekap Bulanan + Summary, sidebar accordion, dan sinkronisasi dokumen |
| Status remote | `0805776` di `main`; remote-tracking tidak di-fetch pada pass ini |
| Migration | `0017` **APPLIED** (Owner-confirmed melalui runtime); `0018` **APPLIED**; `0019` **APPLIED**; `0020`, `0021`, dan `0022` **APPLIED** (Owner-confirmed melalui runtime Vercel 10 November 2026); `0023_berkas_sprint2` **APPLIED** (konfirmasi database Sprint 2 sudah dimigrasi) |

Detail file historis sebelum commit tersedia di Git history; jangan menyalin tabel working tree lama sebagai kondisi saat ini.

## 3. Status Pemeriksaan Terakhir

| Pemeriksaan | Perintah | Exit | Status |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | PASS |
| ESLint (file KM) | `npx eslint src/lib/knowledge-management src/app/api/knowledge-management src/components/dashboard/knowledge-management` | 0 | PASS |
| Test otomatis | `npm test` | 0 | **251/251 PASS** (60 suite; termasuk test PDOC, test Berkas schema, pdf-engine termasuk cover/garis merah/footer WIKA, types, dan navigasi sidebar) |
| ESLint (CST + sidebar) | `npx eslint src/lib/calculation-sheet-template src/components/dashboard/calculation-sheet-template src/app/dashboard/calculation-sheet-template src/app/api/calculation-sheet-template src/components/dashboard/DashboardSidebar.tsx` | 0 | PASS |
| ESLint (PDOC + sidebar) | `npx eslint src/lib/project-documentation src/app/api/project-documentation src/components/dashboard/project-documentation src/components/dashboard/DashboardSidebar.tsx src/components/dashboard/projectDocumentationSidebar.test.ts src/app/dashboard/project-documentation` | 0 | PASS |
| ESLint (Berkas) | `npx eslint src/lib/berkas src/components/dashboard/berkas src/app/api/berkas src/app/dashboard/berkas src/components/dashboard/DashboardSidebar.tsx src/lib/auth/permissions.ts src/lib/storage/blob.ts` | 0 | PASS |
| Diff hygiene | `git diff --check` | 0 | PASS |
| Drift Drizzle | `npx drizzle-kit generate` | — | tidak dijalankan pada task dokumentasi; snapshot `0019`–`0023` tersedia |
| Migration | `npx drizzle-kit migrate` | — | **0017–0023 APPLIED** (Owner-confirmed; `0020`–`0022` melalui runtime Vercel 10 November 2026; `0023` mengikuti konfirmasi database Sprint 2); tidak dijalankan pada task ini |
| Runtime CST | Browser, 4 role | — | **PASS** (Owner-confirmed 10 November 2026) |
| Runtime PDOC | Browser desktop + mobile, 4 role | — | **PASS** (Owner-confirmed 10 November 2026) |
| Runtime Berkas | Vercel, 4 role | — | **PASS untuk Sprint 1 V1** — pengajuan, verifikasi berurutan, cover landscape, kode seri, watermark NIP, delete Admin (Owner-confirmed 10 November 2026); smoke test browser Sprint 2/final polish **belum dijalankan pada pass dokumentasi ini** |
| Deploy Vercel Berkas | — | — | **PASS** (Owner-confirmed 10 November 2026) |
| PDF visual Berkas (cover/merge/watermark) | — | — | **PASS untuk V1** — cover A4 landscape, kode seri pojok kanan atas, watermark NIP (Owner-confirmed); garis merah dan footer WIKA diverifikasi lewat unit test, bukan render visual baru |

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
- PDOC V1 + Monthly Delta (`a7527e1`) dan Modul Berkas (`1668685` → `a85d26f` → `bb0dfdd` → `d3813b3` → `0805776`) sudah di-commit; working tree bersih sebelum pass dokumentasi V1 ini.
- Migration `0020_berkas_pengajuan`, `0021_berkas_catatan`, `0022_berkas_kode_seri`, dan `0023_berkas_sprint2` sudah **APPLIED** (`0020`–`0022` Owner-confirmed melalui runtime Vercel 10 November 2026; `0023` mengikuti konfirmasi database Sprint 2 sudah dimigrasi); tidak ada migration Berkas yang tertunda.
- Database KM dalam keadaan bersih: `knowledge_entries/pics/evidence = 0`, tidak ada project `ZZ-KM-TEST-*` (cleanup runtime **Owner confirmed**).
- Tidak ada user baru, suspend, atau reset password selama pengujian; baseline user 10 akun tidak berubah.
- Modul MSL dan Struktur Organisasi protected — tidak disentuh.
- Feed publik Green Building masih 0 item (empty state).
- `schema.ts` mencakup PDOC periodik, tiga tabel Berkas, kolom `kode_seri`, serta kolom rejection/revision; snapshot `0020`–`0023` tersedia. Status drift schema tidak diuji ulang pada pass dokumentasi ini.

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
- **Migration:** `drizzle/0017_calculation_sheet_templates.sql` + snapshot tersedia; `0017` **APPLIED** (Owner-confirmed melalui runtime 10 November 2026); journal saat itu 20 entry (kini 22 entry).
- **Verifikasi:** `tsc` PASS, `eslint` PASS, `npm test` **233/233 PASS** (saat itu; total kini 245/245), `git diff --check` PASS. Runtime browser 4 role **PASS** (Owner-confirmed 10 November 2026): tujuh kategori + header `colSpan` + sidebar; inline Create/Edit/Delete; URL invalid ditolak; duplikasi kode ditolak; Admin/Head Office manage, Management/Project read-only.
- **Detail:** `DL-2026-11-10-04` (runtime PASS); `DL-2026-11-09-02` (historis); `docs/design/CST_P2_AUDIT.md`, `docs/design/CST_P3_TECHNICAL_DESIGN.md`.

## 8. Project Documentation (P4 + Monthly Delta, 10 November 2026)

**Status:** `IMPLEMENTED & VERIFIED` — static checks PASS; commit fitur `a7527e1`; dokumentasi `062f8d4`; migration `0018` + `0019` APPLIED; runtime browser 4 role PASS (Owner-confirmed 10 November 2026).

- **Cakupan:** PDOC V1 + Monthly Delta. Root `/dashboard/project-documentation` redirect ke `/rekap-bulanan`; halaman rekap memiliki filter Tahun/Bulan; halaman `/summary` menampilkan matriks 12 bulan; sidebar berupa accordion dengan submenu **Rekap Bulanan** dan **Summary Report**.
- **Model:** `project_documentations` beridentitas `(project_id, year, month)` dengan unique composite; lima URL minggu, audit per minggu, `catatan`, dan audit level baris. Master Project tetap menjadi sumber baris; summary menampilkan semua project, termasuk `0/5`.
- **API:** tiga endpoint: `GET /api/project-documentation?year&month`, `PUT /api/project-documentation/[projectId]/[year]/[month]`, dan `GET /api/project-documentation/summary?year`. PUT bersifat upsert per periode; field opsional; URL kosong menjadi `NULL`; periode berasal dari path/query, bukan body.
- **RBAC:** `DOCUMENTATION_VIEW` (Admin, Head Office, Management, Project); `DOCUMENTATION_MANAGE` (Admin, Head Office, Project). Management read-only; Admin, Head Office, dan Project dapat mengelola.
- **UI:** tabel 8 kolom, inline edit, audit per minggu, search, dan PDF A4 landscape pada Rekap Bulanan; filter tahun/bulan memicu fetch ulang. Summary read-only memakai warna 5/5 hijau, 1–4/5 amber, 0/5 abu-abu.
- **Runtime PASS (Owner, 4 role):** filter tahun/bulan dan tabel semua project; simpan 5 URL + catatan dengan audit per minggu; URL kosong tampil `—` dan URL invalid menampilkan error per baris; simpan tanpa perubahan tidak mengubah timestamp; Summary 12 bulan dengan `0/5`; PDF A4 landscape dengan filter line periode; Management read-only sedangkan Admin/Head Office/Project manage; sidebar accordion terbuka pada kedua route; desktop + mobile.
- **Migration:** `0018_project_documentations` **APPLIED** (Owner-confirmed); `0019_project_documentation_period` **APPLIED** (Owner-confirmed 10 November 2026); journal saat itu 20 entry (kini 22 entry).
- **Verifikasi:** `tsc` PASS, `eslint` PASS, `npm test` **233/233 PASS** (saat itu; 59 suite; 58 test PDOC di 6 file; total kini 245/245), `git diff --check` PASS. Runtime visual + RBAC 4 role **PASS** (Owner-confirmed 10 November 2026).
- **Detail:** `DL-2026-11-10-03` (runtime PASS), `DL-2026-11-10-02` (historis), `DL-2026-11-10-01` (historis), `docs/design/PDOC_MONTHLY_IMPACT_ANALYSIS.md`, `docs/design/PDOC_P3_DELTA_MONTHLY.md`.

## 9. Berkas — Ajukan, Verifikasi, PDF, Reject & Revisi (Sprint 1 & 2 + Final Polish)

**Status:** `IMPLEMENTED & VERIFIED` — Sprint 1 V1 diuji Owner di Vercel (runtime PASS, 10 November 2026); Sprint 2 dan final polish selesai dengan static checks PASS (251/251, 60 suite); migration `0020`–`0023` **APPLIED**. **Notifikasi Sidebar**, **Footer WIKA**, dan **Garis Merah** sudah `IMPLEMENTED & VERIFIED` melalui test otomatis dan pemeriksaan statis.

- **Cakupan:** satu dokumen PDF pengajuan per record. Pemohon mengunggah PDF asli (≤20 MB, 1–200 halaman) beserta TTD penyusun; dua validator menandatangani berurutan; sistem membuat cover A4 landscape, menggabungkannya dengan PDF asli, lalu menyediakan viewer read-only dan unduhan berwatermark NIP. Kode Seri tampil di pojok kanan atas cover, dan Admin dapat menghapus record beserta objek turunannya.
- **Model:** `berkas_pengajuan` (status `MENUNGGU_TTD_1` → `MENUNGGU_TTD_2` → `SELESAI`/`DITOLAK`, `version`, metadata PDF asli/generated, `catatan` ≤2.000, `kode_seri` ≤100, `rejection_reason` 1–2.000, `rejected_at`, `rejected_by`, `revision_count` ≥0), `berkas_penyusun` (maks 4, urutan dan user unik per berkas, TTD wajib PNG/JPEG ≤2 MB), `berkas_validasi` (tepat 2 slot, validator berbeda, TTD opsional sampai giliran). CHECK menjaga konsistensi status ↔ `completed_at`, generated PDF, dan rejection state.
- **API:** `GET`/`POST /api/berkas`, `GET /api/berkas/notifications`, `POST /api/berkas/upload-token` (token unggah Blob privat per prefix), `GET /api/berkas/user-options`, `POST /api/berkas/[id]/ttd`, `POST /api/berkas/[id]/reject`, `PUT /api/berkas/[id]/revisi`, `GET /api/berkas/[id]/view` (original atau `?type=generated`), `GET /api/berkas/[id]/download`, dan `DELETE /api/berkas/[id]` (Admin-only). Route TTD, download, reject/revisi, notifikasi, dan delete memakai `runtime = "nodejs"`; response privat `no-store`.
- **RBAC:** `BERKAS_VIEW` dan `BERKAS_DOWNLOAD` (Admin, Head Office, Management, Project); `BERKAS_CREATE` dan `BERKAS_VALIDATE` (Admin, Head Office, Management); `BERKAS_DELETE` hanya Admin melalui super-application. Validasi bersifat record-scoped — pemegang `BERKAS_VALIDATE` tetap harus validator yang ditugaskan pada record. Download menolak user tanpa NIP (403 `NIP_REQUIRED`).
- **PDF Engine:** `pdf-lib` di server. Cover A4 landscape 842 × 595 pt dengan logo, judul (maks 3 baris), dan tabel tanda tangan 3 kolom memakai grid strict (lebar kolom tetap; tinggi baris header 28, nama 30, jabatan 34, TTD 80, tanggal 16 pt). Kode Seri (≤100 karakter) digambar Helvetica Bold 9 pt rata kanan tepat di atas garis atas tabel, hanya bila terisi. Merge dilakukan sekali saat Validator 2 menandatangani. Watermark `NIP: <nip>` diagonal 45°, abu-abu, opacity 0,15, ditempel per halaman saat download sehingga cover tidak dibangun ulang.
- **UI:** sidebar **Berkas** dengan submenu **Ajukan** dan **Verifikasi**; `/dashboard/berkas` redirect ke `/ajukan`; `layout.tsx` menjaga `BERKAS_VIEW`. Form ajukan (PDF asli, penyusun, jabatan manual, dua validator, input Kode Seri opsional), modal TTD, halaman verifikasi dengan catatan verifikator, viewer `pdfjs-dist` berbasis `<canvas>` dengan worker dari `public/pdfjs/`, serta tombol/modal hapus khusus Admin pada tabel Ajukan.
- **Migration:** `0020_berkas_pengajuan` (3 tabel, 5 FK, 7 index + unique constraint, 22 CHECK), `0021_berkas_catatan` (kolom `catatan` + CHECK ≤2.000), `0022_berkas_kode_seri` (kolom `kode_seri` + CHECK 1–100), dan `0023_berkas_sprint2` (status `DITOLAK`, kolom rejection/revision, CHECK, partial unique index `kode_seri`) — seluruhnya **APPLIED** (Owner-confirmed; `0020`–`0022` melalui runtime Vercel); journal 24 entry.
- **Verifikasi:** `tsc` PASS, `eslint` PASS, `npm test` **251/251 PASS** (60 suite; termasuk test cover/garis merah/footer WIKA dan posisi kode seri), `git diff --check` PASS. Runtime Vercel V1 **PASS** (Owner-confirmed 10 November 2026): pengajuan, verifikasi berurutan, cover landscape, kode seri, watermark NIP, viewer, dan delete Admin.
- **Detail:** `DL-2026-11-12-03` (Sprint 2 & final polish); `DL-2026-11-10-07` (V1 final); `DL-2026-11-10-06` (historis); desain `docs/design/BERKAS_P3_TECHNICAL_DESIGN.md`.

### Sprint 2 & Final Polish (12 November 2026)

- **Database:** migration `0023_berkas_sprint2` menambah status `DITOLAK`, kolom `rejection_reason`, `rejected_at`, `rejected_by`, `revision_count`, CHECK rejection/status, dan partial unique index `kode_seri`. Migration **APPLIED**; journal 24 entry.
- **Reject & revisi:** `POST /api/berkas/[id]/reject` untuk Admin atau validator slot aktif; `PUT /api/berkas/[id]/revisi` hanya untuk pemohon/Admin, memvalidasi PDF baru dan page count server-side, mereset ke `MENUNGGU_TTD_1`, mengosongkan TTD validator, dan menaikkan `revision_count`.
- **Pagination & search:** `GET /api/berkas?search=&page=&limit=` mengembalikan `data`, `assignments`, dan `pagination`; halaman Ajukan/Verifikasi memakai kontrol search debounce dan navigasi halaman.
- **Orphan blob cleanup:** `cleanupBerkasBlobs()` best-effort dipanggil pada create gagal, TTD gagal, revisi, dan delete; pathname yang masih dimiliki record lain tidak dihapus.
- **Server-side page count:** PDF asli dan PDF revisi dihitung dengan `pdf-lib` sebelum record/commit disimpan.
- **Preview watermark:** tombol Preview pada File Generate memanggil `GET /api/berkas/[id]/view?type=generated`; route dan download memakai `getWatermarkedGeneratedPdf()` yang sama sehingga watermark NIP identik.
- **Info pengunggah:** tabel Ajukan menampilkan ikon tautan, nama pemohon, dan tanggal dibuat dengan format PDOC (`Oleh: Nama, 12 Nov 2026`); klik judul tetap membuka PDF original.
- **Cover styling:** garis merah 2 pt di bawah judul dan footer biru gelap 35 pt berisi dua baris peringatan hak cipta WIKA, khusus halaman cover.
- **Notifikasi Sidebar:** endpoint `GET /api/berkas/notifications` mengembalikan `{ needsAction }`; badge merah pada accordion Berkas dan submenu Ajukan/Verifikasi, diperbarui saat route berubah dan setiap 30 detik.
- **UI:** dialog Revisi menampilkan alasan penolakan dan upload PDF baru; dialog Tolak mewajibkan alasan ≤2.000 karakter; baris `DITOLAK` tidak menampilkan aksi TTD.
- **Verifikasi:** `npx tsc --noEmit` PASS, ESLint file terkait PASS, `npm test` **251/251 PASS** (60 suite), `git diff --check` PASS. Runtime browser alur Sprint 2/final polish belum direproduksi pada pass dokumentasi ini.
- **Detail:** `DL-2026-11-12-03`.

## 10. Langkah Berikutnya

1. Final acceptance Owner/ChatGPT atas `DL-2026-11-12-03` (Berkas Sprint 2 + final polish).
2. Smoke test browser untuk Revisi, Tolak, preview watermark, badge Sidebar, dan cover PDF.
3. Modul berikutnya: Dashboard SASAA (belum dimulai).
4. Pemeliharaan: pantau drift schema (snapshot `0023` tersedia) dan perilaku PDF pada perubahan berikutnya.
