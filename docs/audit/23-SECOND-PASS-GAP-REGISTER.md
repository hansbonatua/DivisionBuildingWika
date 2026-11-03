# 23 — SECOND-PASS GAP REGISTER

Audit lanjutan (second pass), 3 November 2026. Read-only: tidak ada source, konfigurasi, database, dependency, atau Git history yang diubah.

**Metode.** Setiap klaim dokumentasi diuji ulang terhadap repository: `find`/`grep`/`ls`, pembacaan file aktual, penghitungan handler, dan penelusuran alur `UI → component → route → service → repository`. Status verifikasi memakai: **VERIFIED**, **PARTIALLY VERIFIED**, **INFERRED**, **PERLU VERIFIKASI**, **BELUM DIKETAHUI**.

**Severity.** CRITICAL · HIGH · MEDIUM · LOW · INFO.

## 1. Ringkasan

| Kategori | Jumlah | ID |
|---|---|---|
| Documentation accuracy | 8 | GAP-01 … GAP-08 |
| API / authorization | 2 | GAP-09, GAP-10 |
| Feature / UI completeness | 2 | GAP-11, GAP-12 |
| Database forensic | 2 | GAP-13, GAP-14 |
| Security / quality | 3 | GAP-15 … GAP-17 |
| AI handoff | 1 | GAP-18 |
| Inventory / counts | 2 | GAP-19, GAP-20 |

Tidak ada gap **CRITICAL**. Tiga gap **HIGH**: GAP-01 (jumlah layout guard salah), GAP-04 (guard `pic-options` salah didokumentasikan), GAP-18 (handoff tidak menyebut pola `_helpers`).

---

## 2. Gap Documentation Accuracy

### GAP-01 — Jumlah layout guard salah (16 vs 20)
- **Kategori:** documentation accuracy.
- **Deskripsi:** dokumen 03, 06, 14, dan laporan eksekutif menyebut "16 layout" guard. Repository memiliki **20** file `layout.tsx` di `src/app/dashboard` (1 shell `dashboard/layout.tsx` + 19 layout modul).
- **Lokasi:** `src/app/dashboard/**/layout.tsx`; klaim di `03_SYSTEM_ARCHITECTURE.md` §2/§7, `06_AUTHENTICATION_AND_AUTHORIZATION.md` §2, `14_...` ADR-09 + §3, `FINAL_EXECUTIVE_REPORT.md` §B, `MASTER_PROJECT_INDEX.md`.
- **Bukti:** `find src/app/dashboard -name layout.tsx | wc -l` → **20**; daftar lengkap diverifikasi (clients, engineering-database ×4, green-building, hero, master-project ×3, program-kerja ×3, projects, social-media, template-form ×3, users, dashboard).
- **Informasi kurang:** tidak ada.
- **Dampak:** AI agent dapat melewatkan guard pada modul yang tidak ia hitung; perkiraan cakupan otorisasi menjadi salah.
- **Severity:** HIGH.
- **Rekomendasi:** perbaiki angka menjadi "19 layout modul + 1 layout dashboard"; sebutkan bahwa `manage/new`, `manage/[id]/edit`, dan `[category]/*` punya guard sendiri.
- **Dokumen diperbaiki:** 03, 06, 14, FINAL_EXECUTIVE_REPORT, MASTER_PROJECT_INDEX.
- **Status verifikasi:** VERIFIED.

### GAP-02 — Jumlah komponen dashboard salah (70 vs 59)
- **Kategori:** documentation accuracy.
- **Deskripsi:** `01_REPOSITORY_INVENTORY.md` mencatat 70 file `src/components/dashboard/`; aktual **59**.
- **Lokasi:** `src/components/dashboard/**/*.tsx`.
- **Bukti:** `find src/components/dashboard -name "*.tsx" | wc -l` → 59. Total `src/components` = 68 (59 dashboard + 9 landing).
- **Dampak:** rendah; memengaruhi estimasi ukuran UI dan inventaris.
- **Severity:** MEDIUM.
- **Rekomendasi:** perbaiki angka + catat total 68 komponen.
- **Dokumen diperbaiki:** 01.
- **Status:** VERIFIED.

