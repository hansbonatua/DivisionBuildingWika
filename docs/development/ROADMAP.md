# ROADMAP PENGEMBANGAN — BDWIKA / WIBEX

> **Peta jalan resmi proyek**, dari modul yang sudah selesai sampai rencana pengembangan berikutnya.
> **Aturan utama: kode adalah sumber kebenaran.** Bila dokumen ini berbeda dengan kode, kode menang dan dokumen harus diperbarui.
> Kondisi terkini per modul ada di `CURRENT_PROJECT_STATE.md`, status per fitur di `FEATURE_REGISTER.md`, riwayat keputusan di `DEVELOPMENT_MASTER_LOG.md`.

| Field | Nilai |
|---|---|
| Status dokumen | **RESMI — v1.0** |
| Terakhir diperbarui | **25 November 2026** |
| HEAD saat disusun | **`c9fc8b1`** — `deploy:install minIO` |
| Branch | `main` |
| Posisi proyek | **Fase 1 selesai → masuk Fase 2 (Deployment & Stabilization)** |
| Pemilik keputusan | Owner proyek — Building Division PT Wijaya Karya (Persero) Tbk. |
| Dokumen terkait | `CURRENT_PROJECT_STATE.md` · `FEATURE_REGISTER.md` · `DEVELOPMENT_MASTER_LOG.md` · `docs/audit/*` |

**Legenda status**

| Simbol | Arti |
|---|---|
| ✅ | **Production-Ready** — kode, static check, dan verifikasi runtime/visual selesai |
| 🟡 | **Implemented, not fully verified** — kode + static check PASS, verifikasi visual/runtime Owner belum ada |
| ⏳ | **Planned** — belum dikerjakan |
| 🔒 | **Frozen** — jangan di-refactor tanpa instruksi eksplisit Owner |

---

## Ringkasan Fase

| Fase | Nama | Status | Kriteria keluar |
|---|---|---|---|
| **1** | Development — Landing, Auth, Core Enterprise | ✅ **SELESAI** | Seluruh modul inti terimplementasi, build PASS, test PASS, RBAC 4 role terverifikasi |
| **2** | Deployment & Stabilization | ⏳ **SEDANG BERJALAN** | Aplikasi live di Vercel + MinIO, 6 area TD-03 terverifikasi, dead code bersih, TD HIGH selesai |
| **3** | Review & Iteration | ⏳ Menunggu Fase 2 | UAT stakeholder Dashboard SASAA & penyesuaian UI BLC disetujui Owner |
| **4** | Future Enhancements | ⏳ Backlog | Kapabilitas baru diprioritaskan dan dijadwalkan |

---

# FASE 1 — COMPLETED

**Periode:** awal proyek s.d. 25 November 2026
**Status keseluruhan:** ✅ **PRODUCTION-READY** untuk seluruh modul inti, dengan 6 area yang masih menunggu verifikasi visual/runtime (dipindahkan ke Fase 2).

## 1.1 Fondasi, Landing Page & CMS

| Modul | Status | Bukti / Catatan |
|---|---|---|
| Landing page publik (Hero, About, Our Project, Green Building, Social Media, Clients, Footer) | ✅ Production-Ready | `src/app/page.tsx`, `src/components/landing/*`; data via `GET /api/<modul>/public`, empty-first (tanpa konten karangan) |
| Navbar landing: HOME, ABOUT, OUR PROJECT, SUSTAINABILITY, **INNOVATION** | 🟡 Not fully verified | `Navbar.tsx`; SUSTAINABILITY + INNOVATION (`https://im.dewika.id`) `target="_blank"` + `rel="noopener noreferrer"`; visual 768–1100 px belum dicek (TD-09) |
| CMS Hero / Our Project / Green Building / Media Sosial / Our Client | ✅ Production-Ready | MongoDB (5 koleksi) + object storage publik |
| Upload gambar CMS + cleanup referensi | ✅ Production-Ready | `src/lib/cms/*`, `src/lib/storage/public-image.ts` |

