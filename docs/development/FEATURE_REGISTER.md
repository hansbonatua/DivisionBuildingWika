# FEATURE REGISTER — BDWIKA / WIBEX

Register fitur dan perubahan perilaku yang dikelola melalui alur audit → approval → implementasi.
Status memakai: `COMPLETE AND VERIFIED` · `IMPLEMENTED BUT NOT FULLY VERIFIED` · `PARTIALLY IMPLEMENTED` · `NOT STARTED` · `PLACEHOLDER` · `UNKNOWN`.

## 1. Ringkasan

| Feature ID | Nama | Area | Status | Commit |
|---|---|---|---|---|
| `LP-NAV-001` | Navbar landing: tautan section + SUSTAINABILITY (tab baru) | Landing | COMPLETE AND VERIFIED | `84e0a90` |
| `LP-NAV-002` | **WIBEX Portal membuka `/login` di tab baru** | Landing | **IMPLEMENTED BUT NOT FULLY VERIFIED** | belum di-commit |
| `LP-CLIENTS-001` | Kartu Our Client dapat diklik + sanitizer URL | Landing | IMPLEMENTED BUT NOT FULLY VERIFIED | belum di-commit (perubahan lama) |
| `LP-SOCIAL-001` | Media Sosial: tautan Instagram tab baru | Landing | COMPLETE AND VERIFIED | `84e0a90` |
| `CMS-HERO` | Hero CMS | CMS | COMPLETE AND VERIFIED | — |
| `CMS-PROJECT` | Our Project CMS + modal detail | CMS | COMPLETE AND VERIFIED | `84e0a90` |
| `CMS-GREEN` | Green Building CMS | CMS | IMPLEMENTED (data publik 0 item) | — |
| `CMS-SOCIAL` | Media Sosial CMS | CMS | COMPLETE AND VERIFIED | — |
| `CMS-CLIENT` | Our Client CMS | CMS | COMPLETE AND VERIFIED | — |
| `ENT-AUTH` | Login NIP + sesi + lockout | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-USER` | User control + RBAC | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-PROKER` | Program Kerja + summary + PDF | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-TEMPLATE` | Template & Form (dokumen privat) | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-MASTER` | Master Project | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-ENGDB` | Engineering Databases | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-MSL` | MSL Engineering (protected) | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-ORG` | Struktur Organisasi (protected) | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-KNOW` | **Knowledge Management V2** (Lesson Learn, Best Practice / KI KM, VA/VE) | Enterprise | **IMPLEMENTED & VERIFIED** — V1→V2 via drop+rebuild; `0015_knowledge_management_v2_fresh` APPLIED 2026-11-05; RBAC 4 role PASS (Admin, Head Office, Management, Project — Owner confirmed 2026-11-09). Enhancement 2026-11-05: View modal, PDF (tabel + per-record), filter tahun, search proyek. Lihat DL-2026-11-05-03, DL-2026-11-09-01 | belum di-commit |
| `ENT-MKS` | **Metode Kerja Standar** (summary + 6 disiplin A–F, PIC multi, reorder, PDF) | Enterprise | **IMPLEMENTED & VERIFIED** — `0016_metode_kerja_standar` APPLIED; static checks PASS (122/122); runtime fitur, UI tabel (Summary grouping + merge Sub-Kategori) PASS; RBAC 4 role PASS (Owner confirmed 2026-11-09). Lihat `DL-2026-11-08-01`, `DL-2026-11-09-01` | belum di-commit |
| `ENT-CST` | **Calculation Sheet Template V1** (master reference flat, 7 kategori, inline editing, PIC Head Office) | Enterprise | **IMPLEMENTED & VERIFIED** — `0017_calculation_sheet_templates` **APPLIED**; static checks PASS (233/233 total; suite CST PASS); runtime browser 4 role PASS (Owner-confirmed 10 November 2026): 7 kategori + header `colSpan` + sidebar, inline Create/Edit/Delete, URL invalid ditolak, duplikasi kode ditolak; Admin & Head Office manage, Management & Project read-only. Lihat `DL-2026-11-10-04`; `DL-2026-11-09-02` historis | `5636113` |
| `ENT-PDOC` | **Project Documentation V1 + Monthly Delta** (rekap bulanan, filter tahun/bulan, summary 12 bulan, audit per minggu, inline editing, search, PDF) | Enterprise | **IMPLEMENTED & VERIFIED** — runtime browser 4 role PASS (Owner-confirmed 10 November 2026); **0018 + 0019 APPLIED**; static checks PASS (233/233, 59 suite; 58 test PDOC di 6 file); rekap/inline/audit/Summary/PDF/filter/accordion PASS; Management read-only, Admin/Head Office/Project manage. Lihat `DL-2026-11-10-03`; `DL-2026-11-10-02` historis | `a7527e1`; docs `062f8d4` |
| `ENT-BERKAS` | **Berkas** — Ajukan & Verifikasi PDF: cover A4 landscape, TTD penyusun + 2 validator, kode seri, viewer canvas, watermark NIP, delete Admin | Enterprise | **IMPLEMENTED & VERIFIED** — runtime Vercel PASS (Owner-confirmed 10 November 2026); migration `0020` + `0021` + `0022` **APPLIED**; static checks PASS (248/248, 60 suite); pengajuan, verifikasi berurutan, PDF landscape, kode seri, watermark NIP, dan delete Admin PASS. Lihat `DL-2026-11-10-07`; `DL-2026-11-10-06` historis | `1668685`; `0805776` |
| `ENT-SASAA` | Dashboard SASAA | Enterprise | NOT STARTED | — |
| `GOV-WIBEX-001` | **WIBEX Development Governance** — standar organization-wide | Governance | **COMPLETE AND VERIFIED** — **APPROVED & EFFECTIVE**; Approved by Owner 10 November 2026; workflow operasional turunan resmi; tidak ada perubahan source/DB | belum di-commit |