### GAP-03 — `Navbar` salah diklasifikasikan sebagai Server Component
- **Kategori:** documentation accuracy (rendering).
- **Deskripsi:** `03_SYSTEM_ARCHITECTURE.md` menyatakan `Navbar`, `About`, `Footer` adalah "Server/statis (tanpa state)". `Navbar.tsx` diawali `"use client"` dan memakai `useState` untuk drawer mobile.
- **Lokasi:** `src/components/landing/Navbar.tsx` baris 1–2, 19; klaim di 03 §2.
- **Bukti:** `head -1 Navbar.tsx` → `"use client"`; `About.tsx` dan `Footer.tsx` tidak ber-`"use client"` (server).
- **Dampak:** AI agent dapat menambahkan hook/state ke `Navbar` dengan asumsi server, atau memindahkan logika menu ke server.
- **Severity:** MEDIUM.
- **Rekomendasi:** pisahkan baris: `Navbar` = client (state menu), `About`/`Footer` = server.
- **Dokumen diperbaiki:** 03.
- **Status:** VERIFIED.

### GAP-04 — Guard empat endpoint `pic-options` salah didokumentasikan
- **Kategori:** API / authorization documentation.
- **Deskripsi:** `05_API_DOCUMENTATION.md` menulis `VIEW` untuk `program-kerja`, `master-project`, dan `engineering-database` `pic-options`, serta `MANAGE` untuk `template-form`. Aktual: keempat route hanya memakai `getActor()` (autentikasi), lalu otorisasi dilakukan **di service** — `assertManageAccess` untuk program-kerja, template-form, engineering-database; `assertEditAccess` untuk master-project.
- **Lokasi:** `src/app/api/{program-kerja,template-form,master-project,engineering-database}/pic-options/route.ts`; `src/lib/*/service.ts` (`listProgramKerjaPicOptions` baris 208–216, `listTemplateFormPicOptions` 501–506, `listMasterProjectPicOptions` 308–313, `listEngineeringDatabasePicOptions` 286–293).
- **Bukti:** route memanggil `getActor()` tanpa `getPermittedActor`; service memanggil `assert*Access` sebelum query.
- **Dampak:** pembaca menyimpulkan `VIEW` (mis. Management boleh) padahal Management mendapat 403 untuk program-kerja dan template-form; pengujian otorisasi bisa salah sasaran.
- **Severity:** HIGH (untuk akurasi handoff).
- **Rekomendasi:** tulis "A + MANAGE di service" / "A + EDIT di service"; jelaskan bahwa otorisasi tetap ditegakkan (bukan celah), hanya lapisannya berbeda.
- **Dokumen diperbaiki:** 05, 06.
- **Status:** VERIFIED.

### GAP-05 — Jumlah fitur tidak konsisten (18 vs 19; 16 vs 17 COMPLETE)
- **Kategori:** documentation accuracy.
- **Deskripsi:** `MASTER_PROJECT_INDEX.md` menyebut "18 fitur" pada deskripsi dokumen 07; tabel 07 berisi **19** baris. `FINAL_EXECUTIVE_REPORT.md` menyebut "16 fitur berstatus COMPLETE"; tabel 07 menandai **17** modul COMPLETE (baris 1–17) + 2 NOT STARTED (SASAA, Test/CI).
- **Lokasi:** `07_MODULE_AND_FEATURE_INVENTORY.md` §1; `MASTER_PROJECT_INDEX.md`; `FINAL_EXECUTIVE_REPORT.md` §A.
- **Bukti:** `grep -c "^| [0-9]" 07_...` → 19; hitung status pada tabel.
- **Dampak:** rendah–sedang; memengaruhi laporan status ke manajemen.
- **Severity:** MEDIUM.
- **Rekomendasi:** samakan menjadi 19 item, 17 COMPLETE, 2 NOT STARTED.
- **Dokumen diperbaiki:** index, FINAL_EXECUTIVE_REPORT, 07 (penomoran tetap).
- **Status:** VERIFIED.