## 1.2 Authentication, RBAC & User Directory

| Modul | Status | Bukti / Catatan |
|---|---|---|
| Auth NIP + password, sesi opaque, lockout | ✅ Production-Ready | `src/lib/auth/*`; bcrypt cost 12, cookie `wibex_session`, 5 gagal / 15 menit |
| RBAC 3 lapis + User Directory | ✅ Production-Ready | 39 permission di `src/lib/auth/permissions.ts`; layout guard + route guard + `assert*` di service |
| User Directory lanjutan (posisi Manager, activity log, proteksi Admin terakhir) | ✅ Production-Ready | migration `0025_activity_logs`, `0031_user_activity_logs` |
| Profil mandiri + foto profil (≤2 MB, jpeg/png/webp) | ✅ Production-Ready | `/dashboard/profile/edit` |

## 1.3 Core Enterprise

| # | Modul | Status | Catatan |
|---|---|---|---|
| 1 | **Program Kerja** (+ RI/catatan/evidence, Summary, PDF) | ✅ Production-Ready | runtime 4 role dikonfirmasi Owner |
| 2 | **Template & Form** (link + upload dokumen privat) | ✅ Production-Ready | bucket privat, download via route ber-guard |
| 3 | **Master Project** (direktori proyek kanonik) | ✅ Production-Ready | GIN trigram; sumber baris modul lain |
| 4 | **Engineering Databases** (6 kategori + summary) | ✅ Production-Ready | — |
| 5 | **MSL Engineering** (bulanan, skor, PDF V2.5) | ✅ Production-Ready · 🔒 Frozen | jangan refactor tanpa instruksi Owner |
| 6 | **Struktur Organisasi** | ✅ Production-Ready · 🔒 Frozen | jangan refactor tanpa instruksi Owner |
| 7 | **Knowledge Management V2** (Lesson Learn, Best Practice/KI-KM, VA/VE) | ✅ Production-Ready | RBAC 4 role PASS 9 Nov 2026 |
| 8 | **Metode Kerja Standar** (6 disiplin A–F, multi PIC, reorder, PDF) | ✅ Production-Ready | RBAC 4 role PASS 9 Nov 2026 |
| 9 | **Calculation Sheet Template** (7 kategori, inline edit) | ✅ Production-Ready | runtime browser 4 role PASS 10 Nov 2026 |
| 10 | **Project Documentation** (Rekap Bulanan + Summary 12 bulan) | ✅ Production-Ready | runtime browser 4 role PASS 10 Nov 2026 |
| 11 | **Berkas** (Ajukan, Verifikasi, PDF cover, watermark NIP, reject/revisi, TTD inline) | ✅ Production-Ready | Sprint 1 runtime Vercel PASS 10 Nov 2026; TTD inline PASS 24 Nov 2026 |
| 12 | **Dashboard Welcoming** (`/dashboard`) | ✅ Production-Ready | `activity_logs`, commit `eb77e1c` |
| 13 | **Dashboard SASAA** (6 grafik bulanan, tabel KM, banner GB, kartu kelengkapan Eng DB) + Kelola Foto | 🟡 Not fully verified | backend + UI selesai; visual Vercel belum dicek |
| 14 | **Standard & Regulation** (5 submenu, tabel berjenjang, upload privat ≤20 MB) | 🟡 Not fully verified | migration `0027`; upload nyata + visual belum dicek |
| 15 | **Green Building — Sertifikasi** | 🟡 Not fully verified | migration `0028`; visual belum dicek |
| 16 | **ESG — Penilaian 12 bulan** | 🟡 Not fully verified | migration `0029`; visual + optimistic rollback belum dicek |
| 17 | **Building Learning Center (BLC)** — Sharing, Training, Certificate, Admin Control | 🟡 Not fully verified | migration `0030`; upload nyata + visual belum dicek |