## 2. Detail `LP-NAV-002` — WIBEX Portal New Tab Behavior

**Latar belakang.** Tombol WIBEX Portal di navbar landing membuka `/login` di tab yang sama sehingga pengguna meninggalkan landing page. Tombol SUSTAINABILITY di komponen yang sama sudah membuka tab baru. Perilaku disamakan.

**File yang diubah.** `src/components/landing/Navbar.tsx` — satu elemen `<Link href="/login">` pada CTA kanan header (+2 baris).

**Perubahan.**
- `target="_blank"` → dokumen tujuan dibuka di tab baru.
- `rel="noopener noreferrer"` → menutup akses `window.opener` dan konsisten dengan tautan eksternal lain di komponen ini.

**Yang tidak berubah.** Komponen tetap Next.js `Link`; URL tetap `/login`; className, ukuran, warna, posisi, ikon, dan teks tidak berubah; tombol SUSTAINABILITY tidak disentuh; alur autentikasi, API, database, storage, dan konfigurasi tidak berubah.

**Alasan teknis.** `next/dist/client/app-dir/link.js` (baris 45–56) memperlakukan `target` selain `_self` sebagai navigasi browser, bukan `router.push`. Karena itu dua atribut cukup tanpa mengganti komponen atau menambah handler.

**Hasil verifikasi.**
- TypeScript `npx tsc --noEmit` → exit 0 (PASS).
- ESLint `npx eslint src/components/landing/Navbar.tsx` → exit 0 (PASS).
- `git diff --check` → exit 0 (PASS).
- Diff hanya menambah dua baris pada elemen Portal.
- Browser: klik Portal tidak menavigasi tab landing (tetap `/`); markup ter-render `target="_blank"` + `rel="noopener noreferrer"`; SUSTAINABILITY tetap sama; mobile 390×844 tidak berubah.
- Keterbatasan: tab baru tidak muncul pada daftar tab terkelola tooling, sehingga isi `/login` di tab baru belum diamati langsung.

