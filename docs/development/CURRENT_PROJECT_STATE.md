# CURRENT PROJECT STATE — BDWIKA / WIBEX

> **Peta kondisi proyek untuk sesi AI berikutnya.** Ditulis dari audit read-only repository pada **25 November 2026**.
> **Aturan utama: kode adalah sumber kebenaran.** Bila dokumen ini berbeda dengan kode, kode menang dan dokumen harus diperbarui.
> Dokumen ini **hanya** memuat kondisi; riwayat keputusan ada di `DEVELOPMENT_MASTER_LOG.md`, status per fitur di `FEATURE_REGISTER.md`.

| Field | Nilai |
|---|---|
| Terakhir diperbarui | **25 November 2026** |
| HEAD | **`dcbf13e`** — `refactor(pre-deploy):new revision-1` (24 Nov 2026, 17:33 +0700) |
| Branch | `main` |
| Working tree | **BERSIH** (`git status` kosong, tidak ada file modified/untracked) |
| Status remote | tidak diperiksa pada pass ini (tidak ada `git fetch`); asumsikan HEAD lokal = yang akan di-push Owner |
| Migration | **32 file** `drizzle/0000`–`0031` + `meta/_journal.json` **32 entry** |
| Test | **358/358 PASS** (76 suite, 50 file test) — 25 November 2026 |
| Build | **PASS** (`npm run build`, "Compiled successfully in 72s", `output: "standalone"`) — 25 November 2026 |

---

## 1. Ringkasan Eksekutif

**WIBEX (BDWIKA)** adalah platform internal Building Division PT Wijaya Karya (Persero) Tbk. yang terdiri dari dua sisi:

1. **Landing page publik** (`/`) — hero, about, Our Project, Green Building, media sosial, klien.
2. **WIBEX Portal / CMS Admin** (`/login` → `/dashboard`) — CMS konten landing + **Core Enterprise** (Program Kerja, Template & Form, Master Project, Engineering Databases, MSL, Knowledge Management, Metode Kerja Standar, Calculation Sheet, Project Documentation, Berkas, Standard & Regulation, Green Building & ESG, Building Learning Center, Dashboard SASAA, User & RBAC).

**Status keseluruhan: `PRODUCTION-READY untuk modul core yang sudah diverifikasi` + 6 area `IMPLEMENTED BUT NOT FULLY VERIFIED`.**

- 14 modul/area berstatus **IMPLEMENTED & VERIFIED** (sebagian besar lewat runtime 4 role yang dikonfirmasi Owner).
- 6 area sudah selesai secara kode dan static-check PASS, tetapi **belum diverifikasi visual/runtime di Vercel**: Standard & Regulation, Sertifikasi Green Building, Penilaian ESG, Building Learning Center, Dashboard SASAA (+ Kelola Foto), dan revisi tampilan terbaru (sidebar, kartu SASAA, menu INNOVATION).
- Tidak ada modul besar yang belum dimulai. Tidak ada temuan CRITICAL yang terbuka.

**Skala kode saat ini**

| Metrik | Jumlah |
|---|---|
| Modul dashboard (`src/app/dashboard/*`) | 22 folder modul |
| Route handler API (`src/app/api/**/route.ts`) | 105 |
| Halaman (`page.tsx`) | 69 |
| Komponen `.tsx` | 144 |
| File test | 50 (76 suite, 358 test) |
| Permission RBAC | 39 |
| Tabel PostgreSQL | 35 |
| Koleksi MongoDB | 5 |
| Migration | 32 (0000–0031) |

---

## 2. Daftar Modul & Status

Legenda: **✅ VERIFIED** = sudah diuji runtime/visual dan dikonfirmasi Owner · **🟡 NOT FULLY VERIFIED** = kode + static check PASS, verifikasi visual/runtime Owner belum ada.

### 2.1 Landing page & CMS