## 1.4 Skala Proyek per 25 November 2026

| Metrik | Jumlah |
|---|---|
| File di `src/` | 581 |
| Modul dashboard (`src/app/dashboard/*`) | 22 folder |
| Route handler API | 105 |
| Halaman (`page.tsx`) | 69 |
| Permission RBAC | 39 |
| Tabel PostgreSQL | 35 |
| Koleksi MongoDB | 5 |
| Migration | 32 (`0000`–`0031`) |
| File test / suite / test case | 50 / 76 / **359 PASS** |

## 1.5 Definition of Done Fase 1 — tercapai

| Kriteria | Hasil |
|---|---|
| `npm run build` | ✅ PASS (`output: "standalone"`) |
| `npm test` | ✅ **359/359 PASS** (76 suite) |
| `npx tsc --noEmit` | ✅ PASS |
| RBAC 4 role (Admin, Head Office, Management, Project) | ✅ Terverifikasi pada modul inti |
| Security patch (Next 16.4.6, React 19.3.1, zod 4.6.7) | ✅ Terpasang |
| Storage produksi | ✅ Beralih dari Vercel Blob ke **MinIO (S3-compatible)** — 7 token route presigned PUT, 2 bucket (`wibex-public`, `wibex-private`) |

**Catatan jujur:** 6 area (Regulation, Sertifikasi GB, ESG, BLC, Dashboard SASAA + Kelola Foto, revisi tampilan terbaru) belum diverifikasi visual/runtime. Area tersebut **bukan** pekerjaan pengembangan baru — penyelesaiannya masuk Fase 2 (TD-03).

---

# FASE 2 — DEPLOYMENT & STABILIZATION

**Tujuan:** aplikasi berjalan stabil di produksi, seluruh modul terverifikasi, sampah teknis dibersihkan.
**Status:** ⏳ sedang berjalan.

## 2.1 Prasyarat

| # | Item | Status awal |
|---|---|---|
| 1 | PostgreSQL produksi (Neon) + `DATABASE_URL`/`DIRECT_URL` | menunggu konfirmasi Owner |
| 2 | MongoDB produksi + `MONGODB_URI`/`MONGODB_DB_NAME` | menunggu konfirmasi Owner |
| 3 | MinIO di VPS + domain `storage.bdwika.cloud` | terpasang (`c9fc8b1`) |
| 4 | 7 variabel `S3_*` terisi di environment Vercel | ⏳ belum |
| 5 | Migration `0031_user_activity_logs` dipastikan APPLIED | ⏳ belum terverifikasi (TD-07) |

**Variabel environment yang wajib ada** (nama saja — nilai tidak boleh dicetak di dokumen, chat, atau log):

- Database: `DATABASE_URL`, `DIRECT_URL`, `MONGODB_URI`, `MONGODB_DB_NAME`
- Storage: `S3_ENDPOINT_INTERNAL`, `S3_ENDPOINT_PUBLIC`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_PUBLIC`, `S3_BUCKET_PRIVATE`
- Bootstrap admin: `ADMIN_NIP`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_POSITION`
- Runtime: `NODE_ENV`

## 2.2 Langkah Deployment ke Vercel

