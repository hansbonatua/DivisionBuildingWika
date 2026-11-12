# DEVELOPMENT MASTER LOG — BDWIKA / WIBEX

Catatan kronologis perubahan yang dikerjakan melalui sesi pengembangan terpandu (audit → approval → implementasi → verifikasi).
Dokumentasi audit repository ada di `docs/audit/`; dokumen ini mencatat **perubahan kode dan/atau dokumentasi/governance**, bukan hasil audit.

---

## DL-2026-11-12-07 — Dashboard SASAA, Kelola Foto & Security Patch

| Field | Nilai |
|---|---|
| Feature ID | `ENT-SASAA` |
| Tanggal | 12 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** — backend dan UI selesai; migration `0026_project_photos` **APPLIED**; build PASS 98 routes; visual Vercel belum dicek |
| Commit | `bb7228f` — `feat(sasaa): implement executive dashboard, photo carousel, and admin photo management`; security patch `package.json`/`package-lock.json` belum di-commit |
| Branch | `main` |
| Baseline | `eb77e1c` + Dashboard SASAA/Kelola Foto + security patch |
| Migration | `0026_project_photos` — **APPLIED** (12 November 2026); journal 27 entry |

### Perubahan
- **Tabel `project_photos`:** menyimpan tepat empat slot foto per proyek dengan `UNIQUE(project_id, slot)`, unique `blob_pathname`, CHECK slot 1–4, validasi URL HTTPS, MIME JPEG/PNG/WEBP/AVIF, dan ukuran 1–5.242.880 byte. FK `project_id` memakai `ON DELETE CASCADE`; audit `created_by`/`updated_by` mengikuti konvensi enterprise.
- **Aggregator API:** `GET /api/dashboard/sasaa` untuk dropdown seluruh proyek dan `GET /api/dashboard/sasaa/[projectId]` untuk agregat foto, MSL, Engineering Database, PDOC, dan Knowledge Management. Query agregat dijalankan paralel; MSL hanya mengekspos skor rata-rata, kategori, jumlah bulan, dan bulan terbaru.
- **API foto Admin:** `POST /api/master-project/photos/upload`, `GET /api/master-project/[id]/photos`, dan `PUT /api/master-project/[id]/photos`. Penggantian foto memakai transaksi database, verifikasi metadata Blob, validasi namespace pathname, dan cleanup Blob lama setelah commit.
- **UI Carousel:** `SasaaPage` dan `ProjectPhotoCarousel` menampilkan empat foto dengan autoplay 6000 ms, pause saat hover/focus, tombol prev/next, indikator dot, hitungan slide, dukungan `prefers-reduced-motion`, serta empty state bila foto belum lengkap.
- **Empat widget:** kartu MSL (skor rata-rata/kategori), Engineering Database (total entri dan kategori), PDOC (minggu terisi dan bulan terdokumentasi), serta Knowledge Management (total dan rincian Lesson Learn/Best Practice/VA-VE). Tersedia skeleton, error/retry, dan state kosong.
- **Kelola Foto Admin:** halaman tabel seluruh Master Project dengan status foto `0/4`–`4/4`; modal empat slot untuk upload, ganti, hapus, preview, progress, dan simpan atomik. Upload browser langsung ke Blob Public; route dan halaman dijaga `MASTER_PROJECT_PHOTOS_MANAGE`.
- **Navigasi/RBAC:** submenu **Dashboard SASAA** dan **Kelola Foto Proyek** di accordion Master Project; `DASHBOARD_SASAA_VIEW` mencakup Admin, Head Office, Management, dan Project, sedangkan `MASTER_PROJECT_PHOTOS_MANAGE` hanya Admin.
- **Security patch:** Next.js dinaikkan ke `16.4.6` dan React/React DOM ke `19.3.1` untuk perbaikan CVE. `npm ls` mengonfirmasi versi terpasang; perubahan dependency masih berada di working tree.
- **Build:** `npx next build` **PASS — 98 routes**.

### File impacted
- Backend: `src/lib/pg/schema.ts`, `src/lib/auth/permissions.ts`, `src/lib/dashboard/{sasaa-service,project-photo-storage}.ts`, `src/lib/master-project/{repository,service}.ts`, route `src/app/api/dashboard/sasaa/*`, dan route `src/app/api/master-project/**/photos/*`.
- Frontend: `src/components/dashboard/DashboardSidebar.tsx`, `src/components/dashboard/sasaa/*`, `src/components/dashboard/master-project/{PhotosManagePage,PhotoUploadDialog,photo-types}.tsx|ts`, dan route `src/app/dashboard/master-project/{sasaa,photos}/*`.
- Data: `drizzle/0026_project_photos.sql`, `drizzle/meta/0026_snapshot.json`, dan `drizzle/meta/_journal.json` (27 entry).
- Dependency: `package.json`, `package-lock.json`.
- Pass dokumentasi ini hanya mengubah tiga dokumen development dan tidak mengubah kode, database, atau API.

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | Freebuff (implementasi) |
| `npx eslint` (file UI/API SASAA) | **PASS** — 0 error, 2 warning `no-img-element` untuk Blob remote | Freebuff (implementasi) |
| `npm test` | **256/256 PASS** (61 suite) | Freebuff (implementasi) |
| `npx next build` | **PASS — 98 routes** | Konteks P8/Owner |
| `git diff --check` | **PASS** | Freebuff (pass dokumentasi) |
| Migration `0026_project_photos` | **APPLIED**; journal 27 entry | Owner-confirmed |
| Runtime visual Vercel | **NOT RUN** | — |

### Batasan
- Visual Vercel, interaksi carousel, dan alur upload/ganti/hapus empat foto belum diperiksa pada pass ini; status sengaja tetap `IMPLEMENTED BUT NOT FULLY VERIFIED`.
- Migration `0026_project_photos` tidak dijalankan ulang pada pass dokumentasi ini; status APPLIED mengikuti konfirmasi konteks P8.
- Security patch `package.json`/`package-lock.json` belum di-commit; pass ini tidak melakukan commit, push, deploy, migration, seed, atau DB write.
- Dokumentasi ini hanya mengubah `docs/development/{CURRENT_PROJECT_STATE,DEVELOPMENT_MASTER_LOG,FEATURE_REGISTER}.md`.

---

## DL-2026-11-12-06 — Dashboard Welcoming (Backend & UI)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-DASHBOARD` |
| Tanggal | 12 November 2026 |
| Status | **IMPLEMENTED & VERIFIED** — commit `eb77e1c` sudah di-push ke Vercel; static checks PASS (256/256, 61 suite); migration `0025_activity_logs` **APPLIED**; log terintegrasi ke Berkas, Master Project, dan PDOC |
| Commit | `eb77e1c` — `feat(dashboard): implement welcoming dashboard UI with stats and activities`; sudah di-push ke Vercel |
| Branch | `main` |
| Baseline | `0805776` + implementasi Dashboard Welcoming |
| Migration | `0025_activity_logs` — **APPLIED** (12 November 2026); journal 26 entry |

### Perubahan
- **Tabel `activity_logs`:** menyimpan `actor_user_id` (nullable), `action`, `entity_type`, `title`, dan timestamp; migration `0025_activity_logs` sudah **APPLIED**.
- **`logActivity()`:** fungsi `logActivity(actorId, action, entityType, title, tx?)` di `src/lib/activity-log/service.ts`; dapat memakai transaksi domain agar log dan perubahan data tersimpan atomik.
- **Integrasi tiga modul:** Berkas (`createBerkas`, submit TTD, reject, revisi, delete), Master Project (create/update/delete), dan PDOC (update dokumentasi).
- **`getDashboardData()`:** query role-scoped untuk statistik, Action Center, dan lima aktivitas terbaru; Project dibatasi pada proyek sebagai PIC, Berkas sebagai pemohon, dan aktivitas sebagai aktor; Admin/Head Office/Management melihat data global.
- **UI Dashboard:** `/dashboard` menjadi Server Component yang memanggil `getCurrentUser()` dan `getDashboardData()`, lalu merender `DashboardView` client. Komponen: `WelcomeCard`, `StatGrid`/`StatCard`, `ActionCenter`, `QuickLinks`, `ActivityFeed`, dan `DashboardSkeleton`; route `loading.tsx` menampilkan skeleton.
- **Empty state:** Action Center menampilkan “Tidak ada tindakan yang dibutuhkan saat ini. Kerja bagus!”; Activity Feed menampilkan “Belum ada aktivitas tercatat”. Statistik yang belum tersedia ditampilkan `-` dan “Tidak tersedia”.

### File impacted
- Backend: `src/lib/pg/schema.ts`, `src/lib/activity-log/service.ts`, `src/lib/dashboard/service.ts`, serta integrasi di `src/lib/berkas/{service,repository}.ts`, `src/lib/master-project/{service,repository}.ts`, dan `src/lib/project-documentation/{service,repository}.ts`.
- Frontend: `src/app/dashboard/{page,loading}.tsx` dan `src/components/dashboard/welcoming/*`.
- Data/docs: `drizzle/0025_activity_logs.sql`, `drizzle/meta/0025_snapshot.json`, `drizzle/meta/_journal.json`, dan tiga dokumen development ini.
- Pass dokumentasi ini hanya mengubah tiga dokumen development dan tidak mengubah kode, database, atau API.

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | Freebuff |
| `npx eslint` (file dashboard) | **PASS** | Freebuff |
| `npm test` | **256/256 PASS** (61 suite) | Freebuff |
| `git diff --check` | **PASS** | Freebuff |
| Migration `0025_activity_logs` | **APPLIED**; journal 26 entry | Owner-confirmed |
| Commit/push Vercel | `eb77e1c` sudah di-push | Owner-confirmed |

### Batasan
- Migration `0025` tidak dijalankan ulang pada pass dokumentasi ini; status APPLIED mengikuti konteks P8 dan konfirmasi Owner.
- Runtime/visual Dashboard Welcoming tidak direproduksi pada pass dokumentasi ini; verifikasi UI mengacu pada static checks dan commit yang sudah di-push.
- Tidak ada commit, push, deploy, migration, seed, atau DB write pada pass ini.

---

## DL-2026-11-12-05 — Berkas Final Polish (Production-Ready)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-BERKAS` |
| Tanggal | 12 November 2026 |
| Status | **IMPLEMENTED & VERIFIED (Production-Ready)** — Audit Readiness dan Final Polish selesai; static checks PASS (256/256, 61 suite); migration `0024_berkas_search_index` **APPLIED** |
| Commit | Belum di-commit; pass dokumentasi ini tidak melakukan commit/push |
| Branch | `main` |
| Baseline | `0805776` + working tree Final Polish |
| Migration | `0024_berkas_search_index` — **APPLIED** (12 November 2026); journal 25 entry |

### Perubahan
- **Index pencarian:** index GIN trigram `berkas_pengajuan_judul_trgm_idx` dan `berkas_pengajuan_kode_seri_trgm_idx` ditambahkan pada schema dan migration `0024_berkas_search_index`; migration sudah **APPLIED**.
- **Validasi TTD:** `assertDecodableTtdImage` memakai `pdf-lib` (`embedPng`/`embedJpg`) untuk memastikan TTD penyusun dan validator benar-benar PNG/JPEG yang dapat didekode; file rusak ditolak dengan error 400 `File TTD rusak atau tidak valid`.
- **Orphan blob:** cleanup pada `createBerkas` (termasuk `failCreate`) sekarang memakai `cleanupBerkasBlobsIfUnreferenced`, sehingga blob yang sudah direferensikan tidak dihapus saat kegagalan/acknowledgment ambigu.
- **Dead code:** `listBerkasRows`, `formatBerkasDate`, dan `berkasStatusNote` dihapus beserta assertion test yang tidak lagi relevan.
- **PDF.js:** folder `standard_fonts` disalin ke `public/pdfjs/standard_fonts/`; `standardFontDataUrl` dikonfigurasi pada viewer dan page-count loader; warning font pada test dibersihkan.
- **Audit Readiness:** seluruh temuan High & Medium ditutup; modul dinyatakan `IMPLEMENTED & VERIFIED (Production-Ready)`.

### File impacted
- Backend: `src/lib/berkas/service.ts`, `src/lib/berkas/repository.ts`, `src/lib/pg/schema.ts`.
- Frontend: `src/components/dashboard/berkas/{client,PdfViewerModal,types}.tsx|ts` dan test terkait.
- Data/docs: `drizzle/0024_berkas_search_index.sql`, `drizzle/meta/0024_snapshot.json`, `public/pdfjs/standard_fonts/`, serta tiga dokumen development ini.
- Pass dokumentasi ini hanya mengubah tiga dokumen development dan tidak mengubah kode, database, atau API.

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | Freebuff |
| `npx eslint` (file Final Polish) | **PASS** | Freebuff |
| `npm test` | **256/256 PASS** (61 suite) | Freebuff |
| `git diff --check` | **PASS** | Freebuff |
| Migration `0024_berkas_search_index` | **APPLIED**; journal 25 entry | Owner-confirmed |
| Audit Readiness High & Medium | **CLOSED** — seluruh temuan diselesaikan | Freebuff + Owner |

### Batasan
- Migration `0024` tidak dijalankan ulang pada pass dokumentasi ini; status APPLIED mengikuti konfirmasi Owner.
- Smoke test browser Sprint 2/final polish tidak direproduksi pada pass dokumentasi ini; verifikasi Final Polish berbasis static checks dan 256 test.
- Tidak ada commit, push, deploy, migration, seed, atau DB write pada pass ini.

---

## DL-2026-11-12-03 — Berkas Sprint 2 & Final Polish

| Field | Nilai |
|---|---|
| Feature ID | `ENT-BERKAS` |
| Tanggal | 12 November 2026 |
| Status | **IMPLEMENTED & VERIFIED** — Sprint 2 dan final polish selesai; static checks PASS (251/251, 60 suite); Sprint 1 runtime Vercel PASS (Owner-confirmed 10 November 2026); smoke test browser untuk fitur baru belum dijalankan pada pass dokumentasi ini |
| Commit | Belum di-commit; working tree memuat perubahan Sprint 2/final polish |
| Branch | `main` |
| Baseline | `0805776` + working tree Sprint 2/final polish |
| Migration | `0023_berkas_sprint2` — **APPLIED** (mengikuti konfirmasi database Sprint 2 sudah dimigrasi); journal 24 entry |