| Modul | Status | Bukti / Catatan |
|---|---|---|
| Landing page publik (Hero, About, Projects, Green Building, Social, Clients, Footer) | ✅ VERIFIED | `src/app/page.tsx`, `src/components/landing/*`; data via `GET /api/<modul>/public`, empty-first (tanpa konten karangan) |
| Navbar landing: HOME, ABOUT, OUR PROJECT, SUSTAINABILITY, **INNOVATION** | 🟡 NOT FULLY VERIFIED (khusus INNOVATION) | `src/components/landing/Navbar.tsx`; SUSTAINABILITY + INNOVATION (`https://im.dewika.id`) `target="_blank"` + `rel="noopener noreferrer"` + ikon ↗, desktop & menu HP; static check PASS, visual belum dicek |
| CMS Hero / Our Project / Green Building / Media Sosial / Our Client | ✅ VERIFIED | MongoDB + Vercel Blob publik; **feed publik Green Building CMS masih 0 item** (lihat TD-05) |
| Upload gambar CMS + cleanup referensi | ✅ VERIFIED | `src/lib/cms/*`, `src/lib/storage/public-image.ts` |

### 2.2 Core Enterprise

| Modul | Status | Bukti / Catatan |
|---|---|---|
| Auth (NIP + password), sesi opaque, lockout | ✅ VERIFIED | `src/lib/auth/*`; bcrypt cost 12, cookie `wibex_session`, 5 gagal/15 menit |
| RBAC + User Directory (+ posisi Manager, activity log, proteksi admin terakhir, foto profil) | ✅ VERIFIED | `src/lib/auth/permissions.ts` (39 permission, 3 lapis); migration `0025_activity_logs`, `0031_user_activity_logs` |
| Profil mandiri (`/dashboard/profile/edit`) | ✅ VERIFIED | termasuk upload foto profil ≤2 MB (jpeg/png/webp) |
| Program Kerja (+ RI/catatan/evidence, Summary, PDF) | ✅ VERIFIED | runtime 4 role dikonfirmasi Owner |
| Template & Form (link + upload dokumen privat) | ✅ VERIFIED | Blob privat, download via route ber-guard |
| Master Project (direktori proyek kanonik) | ✅ VERIFIED | GIN trigram, sumber baris modul lain |
| Engineering Databases (6 kategori + summary) | ✅ VERIFIED | — |
| MSL Engineering (bulanan, skor, PDF V2.5) | ✅ VERIFIED · **frozen** | jangan refactor tanpa instruksi Owner |
| Struktur Organisasi | ✅ VERIFIED · **frozen** | jangan refactor tanpa instruksi Owner |
| Knowledge Management V2 (Lesson Learn, Best Practice/KI-KM, VA/VE) | ✅ VERIFIED | V1→V2 drop+rebuild; RBAC 4 role PASS 9 Nov 2026 |
| Metode Kerja Standar (6 disiplin A–F, multi PIC, reorder, PDF) | ✅ VERIFIED | RBAC 4 role PASS 9 Nov 2026 |
| Calculation Sheet Template (7 kategori, inline edit) | ✅ VERIFIED | runtime browser 4 role PASS 10 Nov 2026 |
| Project Documentation (Rekap Bulanan + Summary 12 bulan) | ✅ VERIFIED | runtime browser 4 role PASS 10 Nov 2026 |
| Berkas (Ajukan, Verifikasi, PDF cover, watermark NIP, reject/revisi, TTD inline) | ✅ VERIFIED (Production-Ready) | Sprint 1 runtime Vercel PASS 10 Nov 2026; TTD inline runtime PASS 24 Nov 2026 |
| Dashboard Welcoming (`/dashboard`) | ✅ VERIFIED | commit `eb77e1c`, `activity_logs` |
| Dashboard SASAA (6 grafik bulanan, tabel KM, banner GB, kartu kelengkapan Eng DB) + Kelola Foto | 🟡 NOT FULLY VERIFIED | backend + UI selesai; visual Vercel belum dicek |
| Standard & Regulation (5 submenu, tabel berjenjang, upload privat ≤20 MB) | 🟡 NOT FULLY VERIFIED | migration `0027`; visual + upload nyata belum dicek |
| Database Green Building & ESG — Sertifikasi | 🟡 NOT FULLY VERIFIED | migration `0028`; visual belum dicek |
| Database Green Building & ESG — Penilaian ESG (12 bulan) | 🟡 NOT FULLY VERIFIED | migration `0029`; visual + optimistic rollback belum dicek |
| Building Learning Center (Sharing, Training, Certificate, Admin Control) | 🟡 NOT FULLY VERIFIED | migration `0030`; upload Blob nyata + visual belum dicek |