| # | Langkah | Kriteria selesai |
|---|---|---|
| 1 | **Siapkan MinIO:** bucket `wibex-public` (anonymous read) dan `wibex-private` (privat total), lalu verifikasi object privat **tidak** menjawab 2xx tanpa kredensial | `curl -I` ke objek privat = 403/404 |
| 2 | **Isi environment** di Vercel (Production + Preview), termasuk 7 variabel `S3_*` | semua nama di §2.1 terpasang |
| 3 | **Migration:** pastikan `0031_user_activity_logs` APPLIED, atau jalankan `drizzle-kit migrate` bila belum | journal database = 32 entry |
| 4 | **Build & deploy:** `npm run build` lokal PASS → deploy (`output: "standalone"`) | deployment sukses, tidak ada error build |
| 5 | **Smoke test 4 role** pada modul inti (login, CRUD satu baris per modul, unduh dokumen privat) | 4 role bisa login & menjalankan aksi sesuai permission |
| 6 | **Verifikasi storage end-to-end:** satu upload per namespace (CMS, foto user, foto proyek, BLC, Template & Form, Regulation, Berkas) + satu download privat | presigned PUT 200, objek muncul di bucket, URL publik dapat diakses, dokumen privat tetap tertutup |
| 7 | **Naikkan status modul** di `FEATURE_REGISTER.md` setelah diverifikasi Owner | status 🟡 → ✅ |

## 2.3 Migrasi Data Storage (Vercel Blob → MinIO)

| # | Langkah | Catatan |
|---|---|---|
| 1 | Jalankan `npx tsx scripts/migrate-blob-to-minio.ts --dry-run` | **belum pernah dijalankan**; hanya melaporkan rencana |
| 2 | Tinjau hasil dry-run (jumlah objek per store, pathname yang akan di-rewrite) | pastikan tidak ada pathname tak terduga |
| 3 | Jalankan migrasi nyata | menyalin objek + menulis ulang URL di `users.photo_url`, `project_photos.blob_url`, `organization_structure.image_url`, `learning_contents.thumbnail_url`, dan `imageUrl` di 5 koleksi Mongo |
| 4 | Verifikasi sampel: gambar landing, foto profil, foto proyek, dokumen privat | semua URL mengarah ke `S3_ENDPOINT_PUBLIC` |
| 5 | Setelah stabil, arsipkan script + hapus `@vercel/blob` dari `devDependencies` | jangan dihapus sebelum migrasi terverifikasi |

## 2.4 Pembersihan Dead Code (hasil audit P2, 25 November 2026)

Audit read-only menemukan sampah teknis berikut. **Belum ada yang dihapus.**

| Prioritas | Item | Jumlah | Aman dihapus? |
|---|---|---|---|
| **P1** | Aset SVG sisa template Next.js (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) | 5 file | ✅ aman |
| **P1** | DevDependency `@testing-library/user-event` | 1 paket | ✅ aman (0 import) |
| **P1** | Komponen yatim `src/components/dashboard/sasaa/SasaaStatsGrid.tsx` | 1 file (5 KB) | ✅ aman (0 importer, terverifikasi) |
| **P2** | Export nilai tak pernah dipanggil (mis. `getDisiplinDetailBySlug`, `deleteExpiredSessions`, `ensureTemplateFormView`, `isBlobStorageConfigured`, `isDeclaredSizeAllowed`) | 26 simbol | ✅ aman, kecuali `isBlobStorageConfigured` bila health-check storage tetap diinginkan |
| **P2** | Variabel/fungsi lokal mati (`Stat`, `CallIcon`, `assertNoteAccess`, `_passwordHash`, `_username`) | 5 temuan | ✅ aman |
| **P3** | Export tipe tak pernah dirujuk (`LoginInput`, `HeroListResponse`, `DeleteRegulationBlobInput`, …) | 14 tipe | ⚠️ aman tapi manfaat ~nol (tidak masuk bundle) |
| **P3** | Aset `public/` tak direferensikan kode | 40 file, **131,75 MB** (12 foto proyek = ±119 MB) | ⚠️ **wajib query DB dulu** — `logoUrl`/`imageUrl` bisa menunjuk path tersebut |
| — | Export yang hanya dipakai di file sendiri (`BerkasDb`, `S3Config`, …) | 332 simbol | ❌ **jangan** — kosmetik, risiko regresi tinggi |

**Catatan penting:** `LICENSE_FOXIT` dan `LICENSE_LIBERATION` di `public/pdfjs/standard_fonts/` **wajib dipertahankan** (kepatuhan lisensi font). Folder `public/pdfjs/*` dipakai PDF.js (`workerSrc` + `standardFontDataUrl`).