**Status.** `IMPLEMENTED BUT NOT FULLY VERIFIED` — kode & tooling hijau, konfirmasi visual tab baru menunggu pemeriksaan manual.

**Commit.** Belum di-commit (instruksi task: no commit/push).

## 3. Detail `ENT-KNOW` — Knowledge Management (V1 → V2)

> **V2 (5 November 2026).** Model V1 digantikan **drop+rebuild**: multiple records per project/kategori, form modal Add/Edit, evidence exactly-one, optimistic concurrency berbasis `version` integer, dan permanent delete. `0015_knowledge_management_v2_fresh` **APPLIED** di `neondb`; journal 16 entry. Seluruh rincian V1 di bawah ditandai **SUPERSEDED** dan dipertahankan sebagai sejarah. V1.1: **SUPERSEDED by V2** — lihat `DL-2026-11-05-02` (commit V1 `c75d426` tercatat di `DL-2026-11-05-01`).
>
> **Status V2.** `IMPLEMENTED & VERIFIED` — API 71/73 lalu dua temuan diperbaiki di E+ (updated_by null saat create, pesan validasi spesifik); concurrency 4/4 PASS; regresi 7/7 PASS; runtime browser Admin PASS (gate Owner); RBAC 4 role PASS (Admin, Head Office, Management, Project — Owner confirmed 9 November 2026, `DL-2026-11-09-01`).

### Enhancement 2026-11-05 (P4) — View, PDF, Filter, Search

**Status.** `IMPLEMENTED & VERIFIED` — empat fitur enhancement terimplementasi; runtime Admin PASS; RBAC 4 role PASS (**Owner confirmed** 9 November 2026). Detail: `DL-2026-11-05-03`, `DL-2026-11-09-01`.

**Perubahan.**
- F-01: modal View read-only (`KnowledgeViewDialog`) dengan focus trap, Escape/backdrop, dan data dari record yang sudah dimuat (tanpa fetch baru).
- F-02a: PDF per-record A4 portrait dari modal View.
- F-02b: PDF seluruh tabel A4 landscape dari header page; hanya record yang lolos filter yang dicetak.
- F-03: filter tahun client-side dari record ter-muat.
- F-04: search dropdown proyek single-select dari record ter-muat (bukan `project-options`, yang Manage-only dan dibatasi 50).
- D-KM-ENH-04: kolom Aksi selalu render; **Lihat** untuk semua role, **Edit** hanya Manage.

**File.** Add `KnowledgeViewDialog.tsx`, `KnowledgeFilterToolbar.tsx`, `KnowledgeProjectCombobox.tsx`, `knowledgeExportPdf.ts`, `knowledgeExportPdf.test.ts`; modify `KnowledgeTable.tsx`, `types.ts`, `types.test.ts`, `KnowledgeFormDialog.tsx` (hanya ekstraksi combobox).

**Tidak berubah.** API, schema, migration, database, MSL/Org; tidak ada dependency baru. Filter dan PDF sepenuhnya client-side.

**Verifikasi.** `tsc` PASS, `eslint` PASS, `npm test` 60/60 PASS (16 test enhancement baru), `git diff --check` PASS (semua Freebuff); runtime Admin dan cleanup PASS (**Owner confirmed**).

### Detail V1 (historis — SUPERSEDED)

**Kebutuhan.** Tiga submenu (Lesson Learn, Best Practice / KI KM, VA/VE) di bawah item top-level **Knowledge Management** — sibling Program Kerja, bukan accordion di dalamnya (restrukturisasi navigasi 4 November 2026). Setiap tabel menampilkan seluruh Master Project, isi knowledge multiline, banyak evidence (nama + URL), dan banyak PIC Head Office. Satu proyek maksimal satu data per submenu.