### 2.3 Perubahan tampilan terbaru (24–25 November 2026, sudah di HEAD)

| Perubahan | File | Status |
|---|---|---|
| Sidebar: urutan BLC, panel biru Master Project, border 1.5 px pada 4 menu akordeon, rata kiri label | `src/components/dashboard/DashboardSidebar.tsx` | static PASS; visual HP/drawer belum dicek |
| Submenu Master Project: kotak border biru (bukan biru gelap) | `DashboardSidebar.tsx` | static PASS; visual belum dicek |
| Kartu "Proyek Terpilih" SASAA tanpa kotak PIC Proyek | `src/components/dashboard/sasaa/SasaaPage.tsx` | static PASS; visual belum dicek |
| Menu INNOVATION di navbar (desktop + HP, ikon ↗) | `src/components/landing/Navbar.tsx` | static PASS; visual belum dicek |

---

## 3. Status Database

### 3.1 Migration

- **32 migration** di `drizzle/` (`0000`–`0031`) dan `meta/_journal.json` berisi **32 entry** — file dan journal sinkron.
- **APPLIED yang tercatat di dokumentasi/commit:** `0017`–`0030` (termasuk `0024_berkas_search_index`, `0025_activity_logs`, `0026_project_photos`, `0027_standard_regulation`, `0028_project_green_certificates`, `0029_project_esg_assessments`, `0030_building_learning_center`).
- **`0031_user_activity_logs`** (24 November 2026) tercatat di journal tetapi **belum tercatat sebagai APPLIED di dokumen mana pun** → status penerapan **BELUM DIVERIFIKASI** (lihat TD-11).
- Status APPLIED **tidak dapat diperiksa dari repository** (tidak ada akses/kredensial database pada pass ini). Verifikasi butuh `DIRECT_URL`/`DATABASE_URL` + `drizzle-kit`.

### 3.2 Migration terbaru

| Migration | Isi |
|---|---|
| `0025_activity_logs` | tabel `activity_logs` (feed Dashboard Welcoming) |
| `0026_project_photos` | tabel `project_photos` (4 slot foto per proyek, SASAA) |
| `0027_standard_regulation` | `regulation_sub_kategori`, `regulation_document` |
| `0028_project_green_certificates` | `project_green_certificates` (CHECK komposit Lembaga/Level) |
| `0029_project_esg_assessments` | `project_esg_assessments` (12 kolom status bulan, UNIQUE project+year) |
| `0030_building_learning_center` | `learning_categories`, `learning_contents`, `learning_attachments` |
| `0031_user_activity_logs` | tabel log aktivitas user (User Directory) |

### 3.3 Tabel PostgreSQL (35)

`users` · `sessions` · `login_attempts` · `program_kerja_groups` · `program_kerja` · `program_kerja_monthly` · `program_kerja_pics` · `template_forms` · `knowledge_entries` · `knowledge_evidence` · `knowledge_pics` · `knowledge_evidence_archive` · `knowledge_evidence_selection` · `master_projects` · `project_photos` · `engineering_database_entries` · `msl_assessments` · `msl_year_notes` · `organization_structure` · `metode_kerja_sub_kategori` · `metode_kerja_item` · `metode_kerja_pic` · `regulation_sub_kategori` · `regulation_document` · `calculation_sheet_templates` · `project_documentations` · `berkas_pengajuan` · `berkas_penyusun` · `berkas_validasi` · `activity_logs` · `project_green_certificates` · `project_esg_assessments` · `learning_categories` · `learning_contents` · `learning_attachments`

Sumber tunggal skema: **`src/lib/pg/schema.ts`**. Ekstensi `pg_trgm` dipakai untuk pencarian (Master Project, Berkas, BLC).

### 3.4 Koleksi MongoDB (5)

`heroes` · `portfolio_projects` · `green_building_certificates` · `social_posts` · `clients` — hanya untuk konten landing; index dibuat lazy pada request pertama.