## 2.5 Technical Debt (TD-01 … TD-13)

| ID | Prioritas | Item | Target Fase 2 |
|---|---|---|---|
| TD-01 | HIGH | **CSP belum dipasang** — `next.config.ts` baru memasang `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` | Susun CSP Report-Only → enforce (perhatikan gambar remote + inline style) |
| TD-02 | HIGH | **Belum ada CI** — `tsc`/`eslint`/`test`/`build` dijalankan manual | Pipeline minimal untuk PR (tsc + eslint + test) |
| TD-03 | MEDIUM | **6 area belum diverifikasi visual/runtime:** Regulation, Sertifikasi GB, ESG, BLC, Dashboard SASAA + Kelola Foto, revisi tampilan (sidebar, kartu SASAA, INNOVATION) | Owner cek dengan 4 role, lalu naikkan status di `FEATURE_REGISTER.md` |
| TD-04 | MEDIUM | `.env.example` gitignored (`.gitignore:44` = `.env*`) dan baru memuat 4 variabel — sekarang butuh +7 variabel `S3_*` | Track ulang (`!.env.example`) + lengkapi seluruh nama variabel |
| TD-05 | MEDIUM | Feed publik **Green Building CMS masih 0 item** (empty state) | Pastikan minimal 1 sertifikat `Published` |
| TD-06 | MEDIUM | Foto profil: blob orphan bila PATCH gagal, tanpa compare-and-set, tanpa rate limit, pesan 400 generik | Cleanup best-effort + validasi pesan |
| TD-07 | MEDIUM | `0031_user_activity_logs` belum tercatat APPLIED | Konfirmasi ke database, lalu catat di dokumen |
| TD-08 | LOW | BLC tab **Kategori** read-only (API belum punya PATCH/DELETE kategori) | Tambahkan kontrak API bila dibutuhkan |
| TD-09 | LOW | Navbar desktop 6 item `space-x-8` + logo 180 px berpotensi sesak di 768–1100 px | Kecilkan spacing di `md` bila meluber |
| TD-10 | LOW | Index MongoDB dibuat lazy pada request pertama | Buat index saat bootstrap/deploy |
| TD-11 | LOW | Tidak ada retensi/penjadwalan `login_attempts` dan `sessions` kedaluwarsa | Scheduler/cron — helper `deleteExpiredSessions` sudah ada di `src/lib/auth/session.ts` tetapi belum dipanggil |
| TD-12 | LOW | Beberapa komponen besar (mis. `TemplateFormEditor` ±1.000 baris) | Pecah hanya bila disentuh untuk perubahan fungsional |
| TD-13 | INFO | MSL Engineering & Struktur Organisasi **frozen** | Jangan refactor tanpa instruksi eksplisit Owner |

## 2.6 Kriteria Keluar Fase 2

1. Deployment produksi Vercel aktif dan dapat diakses dengan domain resmi.
2. Seluruh modul berstatus ✅ di `FEATURE_REGISTER.md` (tidak ada lagi 🟡).
3. Upload & download storage terverifikasi untuk **semua** namespace, baik publik maupun privat.
4. Migrasi Blob → MinIO selesai dan `@vercel/blob` sudah tidak diperlukan.
5. TD-01 dan TD-02 (HIGH) selesai; TD-03, TD-04, TD-05, TD-07 tuntas.
6. Dead code prioritas P1 & P2 sudah dibersihkan; working tree bersih dan `git diff --check` PASS.

---

# FASE 3 — REVIEW & ITERATION

**Tujuan:** memastikan hasil pengembangan sesuai kebutuhan pengguna nyata, bukan hanya lolos static check.
**Prasyarat:** Fase 2 selesai (aplikasi live dan dapat diakses stakeholder).