### Perubahan
- **Sprint 2 database:** status `DITOLAK`; kolom `rejection_reason` (1–2.000), `rejected_at`, `rejected_by` (FK users), `revision_count` (default 0, CHECK ≥0); CHECK rejection state; partial unique index `kode_seri` hanya untuk nilai non-null. Migration `0023_berkas_sprint2`.
- **Reject & revisi API:** `POST /api/berkas/[id]/reject` untuk Admin atau validator slot aktif; `PUT /api/berkas/[id]/revisi` hanya pemohon/Admin, memverifikasi PDF baru dan page count server-side, mereset ke `MENUNGGU_TTD_1`, mengosongkan TTD validator, menaikkan `revision_count`, dan membersihkan PDF/TTD lama setelah commit.
- **Pagination & search:** `GET /api/berkas?search=&page=&limit=` mengembalikan `data`, `assignments`, dan `pagination`; UI Ajukan/Verifikasi memakai search debounce 300ms dan navigasi Prev/Next.
- **Orphan blob cleanup:** `cleanupBerkasBlobs()` best-effort, tidak throw, dipanggil pada create gagal, TTD gagal, revisi, dan delete; pathname milik record lain tidak dihapus saat unique-pathname conflict.
- **Server-side page count:** PDF asli dan PDF revisi dihitung dengan `pdf-lib`; batas 1–200 halaman ditegakkan kembali di server.
- **Preview watermark:** `getWatermarkedGeneratedPdf()` dipakai bersama oleh download dan `GET /api/berkas/[id]/view?type=generated`; keduanya memakai watermark NIP yang sama dan response preview `inline`, `private, no-store`.
- **Info pengunggah:** tabel Ajukan menampilkan ikon tautan, `Oleh: [Pemohon], [Tanggal]` dengan format PDOC (`12 Nov 2026`), serta nama/ukuran file; klik judul tetap membuka PDF original.
- **Cover styling:** garis merah 2 pt di bawah judul dan footer biru gelap 35 pt berisi dua baris peringatan hak cipta WIKA, hanya pada halaman cover; `applyWatermark` tidak diubah.
- **Notifikasi Sidebar:** `GET /api/berkas/notifications` mengembalikan `{ needsAction }` dari validator slot aktif dan Berkas `DITOLAK` milik pemohon; badge merah pada accordion Berkas dan submenu Ajukan/Verifikasi, fetch saat mount/route berubah dan interval 30 detik.
- **UI Sprint 2:** dialog Revisi menampilkan alasan penolakan dan upload PDF baru; dialog Tolak mewajibkan alasan ≤2.000 karakter; baris `DITOLAK` tidak menampilkan Upload TTD; status badge `DITOLAK` merah gelap; catatan TTD maksimum 2.000 karakter.