---

## 4. Status Pengujian & Kualitas

| Pemeriksaan | Perintah | Hasil | Tanggal |
|---|---|---|---|
| Unit + komponen test | `npm test` | **358/358 PASS**, 76 suite, 50 file, exit 0 | 25 Nov 2026 |
| TypeScript | `npx tsc --noEmit` | PASS (exit 0) | 25 Nov 2026 |
| ESLint | `npx eslint <file berubah>` | PASS (exit 0) | 25 Nov 2026 |
| Build produksi | `npm run build` | **PASS** — "Compiled successfully in 72s", 69 halaman, `output: "standalone"` | 25 Nov 2026 |
| Hygiene diff | `git diff --check` | PASS | 25 Nov 2026 |

**Security patch — sudah diterapkan dan terpasang:**

| Paket | Versi terpasang | Catatan |
|---|---|---|
| `next` | **16.4.6** | patch keamanan (commit `d24fa71`, `a4aa8a3`) |
| `react` / `react-dom` | **19.3.1** | idem |
| `zod` | 4.6.7 | perbaikan vulnerability (`a4aa8a3`) |
| `@vercel/blob` | 2.9.0 | — |

**Cakupan test:** logika domain murni (skor MSL, agregasi summary, permission/RBAC, schema Zod, storage path, PDF engine, navigasi sidebar) + beberapa komponen React (`@testing-library/react` + `jsdom`). **Tidak ada** E2E/Playwright, tidak ada CI — semua dijalankan manual.

---

## 5. Technical Debt & Pending Tasks

| ID | Prioritas | Item | Tindakan yang disarankan |
|---|---|---|---|
| TD-01 | HIGH | **CSP belum dipasang.** `next.config.ts` hanya memasang `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` | Susun CSP Report-Only → enforce (perhatikan gambar Blob remote + inline style) |
| TD-02 | HIGH | **Belum ada CI.** `tsc`/`eslint`/`test`/`build` hanya dijalankan manual | Tambahkan pipeline (tsc + eslint + npm test) minimal untuk PR |
| TD-03 | MEDIUM | **6 area belum diverifikasi visual/runtime Vercel:** Regulation, Sertifikasi GB, ESG, BLC, Dashboard SASAA + Kelola Foto, revisi tampilan (sidebar, kartu SASAA, INNOVATION) | Owner cek di Vercel dengan 4 role, lalu naikkan status di `FEATURE_REGISTER.md` |
| TD-04 | MEDIUM | `.env.example` ada di disk tetapi **gitignored** (`.gitignore:44` = `.env*`) dan hanya memuat 4 variabel | Track ulang (`!.env.example`) + lengkapi 13 nama variabel |
| TD-05 | MEDIUM | Feed publik **Green Building CMS masih 0 item** (empty state) | Pastikan minimal 1 sertifikat berstatus `Published` |
| TD-06 | MEDIUM | Foto profil: blob orphan bila PATCH gagal, tanpa compare-and-set, tanpa rate limit, pesan 400 generik | Cleanup best-effort + validasi pesan |
| TD-07 | MEDIUM | **`0031_user_activity_logs` belum tercatat APPLIED** | Konfirmasi ke database, lalu catat di dokumen |
| TD-08 | LOW | BLC tab **Kategori** read-only (API belum punya PATCH/DELETE kategori) | Tambahkan kontrak API bila dibutuhkan |
| TD-09 | LOW | Navbar desktop kini 6 item `space-x-8` + logo 180 px + tombol Portal → berpotensi sesak pada 768–1100 px | Kecilkan spacing di `md` bila terlihat meluber |
| TD-10 | LOW | Index MongoDB dibuat lazy pada request pertama | Buat index saat bootstrap/deploy |
| TD-11 | LOW | Tidak ada retensi/penjadwalan `login_attempts` dan `sessions` kedaluwarsa | Scheduler/cron pembersihan |
| TD-12 | LOW | Beberapa komponen besar (mis. `TemplateFormEditor` ±1.000 baris) | Pecah hanya bila disentuh untuk perubahan fungsional |
| TD-13 | INFO | MSL Engineering & Struktur Organisasi berstatus **frozen** | Jangan refactor tanpa instruksi eksplisit Owner |