**Keputusan teknis.**
- Satu tabel `knowledge_entries` + `UNIQUE(project_id, knowledge_type)`, bukan tiga tabel identik: kolom sama, pembeda hanya `knowledge_type`.
- Baris tabel berasal dari Master Project (`LEFT JOIN`), bukan dari tabel knowledge. Tidak ada placeholder, proyek baru otomatis muncul.
- Inline table editing: content + PIC disimpan bersama per baris; evidence dikelola satu per satu lewat endpoint sendiri sehingga tidak pernah saling menimpa.
- Evidence (`knowledge_evidence`) dan PIC (`knowledge_pics`) sebagai tabel anak. PIC diganti atomik dalam transaksi inline save; evidence ditulis per baris (`POST`/`PATCH`/`DELETE`).
- `project_id` **ON DELETE RESTRICT**: Master Project dengan knowledge tidak bisa di-hard-delete (409), sehingga knowledge tidak hilang diam-diam.
- Namespace route terpisah `/dashboard/knowledge-management/*` dengan guard sendiri; `PROGRAM_KERJA_VIEW` tidak diubah sehingga Project tetap tidak bisa membuka halaman Program Kerja lain.
- PIC: hanya role Head Office, **tanpa filter status** (suspended tetap eligible), disimpan sebagai `user_id`.

**File utama.** `src/lib/knowledge-management/{access,schema,conflict,repository,service}.ts`, 6 route di `src/app/api/knowledge-management/**`, layout + 3 halaman di `src/app/dashboard/knowledge-management/**`, `src/components/dashboard/knowledge-management/KnowledgeTable.tsx`, `DashboardSidebar.tsx`, `permissions.ts`, `pg/schema.ts`, `drizzle/0013_knowledge_management.sql`, `drizzle/0014_knowledge_pic_minimum.sql`.

**Verifikasi.** `npx tsc --noEmit` PASS · ESLint seluruh file berubah PASS · `npm test` PASS (39/39, termasuk 16 test navigasi sidebar) · `npx next build` PASS · `npx drizzle-kit check` PASS. **Browser:** Head Office navigasi **PASS** (desktop/mobile/active route); Admin, Management, Project **NOT RUN** (tanpa sesi/kredensial).

**Status.** `IMPLEMENTED BUT NOT FULLY VERIFIED`.

### Remediasi second-pass (4 November 2026)

| Temuan | Status | Perubahan |
|---|---|---|
| KM-01 — default array destruktif | **FIXED** | `picIds` wajib (min 1); evidence dikeluarkan dari payload inline sehingga tidak bisa terhapus oleh save konten |
| KM-02 — hapus seluruh record di luar scope | **DISABLED** | Tombol Hapus dihapus dari tabel; route `DELETE /entry/[id]` → 405; hapus evidence per baris tetap tersedia |
| KM-03 — silent concurrent overwrite | **VERIFIED (Admin)** | Token `expectedUpdatedAt` string UTC **presisi mikrodetik** (tanpa konversi `Date`) + UPDATE terjaga `WHERE updated_at = token::timestamptz`; token basi/sama-milidetik → 409 + tombol muat ulang. Timestamp baru monotonic ketat (`GREATEST(clock_timestamp(), updated_at + 1µs)`). Runtime Admin PASS; uji HTTP paralel dan role lain belum dijalankan |
| KM-04 — content wajib | **PENDING BUSINESS DECISION** | Tidak diubah; lihat catatan perubahan yang diperlukan di bawah |
| KM-06 — pesan 409 Master Project | **FIXED** | Pesan menyebut Knowledge Management |
| KM-08 — FK violation → 500 | **FIXED** | 23503/23001 dipetakan ke 409 dengan pesan jelas |

**Status acceptance (4 November 2026).** Admin: **PASS**. Monotonic timestamp: **PASS** (unit + SQL proof). Uji HTTP dua penulis simultan: **NOT RUN** (tidak ada DB uji terisolasi; fixture produksi tambahan tidak disetujui). Head Office, Management, Project: **PASS** — runtime 4 role **Owner confirmed** 9 November 2026 (pada pencatatan 4 November ketiganya belum diuji karena kredensial/handoff belum tersedia).