### File impacted
- Backend: `src/lib/pg/schema.ts`, `src/lib/berkas/{schema,repository,service,pdf-engine,access}.ts`, route `src/app/api/berkas/{route,upload-token,notifications}/route.ts`, `src/app/api/berkas/[id]/{ttd,view,download,reject,revisi}/route.ts`.
- Frontend: `src/components/dashboard/berkas/{BerkasAjukanPage,BerkasVerifikasiPage,BerkasRevisiDialog,BerkasRejectDialog,BerkasPagination,PdfViewerModal,types,client,BerkasTtdDialog}.tsx|ts`, route pages Ajukan/Verifikasi, dan `src/components/dashboard/DashboardSidebar.tsx`.
- Data/docs: `drizzle/0023_berkas_sprint2.sql`, snapshot `0023`, `drizzle/meta/_journal.json`, dan tiga dokumen development ini.

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx next typegen` | **PASS** — route type baru tersedia | Freebuff |
| `npx tsc --noEmit` | **PASS** | Freebuff |
| `npx eslint` (Berkas + Sidebar + route baru) | **PASS** | Freebuff |
| `npm test` | **251/251 PASS** (60 suite; termasuk test cover/garis merah/footer WIKA) | Freebuff |
| `git diff --check` | **PASS** | Freebuff |
| Runtime browser Sprint 2/final polish | **NOT RUN pada pass ini** — Sprint 1 V1 runtime Vercel PASS (Owner-confirmed 10 November 2026) | — |
| Migration `0023` | **APPLIED** (konfirmasi database Sprint 2 sudah dimigrasi); journal 24 entry | Owner-confirmed melalui konteks P4 UI |

### Batasan
- Smoke test browser untuk Revisi, Tolak, preview watermark, badge Sidebar, dan cover PDF belum dijalankan pada pass dokumentasi ini.
- Perubahan kode Sprint 2/final polish masih berada di working tree dan belum di-commit; dokumentasi ini tidak melakukan commit/push.
- Migration `0023` tidak dijalankan ulang pada pass dokumentasi; status apply mengikuti konfirmasi Owner bahwa database Sprint 2 sudah dimigrasi.

---

## DL-2026-11-10-07 — Modul Berkas V1 IMPLEMENTED & VERIFIED

| Field | Nilai |
|---|---|
| Feature ID | `ENT-BERKAS` |
| Tanggal | 10 November 2026 |
| Status | **IMPLEMENTED & VERIFIED** — runtime Vercel PASS (Owner-confirmed 10 November 2026); static checks PASS; migration `0020`, `0021`, dan `0022` **APPLIED** |
| Commit | `1668685` (fondasi) → `a85d26f` (layout cover) → `bb0dfdd` (strict grid) → `d3813b3` (kode seri, landscape, delete) → `0805776` (reposisi kode seri); pass dokumentasi ini belum di-commit |
| Branch | `main` |
| Baseline | `0805776` |
| Migration | `0020_berkas_pengajuan`, `0021_berkas_catatan`, `0022_berkas_kode_seri` — **APPLIED** (Owner-confirmed melalui runtime Vercel); journal 23 entry |

### Perubahan
- **Database schema (3 tabel):** `berkas_pengajuan` (status `MENUNGGU_TTD_1` → `MENUNGGU_TTD_2` → `SELESAI`, `version`, metadata PDF asli/generated, `catatan` ≤2.000, `kode_seri` ≤100), `berkas_penyusun` (maks 4, TTD wajib), `berkas_validasi` (tepat 2 slot, TTD opsional sampai giliran). Migration `0020` membuat 3 tabel, 5 FK, 7 index + unique constraint, dan 22 CHECK; `0021` menambah `catatan`; `0022` menambah `kode_seri` + CHECK 1–100.
- **PDF Engine:** `pdf-lib` di server untuk cover dan merge; `pdfjs-dist` untuk viewer canvas dengan worker statis di `public/pdfjs/`. Cover A4 landscape 842 × 595 pt memakai grid strict 3 kolom (header 28, nama 30, jabatan 34, TTD 80, tanggal 16 pt), sehingga baris tidak bergeser meski judul panjang atau penyusun lebih dari satu.
- **UI:** sidebar **Berkas** dengan submenu **Ajukan** dan **Verifikasi**; form pengajuan (PDF asli, penyusun, jabatan manual, dua validator, Kode Seri opsional), modal TTD, halaman verifikasi dengan catatan verifikator, viewer read-only, dan tombol/modal hapus khusus Admin.
- **PDF Landscape:** cover dan halaman tanda tangan dicetak A4 landscape; merge cover + PDF asli dilakukan sekali saat Validator 2 menandatangani dan disimpan sebagai generated PDF.
- **Watermark NIP:** teks `NIP: <nip>` diagonal 45°, abu-abu, opacity 0,15, ditempel per halaman saat download; user tanpa NIP ditolak 403 `NIP_REQUIRED`. Cover tidak dibangun ulang saat unduh.
- **Kode Seri:** kolom `kode_seri` pada `berkas_pengajuan`; input opsional maksimal 100 karakter di form Ajukan; dikembalikan di DTO; digambar Helvetica Bold 9 pt rata kanan tepat di atas garis atas tabel cover, hanya bila terisi.
- **Delete Admin:** permission `BERKAS_DELETE` hanya untuk Admin melalui super-application; route `DELETE /api/berkas/[id]`; repository menghapus record dan objek turunannya secara cascade; tombol/modal konfirmasi hanya tampil untuk Admin.
- **Dokumentasi:** current state, master log, dan feature register disinkronkan pada pass ini; tidak ada perubahan source, database, atau API.

### File impacted
- Add/modify: `src/lib/pg/schema.ts`, `src/lib/berkas/{schema,repository,service,pdf-engine,access}.ts` + `pdf-engine.test.ts`; `src/app/api/berkas/[id]/{route,ttd,view,download}/route.ts`; `src/components/dashboard/berkas/{BerkasAjukanPage,BerkasFormDialog,BerkasDeleteDialog,BerkasTtdDialog,BerkasVerifikasiPage,PdfViewerModal,types}.tsx|ts`; `src/lib/auth/permissions.ts`; `drizzle/0020_berkas_pengajuan.sql`, `drizzle/0021_berkas_catatan.sql`, `drizzle/0022_berkas_kode_seri.sql`, snapshot `0020`–`0022`, `drizzle/meta/_journal.json`.
- Pass dokumentasi ini hanya mengubah `docs/development/{CURRENT_PROJECT_STATE,DEVELOPMENT_MASTER_LOG,FEATURE_REGISTER}.md`.

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | Freebuff |
| `npx eslint` (Berkas) | **PASS**, 0 warning | Freebuff |
| `npm test` | **248/248 PASS** (60 suite; termasuk test posisi kode seri di PDF) | Freebuff |
| `git diff --check` | **PASS** | Freebuff |
| Migration `0020` + `0021` + `0022` | **APPLIED** — journal 23 entry | Owner-confirmed melalui runtime Vercel |
| Deploy Vercel | **PASS** | Owner-confirmed (10 November 2026) |
| Runtime Vercel | **PASS** — pengajuan, verifikasi berurutan, cover landscape, kode seri, watermark NIP, delete Admin | **Owner-confirmed** (10 November 2026) |
| PDF visual (cover, merge, watermark) | **PASS** — cover landscape dan kode seri di pojok kanan atas | Owner-confirmed |

### Batasan
- Runtime dijalankan Owner di Vercel; Freebuff tidak mereproduksi sesi 4 role pada pass dokumentasi ini.
- Delete bersifat sengaja Admin-only dan menghapus objek turunan secara cascade; rollback `0022` adalah drop kolom `kode_seri`, sedangkan rollback `0020`/`0021` menghapus ketiga tabel Berkas (urutan: `berkas_validasi`, `berkas_penyusun`, `berkas_pengajuan`).
- Tidak ada commit, push, deploy, migration, seed, atau DB write pada pass dokumentasi ini.

---

## DL-2026-11-10-06 — Modul Berkas P4 A–E implemented

| Field | Nilai |
|---|---|
| Feature ID | `ENT-BERKAS` |
| Tanggal | 10 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** — implementasi P4 A–E selesai; static checks PASS; migration `0020`/`0021` **CREATED / NOT APPLIED**; runtime Vercel/browser **NOT RUN**. **Superseded oleh `DL-2026-11-10-07`.** |
| Commit | `1668685` — `feat(berkas): implement ajukan and verifikasi modules with pdf watermark` (41 file, +15.037 / −1); pass dokumentasi ini belum di-commit |
| Branch | `main` |
| Baseline | `7e1b54d`; `HEAD` = `1668685` |
| Migration | `0020_berkas_pengajuan` + `0021_berkas_catatan` — **CREATED / NOT APPLIED**; journal 22 entry |

### Perubahan
- **Dependency baru:** `pdf-lib` `^1.17.1` untuk cover, merge, dan watermark di server; `pdfjs-dist` `^6.5.438` untuk viewer, dengan worker statis di `public/pdfjs/pdf.worker.min.mjs`. `jspdf` tetap dipakai exporter client-side modul lain.
- **Tabel `berkas_pengajuan`:** identitas judul ≤200, pemohon, metadata PDF asli (pathname unik, nama, MIME `application/pdf`, ukuran ≤20 MB, halaman 1–200), metadata generated PDF (pathname unik parsial, ukuran ≤32 MB), status `MENUNGGU_TTD_1`/`MENUNGGU_TTD_2`/`SELESAI`, `version` ≥1, `submitted_at`, `completed_at`, dan `catatan` ≤2.000. CHECK menegakkan konsistensi status ↔ `completed_at`, status ↔ generated PDF, serta pathname generated ≠ original.
- **Tabel `berkas_penyusun`:** maksimal 4 penyusun per berkas, unique `(berkas_id, urutan)` dan `(berkas_id, user_id)`, snapshot nama/jabatan, TTD wajib PNG/JPEG ≤2 MB, pathname TTD unik.
- **Tabel `berkas_validasi`:** tepat 2 slot (`urutan` 1–2), unique validator per berkas, snapshot nama/jabatan, TTD opsional namun konsisten (pathname + MIME + ukuran + waktu terisi bersama).
- **Migration:** `0020_berkas_pengajuan.sql` membuat 3 tabel, 5 FK (pemohon/penyusun/validator ke `users`, anak ke `berkas_pengajuan` cascade), 7 index (termasuk unique parsial untuk generated PDF dan TTD validator), serta 22 CHECK. `0021_berkas_catatan.sql` menambahkan kolom `catatan` + CHECK panjang ≤2.000. Snapshot `0020`/`0021` tersedia; journal menjadi 22 entry.
- **Permission:** `BERKAS_VIEW`, `BERKAS_CREATE`, `BERKAS_VALIDATE`, `BERKAS_DOWNLOAD`, dengan helper `access.ts`. Admin memperoleh keempatnya lewat super-application; `BERKAS_VIEW`/`BERKAS_DOWNLOAD` untuk Head Office, Management, Project; `BERKAS_CREATE`/`BERKAS_VALIDATE` untuk Head Office dan Management. Validasi tetap record-scoped: pemegang permission harus validator yang ditugaskan, dan download menolak user tanpa NIP.
- **API:** `GET`/`POST /api/berkas` (daftar dan create dengan verifikasi objek Blob via `headBlob` + validasi `%PDF-`, enkripsi, dan jumlah halaman), `POST /api/berkas/upload-token` (token unggah per prefix `original`/`penyusun_ttd`), `GET /api/berkas/user-options`, `POST /api/berkas/[id]/ttd`, `GET /api/berkas/[id]/view`, dan `GET /api/berkas/[id]/download`. TTD dan download berjalan pada `runtime = "nodejs"`; response privat `no-store`.
- **Storage privat:** helper `putBlob()` ditambahkan ke `src/lib/storage/blob.ts`; pathname `berkas/uploads/{actorId}/{uploadId}/...` dan `berkas/{berkasId}/...` divalidasi per segmen, tidak pernah dikirim sebagai URL publik.
- **PDF Engine (`src/lib/berkas/pdf-engine.ts`):** cover A4 portrait 595 × 842 pt dengan logo, judul maksimal 3 baris, dan tabel tanda tangan 3 kolom (penyusun + Validasi 1 + Validasi 2); merge cover + PDF asli dilakukan sekali saat Validator 2 menandatangani, lalu disimpan sebagai generated PDF. Watermark `NIP: <nip>` diagonal 45°, abu-abu, opacity 0,15, ditempel per halaman pada setiap download sehingga cover tidak dibangun ulang.
- **UI:** sidebar **Berkas** dengan submenu **Ajukan** dan **Verifikasi**; `/dashboard/berkas` redirect ke `/ajukan`; `layout.tsx` menjaga `BERKAS_VIEW`. Halaman Ajukan (form PDF asli, maks 4 penyusun dengan jabatan manual, dua validator), halaman Verifikasi (antrean, catatan verifikator, aksi TTD), modal TTD, dan viewer `pdfjs-dist` berbasis `<canvas>` tanpa toolbar PDF.
- **Dokumentasi:** `docs/design/BERKAS_P3_TECHNICAL_DESIGN.md` masuk repository; current state, feature register, dan master log disinkronkan pada pass ini.

### File impacted
- Add: `src/lib/berkas/{access,storage-path,schema,repository,service,pdf-engine}.ts` + test `schema.test.ts`, `pdf-engine.test.ts`; `src/app/api/berkas/{route,upload-token,user-options,_helpers}.ts`, `src/app/api/berkas/[id]/{ttd,view,download}/route.ts`; `src/app/dashboard/berkas/{layout,page}.tsx`, `{ajukan,verifikasi}/page.tsx`; `src/components/dashboard/berkas/{BerkasAjukanPage,BerkasFormDialog,BerkasTtdDialog,BerkasVerifikasiPage,PdfViewerModal,client,types}.tsx|ts` + `types.test.ts`; `drizzle/0020_berkas_pengajuan.sql`, `drizzle/0021_berkas_catatan.sql`, snapshot `0020`/`0021`; `public/pdfjs/pdf.worker.min.mjs`; `docs/design/BERKAS_P3_TECHNICAL_DESIGN.md`.
- Modify: `package.json`, `package-lock.json`, `src/lib/pg/schema.ts`, `src/lib/auth/permissions.ts`, `src/lib/storage/blob.ts`, `src/components/dashboard/DashboardSidebar.tsx`, `src/components/dashboard/DashboardSidebar.test.ts`, `drizzle/meta/_journal.json`.
- Pass dokumentasi ini hanya mengubah `docs/development/{CURRENT_PROJECT_STATE,DEVELOPMENT_MASTER_LOG,FEATURE_REGISTER}.md`.

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | Freebuff |
| `npx eslint` (Berkas + sidebar + permissions/storage) | **PASS**, 0 warning | Freebuff |
| `npm test` | **245/245 PASS** (60 suite; termasuk test schema, pdf-engine, types, dan navigasi sidebar Berkas) | Freebuff |
| `git diff --check` | **PASS** | Freebuff |
| Migration `0020` + `0021` | **CREATED / NOT APPLIED** — journal 22 entry; tidak dijalankan pada pass ini | Freebuff |
| Deploy Vercel | **NOT RUN** | — |
| Runtime browser 4 role | **NOT RUN** — menunggu uji Vercel | — |
| PDF visual (cover, merge, watermark) | **NOT RUN** — baru diuji lewat unit test `pdf-engine` | — |

### Batasan
- Migration `0020`/`0021` belum diterapkan: tabel Berkas belum ada di database, sehingga seluruh endpoint akan gagal sampai migration dijalankan. Rollback: drop `berkas_validasi`, `berkas_penyusun`, `berkas_pengajuan` (urutan itu), lalu hapus kolom `catatan` bila `0021` dicabut.
- Runtime Vercel belum diuji: ketersediaan `runtime = "nodejs"` untuk TTD/download, token Blob privat, batas ukuran request, bundling `pdf-lib`/`pdfjs-dist`, dan jalur worker viewer belum terbukti di lingkungan Vercel.
- Cover, merge, dan watermark baru diverifikasi lewat unit test `pdf-engine`; hasil visual PDF dan alur TTD dua validator belum diamati di browser.
- Tidak ada commit, push, deploy, migration, seed, atau DB write pada pass dokumentasi ini.

---

## DL-2026-11-10-05 — WIBEX Governance & Engineering Workflow approved

| Field | Nilai |
|---|---|
| Feature ID | `GOV-WIBEX-001` |
| Tanggal | 10 November 2026 |
| Status | **IMPLEMENTED & VERIFIED** — Governance dan Engineering Workflow **APPROVED & EFFECTIVE** oleh Owner (Hans), 10 November 2026 |
| Commit | Tidak ada commit/push pada pass ini; baseline saat itu `8cfef26` |
| Branch | `main` |
| Dokumen | Governance, Workflow, Feature Register, Current State, Master Project Index, AI Handoff Guide |

### Perubahan dokumentasi
- **WIBEX Development Governance** dinaikkan dari status tinjauan Owner menjadi **`APPROVED & EFFECTIVE`**; approval Owner (Hans) dicatat 10 November 2026.
- **WIBEX Engineering Workflow** menjadi dokumen operasional turunan resmi dengan status **`APPROVED & EFFECTIVE`**.
- **Feature Register** `GOV-WIBEX-001` menjadi **`COMPLETE AND VERIFIED`**; **Current State**, **Master Project Index**, dan **AI Developer Handoff Guide** diselaraskan.
- Tidak ada perubahan aturan, source code, database, migration, API, dependency, atau config.

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| Pemeriksaan status tinjauan lama | **0 match pada dokumen governance aktif**; sisa match hanya entri log/design historis | Freebuff |
| `git diff --check` | **PASS** | Freebuff |
| `git status --short` | Hanya file dokumentasi | Freebuff |

### Batasan
- Approval berasal dari keputusan Owner; Freebuff hanya memperbarui status dan metadata.
- Tidak ada commit, push, deploy, migration, atau perubahan runtime pada pass ini.

---

## DL-2026-11-10-04 — CST runtime 4 role PASS

| Field | Nilai |
|---|---|
| Feature ID | `ENT-CST` |
| Tanggal | 10 November 2026 |
| Status | **IMPLEMENTED & VERIFIED** — runtime browser 4 role PASS (Owner-confirmed 10 November 2026); static checks PASS; migration `0017` APPLIED |
| Commit kode | `5636113` — `feat: core enterprise calculation sheet template v-1`; dokumentasi pass ini belum di-commit |
| Branch | `main` |
| Baseline | `8cfef26` |
| Migration | `0017_calculation_sheet_templates` **APPLIED** (Owner-confirmed melalui runtime) |

### Perubahan dokumentasi
- **Status CST dinaikkan** dari `IMPLEMENTED BUT NOT FULLY VERIFIED` menjadi **`IMPLEMENTED & VERIFIED`** setelah Owner menjalankan runtime browser 4 role.
- **Cakupan runtime PASS:** tujuh kategori, header kategori `colSpan`, dan navigasi sidebar per kategori; inline Create/Edit/Delete; URL invalid ditolak; duplikasi kode ditolak; Admin dan Head Office dapat mengedit, Management dan Project read-only.
- **Migration `0017`** dinyatakan **APPLIED** karena CRUD runtime berhasil terhadap tabel CST.
- **Dokumentasi yang disinkronkan:** current state, feature register, API, authentication/authorization, dan module inventory. Tidak ada perubahan kontrak API, source, schema, dependency, atau database.

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| Git baseline | `HEAD` = `origin/main` = `8cfef26`; working tree clean sebelum edit | Freebuff |
| `npx tsc --noEmit` | **PASS** | Freebuff |
| `npm test` | **233/233 PASS** (59 suite) | Freebuff |
| `git diff --check` | **PASS** | Freebuff |
| Runtime browser 4 role | **PASS** — seluruh cakupan di atas | **Owner-confirmed** (10 November 2026) |
| Migration `0017` | **APPLIED** | Owner-confirmed melalui runtime |

### Batasan
- Runtime dijalankan Owner di browser; Freebuff tidak mereproduksi sesi 4 role pada pass dokumentasi ini.
- Tidak ada commit, push, deploy, migration, seed, atau DB write pada pass ini.

---

## DL-2026-11-10-03 — PDOC runtime 4 role PASS

| Field | Nilai |
|---|---|
| Feature ID | `ENT-PDOC` |
| Tanggal | 10 November 2026 |
| Status | **IMPLEMENTED & VERIFIED** — runtime browser 4 role PASS (Owner-confirmed 10 November 2026); static checks PASS; migration `0018` + `0019` APPLIED |
| Commit | fitur `a7527e1`; dokumentasi `062f8d4`; tidak ada commit/push pada pass ini |
| Branch | `main` |
| Baseline | `062f8d4` |
| Migration | `0018_project_documentations` + `0019_project_documentation_period` **APPLIED** (Owner-confirmed) |

### Perubahan dokumentasi
- **Status PDOC dinaikkan** dari `IMPLEMENTED BUT NOT FULLY VERIFIED` menjadi **`IMPLEMENTED & VERIFIED`** setelah Owner menjalankan runtime browser 4 role.
- **Cakupan runtime PASS:** rekap bulanan (filter tahun/bulan, tabel semua project), edit inline 5 URL + catatan dengan audit per minggu, URL kosong `—`/metadata kosong, URL invalid error per baris, simpan tanpa perubahan tidak mengubah timestamp, Summary Report 12 bulan dengan `0/5`, PDF rekap A4 landscape dengan filter line periode, sidebar accordion pada kedua route, serta desktop + mobile.
- **RBAC runtime PASS:** Admin, Head Office, Management, Project. Management read-only; Admin/Head Office/Project dapat mengelola.
- **Dokumentasi yang disinkronkan:** current state, feature register, API, authentication/authorization, dan module inventory. Tidak ada perubahan kontrak API, source, schema, dependency, atau database.

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| Git baseline | `HEAD` = `origin/main` = `062f8d4`; working tree clean sebelum edit | Freebuff |
| `npx tsc --noEmit` | **PASS** | Freebuff |
| `npm test` | **233/233 PASS** (59 suite; 58 test PDOC di 6 file) | Freebuff |
| `git diff --check` | **PASS** | Freebuff |
| Runtime browser 4 role | **PASS** — seluruh cakupan di atas | **Owner-confirmed** (10 November 2026) |
| Migration `0018` + `0019` | **APPLIED** | Owner-confirmed |

### Batasan
- Runtime dijalankan Owner di browser; Freebuff tidak mereproduksi sesi 4 role pada pass dokumentasi ini.
- Tidak ada commit, push, deploy, migration, seed, atau DB write pada pass ini.

---

## DL-2026-11-10-02 — PDOC Monthly Delta committed & documentation sync — HISTORICAL

> **HISTORICAL:** status runtime pending di bawah adalah kondisi sebelum verifikasi 4 role; lihat `DL-2026-11-10-03`.

| Field | Nilai |
|---|---|
| Feature ID | `ENT-PDOC` |
| Tanggal | 10 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** — commit/push selesai; static checks PASS; migration `0018` APPLIED; **0019 APPLIED** (Owner-confirmed 10 November 2026); runtime 4-role PDOC pending Owner |
| Commit | **`a7527e1`** — `feat: project documentation monthly recap and summary report`; sudah di-push ke `origin/main` |
| Branch | `main` (`HEAD` = `origin/main` = `a7527e1`; working tree clean sebelum sinkronisasi dokumen P8) |
| Baseline | `5636113..a7527e1`; 41 file, +15.396 / −29 |
| Migration | `0018_project_documentations` **APPLIED**; **0019 APPLIED** — `0019_project_documentation_period` (Owner-confirmed 10 November 2026) |

### Perubahan yang masuk commit
- **Identitas periodik:** `project_documentations` memakai `(project_id, year, month)` dengan unique composite; unique tunggal `project_id` dihapus; CHECK bulan 1–12 dan tahun ≥2000 ditambahkan melalui migration `0019`.
- **API:** `GET /api/project-documentation?year&month` untuk rekap periode, `PUT /api/project-documentation/[projectId]/[year]/[month]` untuk upsert per periode, dan `GET /api/project-documentation/summary?year` untuk matriks 12 bulan. Periode berasal dari path/query, bukan body.
- **Frontend:** halaman rekap memiliki dropdown Tahun/Bulan dan fetch ulang saat filter berubah; halaman Summary menampilkan semua Master Project × 12 bulan dengan `0/5` untuk bulan kosong; PDF rekap mencantumkan periode.
- **Routing/sidebar:** root PDOC redirect ke `/rekap-bulanan`; route `/summary` read-only; Project Documentation menjadi accordion dengan submenu **Rekap Bulanan** dan **Summary Report**.
- **Dokumentasi:** desain P2/P3 delta, audit 05–07, master log, feature register, dan current state disinkronkan. Test bertambah dari 224 menjadi **233/233** (59 suite; 58 test PDOC di 6 file).

### File impacted
- Commit `a7527e1`: `src/lib/project-documentation/*`, `src/app/api/project-documentation/*`, `src/components/dashboard/project-documentation/*`, `src/app/dashboard/project-documentation/*`, `DashboardSidebar.tsx`, `permissions.ts`, `pg/schema.ts`, `drizzle/0018_*`, `drizzle/0019_*`, `drizzle/meta/_journal.json`, dokumen desain/audit/development.
- Pass dokumentasi P8 ini hanya mengubah `docs/development/{CURRENT_PROJECT_STATE,DEVELOPMENT_MASTER_LOG,FEATURE_REGISTER}.md` dan `docs/audit/{05,06,07}`; tidak ada perubahan source, API, service, UI, schema, dependency, atau database.

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| Git baseline | `HEAD` = `origin/main` = `a7527e1`; working tree clean sebelum edit dokumen | Freebuff |
| `npx tsc --noEmit` | **PASS** | Freebuff |
| `npx eslint` (file PDOC + sidebar) | **PASS** | Freebuff |
| `npm test` | **233/233 PASS** (59 suite; 58 test PDOC di 6 file) | Freebuff |
| `git diff --check` | **PASS** | Freebuff |
| Migration `0018` | **APPLIED** (Owner-confirmed) | Owner |
| Migration `0019` | **APPLIED** | Owner-confirmed |
| Runtime API/browser empat role | **NOT RUN** — menunggu visual test Owner | — |

### Batasan
- Migration `0019` APPLIED berdasarkan konfirmasi Owner; status ini tidak diverifikasi ulang lewat query DB pada pass ini.
- Runtime API terautentikasi, visual browser empat role, dan PDF belum dijalankan.
- Dokumentasi P8 di-commit setelah gate hijau; tidak ada push, deploy, seed, atau DB write pada pass ini.

---

## DL-2026-11-10-01 — Project Documentation V1 (P4 A–D) — HISTORICAL

> **HISTORICAL:** status di bawah adalah kondisi sebelum commit `a7527e1`. Untuk kondisi aktual lihat `DL-2026-11-10-02`.

| Field | Nilai |
|---|---|
| Feature ID | `ENT-PDOC` |
| Tanggal | 10 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** — static checks PASS; migration `0018` APPLIED (Owner-confirmed); commit/push/deploy dan visual browser pending Owner |
| Commit | **belum di-commit** (instruksi: no commit/push/deploy) |
| Branch | `main` |
| Baseline | `5636113` |
| Migration | `0018_project_documentations` **APPLIED** (Owner-confirmed) |

### Perubahan
- **Model dokumentasi flat per Master Project**: tabel `project_documentations` dengan `project_id` UNIQUE, lima slot URL minggu, pasangan audit `week_n_updated_by`/`week_n_updated_at` per minggu, `catatan`, dan audit level baris. Project tanpa dokumentasi tetap tampil karena Master Project menjadi driving table.
- **API**: `GET /api/project-documentation` mengembalikan seluruh Master Project beserta lima minggu; `PUT /api/project-documentation/[projectId]` melakukan upsert satu baris. Tidak ada `POST` atau `DELETE`. Service memvalidasi URL `http(s)` ≤2.048 dan catatan ≤2.000, memeriksa keberadaan project, serta memetakan FK/unique ke 409 dan CHECK ke 400.
- **Audit per minggu**: URL yang berubah memperoleh aktor dan timestamp baru; URL yang sama mempertahankan metadata lama; URL yang dikosongkan menghapus URL sekaligus pasangan audit minggu tersebut. Row audit diperbarui saat ada perubahan.
- **UI**: satu halaman `/dashboard/project-documentation` dengan tabel 8 kolom (Nama Proyek, Minggu 1–5, Catatan, Aksi), inline edit satu baris, validasi error `colSpan` penuh, search client-side berdasarkan nama project, dan PDF A4 landscape dari baris yang terlihat. PDF memotong URL dan tidak mencetak metadata uploader.
- **Sidebar/RBAC**: menu tunggal **Project Documentation** di Core Enterprise; `DOCUMENTATION_VIEW` untuk Admin, Head Office, Management, Project; `DOCUMENTATION_MANAGE` untuk Admin, Head Office, Project. Management read-only; Project dapat mengelola seluruh project tanpa ownership.
- **Dokumentasi**: sinkronisasi master log, feature register, current state, API, authentication/authorization, dan module inventory.

### File impacted
- Add: `src/lib/project-documentation/{constants,schema,repository,service,pdoc-draft}.ts` + test schema/repository/service/pdoc-draft; `src/app/api/project-documentation/{route,_helpers}.ts` + `_helpers.test.ts`, `[projectId]/route.ts`; `src/components/dashboard/project-documentation/{ProjectDocumentationPage,PdocTable}.tsx`, `pdocExportPdf.ts`; `src/app/dashboard/project-documentation/{page,layout}.tsx`; `src/components/dashboard/projectDocumentationSidebar.test.ts`; `drizzle/0018_project_documentations.sql`, `drizzle/meta/0018_snapshot.json`; `docs/design/PDOC_P2_AUDIT.md`, `docs/design/PDOC_P3_TECHNICAL_DESIGN.md`.
- Modify: `src/lib/pg/schema.ts`, `src/lib/auth/permissions.ts`, `drizzle/meta/_journal.json`, `src/components/dashboard/DashboardSidebar.tsx`, `docs/development/{DEVELOPMENT_MASTER_LOG,FEATURE_REGISTER,CURRENT_PROJECT_STATE}.md`, `docs/audit/{05_API_DOCUMENTATION,06_AUTHENTICATION_AND_AUTHORIZATION,07_MODULE_AND_FEATURE_INVENTORY}.md`.
- Tidak berubah pada Sub-fase D: source code, API, service, repository, database, migration, dependency, dan modul lain (MSL/MKS/CST/KM).

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | Freebuff |
| `npx eslint` (PDOC + sidebar) | **PASS**, 0 warning | Freebuff |
| `npm test` | **224/224 PASS** (56 suite; 49 test PDOC di 6 file) | Freebuff |
| `git diff --check` | **PASS** | Freebuff |
| Migration `0018` | **APPLIED** (Owner-confirmed); tidak dijalankan ulang pada Sub-fase D | Owner |
| Runtime API/DB + browser empat role | **NOT RUN** — menunggu visual test dan commit/push Owner | — |

### Batasan
- Tidak ada commit, push, deploy, atau migration pada Sub-fase D.
- Runtime API terautentikasi dan visual browser empat role belum dijalankan oleh Freebuff; status keseluruhan tetap `IMPLEMENTED BUT NOT FULLY VERIFIED`.
- Verifikasi PDOC bersifat static/unit test (repo tanpa jsdom); PDF dan lifecycle browser perlu dikonfirmasi Owner.

---

## DL-2026-11-04-16 — WIBEX Development Governance organization-wide

| Field | Nilai |
|---|---|
| Feature ID | `GOV-WIBEX-001` |
| Tanggal | 4 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED — READY FOR OWNER REVIEW** — preliminary review ChatGPT selesai; koreksi diterapkan; final review dan approval Owner pending |
| Commit | **belum di-commit** (instruksi: no commit/push) |
| Branch | `main` (HEAD `d342bda`) |
| File baru | `docs/development/WIBEX_DEVELOPMENT_GOVERNANCE.md` |
| File diubah | `docs/development/WIBEX_ENGINEERING_WORKFLOW.md`, `docs/development/FEATURE_REGISTER.md`, `docs/development/DEVELOPMENT_MASTER_LOG.md`, `docs/audit/MASTER_PROJECT_INDEX.md`, `docs/audit/AI_DEVELOPER_HANDOFF_GUIDE.md` |

### Keputusan
- Menyiapkan usulan standar governance resmi untuk **seluruh WIBEX**, bukan hanya Knowledge Management V1.1.
- Menetapkan pembagian tugas: **Owner** sebagai decision maker, **ChatGPT** sebagai technical reviewer, **Freebuff** sebagai implementer.
- Menetapkan lifecycle sembilan phase: requirement, audit, desain, implementasi, integrasi, QA, regresi, dokumentasi, final acceptance.
- Menetapkan **Mandatory Review Gate** per phase dengan status **PASS / CONDITIONAL / FAIL**; gate tidak boleh dilewati.
- Menetapkan status verifikasi **PASS / FAIL / NOT RUN / NOT APPLICABLE / HISTORICAL** dan status final **IMPLEMENTED & VERIFIED / IMPLEMENTED BUT NOT FULLY VERIFIED / BLOCKED / NOT ACCEPTED**.
- Menetapkan standard evidence, change safety, data protection, Git/deploy governance, documentation governance, dan acceptance.
- Menetapkan Knowledge Management V1.1 sebagai **penerapan pertama** standar, bukan batas cakupan.

### Audit dokumen existing
- `WIBEX_ENGINEERING_WORKFLOW.md` ditemukan sebagai prosedur operasional existing; dipertahankan dan diturunkan di bawah governance kanonik.
- Workflow lama belum memuat peran reviewer independen dan review gate per phase; bagian tersebut ditambahkan sebagai rujukan, bukan duplikasi aturan.
- `FEATURE_REGISTER.md` memakai status fitur yang berbeda dari status review/acceptance; governance menetapkan pemetaan eksplisit.
- `DEVELOPMENT_MASTER_LOG.md` sebelumnya menyebut hanya perubahan kode; cakupan diperluas ke dokumentasi/governance.
- `AI_DEVELOPER_HANDOFF_GUIDE.md` sudah memakai PASS/FAIL/NOT RUN; ditambahkan rujukan wajib ke governance.
- Tidak ditemukan dokumen governance organization-wide lain di repository.

### Verifikasi
| Pemeriksaan | Hasil |
|---|---|
| Struktur dokumen governance | **PASS** — 15 bagian, roles, 12 scope, lifecycle, gate, evidence, safety, Git/deploy, docs, acceptance |
| Cross-reference workflow | **PASS** — workflow menyatakan tunduk pada governance |
| Cross-reference master index | **PASS** — kedua dokumen development ditautkan |
| Feature register | **PASS** — `GOV-WIBEX-001` tercatat |
| Perubahan source code | **TIDAK ADA** |
| Perubahan database/migration | **TIDAK ADA** |
| `git diff --check` | **PASS** |
| Technical review ChatGPT | **PRELIMINARY COMPLETED** — koreksi diterapkan; final review pending |
| Final acceptance Owner | **PENDING** — status keseluruhan `READY FOR OWNER REVIEW` |

### Batasan
- Governance ini mengatur proses; ia tidak mengubah runtime, API, database, atau modul mana pun.
- Status `IMPLEMENTED BUT NOT FULLY VERIFIED` dipakai secara sengaja karena review independen belum dijalankan; jangan membaca dokumen ini sebagai bukti final acceptance fitur.
- Detail requirement V1.1 tidak disalin ke dokumen governance ini; V1.1 tetap berstatus target yang disetujui dan belum diimplementasikan.
- **Documentation debt:** `docs/development/CURRENT_PROJECT_STATE.md` sengaja tidak diubah; snapshot 3 November 2026 dipertahankan sampai ada task pembaruan khusus.

---

## DL-2026-11-04-15 — Knowledge Management menjadi item top-level sidebar

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` |
| Tanggal | 4 November 2026 |
| Status | **IMPLEMENTED** — unit test, typecheck, ESLint, build PASS; browser Head Office **PASS**; Admin/Management/Project **NOT RUN** (tanpa sesi/kredensial) |
| Commit | **belum di-commit** (instruksi: no commit/push) |
| Branch | `main` (HEAD `d342bda`) |
| File diubah | `src/components/dashboard/DashboardSidebar.tsx`, `docs/audit/06_AUTHENTICATION_AND_AUTHORIZATION.md`, `docs/audit/07_MODULE_AND_FEATURE_INVENTORY.md`, `docs/audit/MASTER_PROJECT_INDEX.md`, `docs/development/FEATURE_REGISTER.md`, dokumen ini |
| File baru | `src/components/dashboard/DashboardSidebar.test.ts` (16 test) |

### Perubahan
- Knowledge Management dipindah dari accordion di dalam Program Kerja menjadi **item top-level sendiri**, sibling Program Kerja di grup Core Enterprise.
- Accordion KM memakai state `knowledgeOpen` sendiri; render tidak lagi bergantung pada `programKerjaOpen`.
- Default terbuka untuk semua role yang memiliki `KNOWLEDGE_MANAGEMENT_VIEW`; tetap dapat ditutup manual dan otomatis terbuka saat route `/dashboard/knowledge-management/*` aktif.
- Program Kerja tidak lagi memuat KM dan tidak lagi ikut terbuka otomatis saat masuk route KM. Dua link Program Kerja tidak berubah.
- Tiga route KM tidak berubah: Lesson Learn, Best Practice / KI KM, VA/VE.
- Model visibilitas/state murni diekspor dari `DashboardSidebar.tsx` agar dapat diuji tanpa DOM.

### Tanpa perubahan
Permission (`permissions.ts` tidak disentuh), API, database, migration, service/repository, guard route, MSL Engineering, dan Struktur Organisasi.

### Verifikasi
| Pemeriksaan | Hasil |
|---|---|
| Focused sidebar test | **PASS 16/16** |
| `npm test` (full) | **PASS 39/39** |
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npx eslint DashboardSidebar.tsx DashboardSidebar.test.ts` | **PASS** (exit 0) |
| `npx next build` | **PASS** (71 route, termasuk 4 route KM) |
| `git diff --check` | **PASS** (exit 0) |
| Browser Head Office — desktop 1280×800 | **PASS** — KM item top-level, expanded, 3 submenu terlihat; Program Kerja collapsed |
| Browser Head Office — mobile 390×844 | **PASS** — sidebar off-canvas dibuka, KM dan 3 submenu terlihat |
| Browser Head Office — active route | **PASS** — `/dashboard/knowledge-management/lesson-learn` auto-expand, `aria-current="page"` + highlight |
| Browser Head Office — independensi | **PASS** — Program Kerja dibuka (2 link) tanpa menutup KM; tidak ada entri ganda |
| Browser Admin / Management / Project | **NOT RUN** — tidak ada sesi atau kredensial role tersebut |

### Keterbatasan
- Komentar lama di `src/lib/auth/permissions.ts` masih menyebut KM "under Program Kerja"; file itu di luar batas perubahan yang disetujui, sehingga komentar tidak diubah. Perilaku izin tetap benar dan tercakup unit test.
- Verifikasi visual baru dilakukan untuk Head Office. Admin, Management, dan Project belum diuji di browser karena tidak ada sesi/kredensial; kelulusan tiga role tersebut hanya berlaku pada model navigasi (unit test), bukan browser.
- Console browser Head Office hanya berisi HMR/Fast Refresh dan warning ukuran gambar header yang sudah ada sebelumnya; tidak ada error aplikasi.

---

## DL-2026-11-04-02 — Knowledge Management V1: remediasi temuan second pass

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` |
| Tanggal | 4 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** (typecheck/lint/unit test/build PASS; migration tetap belum dijalankan) |
| Commit | **belum di-commit** |
| Branch | `main` (HEAD `d342bda`) |

### Perubahan
- **KM-01 (FIXED).** `evidence` dan `picIds` tidak lagi memiliki `default([])` (`lib/knowledge-management/schema.ts`). Keduanya wajib; payload tanpa salah satunya → 400. `[]` eksplisit tetap sah sebagai instruksi mengosongkan.
- **KM-02 (DISABLED).** Tombol hapus seluruh record dihapus dari `KnowledgeTable`; `DELETE /api/knowledge-management/entry/[id]` kini menjawab **405**. Service/repository delete ikut dihapus agar tidak ada jalur kode yang tidak terpakai. Penghapusan evidence per baris di editor tetap ada.
- **KM-03 (IMPLEMENTED).** Token `expectedUpdatedAt` (ISO/null) ditambahkan ke kontrak; `GET` mengembalikan `updatedAt` per baris. Service membandingkan token (`conflict.ts`), lalu menulis dengan `UPDATE … WHERE id = ? AND updated_at = ?`; nol baris → 409. UI menampilkan pesan dan tombol "Muat ulang & batalkan perubahan".
- **KM-04 (PENDING).** Validasi content tidak diubah (Zod `min(1)` + CHECK database). Perubahan yang diperlukan bila owner memutuskan opsional didokumentasikan di `FEATURE_REGISTER`.
- **KM-06 (FIXED).** Pesan 409 Master Project kini menyebut Knowledge Management.
- **KM-08 (FIXED).** `23503`/`23001` dipetakan ke `KnowledgeConflictError` → 409, bukan 500.
- **KM-05 (DEFERRED).** Snapshot/`prevId` tidak disentuh; tetap tercatat sebagai task maintenance terpisah.

### Verifikasi
| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint <file berubah>` | PASS |
| `npm test` | PASS 21/21 (9 test baru: 4 kontrak array + 5 concurrency token) |
| `npx next build` | PASS |
| `git diff --check` | PASS |
| Migration dijalankan | **TIDAK** (tidak ada perubahan skema pada remediasi ini) |

### Catatan
Tidak ada perubahan skema/migration pada remediasi ini: KM-01, KM-02, KM-03, KM-06, dan KM-08 murni perubahan kode. `drizzle/meta` tidak disentuh.

---

## DL-2026-11-04-01 — Knowledge Management V1 (Lesson Learn, Best Practice / KI KM, VA/VE)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` |
| Tanggal | 4 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** (tsc/ESLint/unit test/build PASS; migration belum dijalankan; uji browser end-to-end belum) |
| Commit | **belum di-commit** (instruksi: no commit/push) |
| Branch | `main` (HEAD `d342bda`) |
| File baru | `lib/knowledge-management/*` (4), `api/knowledge-management/**` (4 route + `_helpers`), `dashboard/knowledge-management/**` (layout + 4 page), `components/dashboard/knowledge-management/KnowledgeTable.tsx`, `drizzle/0013_knowledge_management.sql`, 1 file test |
| File diubah | `lib/auth/permissions.ts`, `lib/pg/schema.ts`, `components/dashboard/DashboardSidebar.tsx`, `package.json`, dokumen audit/development |

### Keputusan arsitektur
- **Satu tabel bersama** `knowledge_entries` + `UNIQUE(project_id, knowledge_type)`; tiga submenu dibedakan `knowledge_type` (`lesson_learn`, `best_practice`, `va_ve`). Alasan: kolom identik, dan constraint tunggal menjamin aturan "satu data per proyek per submenu".
- **Daftar proyek dari Master Project** (`LEFT JOIN`), bukan baris placeholder. Proyek tanpa knowledge tetap tampil; proyek baru otomatis muncul.
- **Routing terpisah.** Halaman di `/dashboard/knowledge-management/*` dengan layout guard `KNOWLEDGE_MANAGEMENT_VIEW`. Guard `/dashboard/program-kerja` **tidak diubah** (tetap menolak Project). Sidebar menampilkan grup Program Kerja yang berisi accordion Knowledge Management, sehingga hierarki visual sesuai permintaan tanpa melemahkan guard lama.
- **PIC tanpa filter status.** Hanya role Head Office; user suspended tetap eligible dan diberi label "(non-aktif)" pada pilihan.
- **Evidence** disimpan sebagai nama + URL; tidak ada upload atau penyalinan file ke Blob.

### Database
Migration aditif `0013_knowledge_management.sql`: 3 tabel, 3 CHECK pada `knowledge_entries`, 2 CHECK pada evidence, `UNIQUE(project_id, knowledge_type)`, 3 index, 6 FK (project RESTRICT; entry cascade; user NO ACTION/SET NULL).

Catatan penting: `drizzle-kit generate` semula juga mengeluarkan `organization_structure` dan kolom MSL karena snapshot `0011`/`0012` tidak ada. Statement itu dihapus manual dari `0013`; hanya objek Knowledge Management yang tersisa.

### Verifikasi
| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npx eslint <file berubah>` | PASS (exit 0, setelah memindahkan setState keluar dari body effect) |
| `npm test` (baru, `node --import tsx --test`) | PASS 12/12 (URL evidence, konten multiline, tipe, permission) |
| `npx next build` | PASS; 4 route knowledge muncul di output |
| Migration dijalankan | **TIDAK** — butuh database; bukan bagian dari instruksi |
| Uji API/UI per role | **BELUM** — server dev perlu dijalankan ulang dan login 4 role |

### Risiko / catatan
- Migration belum diterapkan: tabel belum ada di database mana pun, sehingga endpoint knowledge akan gagal sampai `0013` dijalankan (setelah backup).
- Rollback: drop `knowledge_pics`, `knowledge_evidence`, `knowledge_entries` (urutan itu), lalu hapus baris jurnal `0013` bila migration dicabut.
- Tanpa CI: unit test berjalan lokal lewat `npm test`.

---

## DL-2026-11-03-01 — Landing Page: WIBEX Portal opens in a new tab

| Field | Nilai |
|---|---|
| Feature ID | `LP-NAV-002` |
| Tanggal | 3 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** (typecheck/lint/diff PASS; markup & tidak-adanya navigasi in-place terbukti; `/login` di tab baru belum diverifikasi visual) |
| Commit | **belum di-commit** (sesuai instruksi: no commit/push) |
| Branch | `main` (tracking `origin/main` @ `84e0a90`) |
| File diubah | `src/components/landing/Navbar.tsx` (1 file, +2 / −0) |

### Latar belakang
Tombol **WIBEX Portal** di navbar landing sebelumnya memakai Next.js `<Link href="/login">` tanpa `target`, sehingga klik menavigasi **di tab yang sama** dan pengguna meninggalkan landing page. Tombol **SUSTAINABILITY** di komponen yang sama sudah membuka tab baru (`target="_blank"` + `rel="noopener noreferrer"`). Pemilik produk meminta perilaku Portal disamakan: `/login` terbuka di tab baru, landing tetap terbuka di tab asal.

### Detail perubahan
```diff
           <Link
             href="/login"
+            target="_blank"
+            rel="noopener noreferrer"
             className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-secondary px-3 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary md:h-10 md:px-4 md:text-sm"
           >
             <span>WIBEX Portal</span>
```

Tidak berubah: komponen (`Link`), `href="/login"`, seluruh className, ukuran, warna, posisi, ikon gembok, teks "WIBEX Portal", tombol SUSTAINABILITY (desktop & mobile), alur login, konfigurasi, dependency.

### Alasan teknis
- Next.js App Router memperlakukan klik sebagai navigasi browser biasa bila `target` bukan `_self`: `node_modules/next/dist/client/app-dir/link.js` baris 45–56 (`isModifiedEvent` → `target && target !== '_self'`), sehingga handler klik `return` tanpa `router.push`. Jadi dua atribut cukup; tidak perlu mengganti ke `<a>`.
- `rel="noopener noreferrer"` mencegah tab baru mengakses `window.opener` (reverse tabnabbing) dan menyamakan kebijakan dengan tautan eksternal yang sudah ada. Untuk URL internal `/login` efek `noreferrer` nihil karena halaman tidak memakai Referer.
- Client component murni: tidak ada perubahan server, route, API, database, atau storage.

### Verifikasi
| Pemeriksaan | Perintah | Exit | Hasil |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | PASS (seluruh proyek) |
| ESLint | `npx eslint src/components/landing/Navbar.tsx` | 0 | PASS (0 error/warning) |
| Whitespace | `git diff --check` | 0 | PASS |
| Diff scope | `git diff src/components/landing/Navbar.tsx` | — | hanya +2 baris (`target`, `rel`) pada elemen Portal |

### Browser testing
Dev server `http://localhost:3000` merespons HTTP 200 (Next dev, hot reload).

| Uji | Hasil |
|---|---|
| Klik WIBEX Portal (desktop 1280×~800) | klik terkirim pada koordinat (1136, 32) |
| Tab landing setelah klik | **tetap** `http://localhost:3000/` — tidak ada navigasi in-place ✔ |
| Markup hasil render | `a[href="/login"]` dengan `target="_blank"`, `rel="noopener noreferrer"`, teks "WIBEX Portal" utuh ✔ |
| Tombol SUSTAINABILITY | tetap `target="_blank"` + `rel="noopener noreferrer"` ✔ |
| Tampilan mobile (390×844) | tautan "WIBEX Portal" tetap ada di header; tidak ada perubahan CSS sehingga tampilan tidak berubah ✔ |
| Isi tab baru (`/login`) | **tidak dapat diobservasi** oleh tooling browser sesi ini — daftar tab terkelola tidak menampilkan tab baru yang dibuka Chromium. Tidak diklaim PASS. |

Kesimpulan verifikasi: perubahan markup dan tidak-adanya navigasi in-place **terbukti**; pembukaan tab baru secara visual **belum terverifikasi langsung** dan perlu konfirmasi manual di browser pengguna.

### Catatan / risiko
- Cookie `wibex_session` bersifat per-origin, jadi login di tab baru juga berlaku di tab landing (perilaku normal, bukan regresi).
- Setelah login, `router.replace("/dashboard")` berjalan di tab baru; tab landing tetap pada posisinya — ini konsekuensi yang diinginkan.
- Jika kelak `/login` menambahkan parameter tujuan (`?next=`), perilaku tab baru harus diuji ulang.
- Working tree memiliki perubahan lain yang sudah ada sebelumnya (`About.tsx`, `Clients.tsx`, `Footer.tsx`, `SocialMedia.tsx`) — tidak disentuh pada pekerjaan ini.

## DL-2026-11-04-03 — Knowledge Management: inline editing + evidence per baris

**Permintaan.** Final business requirement: inline table editing mengacu pola MSL Engineering (modul MSL tidak diubah); content wajib; PIC minimal satu user Head Office dan semua status akun eligible; evidence opsional dan ditambahkan kapan saja; multiple PIC/evidence tetap didukung; optimistic concurrency dipertahankan; hapus seluruh record tetap nonaktif.

**Perubahan.**
- `schema.ts`: payload inline = `content` + `picIds` (min 1) + `expectedUpdatedAt`; `evidence` dikeluarkan dari kontrak record dan punya `evidencePayloadSchema` sendiri.
- `service.ts`: operasi evidence individual (`addKnowledgeEvidence`, `updateKnowledgeEvidenceById`, `deleteKnowledgeEvidenceById`); PIC kosong → 400; `23514` → 400; inline save tidak lagi menulis evidence.
- `repository.ts`: helper evidence per baris + `max(sort_order)`; `replaceKnowledgeEvidence` dihapus.
- Route baru: `POST /[projectId]/[type]/evidence`, `PATCH|DELETE /evidence/[id]`.
- `KnowledgeTable.tsx`: textarea + checkbox PIC inline; setiap evidence punya `Ubah`/`Hapus`; `+ Tambah evidence` di sel Evidence; token tetap dikirim pada inline save.
- `drizzle/0014_knowledge_pic_minimum.sql`: dua constraint trigger deferred yang menegakkan minimal 1 PIC, plus entri journal.
- Dokumentasi: `04_DATABASE_SCHEMA.md`, `05_API_DOCUMENTATION.md`, `07_MODULE_AND_FEATURE_INVENTORY.md`, `08_BUSINESS_PROCESS_AND_DATA_FLOW.md`, `FEATURE_REGISTER.md`.

**Verifikasi.**

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | PASS |
| ESLint | `npx eslint` (seluruh file berubah) | PASS |
| Unit test | `npm test` | PASS 21/21 |
| Build | `npx next build` | PASS |
| Migration check | `npx drizzle-kit check` | PASS ("Everything's fine") |
| Whitespace | `git diff --check` | PASS |

**Batasan.** Migration `0013`/`0014` belum dijalankan; belum ada uji HTTP/DB end-to-end; tidak ada commit, push, deployment, atau migration produksi.

## DL-2026-11-04-04 — Knowledge Management V1: staging verification (BLOCKED di Phase 2)

**Phase 1 — Repository readiness: PASS.** Branch `main`, HEAD `d342bda`; 14 file termodifikasi dan seluruh path untracked dipertahankan (termasuk `docs/development/WIBEX_ENGINEERING_WORKFLOW.md`). Journal `0000`–`0014` konsisten; `0013`/`0014` direview; remediasi terakhir (evidence per baris, PIC minimum, trigger) terpasang.

**Phase 2 — Staging database safety: BLOCKED (STOP).** Satu-satunya kredensial menunjuk Neon `ep-tiny-sunset-b4im0t43.c-6.us-east-2.aws.neon.tech`, database `neondb`, `sslmode=require`. Tidak ada penanda staging/non-produksi, tidak ada kredensial pembanding, dan tidak tersedia `pg_dump`, `psql`, maupun Docker untuk membuat dan memverifikasi backup. Sesuai stop condition (environment tidak dapat dibuktikan non-produksi; backup tidak dapat dibuat/diverifikasi), **tidak ada migration yang dijalankan** dan database Neon tidak disentuh.

**Phase 3–5 — Migration, DB integration, API end-to-end: NOT RUN.** Konsekuensi langsung stop condition di atas.

**Runtime HTTP yang diamati (tanpa sesi, tanpa operasi tulis):**

| Request | Status | Body |
|---|---|---|
| `GET /api/knowledge-management?type=lesson_learn` | **401** | `{"error":{"message":"Unauthenticated"}}` |
| `GET /api/knowledge-management/pic-options` | **401** | idem |
| `POST /api/knowledge-management/[projectId]/[type]/evidence` | **401** | idem |
| `PATCH /api/knowledge-management/evidence/[id]` | **401** | idem |
| `DELETE /api/knowledge-management/evidence/[id]` | **401** | idem |
| `PUT /api/knowledge-management/[projectId]/[type]` | **401** | idem |
| `DELETE /api/knowledge-management/entry/[id]` | **405** | pesan fitur hapus dinonaktifkan |
| `GET /dashboard/knowledge-management/lesson-learn` | **307** | redirect ke login |

**Phase 6 — Browser testing empat role: NOT RUN.** Tidak ada kredensial akun untuk Admin/Head Office/Management/Project. Tidak ada screenshot fitur yang dapat diambil tanpa sesi; tidak ada hasil yang diklaim PASS.

**Phase 7 — Regression: PASS (statis).** `git status` menunjukkan tidak ada perubahan pada `src/lib/msl`, `src/lib/organization-structure`, maupun route/halaman MSL/Struktur Organisasi (frozen). `npx next build` berhasil mengompilasi seluruh route, termasuk modul lain.

**Phase 8 — QA: PASS.** `npx tsc --noEmit` 0 · ESLint file berubah 0 · `npm test` 21/21 · `npx drizzle-kit check` PASS · `npx next build` PASS · `git diff --check` 0.

**Phase 9 — Backup, rollback, status.** Backup **tidak dibuat** (tidak ada tool yang tersedia; stop condition). Rollback belum diperlukan karena tidak ada DDL yang dijalankan. Bila migration kelak dijalankan: `DROP TRIGGER knowledge_entries_require_pic_trigger ON knowledge_entries; DROP TRIGGER knowledge_pics_require_remaining_trigger ON knowledge_pics; DROP FUNCTION knowledge_entries_require_pic(); DROP FUNCTION knowledge_pics_require_remaining();` lalu untuk `0013` drop `knowledge_pics`, `knowledge_evidence`, `knowledge_entries` (urutan anak → induk).

**Final status: BLOCKED.** Migration wajib, uji DB, API terautentikasi, dan browser empat role belum dieksekusi. Owner perlu menyediakan database non-produksi yang terkonfirmasi beserta tool backup, dan akun uji untuk empat role.

## DL-2026-11-04-05 — Knowledge Management: migration `0013`/`0014` di `neondb` (APPLIED)

**Otorisasi.** Owner mengesahkan implementasi objek database pada database WIBEX Neon yang ada (`neondb`), tanpa database/branch staging baru.

**1. Target terverifikasi.** Koneksi `DIRECT_URL` → host Neon `ep-tiny-sunset-b4im0t43.c-6.us-east-2.aws.neon.tech`, database `neondb`, `sslmode=require`; server PostgreSQL 18.6. Kredensial tidak dicetak.

**2. Audit riwayat sebelum eksekusi.** `drizzle.__drizzle_migrations` berisi **13 baris**; hash SHA-256 setiap baris cocok dengan file `0000`–`0012`, tidak ada entri tak dikenal, dan seluruh tabel historis yang diharapkan ada (`users`, `sessions`, `program_kerja*`, `template_forms`, `master_projects`, `engineering_database_entries`, `login_attempts`, `msl_assessments`, `msl_year_notes`, `organization_structure`). Tidak ada tabel/trigger Knowledge Management. Pending tepat `0013` dan `0014`. Data saat audit: 7 Master Project; user aktif 3 Admin, 5 Head Office, 1 Management, 1 Project.

**3. Eksekusi.** `npx drizzle-kit migrate` (hash resmi Drizzle) → `migrations applied successfully`, exit 0. Hanya `0013_knowledge_management` dan `0014_knowledge_pic_minimum` yang dijalankan; tidak ada DDL pada modul lain.

**4. Verifikasi objek (23/23 PASS).**

| Objek | Hasil |
|---|---|
| `knowledge_entries`, `knowledge_evidence`, `knowledge_pics` | PASS — ada |
| `UNIQUE(project_id, knowledge_type)` | PASS |
| CHECK content, tipe, nama evidence, URL `^https?://` | PASS |
| 6 foreign key (RESTRICT ke Master Project, NO ACTION/SET NULL ke users, CASCADE evidence/PIC) | PASS |
| `knowledge_entries_require_pic_trigger` | PASS — `enabled=O`, `deferrable=true`, `initdeferred=true` |
| `knowledge_pics_require_remaining_trigger` | PASS — deferrable, initdeferred |
| Riwayat migrasi | 15 baris; hash `0013`/`0014` cocok dengan file |

**5. Uji perilaku (semua di dalam transaksi yang di-rollback).** Entry tanpa PIC → `23514`; entry + 1 PIC + evidence → diterima; hapus PIC terakhir → `23514`; content spasi saja → `23514`; URL evidence `javascript:` → `23514`; duplikasi `(project, type)` → `23505`. Setelah seluruh uji: **0 baris** Knowledge Management tertinggal.

**6. Inkonsistensi/error.** Tidak ada. Satu NOTICE `schema "drizzle" already exists` dan `relation "__drizzle_migrations" already exists` dari migrator — normal, bukan kegagalan.

**7. Final status database: APPLIED & VERIFIED.** Sisa yang belum diuji: API terautentikasi empat role dan browser end-to-end (tidak ada kredensial akun uji). Tidak ada deployment, commit, atau push.

## DL-2026-11-04-06 — Post-migration application verification (BLOCKED: tanpa kredensial; fixture belum disetujui)

**Phase A — API read-only terautentikasi: NOT RUN.** Tidak ada kredensial akun untuk Admin/Head Office/Management/Project. `sessions` berisi 7 baris, tetapi token mentah tidak tersedia (yang disimpan hanya hash) dan memakai sesi milik pengguna lain tidak diotorisasi. Permintaan tanpa sesi yang sudah diuji tetap **401** pada seluruh endpoint Knowledge Management dan **307** pada halaman dashboard.

**Matriks permission (runtime, eksekusi kode — bukan HTTP):**

| Role | `KNOWLEDGE_MANAGEMENT_VIEW` | `KNOWLEDGE_MANAGEMENT_MANAGE` | `PROGRAM_KERJA_VIEW` |
|---|---|---|---|
| Admin | true | true | true |
| Head Office | true | true | true |
| Management | true | false | true |
| Project | true | false | **false** |

Hasil ini konsisten dengan desain: Project tetap dapat membuka Knowledge Management tetapi tidak dapat membuka halaman Program Kerja lain.

**Phase B — negative API: NOT RUN** (butuh sesi). Validasi tingkat skema sudah tercakup unit test 21/21: content kosong/spasi ditolak, `picIds` hilang/`[]` ditolak, evidence bukan bagian payload record, URL tidak aman ditolak. Status HTTP sebenarnya belum diuji.

**Phase C — fixture safety gate: STOPPED sesuai instruksi.** Tidak ada fixture dibuat. `knowledge_entries`/`knowledge_evidence`/`knowledge_pics` = **0/0/0** baris.

**Usulan fixture (menunggu persetujuan owner):**
- 1 Master Project sementara: `name` = `ZZ-KM-VERIFY-<timestamp>`, `location` = `TEST-ONLY`, `year` = 2026, `pic_user_id`/`created_by` = user Admin yang ada.
- Akun uji: cukup kredensial 4 akun existing (Admin, Head Office aktif, Head Office `suspended`, Management, Project); tidak perlu user baru.
- Record uji: 1 entry `lesson_learn` (content multiline) + 2 PIC Head Office (1 aktif, 1 suspended) + 2 evidence valid; 1 entry `va_ve` tanpa evidence.
- Cleanup: hapus evidence → PIC → entry untuk `project_id` fixture, lalu hapus Master Project; verifikasi count = 0 dan tidak ada baris yatim.

**Phase D — browser: NOT RUN.** Tidak ada akun; tidak ada screenshot yang diklaim.

**Phase E — regression: PASS (statis).** Tidak ada perubahan pada modul frozen (MSL Engineering, Struktur Organisasi) dan `npx next build` mengompilasi seluruh route. Uji fungsional runtime modul lain belum dijalankan.

**Status akhir putaran ini: BLOCKED** — menunggu kredensial akun uji (Phase A/B/D) dan persetujuan fixture (Phase C). Tidak ada deployment, commit, atau push.

## DL-2026-11-04-07 — Fixture execution preflight: STOP (kredensial empat role tidak tersedia)

**Pemeriksaan secret lokal (nama variabel saja, nilai tidak dibaca/dicetak).** `.env.local` memuat koneksi database, Blob/Vercel, MongoDB, dan hanya kredensial **Admin** (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Tidak ada variabel untuk Head Office, Management, maupun Project; tidak ada file `.env.test.local`/credential file lain di workspace.

**Konsekuensi.** Sesuai prioritas eksekusi (berhenti bila kredensial empat role belum tersedia), **tidak ada Master Project fixture dan tidak ada Knowledge Management record yang dibuat**. Tidak ada login, sesi, atau operasi tulis lain yang dijalankan.

**Verifikasi database tetap bersih (read-only).** Master Project 7, `knowledge_entries` 0, `knowledge_evidence` 0, `knowledge_pics` 0, Engineering Database 0, MSL assessment 7 — identik dengan kondisi sebelum audit. Tidak ada artefak fixture di working tree.

**Yang masih diperlukan dari owner.** (1) Tambahkan ke `.env.local` (untracked, jangan di-commit): `HO_EMAIL`/`HO_PASSWORD`, `MANAGEMENT_EMAIL`/`MANAGEMENT_PASSWORD`, `PROJECT_EMAIL`/`PROJECT_PASSWORD`; (2) keputusan untuk skenario PIC Head Office **suspended** — saat ini tidak ada user Head Office suspended, dan membuat/men-suspend user memerlukan persetujuan terpisah; (3) persetujuan tertulis pembuatan fixture `ZZ-KM-VERIFY-*` di `neondb`.

**Status: BLOCKED.** API terautentikasi, browser empat role, dan cleanup belum dapat dijalankan karena fixture belum boleh dibuat.

## DL-2026-11-04-08 — Eksekusi mandiri: kredensial Admin ditolak, fixture tidak dibuat

**Percobaan login (nilai kredensial tidak dicetak).** `.env.local` memuat `ADMIN_NIP`, `ADMIN_PASSWORD`, dan `ADMIN_EMAIL`, tetapi `POST /api/auth/login` mengembalikan **401 Invalid NIP or password** baik dengan NIP maupun dengan email. Artinya kredensial yang tersimpan tidak cocok dengan database yang sedang dipakai; tidak dilakukan tebakan password dan tidak ada sesi yang dibuat.

**Fixture.** Tidak ada Master Project maupun record Knowledge Management yang dibuat karena autentikasi gagal sebelum langkah tersebut. Skrip uji sementara dan log sudah dihapus.

**Verifikasi database (read-only) sesudah percobaan.** Master Project 7, fixture `ZZ-KM-VERIFY-%` 0, `knowledge_entries` 0, `knowledge_evidence` 0, `knowledge_pics` 0, `sessions` tidak bertambah. Dua percobaan login gagal tercatat pada ledger `login_attempts` (perilaku normal keamanan; tidak dihapus).

**Yang masih diperlukan.** Kredensial Admin yang valid untuk database aktif, plus kredensial Head Office, Management, dan Project bila uji empat role ingin diselesaikan. Tanpa itu, API/browser terautentikasi tetap **BLOCKED**.

## DL-2026-11-04-09 — Investigasi blocker login: target DB cocok, NIP env salah

**Target database.** `DIRECT_URL` = host direct `ep-tiny-sunset-b4im0t43...neon.tech`, `DATABASE_URL` = host pooler `ep-tiny-sunset-b4im0t43-pooler...neon.tech`; keduanya database **neondb**, PostgreSQL 18.6, `sslmode=require`. Aplikasi memakai `DATABASE_URL` (`src/lib/pg/client.ts`), migrasi memakai `DIRECT_URL` (`drizzle.config.ts`). Kedua koneksi melihat `drizzle.__drizzle_migrations` **15 baris dengan timestamp terakhir identik** dan data `users` yang sama — direct dan pooler menunjuk endpoint Neon yang sama, bukan database berbeda.

**Kontrak login.** Identifier adalah **NIP saja** (`loginSchema.nip`), lookup `users.nip`, verifikasi bcrypt, lalu status harus `active`. Email tidak pernah dipakai sebagai identifier.

**Temuan akar masalah.** `ADMIN_EMAIL` cocok dengan user **Administrator** (Admin, `active`, id `b0d26ba2-...`), dan `ADMIN_PASSWORD` **cocok dengan hash bcrypt akun tersebut**. Namun `ADMIN_NIP` di `.env.local` **tidak sama** dengan NIP tersimpan: panjang 7 vs 8 karakter, karakter pertama berbeda. Jadi 401 disebabkan identifier yang salah, bukan password atau database yang salah.

**Dampak keamanan.** Tercatat 3 kegagalan pada 2026-11-04 (2 untuk identity NIP salah, 1 untuk identity email): di bawah ambang lockout 5 kegagalan/15 menit, sehingga akun **tidak terkunci** dan tetap `active`. Tidak ada baris `login_attempts` yang dihapus.

**Resolusi.** Owner perlu mengoreksi `ADMIN_NIP` di `.env.local` (satu karakter awal) memakai NIP akun Administrator yang sebenarnya; password tidak perlu diubah. Kredensial Head Office, Management, dan Project tetap belum tersedia.

## DL-2026-11-04-10 — Eksekusi Admin end-to-end, bug KM-03 ditemukan & diperbaiki, fixture bersih

**Login Admin.** NIP benar diambil langsung dari database untuk `ADMIN_EMAIL` (nilai tidak dicetak); login **200**, role Admin. Tidak ada reset password atau perubahan user. Head Office/Management/Project tetap tanpa kredensial sehingga uji role tersebut BLOCKED.

**Runtime API (fixture 1 proyek, 3 record, 4 PIC, 3 evidence).** Suite pertama 40 cek: **36 PASS, 4 FAIL**. Semua kegagalan berasal dari satu bug: guarded UPDATE membandingkan `updated_at` PostgreSQL (mikrodetik) dengan token JSON (milidetik), sehingga setiap inline edit pertama mengembalikan **409**; PIC replacement ikut gagal dan uji "content untouched" gagal sebagai akibatnya.

**Perbaikan.** `updateKnowledgeContentIfUnchanged` (`src/lib/knowledge-management/repository.ts`) sekarang membandingkan epoch milidetik: `floor(extract(epoch from updated_at) * 1000) = expected.getTime()`. Tidak ada migration; presisi token tetap sama dengan yang diterima browser sehingga konflik nyata tetap ditolak.

**Verifikasi ulang pada fixture yang sama:** **10/10 PASS** — edit token fresh **200**, token basi **409**, konten tersimpan, stale write tidak menimpa, PIC replacement **200**, PIC menjadi 1, evidence tetap 1, PATCH evidence **200**.

**Browser (Admin, cookie via gate lokal).** Tiga submenu (Lesson Learn, Best Practice/KI KM, VA/VE) merender fixture; inline edit dilakukan lewat UI dan tersimpan (dikonfirmasi di database: konten 199 karakter memuat penanda UI). Console hanya berisi HMR/Fast Refresh, tanpa error aplikasi.

**Validasi API lain yang PASS:** content kosong 400, PIC hilang/[] 400, PIC Admin 409, `javascript:`/URL relatif 400, tipe tidak valid 400, hapus record 405, hapus proyek saat masih direferensikan 409, tanpa sesi 401, serta batas PIC/evidence sesuai scope.

**Cleanup.** Evidence (2) → PIC (3) → entry (3) → Master Project dihapus dalam satu transaksi; **CLEANUP PASS**, tanpa baris yatim. Database akhir: 7 Master Project, 0 fixture, 0 entry/evidence/PIC, 0 Engineering Database, 7 MSL, 10 user. Logout **200**.

**Regression & kualitas.** `tsc --noEmit` 0, ESLint 0, unit test **21/21**, `next build` **0**, `git diff --check` 0. Modul frozen (MSL Engineering, Struktur Organisasi) tidak berubah. Tidak ada deployment, commit, atau push.

**Status.** Admin: **PASS**. Head Office, Management, Project: **BLOCKED** (kredensial tidak tersedia). Knowledge Management V1 siap untuk acceptance Admin; acceptance empat role belum lengkap.

## DL-2026-11-04-11 — Token concurrency presisi mikrodetik, session cleanup, regresi final

**Audit presisi.** Implementasi sebelumnya membandingkan epoch milidetik, sehingga dua penyimpanan dalam milidetik yang sama dapat menerima token basi. Token sekarang adalah string UTC `YYYY-MM-DDTHH:MM:SS.ffffffZ` yang dihasilkan PostgreSQL (`to_char(... AT TIME ZONE 'UTC', '...US...')`) dan dikembalikan apa adanya; klien tidak lagi melewati `Date`. `findKnowledgeEntry` mengembalikan string yang sama, `updateKnowledgeContentIfUnchanged` memakai `updated_at = $token::timestamptz` dan menulis `updated_at = now()`, sehingga presisi penuh dipertahankan tanpa migration.

**Bukti.** Unit test **22/22** (termasuk token berbeda 1 mikrodetik dalam milidetik yang sama dianggap basi). Bukti guard SQL dengan tabel sementara (tanpa baris produksi): token fresh = 1 baris, replay token yang sama = 0, token beda 500 mikrodetik pada milidetik yang sama = 0, token tepat = 1 — **GUARD_PROOF PASS**. Uji HTTP concurrency pasca-perubahan **NOT RUN** karena pembuatan fixture tambahan dilarang pada fase ini; jalur HTTP Admin (fresh 200, stale 409) terakhir terverifikasi pada DL-10.

**Session security.** Lima sesi uji Admin (dibuat 06:27–06:37 UTC) dihapus berdasarkan ID tepat; `sessions` kembali **7** (baseline), sesi pra-uji 03:36 dan sesi pengguna lain tidak disentuh.

**QA final.** `tsc` 0, ESLint 0, unit test 22/22, `next build` 0, `drizzle-kit check` PASS, `git diff --check` 0. Modul frozen tidak berubah. Database: 7 Master Project, 0 fixture, 0 entry/evidence/PIC, 7 sesi, 10 user. Tidak ada migration, deployment, commit, atau push.

**Role.** Head Office, Management, Project tetap **BLOCKED**: tidak ada kredensial di `.env.local` maupun file secret lain; hanya `ADMIN_*` yang tersedia. Akun existing teridentifikasi (5 Head Office aktif, 1 Management, 1 Project) tetapi password tidak tersedia dan tidak boleh direset/dibuat.

**Status.** Admin **PASS**; concurrency **PASS (unit + SQL guard)**; HTTP concurrency pasca-perubahan **NOT RUN**; tiga role **BLOCKED**; acceptance empat role belum lengkap.

## DL-2026-11-04-12 — Timestamp monotonic ketat & keputusan acceptance final

**Monotonicity.** `updated_at = now()` diganti menjadi `greatest(clock_timestamp(), updated_at + interval '1 microsecond')`. `now()` adalah waktu mulai transaksi dan dapat berulang atau mundur bila jam disesuaikan; GREATEST menjamin setiap update sukses memiliki token yang **naik ketat** minimal 1 mikrodetik, tanpa mengubah tipe kolom, serialisasi string, atau semantik guard.

**Bukti monotonicity (tabel sementara, tanpa baris produksi).** Dengan `updated_at` diset ke 2030 (simulasi jam mundur), dua update menghasilkan `2030-01-01T00:00:00.123457Z` lalu `.123458Z`; pada jalur jam normal dua update menghasilkan token berbeda yang naik. **MONO_PROOF PASS**. Unit test bertambah menjadi **23/23 PASS**, termasuk token berbeda tepat 1 mikrodetik.

**Uji HTTP paralel — NOT RUN.** Tidak ada database uji terisolasi (`docker`, `psql`, `pg_ctl`, `initdb`, `postgres` semuanya tidak tersedia) dan tidak ada persetujuan fixture produksi tambahan, sehingga dua request simultan dengan token yang sama belum diuji lewat HTTP. Bukti yang ada: guard SQL (fresh=1 baris, replay=0 baris) dan unit test.

**RBAC tiga role — BLOCKED.** Tidak ada kredensial Head Office/Management/Project di `.env.local` atau file secret lain, dan tidak ada handoff browser dari pemilik akun. Tidak ada impersonasi, pembuatan user, atau reset password. Akun existing tetap: 5 Head Office aktif, 1 Management, 1 Project.

**QA final.** `tsc` 0, ESLint 0, unit test 23/23, `next build` 0, `drizzle-kit check` PASS, `git diff --check` 0. Modul frozen tidak berubah. Database tetap 7 Master Project, 0 fixture, 0 entry/evidence/PIC, 7 sesi (baseline), 10 user.

**Keputusan acceptance.** Admin: **PASS**. Timestamp monotonicity: **PASS**. Uji HTTP paralel: **NOT RUN**. Head Office/Management/Project: **BLOCKED**. Status keseluruhan: **BELUM READY FOR FINAL ACCEPTANCE** sampai uji paralel dan tiga role diselesaikan.

## DL-2026-11-04-13 — Verifikasi akhir: environment tidak tersedia, role BLOCKED

**A1 — kesiapan lingkungan.** Tidak ada database uji terisolasi: tidak ada `.env.test*`, `docker-compose`, atau workflow CI; `docker`/`psql`/`pg_ctl`/`initdb`/`postgres` tidak ada di PATH. Port 5432 memang terbuka dengan proses `postgres.exe` (PID 6764, service Windows), tetapi tidak ada kredensial, DSN, skema uji, atau konfigurasi proyek yang menunjuk ke sana; aplikasi tetap memakai `DATABASE_URL` produksi `neondb`. Membuat database/fixture baru dilarang tanpa persetujuan owner baru.

**A2 — uji HTTP paralel: NOT RUN.** Tidak dapat dijalankan tanpa lingkungan terisolasi atau fixture produksi tambahan. Bukti tidak langsung tetap berlaku: guard SQL (fresh=1 baris, replay=0 baris) dan unit test 23/23.

**A3 — timestamp integrity: PASS (dari DL-12, tidak berubah).** Serialisasi 6 digit mikrodetik, `GREATEST(clock_timestamp(), updated_at + 1µs)` menjamin kenaikan ketat, token fresh diterima, token basi ditolak, dua token dalam milidetik sama dibedakan, dan simulasi jam mundur (2030) tetap menghasilkan +1µs.

**A4 — regresi final.** `tsc` 0, ESLint 0, unit test **23/23**, `next build` 0, `drizzle-kit check` 0, `git diff --check` 0; modul frozen tidak berubah.

**B — role acceptance: BLOCKED.** Browser tidak memiliki sesi terautentikasi (tab dashboard diarahkan ke `/login`), hanya ada satu tab, dan tidak ada handoff dari pemilik akun Head Office/Management/Project. Kredensial ketiga role juga tidak ada di secret lokal. Tidak ada impersonasi, pembuatan user, suspend, atau reset password. Akun aktif tetap 5 Head Office, 1 Management, 1 Project.

**C — keamanan & integritas.** Tidak ada mutasi tak sah yang dijalankan pada fase ini. Database: 7 Master Project, 0 fixture, 0 entry/evidence/PIC, 7 sesi (baseline), 10 user. Tidak ada sesi uji tersisa.

**Keputusan akhir.** Admin **PASS**; timestamp **PASS**; uji HTTP paralel **NOT RUN**; tiga role **BLOCKED**. Status keseluruhan **BELUM READY FOR FINAL ACCEPTANCE**.

## DL-2026-11-04-14 — Role handoff tidak tersedia; PostgreSQL lokal tidak dapat diakses

**Phase A — role testing: BLOCKED.** Browser hanya memiliki tab di `/login` (tidak ada sesi terautentikasi); tidak ada handoff dari pemilik akun Head Office/Management/Project. Secret lokal tetap hanya `ADMIN_*`; tidak ada `HO_*`/`MANAGEMENT_*`/`PROJECT_*`. Tidak ada impersonasi, pembuatan user, suspend, atau reset password. Uji GET, visibilitas, mutasi, PIC options, dan pembatasan Program Kerja untuk ketiga role **NOT RUN**.

**Phase B — PostgreSQL lokal.** Service `postgresql-x64-17` **RUNNING** (PID 6764, akun `NT AUTHORITY\NetworkService`, data dir `C:\Program Files\PostgreSQL\17\data`, listen `*:5432`). `pg_hba.conf` memakai **scram-sha-256** untuk semua koneksi local/host, dan `psql -w` gagal dengan "no password supplied". Tidak ada DSN/kredensial uji resmi di repo maupun secret; tidak ada bukti database uji terpisah. Sesuai instruksi, tidak ada tebakan password, pembuatan database, atau perubahan konfigurasi. **Berhenti dan meminta bantuan owner.**

**Phase C — concurrent HTTP: NOT RUN.** Bergantung pada lingkungan uji terisolasi yang tidak tersedia; fixture produksi tambahan juga tidak disetujui.

**Phase D — dokumentasi.** Matriks acceptance role ditambahkan ke `06_AUTHENTICATION_AND_AUTHORIZATION.md`; status per modul sudah tercatat di `05`, `07`, `08`, dan `FEATURE_REGISTER`.

**Security hygiene vs RBAC.** Security hygiene **PASS** (tidak ada mutasi tak sah, tidak ada sesi uji tersisa, user tidak berubah). RBAC authorization tiga role **BELUM terverifikasi runtime** dan tidak boleh dilaporkan PASS.

**Status akhir.** Admin PASS; timestamp PASS; concurrent HTTP NOT RUN; Head Office/Management/Project BLOCKED. **BELUM READY FOR FINAL ACCEPTANCE**.

---

## DL-2026-11-05-01 — Commit KM V1 (c75d426)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` |
| Tanggal | 5 November 2026 |
| Status | **COMMITTED & PUSHED** — commit `c75d426`; tidak ada perubahan source pada pencatatan ini |
| Commit | `c75d426` "feat:KM core enterprise v.1" |
| Branch | `main` |
| Push | sudah di `origin/main` (verified) |
| Otorisasi | Owner (Hans) |
| Isi | 40 file: KM V1 (migration 0013/0014, API, lib, sidebar, dashboard, test), dokumentasi audit + development, `package.json` |
| File landing | 5 file landing sudah ter-commit di `d342bda`, bukan di commit ini |

### Catatan

Commit ini menutup rangkaian DL-01…DL-16 yang sebelumnya menyatakan "belum di-commit". Penambahan entri ini hanya dokumentasi log; tidak ada perubahan source code, migration, database, config, atau deployment.

---

## DL-2026-11-05-02 — Knowledge Management V2

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` |
| Tanggal | 5 November 2026 |
| Status | **IMPLEMENTED & VERIFIED** — Admin PASS; Head Office/Management/Project PASS (runtime 4 role, Owner confirmed 9 November 2026 — lihat `DL-2026-11-09-01`); migration APPLIED |
| Commit | belum di-commit (instruksi: no commit/push) |
| Branch | `main` |
| Baseline | `c75d426` |
| Migration | `0015_knowledge_management_v2_fresh` APPLIED di `neondb` |
| Data V1 | di-DROP (Owner accepted risk; 1 test record) |

### Perubahan
- Model V1 → V2: multiple records per project/kategori, form-based CRUD (bukan inline editing), evidence exactly-one, version-based concurrency, permanent delete
- Frontend: `KnowledgeTable` rewrite dengan rowspan grouping, `KnowledgeFormDialog` (modal Add/Edit), `KnowledgeDeleteDialog` (konfirmasi), `KnowledgeManagementPage` (shell)
- API: 6 endpoint V2 + 1 pendukung (`project-options`); hapus 4 endpoint V1
- Database: DROP V1 tables, REBUILD V2 fresh via migration 0015 (single statement batch, no partial state)

### Verifikasi
| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint` | PASS |
| `npm test` | 44/44 PASS |
| `git diff --check` | PASS |
| Migration APPLIED | PASS — 8/8 schema verification |
| API test | 71/73 → fix 2 di E+ → final PASS |
| Concurrency test | 4/4 PASS |
| Regression test | 7/7 PASS (MSL, Org, Program Kerja, Master Project, User, Landing CMS, Sidebar) |
| Runtime browser | PASS (gate Owner) |
| 4 role | PASS — Admin, Head Office, Management, Project (diverifikasi 9 November 2026) |
| Cleanup | PASS — 0 record, 0 test project, users identik, modul lain tidak berubah |

### Known limitations
- Head Office, Management, Project: **PASS** sejak 9 November 2026 (runtime 4 role, Owner confirmed); sebelumnya tidak dapat diuji karena kredensial tidak tersedia dan tidak ada impersonasi pembuatan user
- 4 drift `schema.ts` vs DB dari Sub-Fase M: diperbaiki di Sub-Fase F (termasuk snapshot `0015_snapshot.json`)
- `drizzle.config.ts` tidak membaca `.env.local` otomatis — didokumentasikan di `docs/audit/13_DEPLOYMENT_AND_ENVIRONMENT_GUIDE.md`

### Batasan
- Tidak ada commit/push/deploy
- Tidak menyentuh modul MSL/Org
- Migration 0015 fresh menggantikan 0015/0016/0017 (superseded)
- Data V1 (1 test record) hilang per keputusan Owner

---

## DL-2026-11-05-03 — KM V2 Enhancement (View, PDF, Filter, Search)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` (enhancement) |
| Tanggal | 5 November 2026 |
| Status | **IMPLEMENTED & VERIFIED** — Admin runtime PASS (Owner confirmed); HO/Mgmt/Project PASS (runtime 4 role, Owner confirmed 9 November 2026); enhancement 4 fitur terimplementasi |
| Commit | belum di-commit (instruksi: no commit/push) |
| Branch | `main` |
| Baseline | `303ca9b` + enhancement A→D (uncommitted) |

### Perubahan
- F-01: Modal View read-only (`KnowledgeViewDialog`)
- F-02a: PDF per-record (A4 portrait) dari modal View
- F-02b: PDF seluruh tabel (A4 landscape) dari page header, filter aktif tercetak
- F-03: Filter tahun (client-side, dari record ter-muat)
- F-04: Search dropdown proyek (single-select, dari record ter-muat)
- D-KM-ENH-04: Kolom Aksi di KnowledgeTable selalu render (Lihat selalu, Edit kondisional)

### File impacted
- Add: `KnowledgeViewDialog.tsx`, `KnowledgeFilterToolbar.tsx`, `KnowledgeProjectCombobox.tsx`, `knowledgeExportPdf.ts`, `knowledgeExportPdf.test.ts`
- Modify: `KnowledgeTable.tsx`, `types.ts`, `types.test.ts`, `KnowledgeFormDialog.tsx`
- Tidak berubah: API, schema, migration, database, MSL/Org

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | PASS | Freebuff |
| `npx eslint` | PASS | Freebuff |
| `npm test` | 60/60 PASS (16 test enhancement baru) | Freebuff |
| `git diff --check` | PASS | Freebuff |
| Runtime Admin 4 fitur enhancement | PASS | **Owner confirmed** |
| Runtime regression Form/Delete/Table | PASS | **Owner confirmed** |
| Runtime PDF View + Download | PASS | **Owner confirmed** |
| 4 role runtime | PASS — Admin, Head Office, Management, Project | **Owner confirmed** (9 November 2026) |
| Cleanup DB | PASS | **Owner confirmed** |

### Catatan sumber runtime
Runtime test dilakukan oleh Owner di browser sendiri. Freebuff tidak dapat menjalankan runtime karena kredensial Admin tidak tersedia untuk Freebuff. Owner mengonfirmasi hasil runtime PASS untuk Sub-Fase B, C, dan D sebelum dokumentasi ini ditulis. Ini sesuai governance §11.3.

### Known limitations
- RBAC 4 role **PASS** sejak 9 November 2026 (Admin, Head Office, Management, Project) — catatan lama "3 role BLOCKED" / follow-up RB-21 ditutup
- File naming collision (dua download detik sama) — konsekuensi requirement, risiko sangat rendah
- jsPDF test smoke PASS di Node; wrapper browser hanya manual test (Owner confirmed)

### Batasan
- Tidak ada commit/push/deploy
- Tidak menyentuh modul MSL/Org
- MSL/Program Kerja exporter TIDAK di-refactor
- Tidak menambah dependency

---

## DL-2026-11-08-01 — MKS P4 Finalization (Sidebar KM, Table UI, Sub-Fase E)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-MKS` |
| Tanggal | 8 November 2026 |
| Status | **IMPLEMENTED & VERIFIED** — static checks PASS; runtime visual tabel dan RBAC 4 role PASS (Owner confirmed 9 November 2026) |
| Commit | belum di-commit (instruksi: no commit/push/deploy) |
| Branch | `main` |
| Baseline | `ea70ba2` + MKS A–D (uncommitted); migration `0016` APPLIED |

### Perubahan
- Sidebar KM: `knowledgeOpen` menjadi `isKnowledgeManagementPath(pathname)` saja (menyimpang dari DL-2026-11-04-15 atas keputusan Owner 8 November 2026). MKS dan KM kini sama-sama route-driven.
- `getInitialSidebarAccordionState(pathname)` tidak lagi menerima parameter role; parameter dihapus agar tidak menyesatkan pembaca.
- Tabel MKS: padding baris `py-3` → `py-2`, header `py-2.5`, chip PIC `py-0.5`, catatan clamp 2 baris, tombol aksi seragam `h-7` + `shrink-0` (↑/↓ menjadi tombol ikon `w-7`), kontainer aksi `whitespace-nowrap`, sel Aksi `align-middle`, baris sub-kategori `bg-blue-50` dengan teks biru (item tetap putih), kolom Aksi 150px → 240px, `min-w` tabel 1080px → 1130px.
- Kolom **No dihapus** dari tabel disiplin (8 → 7 kolom; `colSpan` header/empty state ikut 7) dan dari PDF Summary (`TABLE_HEADERS`, `BASE_COLUMN_WIDTHS`, `summaryPdfCells` tanpa `index`/`no`; lebar kolom lain diskalakan ulang).
- **Summary Report dirombak** mengikuti pola Program Kerja: Disiplin menjadi baris header `colSpan` penuh (navy, teks putih) dengan sub-kategori/item di bawahnya; tabel UI dan PDF menjadi 5 kolom. Helper baru `buildSummaryTree()` (Disiplin → Sub-Kategori → Item, dipakai UI dan PDF) dan `buildSummaryPdfBody()`; Sub-Kategori memakai `rowSpan` di UI dan teks-sekali-di-baris-pertama di PDF, dengan jumlah baris mengikuti hasil filter. Filter client-side tetap.
- **Tabel Disiplin di-merge** seperti Summary: sel Sub-Kategori memakai `rowSpan={items.length + 1}` (`subKategoriRowSpan()`), header menjadi `Sub-Kategori | Item | PIC | Evidence | Catatan | Jumlah | Aksi` (tetap 7 kolom), item memakai kolom Item (kode + nama), `min-w` 1290px. Hanya markup: props `onAdd*/onEdit*/onDelete*/onReorder*`, state, dan API tidak berubah.
- Dokumentasi: laporan `docs/design/MKS_P4_FINALIZATION.md`, koreksi klaim KM di `docs/audit/06`, penanda resolusi di `SIDEBAR_ACCORDION_AUDIT.md`.

### File impacted
- Modify: `DashboardSidebar.tsx`, `DashboardSidebar.test.ts`, `metodeKerjaSidebar.test.ts`, `MetodeKerjaTable.tsx`
- Add: `docs/design/MKS_P4_FINALIZATION.md`
- Tidak berubah: API, service, repository, schema, migration, database, modul MSL/Org

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | PASS | Freebuff |
| `npx eslint` (sidebar + folder MKS) | PASS, 0 warning | Freebuff |
| `npm test` | 115/115 PASS (30 suite) | Freebuff |
| `git diff --check` | PASS | Freebuff |
| Migration `0016` | APPLIED sebelum fase ini; tidak dijalankan ulang | Freebuff |
| Runtime visual tabel (Summary + Disiplin merge) | PASS | **Owner confirmed** (9 November 2026) |
| RBAC 4 role (Admin, Head Office, Management, Project) | PASS | **Owner confirmed** (9 November 2026) — lihat `DL-2026-11-09-01` |

### Batasan
- Tidak ada commit/push/deploy/migration
- Tidak ada dependency baru, tidak ada auto-collapse logic
- Kolom Aksi 200px menyimpang dari P3 H.2 (140px) agar toolbar tidak membungkus

---

## DL-2026-11-09-01 — RBAC 4 Roles Verification (MKS & KM V2)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-MKS`, `ENT-KNOW` |
| Tanggal | 9 November 2026 |
| Status | **IMPLEMENTED & VERIFIED** — RBAC 4 role PASS di runtime; tidak ada temuan |
| Commit | belum di-commit (instruksi: no commit/push) |
| Branch | `main` |
| Baseline | `ea70ba2` + MKS P4 (uncommitted), termasuk redesign Summary dan merge Sub-Kategori tabel Disiplin |