**Pending keputusan produk**

1. **Dashboard SASAA — kartu "Persentase Kelengkapan per Proyek"**: saat ini hanya menampilkan **proyek terpilih** (opsi 1), karena frontend hanya menerima `charts.engDb` untuk proyek terpilih. Bila ingin satu bar per proyek, endpoint agregator harus diperluas (bukan sekadar perubahan tampilan).
2. **Integrasi/ekspansi SASAA** (mis. ringkasan lintas proyek) belum direncanakan.
3. **Kebijakan "frozen"** MSL & Struktur Organisasi belum punya dokumen resmi — masih berdasarkan catatan historis.

---

## 6. Environment & Stack

| Komponen | Versi / Detail |
|---|---|
| Framework | **Next.js 16.4.6** (App Router, `output: "standalone"`) |
| UI | **React 19.3.1** / React DOM 19.3.1 |
| Bahasa | TypeScript **5.9.3** (`strict`) |
| Styling | Tailwind CSS **4.3.3** via `@tailwindcss/postcss`; **tanpa** `tailwind.config.*`; token di `src/app/globals.css` (`--primary #001f3f`, `--secondary #0061a5`, `--surface #ffffff`, `--outline #c3c6cf`, `--background #f8f9ff`) |
| Database utama | **PostgreSQL (Neon)** via `postgres` 3.4.9 + **Drizzle ORM 0.45.4** (`drizzle-kit` 0.31.11) |
| Database konten | **MongoDB** (`mongodb` driver 7.7.0) — 5 koleksi landing |
| Storage | **Vercel Blob** (`@vercel/blob` 2.9.0) — publik untuk gambar CMS/foto proyek, privat untuk dokumen Template & Form, Regulation, lampiran BLC, PDF Berkas |
| PDF | `pdf-lib` 1.17.1 (cover + merge + watermark), `pdfjs-dist` 6.5.438 (viewer), `jspdf` 4.2.1 + `jspdf-autotable` 5.0.9 (export client-side) |
| Grafik | `recharts` 3.10.1 |
| Tanda tangan | `signature_pad` 5.1.7 (TTD inline Berkas) |
| Validasi | `zod` 4.6.7 |
| Auth | `bcryptjs` 3.0.3, sesi opaque di PostgreSQL (tanpa NextAuth) |
| Runtime lokal | Node **v24.18.0**, npm **12.2.3**, Windows (Git Bash) |
| Deploy | Vercel (runtime Owner); build lokal PASS |
| Test tooling | `tsx` 4.23.15, `jsdom` 31.0.1, `@testing-library/react` 16.3.3 |

**Script:** `dev` · `build` · `start` · `lint` · `test` (`node --import tsx --test "src/**/*.test.ts" "src/**/*.test.tsx"`).