### GAP-06 — Dokumen 05 tidak menyebut jumlah method handler (83)
- **Kategori:** documentation accuracy.
- **Deskripsi:** dokumen 05 dan ringkasan menyebut "49 route(handler)". Itu benar sebagai **file** `route.ts`, tetapi file-file itu mengekspor **83** fungsi method (`GET/POST/PATCH/PUT/DELETE`).
- **Lokasi:** `src/app/api/**/route.ts`.
- **Bukti:** `grep -rhoE "export (async )?function (GET|POST|PUT|PATCH|DELETE)" src/app/api | wc -l` → **83**; `find ... -name route.ts | wc -l` → 49.
- **Dampak:** estimasi cakupan dokumentasi/tes bisa meleset 40%.
- **Severity:** MEDIUM.
- **Rekomendasi:** cantumkan "49 file route, 83 method handler" di header dokumen 05.
- **Dokumen diperbaiki:** 05, MASTER_PROJECT_INDEX.
- **Status:** VERIFIED.

### GAP-07 — Working tree pada dokumen 12 sudah kedaluwarsa
- **Kategori:** documentation accuracy.
- **Deskripsi:** dokumen 12 mencatat 4 file landing modified dan `docs/audit/` 17 file. Saat ini **5** file modified (termasuk `Navbar.tsx` untuk CTA Portal) dan dokumentasi bertambah (`docs/audit/` 19 file termasuk 23/24, `docs/development/` 3 file).
- **Lokasi:** `12_GIT_AND_CHANGE_HISTORY.md` §2.
- **Bukti:** `git status -sb`; `git diff --numstat -- src/` → Navbar 2+/0−.
- **Dampak:** risiko AI agent menganggap `Navbar.tsx` bersih lalu menimpanya.
- **Severity:** MEDIUM.
- **Rekomendasi:** perbarui tabel working tree + jumlah insert/delete (109/49 pada 5 file).
- **Dokumen diperbaiki:** 12, CURRENT_PROJECT_STATE.
- **Status:** VERIFIED.

### GAP-08 — Hasil build pada dokumen 11 tidak diberi label historis
- **Kategori:** documentation accuracy.
- **Deskripsi:** baris `npm run build` menampilkan "Compiled successfully in 14.6s" tanpa penanda bahwa itu dijalankan pada sesi audit sebelumnya, bukan pada pemeriksaan terakhir.
- **Lokasi:** `11_TESTING_AND_QUALITY_REPORT.md` §2.
- **Bukti:** hasil tersebut berasal dari eksekusi sesi audit (sebelum perubahan `Navbar.tsx`); pemeriksaan terakhir hanya `tsc`, ESLint file, dan `git diff --check`.
- **Dampak:** pembaca mengira build dijalankan setelah perubahan terakhir.
- **Severity:** LOW.
- **Rekomendasi:** tandai "HISTORICAL (sebelum perubahan CTA Portal)".
- **Dokumen diperbaiki:** 11.
- **Status:** VERIFIED.

---

## 3. Gap API / Authorization

### GAP-09 — Pola `_helpers.ts` per domain tidak terdokumentasi
- **Kategori:** API structure.
- **Deskripsi:** lima domain API memiliki `_helpers.ts` berisi `getActor`, `mapDomainError`, `parseJsonBody`, `isUuid`, `invalidIdResponse` (nama bervariasi). Dokumen 03/05/AI guide tidak menyebut file ini, padahal AI agent wajib menambah helper serupa saat membuat domain API baru.
- **Lokasi:** `src/app/api/{engineering-database,master-project,msl,program-kerja,template-form}/_helpers.ts`. Modul CMS (`heroes`, `clients`, …) memakai helper dari `lib/cms/error-response.ts` / pola berbeda.
- **Bukti:** `find src/app/api -name _helpers.ts` → 5 file.
- **Dampak:** endpoint baru bisa mengembalikan 500 mentah atau status tidak konsisten.
- **Severity:** HIGH (bagi AI agent).
- **Rekomendasi:** dokumentasikan helper + pemetaan status 400/401/403/404/409/502/503 per domain.
- **Dokumen diperbaiki:** 03, 05, AI_DEVELOPER_HANDOFF_GUIDE.
- **Status:** VERIFIED.