### Perubahan
- Verifikasi runtime 4 role oleh Owner untuk Metode Kerja Standar (MKS) dan Knowledge Management V2 (KM V2).
- Tiga role yang sebelumnya **BLOCKED** (Head Office, Management, Project) kini **PASS**; tidak ada perubahan source code, API, database, atau UI pada entri ini (murni dokumentasi).

### Hasil RBAC
| Role | MKS | KM V2 | Cakupan yang diverifikasi |
|---|---|---|---|
| Admin | PASS | PASS | Full CRUD: create, update, delete, reorder (sub-kategori, item, PIC) |
| Head Office | PASS | PASS | CRUD tanpa Delete — tombol Hapus tidak tersedia, API menolak |
| Management | PASS | PASS | Read-only — tanpa tombol mutasi dan tanpa endpoint mutasi |
| Project | PASS | PASS | Read-only — termasuk tidak membuka modul/menu yang tidak diizinkan |

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | PASS | Freebuff |
| `npm test` | 122/122 PASS (30 suite) | Freebuff |
| `git diff --check` | PASS | Freebuff |
| Runtime 4 role MKS | PASS | **Owner confirmed** |
| Runtime 4 role KM V2 | PASS | **Owner confirmed** |

### Dampak dokumentasi
- `FEATURE_REGISTER.md`: `ENT-KNOW` dan `ENT-MKS` menjadi **IMPLEMENTED & VERIFIED**; catatan BLOCKED pada bagian RBAC dihapus.
- `CURRENT_PROJECT_STATE.md`: status proyek menjadi **FULLY VERIFIED**; known limitation "3 role BLOCKED" dihapus.
- `DEVELOPMENT_MASTER_LOG.md`: status akhir `DL-2026-11-05-02`, `DL-2026-11-05-03`, dan `DL-2026-11-08-01` diperbarui; fakta historis kapan role diuji tetap dicatat apa adanya.