**KM-04 — diputuskan 4 November 2026.** Owner menetapkan content **wajib** (bukan opsional), sehingga CHECK `knowledge_entries_content_check` dan `min(1)` di Zod **tetap dipertahankan**. Tidak ada migration yang diperlukan untuk content; migration `0014` hanya menambah penjaga PIC minimal satu.

### Pembaruan business requirement (4 November 2026)

| Aturan | Implementasi |
|---|---|
| Inline table editing (pola MSL Engineering) | Content + PIC diedit per baris di tabel; Simpan/Batal di kolom Aksi |
| Content wajib, tidak boleh kosong | Zod `min(1)` + CHECK database (sudah ada) + guard UI |
| PIC minimal satu, role Head Office | Zod `min(1)` + service (role & keberadaan user) + constraint trigger `0014` |
| Semua status akun Head Office eligible | PIC options tanpa filter status; label "(non-aktif)" |
| Evidence opsional dan boleh kosong | Bukan bagian payload inline; tanpa evidence tetap sah |
| Evidence ditambahkan kapan saja | `POST /[projectId]/[type]/evidence`; record harus ada |
| Multiple PIC & multiple evidence | Tetap didukung (maks 50 PIC, unlimited praktis untuk evidence) |
| Evidence tidak mengubah content/PIC | Endpoint evidence terpisah, tidak menulis `knowledge_entries`/`knowledge_pics` |
| Optimistic concurrency dipertahankan | Token `expectedUpdatedAt` pada inline save; evidence tidak mengubah token |
| Hapus seluruh record tetap nonaktif | `DELETE /entry/[id]` → 405, tombol Hapus record tidak ada |

## 4. Detail `GOV-WIBEX-001` — WIBEX Development Governance

**Kebutuhan.** Menetapkan satu standar kerja yang berlaku untuk seluruh proyek, modul, fitur, perubahan, dan pemeliharaan WIBEX — bukan hanya Knowledge Management V1.1. Standar harus mengatur peran, lifecycle, review gate, bukti, keamanan perubahan, Git/deploy, dokumentasi, dan final acceptance.

**Dokumen kanonik.** `docs/development/WIBEX_DEVELOPMENT_GOVERNANCE.md`.

**Dokumen operasional turunan.** `docs/development/WIBEX_ENGINEERING_WORKFLOW.md` — memuat konteks teknis dan langkah rinci; tunduk pada governance dan tidak boleh melemahkannya.

**Keputusan inti.**
- Owner = decision maker; ChatGPT = technical reviewer; Freebuff = implementer.
- Prinsip: **Freebuff mengerjakan, ChatGPT mengevaluasi, Owner menyetujui.**
- Setiap phase wajib melewati review gate: **PASS / CONDITIONAL / FAIL**.
- Status verifikasi: **PASS / FAIL / NOT RUN / NOT APPLICABLE / HISTORICAL**.
- Status final: **IMPLEMENTED & VERIFIED / IMPLEMENTED BUT NOT FULLY VERIFIED / BLOCKED / NOT ACCEPTED**.
- Cakupan: 12 area pekerjaan WIBEX, termasuk database, API, frontend, RBAC, integrasi, deployment, regresi, technical debt, dan dokumentasi.
- Change safety: lindungi pekerjaan lokal, jangan reset/stash/overwrite tanpa otorisasi, verifikasi target DB, migration harus punya strategi data dan rollback.
- Git/deploy: tanpa instruksi Owner — no commit, no push, no deploy, no production release.
- Dokumentasi: gunakan dokumen existing, hindari duplikasi, jangan menandai selesai tanpa bukti.

**Penerapan pertama.** Knowledge Management V1.1. Statusnya **APPROVED SPECIFICATION / READY FOR IMPLEMENTATION**, bukan fitur yang sudah selesai; V1 tetap menjadi kondisi runtime aktual sampai implementasi V1.1 disetujui dan diverifikasi.