## 3.1 UAT Stakeholder — Dashboard SASAA (prioritas utama)

| # | Skenario uji | Peran | Kriteria diterima |
|---|---|---|---|
| 1 | Buka `/dashboard/master-project/sasaa` untuk proyek dengan data lengkap | Admin, Head Office | 6 grafik bulanan ter-render, angka sesuai data sumber |
| 2 | Proyek tanpa data (empty state) | Management, Project | Tidak ada error; empty state jelas, bukan grafik kosong membingungkan |
| 3 | Kartu "Proyek Terpilih" | semua role | Informasi proyek tampil tanpa kotak PIC Proyek (revisi 24 Nov) |
| 4 | Banner Green Building + tabel Knowledge Management | semua role | Data sesuai modul sumber; tidak ada item karangan |
| 5 | Kelola Foto proyek (4 slot) | Admin, Head Office | Upload, ganti, hapus foto berfungsi; foto lama terhapus dari storage |
| 6 | Kartu "Persentase Kelengkapan per Proyek" | semua role | Sesuai keputusan produk (lihat §3.4) |

**Keputusan produk yang masih terbuka:** kartu kelengkapan saat ini hanya menampilkan **proyek terpilih** karena endpoint hanya mengirim `charts.engDb` untuk proyek tersebut. Bila stakeholder ingin satu bar per proyek, endpoint agregator harus diperluas — ini perubahan backend, bukan sekadar tampilan.

## 3.2 Penyesuaian UI Building Learning Center (BLC)

| # | Area | Yang perlu diputuskan |
|---|---|---|
| 1 | Tampilan kartu grid (24 item/halaman) | Kerapatan kartu, ukuran thumbnail, jumlah item per baris di layar 1366 px |
| 2 | Detail Sharing (iframe 16:9) | Proporsi video, posisi daftar lampiran, tombol Kembali |
| 3 | Admin Control (4 tab) | Konsistensi tabel Edit/Hapus dengan modul lain |
| 4 | Tab Kategori (read-only) | Apakah perlu CRUD kategori (TD-08) atau tetap read-only |
| 5 | Upload thumbnail + lampiran (≤20 MB) | Umpan balik progres, pesan error, perilaku saat gagal |
| 6 | Navigasi sidebar BLC | Urutan menu, state akordeon, perilaku di HP/drawer |

## 3.3 Area lain yang menunggu verifikasi visual (TD-03)

Standard & Regulation · Sertifikasi Green Building · Penilaian ESG · revisi sidebar (panel biru Master Project, border 1,5 px, rata kiri) · navbar 6 item pada 768–1100 px · tampilan drawer di HP.

## 3.4 Ritme Iterasi

1. Stakeholder menguji dengan data produksi (bukan data demo).
2. Temuan dicatat sebagai tiket dengan ID modul + prioritas.
3. Perbaikan dikerjakan per batch kecil; setiap batch wajib `tsc` + `eslint` + `npm test` PASS sebelum diserahkan.
4. Status modul diperbarui di `FEATURE_REGISTER.md` dan `CURRENT_PROJECT_STATE.md`; keputusan dicatat di `DEVELOPMENT_MASTER_LOG.md`.
5. Modul **frozen** (MSL Engineering, Struktur Organisasi) hanya disentuh bila Owner meminta secara eksplisit.

## 3.5 Kriteria Keluar Fase 3

1. Dashboard SASAA diterima stakeholder (checklist §3.1 lulus).
2. Penyesuaian UI BLC disetujui dan terpasang.
3. Tidak ada temuan UAT berprioritas HIGH yang terbuka.
4. Seluruh modul berstatus ✅ di `FEATURE_REGISTER.md`.

---

# FASE 4 — FUTURE ENHANCEMENTS

Fitur dan kapabilitas yang **belum** dikerjakan. Urutan bersifat usulan; prioritas akhir ditentukan Owner.