### Batasan
- Tidak ada commit/push/deploy
- Tidak ada perubahan source code, API, DB, UI, atau dependency

---

## DL-2026-11-09-02 — Calculation Sheet Template V1 (P4 A–D)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-CST` |
| Tanggal | 9 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** — static checks PASS; migration `0017` belum di-apply; runtime API/DB + visual browser pending Owner |
| Commit | belum di-commit (instruksi: no commit/push/deploy) |
| Branch | `main` |
| Baseline | `c053c48` |

### Perubahan
- **Master reference flat**: satu halaman `/dashboard/calculation-sheet-template`, satu tabel inline, tujuh kategori kanonik hardcoded tanpa angka prefix — Arsitektur, Struktur, Infrastruktur, Geoteknik, Green Building, MEEP, Lainnya.
- **Model**: tabel `calculation_sheet_templates` dengan kategori, kode, nama, satu PIC Head Office, URL evidence opsional, dan catatan opsional. Unique kode per kategori; tanpa upload, reorder, PDF, atau optimistic concurrency.
- **API**: 5 method — `GET` list flat, `POST` create (201), `PUT`/`DELETE` per id, `GET pic-options` (Manage-only). `kategori` hanya pada create dan ditolak strict pada update; semua respons `Cache-Control: no-store`.
- **UI**: 7 `<tbody>` dengan header kategori `colSpan={6}` + anchor id, inline edit satu baris pada satu waktu, create draft per kategori, error validasi di bawah baris, PIC `<select>` dari `pic-options`, dan pesan sukses/gagal.
- **Sidebar**: menu top-level accordion "Calculation Sheet Template" dengan tujuh submenu anchor (`#arsitektur` … `#lainnya`); submenu aktif mengikuti hash, bukan hanya pathname. Management/Project tetap melihat menu dan tabel dalam mode baca.
- **RBAC**: `CALCULATION_SHEET_VIEW` untuk Admin, Head Office, Management, Project; `CALCULATION_SHEET_MANAGE` hanya Admin dan Head Office (termasuk delete).