**Environment variable (nama saja, jangan pernah dicetak nilainya):** `DATABASE_URL`, `DIRECT_URL`, `MONGODB_URI`, `MONGODB_DB_NAME`, `BLOB_READ_WRITE_TOKEN`, `VERCEL_OIDC_TOKEN`, `BLOB_STORE_ID`, `CMS_BLOB_READ_WRITE_TOKEN`, `ADMIN_NIP`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_POSITION`, `NODE_ENV`.

**Arsitektur wajib diikuti:** `Client Component → Route Handler (auth + Zod + mapping HTTP) → Service (aturan bisnis + otorisasi) → Repository (Drizzle/Mongo) → DB`. Otorisasi 3 lapis (layout guard, route, `assert*` di service). Permission terpusat di `src/lib/auth/permissions.ts`.

---

## 7. Riwayat Perubahan 2–3 Minggu Terakhir (audit `git log`)

| Tanggal | Modul / peristiwa | Commit kunci |
|---|---|---|
| 24 Nov 2026 | User Directory: posisi Manager, user activity log, proteksi admin terakhir, foto profil · Berkas TTD inline · Dashboard SASAA struktur baru (6 grafik, tabel KM, banner GB) · revisi sidebar (urutan, panel biru, border, rata kiri) · revisi pra-deploy | `aaa326a`, `a30c6cb`, `2382319`, `b9477c8`, `8a3270f`, `d5f9ae8`, `8964561`, `dcbf13e` |
| 23 Nov 2026 | **Building Learning Center (BLC)** core enterprise + recap dokumentasi | `b833ca7`, `b34c30e` |
| 20 Nov 2026 | Penyesuaian layout PDF Berkas | `d11577f` |
| 19 Nov 2026 | `output: "standalone"`, perbaikan vulnerability zod, ignore `.cloud-attachments` | `1825357`, `a4aa8a3`, `2842b4e` |
| 18 Nov 2026 | **Sertifikasi Green Building + Penilaian ESG** (migration 0028/0029) · reorder sidebar Core Enterprise | `a6cbe60`, `05898d5`, `4ab2ef7`, `9d52086` |
| 16 Nov 2026 | **Standard & Regulation** (migration 0027) | `d688472` |
| 12 Nov 2026 | **Dashboard SASAA + Kelola Foto** (0026) + security patch Next/React · **Dashboard Welcoming** (0025) · Berkas Sprint 2 + audit + index (0023/0024) | `bb7228f`, `d24fa71`, `eb77e1c`, `c4176cf`, `1eb9280`, `9684fc1` |
| 10–11 Nov 2026 | Berkas Sprint 1 V1 (cover, kode seri, watermark) · CST · PDOC | `1668685`, `d3813b3`, `5636113`, `a7527e1` |
| 8–9 Nov 2026 | **Metode Kerja Standar** (0016) · KM sidebar fix · verifikasi PDOC/CST/MKS/KM | `1857f51`, `9dd9f5d`, `c053c48` |

Detail per perubahan (file, keputusan, hasil verifikasi) ada di `DEVELOPMENT_MASTER_LOG.md`.

---

## 8. Aturan Kerja untuk AI Berikutnya

1. **Baca kode dulu, ubah kemudian.** Dokumen ini ringkasan; detail perilaku ada di file.
2. **Periksa `git status` sebelum bekerja.** Working tree saat audit bersih — jangan `git add .` atau menghapus perubahan yang bukan milik Anda.
3. **Jangan pernah** menjalankan migration/seed, deploy, commit, atau push tanpa instruksi eksplisit Owner.
4. **Jangan mencetak** nilai environment/secret di chat, log, atau file.
5. **Hormati fitur frozen** (MSL Engineering, Struktur Organisasi): usulkan, jangan langsung refactor.
6. **Ikuti pola yang ada**: Route → Service → Repository, permission terpusat, Zod di batas HTTP, storage DB-first, error domain → HTTP (bukan 500).
7. **Migration baru**: tambahkan file di `drizzle/` (jangan edit migration lama) + perbarui `src/lib/pg/schema.ts` pada perubahan yang sama.
8. **Setelah mengubah kode**: jalankan `npx tsc --noEmit`, `npx eslint <file>`, dan `npm test`; jalankan `npm run build` bila menyentuh routing/konfigurasi. Laporkan hasil sebenarnya.
9. **Bahasa**: kode & komentar Inggris; teks UI dalam Bahasa Indonesia.
10. **UI belum dianggap "verified"** hanya karena static check PASS — verifikasi visual/runtime adalah keputusan Owner.

---

## 9. Yang Belum Terverifikasi (jujur)

- Status APPLIED migration `0031` (dan drift schema terhadap database produksi).
- Visual/runtime Vercel untuk 6 area pada TD-03, termasuk RBAC 4 role di modul-modul baru.
- Alur upload Blob nyata: Regulation (PDF/Word/Excel/ZIP), BLC (thumbnail + lampiran), foto proyek SASAA, foto profil.
- Tampilan sidebar hasil redesign pada layar HP/drawer (kontras border 40%, panel biru, wrap label panjang).
- Tampilan navbar dengan 6 item pada lebar 768–1100 px.
- Isi database produksi (jumlah user, role, data konten), status deployment Vercel, dan domain.
- Kebijakan resmi "frozen" MSL & Struktur Organisasi.