| # | Kapabilitas | Nilai | Prasyarat | Prioritas |
|---|---|---|---|---|
| 1 | **Integrasi notifikasi** (in-app + email) untuk Berkas masuk, revisi, approval, dan pengingat Program Kerja | Memotong ketergantungan pada pengecekan manual | Penyedia email/queue + tabel notifikasi | HIGH |
| 2 | **CI/CD pipeline** (GitHub Actions: tsc + eslint + test + build, lalu deploy otomatis) | Mencegah regresi masuk ke produksi (melanjutkan TD-02) | Repo host + secret deploy | HIGH |
| 3 | **CSP enforce** setelah Report-Only stabil (lanjutan TD-01) | Menutup XSS/clickjacking secara menyeluruh | Audit sumber inline script/style | HIGH |
| 4 | **Scheduler retensi data** (`sessions`, `login_attempts`, log aktivitas lama) | Menjaga ukuran database & kepatuhan (lanjutan TD-11) | Cron/worker + kebijakan retensi | MEDIUM |
| 5 | **SASAA lintas proyek** (ringkasan & perbandingan antar proyek) | Keputusan manajerial berbasis data portofolio | Perluasan endpoint agregator | MEDIUM |
| 6 | **BLC: CRUD kategori** (lanjutan TD-08) | Admin bisa mengelola kategori sendiri | Kontrak API PATCH/DELETE kategori | MEDIUM |
| 7 | **E2E test** (Playwright) untuk alur kritis: login → CRUD → upload → PDF | Mengunci alur bisnis utama | Environment uji + data seed | MEDIUM |
| 8 | **Observability** (error tracking, log terstruktur, uptime monitor) | Deteksi gangguan lebih cepat | Pemilihan layanan monitoring | MEDIUM |
| 9 | **Backup & disaster recovery MinIO** (snapshot bucket + uji restore) | Melindungi dokumen privat & foto | Kebijakan retensi + storage cadangan | MEDIUM |
| 10 | **Index MongoDB saat bootstrap** (lanjutan TD-10) | Menghindari latensi request pertama | Hook inisialisasi aplikasi | LOW |
| 11 | **Kebijakan resmi "frozen"** untuk MSL & Struktur Organisasi | Menghindari refactor tak sengaja | Keputusan Owner (lanjutan TD-13) | LOW |
| 12 | **Pemecahan komponen besar** (lanjutan TD-12) | Kemudahan perawatan | Dilakukan hanya saat komponen disentuh | LOW |

---

## Risiko & Ketergantungan

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Kredensial DB/storage belum tersedia saat audit | Status APPLIED migration & isi data tidak terverifikasi | Verifikasi manual Owner sebelum go-live |
| Aset `public/asset/*` dihapus padahal dirujuk baris database | Gambar rusak di landing page | Query DB dulu; hapus bertahap dengan verifikasi |
| Migrasi Blob → MinIO belum dijalankan | URL lama masih menunjuk Vercel Blob | Dry-run dulu, verifikasi sampel, baru hapus dependency |
| 6 area belum diuji visual | Cacat tampilan baru terlihat setelah rilis | Jadwalkan UAT Fase 3 segera setelah deploy |
| Modul frozen di-refactor tanpa instruksi | Regresi pada modul yang sudah stabil | Hormati TD-13; usulkan, jangan ubah langsung |

---

## Aturan Perubahan Dokumen Ini

1. Roadmap diperbarui saat sebuah fase dimulai/selesai, bukan setiap perubahan kecil.
2. Setiap perubahan fase wajib disertai entri di `DEVELOPMENT_MASTER_LOG.md` dengan ID `DL-YYYY-MM-DD-XX`.
3. Status modul di sini **ringkasan**; rujukan resmi tetap `FEATURE_REGISTER.md` dan `CURRENT_PROJECT_STATE.md`.
4. Jangan mencantumkan nilai secret/credential di dokumen ini — hanya nama variabel.