### File impacted
- Add: `src/lib/calculation-sheet-template/{constants,schema,repository,service,cst-draft}.ts` + `{schema,service,cst-draft}.test.ts`; `src/app/api/calculation-sheet-template/{route,_helpers}.ts`, `{route,_helpers}.test.ts`, `[id]/route.ts`, `pic-options/route.ts`; `src/components/dashboard/calculation-sheet-template/{CalculationSheetTemplatePage,CstTable}.tsx`; `src/app/dashboard/calculation-sheet-template/{page,layout}.tsx`; `src/components/dashboard/calculationSheetSidebar.test.ts`; `drizzle/0017_calculation_sheet_templates.sql`; `drizzle/meta/0017_snapshot.json`; `docs/design/CST_P2_AUDIT.md`; `docs/design/CST_P3_TECHNICAL_DESIGN.md`
- Modify: `src/lib/pg/schema.ts`, `src/lib/auth/permissions.ts`, `drizzle/meta/_journal.json`, `src/components/dashboard/DashboardSidebar.tsx`, dokumen `docs/development/{DEVELOPMENT_MASTER_LOG,FEATURE_REGISTER,CURRENT_PROJECT_STATE}.md`, `docs/audit/{05_API_DOCUMENTATION,06_AUTHENTICATION_AND_AUTHORIZATION,07_MODULE_AND_FEATURE_INVENTORY}.md`
- Tidak berubah: frontend modul lain, API/service modul lain, serta migration yang sudah APPLIED (`0015`, `0016`)

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | PASS | Freebuff |
| `npx eslint` (CST lib/API/UI + Sidebar) | PASS, 0 warning | Freebuff |
| `npm test` | **174/174 PASS** (45 suite; 155 sebelum CST + 19 test CST) | Freebuff |
| `git diff --check` | PASS | Freebuff |
| Migrasi `0017` | **BELUM dijalankan** — file dibuat, snapshot sinkron, journal file 18 entry; journal database masih 17 entry | Freebuff |
| Uji runtime API/DB + browser | **NOT RUN** — menunggu migration dan runtime test Owner | — |

### Batasan
- Tidak ada commit/push/deploy
- Tidak ada migration yang dijalankan; `psql` tidak tersedia di environment ini
- Runtime 4 role, inline CRUD, dan anchor scroll belum diuji terhadap database/browser nyata; status keseluruhan tetap `IMPLEMENTED BUT NOT FULLY VERIFIED` sampai Owner menyelesaikan runtime test
- Verifikasi UI bersifat statis + unit test (repo tanpa jsdom)