### GAP-10 — `apiAuthGuard` ada tetapi tidak dipakai
- **Kategori:** API / dead code.
- **Deskripsi:** `apiAuthGuard()` diekspor dan didokumentasikan di komentar, tetapi tidak ada route yang memanggilnya (0 call site selain definisi dan contoh komentar).
- **Lokasi:** `src/lib/auth/current-user.ts` baris 47–60.
- **Bukti:** `grep -rn "apiAuthGuard()" src` → dua kecocokan: definisi dan komentar contoh.
- **Dampak:** AI agent dapat memakai helper yang tidak teruji alih-alih pola `getActor` yang nyata.
- **Severity:** LOW.
- **Rekomendasi:** hapus atau tandai eksplisit "unused / tidak dipakai route".
- **Dokumen diperbaiki:** 03, 06.
- **Status:** VERIFIED.

---

## 4. Gap Feature / UI Completeness

### GAP-11 — Tautan footer placeholder + email tidak konsisten
- **Kategori:** feature completeness (landing).
- **Deskripsi:** (a) Tiga ikon sosial (LinkedIn/YouTube/X) dan lima tautan legal (`Privacy Policy`, `Terms of Service`, `Compliance & ESG`, `Investor Relations`, `Site Map`) semuanya `href="#"` — tidak menuju mana pun. (b) `mailto:corporate@wibex.co.id` menampilkan teks `wibexwika@gmail.com`, sehingga alamat yang terlihat ≠ alamat yang dihubungi.
- **Lokasi:** `src/components/landing/Footer.tsx` baris 4–10 (`legalLinks`), 148–170 (ikon sosial), 186–187 (email), 199–206 (legal).
- **Bukti:** `grep -n 'href="#"' src/components/landing/Footer.tsx` → 4 kecocokan (3 ikon + loop legal); `grep -n "corporate@wibex\|wibexwika@gmail"` → kedua nilai pada baris berurutan.
- **Informasi kurang:** URL resmi kanal sosial dan halaman legal belum diberikan pemilik produk.
- **Dampak:** tautan mati menurunkan kredibilitas; email yang diklik berbeda dari yang dibaca; pembaca layar mengumumkan tautan tanpa tujuan.
- **Severity:** MEDIUM.
- **Rekomendasi:** ganti dengan URL resmi, atau render sebagai teks non-interaktif sampai URL tersedia; samakan `mailto:` dengan teks yang ditampilkan.
- **Dokumen diperbaiki:** 07, 10, AI_DEVELOPER_HANDOFF_GUIDE.
- **Status:** VERIFIED (kondisi), **PERLU VERIFIKASI** (URL yang benar).

### GAP-12 — Tidak ada route/UI untuk permission `DASHBOARD_SASAA_VIEW`
- **Kategori:** feature gap (sudah tercatat sebagai F-09/18).
- **Deskripsi:** permission `DASHBOARD_SASAA_VIEW` diberikan ke Head Office + Management, tetapi tidak ada route, page, service, atau query yang memakainya.
- **Lokasi:** `src/lib/auth/permissions.ts` baris 36, 79.
- **Bukti:** `grep -rn "DASHBOARD_SASAA" src` → hanya deklarasi + role map.
- **Dampak:** modul yang direncanakan belum ada; jangan diasumsikan ada data SASAA.
- **Severity:** LOW (sudah diketahui), tetap dicantumkan untuk kelengkapan register.
- **Status:** VERIFIED.

---

## 5. Gap Database Forensic

### GAP-13 — Tidak ada UNIQUE domain pada `program_kerja`
- **Kategori:** database constraint.
- **Deskripsi:** `program_kerja` tidak memiliki UNIQUE pada kombinasi yang membentuk identitas bisnis (mis. `group_id + year + name`). Hanya `group_id` FK, CHECK tahun/unit/periode, dan index biasa.
- **Lokasi:** `src/lib/pg/schema.ts` baris 96–140; `drizzle/0001_naive_iron_patriot.sql` dst.
- **Bukti:** schema tidak memuat `unique(` untuk tabel ini; service hanya melempar `ProgramKerjaConflictError` untuk PIC dan aturan unit/periode (grep baris 161–341), bukan duplikasi nama.
- **Informasi kurang:** apakah duplikasi nama program dalam satu grup/tahun sengaja diizinkan (tidak ada komentar yang menyatakannya).
- **Dampak:** data ganda dapat masuk; laporan summary bisa menghitung ganda.
- **Severity:** MEDIUM.
- **Rekomendasi:** konfirmasi ke pemilik; bila duplikat tidak boleh, tambahkan UNIQUE + penanganan 409.
- **Dokumen diperbaiki:** 04, 14.
- **Status:** **PERLU VERIFIKASI** (niat bisnis tidak terbaca dari kode).