**Status review.** Preliminary technical review ChatGPT selesai dan koreksi diterapkan. Owner (Hans) menyetujui Governance dan Engineering Workflow pada **10 November 2026**; status governance menjadi **APPROVED & EFFECTIVE** dan status register **COMPLETE AND VERIFIED**.

**Batasan.** Perubahan ini murni dokumentasi. Tidak ada perubahan source code, database, migration, API, frontend, deployment, commit, atau push.

## 5. Detail `ENT-BERKAS` — Modul Berkas (Ajukan & Verifikasi)

**Status.** `IMPLEMENTED & VERIFIED` — runtime Vercel PASS (Owner-confirmed 10 November 2026); static checks PASS (248/248, 60 suite); migration `0020`, `0021`, dan `0022` **APPLIED**. Detail: `DL-2026-11-10-07`; `DL-2026-11-10-06` historis.

**Alur.** Pemohon mengunggah satu PDF asli (≤20 MB, 1–200 halaman) beserta TTD penyusun; record lahir berstatus `MENUNGGU_TTD_1`. Validator 1 menandatangani → `MENUNGGU_TTD_2`; Validator 2 menandatangani → cover A4 landscape dibuat, digabung dengan PDF asli, disimpan sebagai generated PDF, lalu status `SELESAI`. Kode Seri opsional (≤100 karakter) tampil di pojok kanan atas cover. Viewer menampilkan PDF asli secara read-only; unduhan memakai generated PDF berwatermark `NIP: <nip>` diagonal 45° (abu-abu, opacity 0,15) per halaman. Admin dapat menghapus record beserta objek turunannya.

**Model.** `berkas_pengajuan` (termasuk `catatan` ≤2.000 dan `kode_seri` ≤100) + `berkas_penyusun` (maks 4) + `berkas_validasi` (tepat 2, validator berbeda). Migration `0020_berkas_pengajuan` menambah 3 tabel, 5 FK, 7 index + unique constraint, dan 22 CHECK; `0021_berkas_catatan` menambah `catatan`; `0022_berkas_kode_seri` menambah `kode_seri` + CHECK 1–100. Journal 23 entry; ketiga migration **APPLIED**.

**API.** `GET`/`POST /api/berkas`, `POST /api/berkas/upload-token`, `GET /api/berkas/user-options`, `POST /api/berkas/[id]/ttd`, `GET /api/berkas/[id]/view`, `GET /api/berkas/[id]/download`, dan `DELETE /api/berkas/[id]` (Admin-only). TTD, download, dan delete memakai `runtime = "nodejs"`; pathname Blob privat tidak pernah dikirim ke client.

**RBAC.** `BERKAS_VIEW` dan `BERKAS_DOWNLOAD` (Admin, Head Office, Management, Project); `BERKAS_CREATE` dan `BERKAS_VALIDATE` (Admin, Head Office, Management); `BERKAS_DELETE` hanya Admin lewat super-application. Validasi bersifat record-scoped: permission saja tidak cukup, actor harus validator yang ditugaskan; download menolak user tanpa NIP (403 `NIP_REQUIRED`).

**Dependency.** `pdf-lib` `^1.17.1` (server: cover, merge, watermark) dan `pdfjs-dist` `^6.5.438` (viewer canvas, worker di `public/pdfjs/`).

**Verifikasi.** `tsc` PASS, `eslint` PASS, `npm test` 248/248 PASS (60 suite; termasuk test posisi kode seri), `git diff --check` PASS. Runtime Vercel **PASS** (Owner-confirmed 10 November 2026): pengajuan, verifikasi berurutan, cover landscape, kode seri, watermark NIP, viewer, dan delete Admin.

**Batasan.** Runtime dijalankan Owner di Vercel; Freebuff tidak mereproduksi sesi tersebut. Delete bersifat sengaja Admin-only dan cascade ke objek turunan. Tidak ada commit/push pada pass dokumentasi ini.