### GAP-14 — Kondisi database produksi tetap tidak diketahui
- **Kategori:** database forensic limitation.
- **Deskripsi:** seluruh 13 tabel, constraint, dan index diverifikasi dari `schema.ts` + migration, tetapi tidak ada `SELECT`/`information_schema` yang dijalankan. Drift, row count, index yang benar-benar ada, dan data green building tidak dapat dipastikan.
- **Lokasi:** `src/lib/pg/schema.ts`, `drizzle/*.sql`.
- **Bukti:** tidak ada koneksi DB dibuka (batasan audit read-only).
- **Dampak:** migration yang belum diterapkan di produksi tidak terdeteksi; feed green building kosong bisa berupa data, bukan bug.
- **Severity:** MEDIUM (risiko operasional).
- **Status:** BELUM DIKETAHUI.

---

## 6. Gap Security / Quality

### GAP-15 — Daftar opsi PIC tidak memfilter status akun
- **Kategori:** security/UX.
- **Deskripsi:** untuk Engineering Database, komentar menyatakan `status` sengaja **tidak** difilter di V1 sehingga user `suspended` tetap muncul sebagai opsi PIC. Pola serupa dipakai `listHeadOfficePicOptions` untuk Program Kerja/Template & Form, dan `master-project` (Admin + Head Office) — belum dipastikan apakah ikut memfilter status.
- **Lokasi:** `src/lib/engineering-database/repository.ts` baris 158–168; `src/lib/*/repository.ts` fungsi `listHeadOfficePicOptions`/`listPicOptionRows`.
- **Bukti:** komentar eksplisit "status is intentionally NOT filtered in V1"; query hanya `inArray(users.role, …)`.
- **Dampak:** PIC non-aktif dapat dipilih; RI oleh PIC tersebut tidak mungkin dilakukan (tidak bisa login), sehingga data bisa macet.
- **Severity:** MEDIUM.
- **Rekomendasi:** filter `users.status = 'active'` pada opsi, atau beri label "(non-aktif)".
- **Dokumen diperbaiki:** 06, 10.
- **Status:** PARTIALLY VERIFIED (Engineering DB terverifikasi; tiga modul lain perlu dicek satu per satu).

### GAP-16 — Tidak ada error/loading boundary kustom
- **Kategori:** quality/UX.
- **Deskripsi:** tidak ada `error.tsx`, `global-error.tsx`, `loading.tsx`, atau `not-found.tsx` di `src/app`. Error runtime memakai tampilan default Next.
- **Lokasi:** `src/app/**`.
- **Bukti:** `find src/app \( -name error.tsx -o -name loading.tsx -o -name not-found.tsx -o -name global-error.tsx \)` → kosong.
- **Dampak:** kegagalan DB/Mongo pada halaman tampil sebagai layar default; tidak ada pesan Bahasa Indonesia yang konsisten.
- **Severity:** LOW.
- **Rekomendasi:** tambahkan `app/error.tsx` + `app/not-found.tsx` dengan pesan netral (tanpa stack).
- **Dokumen diperbaiki:** 10, 11.
- **Status:** VERIFIED.

### GAP-17 — Tidak ada rate limit selain login (sudah tercatat)
- **Kategori:** security.
- **Deskripsi:** endpoint mutasi lain tidak memiliki throttle; perlindungan hanya cookie sesi + permission.
- **Lokasi:** seluruh `POST/PATCH/PUT/DELETE` selain `/api/auth/login`.
- **Bukti:** tidak ada middleware/limiter; hanya `login_attempts`.
- **Severity:** LOW.
- **Status:** VERIFIED (duplikat SEC-05; dipertahankan agar register lengkap).

---

## 7. Gap AI Handoff

### GAP-18 — Handoff tidak menyebut `_helpers.ts`, jumlah method, dan guard layout aktual
- **Kategori:** AI handoff.
- **Deskripsi:** `AI_DEVELOPER_HANDOFF_GUIDE.md` mengarahkan "tambah endpoint → `route.ts` (+ `_helpers.ts`)" tetapi tidak menjelaskan isi helper, tidak menyebut 83 method handler, dan menyebut guard layout secara umum tanpa angka. Tiga hal ini adalah sumber kesalahan paling mungkin bagi agent baru.
- **Lokasi:** `AI_DEVELOPER_HANDOFF_GUIDE.md` §3/§4.
- **Bukti:** dokumen vs `find src/app/api -name _helpers.ts` (5 file), hitungan method (83), layout (20).
- **Dampak:** agent dapat membuat helper duplikat, salah menghitung cakupan, atau melewatkan guard.
- **Severity:** HIGH (bagi kualitas handoff).
- **Rekomendasi:** tambahkan peta helper + angka aktual + contoh `mapDomainError` per domain.
- **Dokumen diperbaiki:** AI_DEVELOPER_HANDOFF_GUIDE.
- **Status:** VERIFIED.

---

## 8. Gap Inventory / Counts

### GAP-19 — Jumlah dokumen aktual ≠ asumsi "23 dokumen"
- **Kategori:** documentation inventory.
- **Deskripsi:** saat ini ada **19** dokumen di `docs/audit/` (01–14, index, handoff, executive, 23, 24), **3** di `docs/development/`, **2** audit root, serta `AGENTS.md`, `CLAUDE.md`, `README.md`. Total file Markdown 25. Istilah "23 dokumen utama" pada prompt mengacu pada daftar handoff, bukan jumlah file aktual.
- **Lokasi:** `docs/`, root.
- **Bukti:** `ls -1 docs/audit/*.md docs/development/*.md *.md | wc -l` → 25.
- **Dampak:** rendah; memengaruhi pelacakan kelengkapan.
- **Severity:** INFO.
- **Rekomendasi:** gunakan peta dokumen di `MASTER_PROJECT_INDEX.md` sebagai otoritas, bukan angka.
- **Status:** VERIFIED.

### GAP-20 — Klaim "12 service" benar, tetapi tidak dirinci
- **Kategori:** inventory clarity.
- **Deskripsi:** "12 service" pada dokumen 03/executive terbukti benar: 7 file `service.ts` + 5 file `*.service.ts` (lima modul CMS). Namun rinciannya tidak pernah ditulis, sehingga sulit diaudit ulang.
- **Lokasi:** `src/lib/**/service.ts` dan `src/lib/{heroes,clients,portfolio-projects,green-buildings,social-posts}/*.service.ts`.
- **Bukti:** `find src/lib -name "service.ts"` → 7; `-name "*.service.ts"` → 5.
- **Severity:** INFO.
- **Rekomendasi:** cantumkan daftar di dokumen 03.
- **Status:** VERIFIED.

---

## 9. Area yang Tidak Ditemukan Gap-nya (Diverifikasi Ulang)

| Area | Hasil |
|---|---|
| Skema PostgreSQL | 13 tabel, 23 CHECK, 3 UNIQUE parsial/index unik, 23 index — sesuai dokumen 04 |
| Migration | 13 file, berurutan, aditif; `pg_trgm` di 0004; tidak ada DROP TABLE |
| Permission matrix | 18 permission, 4 role; seluruh baris dokumen 06 cocok dengan `permissions.ts` |
| API method coverage | 83 method nyata = 83 baris terdokumentasi (tidak ada endpoint hilang) |
| Public projection | 5 feed memakai projection eksplisit; tidak ada `blobPathname`/`_id` |
| Secret handling | tidak ada secret di repo; `.env*` ignored; nama env di kode sesuai dokumen 02 |
| Landing empty-first | tidak ada data karangan pada section yang berfetch |
| Storage ownership | aturan `imageSource` + 6 registry referensi sesuai dokumen 09 |
