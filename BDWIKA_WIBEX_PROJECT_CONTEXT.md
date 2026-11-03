# BDWIKA_WIBEX_PROJECT_CONTEXT.md

> Dokumen konteks migrasi untuk GPT/engineer berikutnya.
> Disusun dari audit read-only repository pada **3 November 2026**, HEAD **`84e0a90`**.
> Sumber kebenaran = kode di repository, bukan catatan historis. Bila dokumen ini berbeda dengan kode, **kode menang** dan dokumen harus diperbarui.

---

## Project Overview

- **Nama:** BDWIKA / WIBEX (“WIBEX Enterprise CMS”).
- **Organisasi:** Building Division PT Wijaya Karya (Persero) Tbk.
- **Tujuan:** platform internal + landing page publik Building Division.
  - **Landing page publik** — hero, about, portfolio proyek, sertifikat green building, media sosial, klien.
  - **CMS Admin** — mengelola seluruh konten landing di atas.
  - **Core Enterprise** — Program Kerja, Template & Form, Master Project, Engineering Databases, MSL Engineering (penilaian bulanan + PDF), Struktur Organisasi, User Directory.
- **Repository:** `https://github.com/hansbonatua/DivisionBuildingWika.git` (branch `main`).
- **Lokasi kerja:** `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika`.
- **Bahasa UI:** Indonesia (label, pesan error, PDF). Kode & komentar: Inggris.

---

## Verified Tech Stack

Diverifikasi dari `node_modules/*/package.json`.

| Komponen | Versi |
|---|---|
| Next.js (App Router) | **16.3.8** |
| React / React DOM | **19.2.8** |
| TypeScript | **5.9.3** (`strict`) |
| Tailwind CSS | **4.3.3** (via `@tailwindcss/postcss`, tanpa `tailwind.config.*`) |
| Drizzle ORM / drizzle-kit | **0.45.4** / ^0.31.11 |
| Zod | **4.6.5** |
| MongoDB driver | **7.7.0** |
| postgres.js | **3.4.9** |
| bcryptjs | ^3.0.3 (cost 12) |
| @vercel/blob | ^2.8.2 |
| jsPDF + jspdf-autotable | ^4.2.1 / ^5.0.9 |
| Recharts | ^3.10.1 |
| ESLint | ^9 + eslint-config-next 16.3.8 |

- **Tidak ada**: framework test, library state management, library form, ORM Mongo, NextAuth.
- Script: `dev`, `build`, `start`, `lint` (tidak ada `test`).
- `next.config.ts` hanya memasang header keamanan dasar; **CSP sengaja belum ada**.
- Alias import: `@/*` → `src/*`.

**Environment variables (nama saja):** `DATABASE_URL`, `DIRECT_URL`, `MONGODB_URI`, `MONGODB_DB_NAME`, `BLOB_READ_WRITE_TOKEN`, `VERCEL_OIDC_TOKEN`, `BLOB_STORE_ID`, `CMS_BLOB_READ_WRITE_TOKEN`, `ADMIN_NIP`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_POSITION`, `NODE_ENV`.

`.env.example` **ada di disk tetapi gitignored** (`.gitignore` baris 44: `.env*`) dan hanya memuat 4 variabel; variabel Blob dan `ADMIN_*` belum tercantum.

---

## Current Architecture

### Frontend
- Next.js **App Router**; server components untuk guard & perakitan halaman, client components untuk interaksi dan data CMS.
- Landing: `useEffect` + `fetch("/api/<modul>/public")`, pola **empty-first** (tidak pernah menampilkan konten karangan; gagal → empty state netral).
- Dashboard: `DashboardShell` (header + sidebar responsif) → halaman modul (client) → `fetch` ke API terproteksi.
- Styling: Tailwind v4 token tema di `src/app/globals.css` (`--primary #001f3f`, `--secondary #0061a5`, `--surface #ffffff`, `--outline #c3c6cf`, `--background #f8f9ff`); font Hanken Grotesk (display) + Manrope (body).

### Backend
```
Client Component → Route Handler (auth + Zod + HTTP mapping) → Service (business rules + otorisasi) → Repository (Drizzle/Mongo) → DB
```
- Setiap namespace API punya `_helpers.ts` untuk aktor, parsing body/query, dan mapping error domain.
- Respons seragam: sukses `{ data }`, gagal `{ error: { message, details? } }`.
- Transaksi PG dipakai pada operasi multi-tabel (`createProgram`, `updateProgramMaster`).
- Konversi `numeric` PostgreSQL → `number` **hanya** di repository MSL; di atasnya selalu `number`.

### Storage
- **Blob publik CMS** (`CMS_BLOB_READ_WRITE_TOKEN`, namespace `cms/<module>/<uuid>/<file>`): gambar landing + Struktur Organisasi.
- **Blob privat dokumen** (`BLOB_READ_WRITE_TOKEN` / OIDC): file Template & Form; download lewat route terautentikasi berbasis id record.
- Aturan tetap: verifikasi objek sebelum simpan; hapus objek lama **hanya setelah** tulisan DB sukses; hapus hanya objek yang benar-benar dimiliki record dan tidak lagi direferensikan modul lain.

---

## Directory Structure

```
src/app/                     halaman (landing, login, dashboard) + 62 route/handler API
src/app/api/                 14 namespace: auth, users, clients, heroes, portfolio-projects,
                             green-buildings, social-posts, cms, program-kerja, template-form,
                             master-project, engineering-database, msl, organization-structure
src/components/landing/      9 komponen landing (Hero, Projects, ProjectDetailModal, GreenBuilding,
                             SocialMedia, Clients, About, Navbar, Footer)
src/components/dashboard/    70 komponen dashboard per modul (+ header/shell/sidebar, cms/*)
src/lib/auth/                session, password, permissions, current-user, require-permission,
                             login-attempts, schema
src/lib/cms/                 access, image-source, image-storage, image-references, storage-path,
                             error-response, use-cms-image-field
src/lib/db/mongodb.ts        koneksi Mongo (cached global)
src/lib/pg/                  client (postgres.js + drizzle), schema (572 baris), errors
src/lib/storage/             blob.ts (privat), public-image.ts (publik CMS)
src/lib/<domain>/            access, schema, repository, service (+ summary/score untuk modul tertentu)
src/lib/demo/                konstanta & tipe statis yang MASIH dipakai form dashboard
drizzle/                     13 migration SQL + meta (0000–0012)
scripts/                     seed-admin.ts, seed-program-kerja-groups.ts, migrate-portfolio-categories.ts
public/asset/                44 gambar/logo statis (hero, about, logo, wibex-icon, dll)
```

Tidak ada folder `hooks/`, `types/`, `utils/`, `services/`, `repositories/` — semua kode domain dikelompokkan per modul di `src/lib/<domain>/`.

---

## Database Overview

### PostgreSQL (Drizzle)

| Tabel | Fungsi | Kunci |
|---|---|---|
| `users` | akun & role | UNIQUE email, UNIQUE nip; CHECK role/status; `msl_access` boolean |
| `sessions` | sesi login | UNIQUE token_hash; FK user CASCADE |
| `login_attempts` | audit login + lockout | index (identity_hash, succeeded, created_at) |
| `program_kerja_groups` | kelompok program | UNIQUE name |
| `program_kerja` | master program kerja | CHECK year/month/unit; FK group RESTRICT |
| `program_kerja_monthly` | 12 baris RA/RI per program | UNIQUE (program, month); ri NULL = belum ada |
| `program_kerja_pics` | PIC (Head Office) | PK komposit |
| `template_forms` | template & form (link/upload) | CHECK source integritas; UNIQUE parsial blob_pathname |
| `master_projects` | direktori proyek kanonik | UNIQUE lower(trim(name)), lower(trim(location)); GIN trigram; `year` |
| `engineering_database_entries` | dokumen engineering per proyek | CHECK 6 kategori; FK project RESTRICT |
| `msl_assessments` | penilaian MSL bulanan | UNIQUE (project, month); numeric(3,2) 0–5 |
| `msl_year_notes` | catatan tahunan MSL | UNIQUE year |
| `organization_structure` | satu chart organisasi | CHECK + UNIQUE pada `singleton` |

Ekstensi: `pg_trgm` (migration 0004). Skor/kategori MSL **tidak** disimpan (diturunkan dari 3 komponen).

### MongoDB

| Collection | Sumber data landing | Indeks | Status publik |
|---|---|---|---|
| `heroes` | Hero banner | `{status, sortOrder}` | `status: "active"` |
| `portfolio_projects` | Our Project | `{status, sortOrder}` | `status: "Active"` |
| `green_building_certificates` | Green Building | `{publishStatus, sortOrder}` | `publishStatus: "Published"` |
| `social_posts` | Media Sosial (kurasi Instagram) | `{status, sortOrder}` | `status: "Published"` |
| `clients` | Our Client | `{status, sortOrder}` | `status: "active"` |

Field internal (`imageSource`, `blobPathname`) tidak pernah masuk projection publik. Indeks dibuat lazy pada request pertama.

---

## Authentication and Roles

**Mekanisme:** NIP + password (bcrypt cost 12) → sesi opaque di PostgreSQL (DB menyimpan SHA-256 token) → cookie `wibex_session` (httpOnly, `sameSite=lax`, `secure` di produksi, 24 jam / 30 hari “remember”). Logout menghapus sesi. Proteksi brute force: 5 gagal / 15 menit per NIP (hash) → 429 + `Retry-After`.

**Otorisasi:** tiga lapis — layout server (`redirect`), route handler (`getPermittedActor`/helper), service (`assert*`). Permission terpusat di `src/lib/auth/permissions.ts`; **Admin = super-application** (semua permission fitur `true`).

| Role | Hak yang terbukti |
|---|---|
| Admin | Semua fitur (CMS, User Directory, Program Kerja, Template & Form, Master Project, Engineering Databases, MSL, Struktur Organisasi) |
| Head Office | Program Kerja (view/manage/edit RI **hanya jika PIC**), Template & Form (view/manage), Master Project (view/create/edit/delete), Engineering DB (view/manage), MSL **view**, Struktur Organisasi view |
| Management | Program Kerja view, Template & Form view, Master Project view, Engineering DB view, MSL **hanya bila `msl_access = true`** (view+manage), Struktur Organisasi view, `DASHBOARD_SASAA_VIEW` |
| Project | Template & Form view, Master Project view/edit, Engineering DB view/manage, Struktur Organisasi view |
| Tidak dikenal | Tidak ada akses |

`msl_access` hanya boleh `true` untuk Management (dipaksa `false` oleh service bila role berubah). PIC Program Kerja & PIC Template & Form harus Head Office; PIC Master Project harus Admin/Head Office; PIC Engineering DB boleh Admin/Head Office/Project.

---

## Feature Inventory

| Fitur | Status | Lokasi |
|---|---|---|
| Landing page publik | COMPLETE | `src/app/page.tsx`, `src/components/landing/*` |
| CMS Hero Banner | COMPLETE | `dashboard/hero/*`, `lib/heroes/*`, `api/heroes/*` |
| CMS Our Project (portfolio) | COMPLETE | `dashboard/projects/*`, `lib/portfolio-projects/*` |
| CMS Green Building | COMPLETE (data publik 0 item) | `dashboard/green-building/*`, `lib/green-buildings/*` |
| CMS Media Sosial | COMPLETE | `dashboard/social-media/*`, `lib/social-posts/*` |
| CMS Our Client | COMPLETE (+ tautan logo, uncommitted) | `dashboard/clients/*`, `lib/clients/*`, `landing/Clients.tsx` |
| Upload gambar CMS + cleanup | COMPLETE | `api/cms/upload*`, `lib/cms/*`, `lib/storage/public-image.ts` |
| Autentikasi + hardening | COMPLETE | `api/auth/*`, `lib/auth/*` |
| RBAC + User Directory | COMPLETE | `lib/auth/permissions.ts`, `dashboard/users/*` |
| Program Kerja (+ RI/note/evidence, summary, PDF) | COMPLETE | `dashboard/program-kerja/*`, `lib/program-kerja/*` |
| Template & Form (link/upload privat) | COMPLETE | `dashboard/template-form/*`, `lib/template-form/*` |
| Master Project | COMPLETE | `dashboard/master-project/*`, `lib/master-project/*` |
| Engineering Databases (6 kategori + summary) | COMPLETE | `dashboard/engineering-database/*`, `lib/engineering-database/*` |
| MSL Engineering (bulanan, skor, PDF V2.5) | COMPLETE | `dashboard/engineering-database/msl/*`, `lib/msl/*` |
| Struktur Organisasi | COMPLETE | `dashboard/struktur-organisasi/*`, `lib/organization-structure/*` |
| Profil mandiri | COMPLETE | `dashboard/profile/edit`, `api/auth/me` |
| Dashboard SASAA | NOT STARTED (hanya permission) | `lib/auth/permissions.ts` |
| Test / CI | NOT CONFIGURED | — |

Kategori Engineering DB (CHECK constraint): `ENGINEERING_DRAWING`, `ENGINEERING_DESIGN_REPORT`, `METODE_PELAKSANAAN_PEKERJAAN`, `SPESIFIKASI_TEKNIS`, `PROJECT_MASTER_SCHEDULE`, `BIM`.

Kategori Our Project (label = nilai tersimpan, `lib/portfolio-projects/project-categories.ts`): Gedung Publik & Pemerintah, Commercial High-Rise, Residensial, Gedung Pendidikan, Gedung Kesehatan, Gedung Peribadatan, Gedung Olahraga, Gedung Industri & Logistik, Fasilitas Transportasi, Infrastruktur.

MSL: komponen 0.00–5.00 (2 desimal); skor = rata-rata; kategori `TIDAK_PEDULI <1`, `PEDULI <2`, `TAHAP_BELAJAR <3`, `KOMPETEN <4`, `PENGAJAR <5`, `BERINOVASI =5`.

---

## Frozen Features

- **MSL Engineering** dan **Struktur Organisasi** disebut "selesai & frozen" pada catatan historis. Repository **tidak** memuat dokumen kebijakan yang menyatakan itu.
- **Aturan kerja yang dipakai audit ini:** jangan mengubah atau me-refactor MSL maupun Struktur Organisasi tanpa instruksi eksplisit dari pemilik proyek dan alasan teknis yang terbukti. Perbaikan bug/keamanan tetap boleh diusulkan — tetapi **usulkan dulu**, jangan langsung ubah.
- Status klaim: **PERLU VERIFIKASI** ke pemilik proyek.

---

## Development History

68 commit, 2026-10-01 → 2026-11-02 (author `Hans` 67, `hansbonatua` 1).

| Tanggal | Peristiwa |
|---|---|
| 2026-10-01 | `3d967bd` initial commit; `f9d2dee` Create Next App |
| 2026-10-06–09 | Landing + CMS Mongo awal; `8c9ee7f` green building & social; `3a4cd45` Our Project; `2c14a27` cleanup data demo; `61f92b7` hapus aset |
| 2026-10-09–12 | `f4e0d20` PostgreSQL + Drizzle; `552a8e5`/`5ecfb1d` auth; `da53ad8` dashboard terproteksi; `ab92b93`–`e2beb3e` CRUD user, suspend, delete; `425db5e` profil nyata; `ba5a73c` Our Project dari CMS |
| 2026-10-13–16 | `5fa704f` kontrak role; `016a79a`–`57186f3` Program Kerja; PDF `61551a6`/`588cf45`/`27cbcda`/`c763397` |
| 2026-10-21–22 | `be382ad`–`ee7c1a2` Summary Report + PDF; `28d581b`/`1bf749d` Template & Form |
| 2026-10-23–27 | `616b4e9` Master Project; `d7a04d8` Engineering DB; `0b146cb` konsolidasi RBAC; `67e9d32` upload privat |
| 2026-10-28–29 | `0d580aa` msl_access; `32e7c15`–`287c733` MSL lengkap + PDF V2.5; `f7c9cc5`/`36536c0` Struktur Organisasi |
| 2026-10-30–11-02 | `ecd1ab1` kategori Our Project; `6893e77` About; `3914244` hapus input alt text; `84e0a90` modal detail proyek + penyempurnaan Hero |

Commit yang wajib diketahui:
- `3914244` — 16 file, −105 baris: menghapus input alt text dari form Clients, Green Building, Hero, Projects, Social Media.
- `84e0a90` — 7 file, +231/−23: menambah `ProjectDetailModal.tsx` (175 baris), `Projects.tsx` (+56), mengurangi HeroForm (−16).

---

## Current Development State

- **HEAD `84e0a90`** = `origin/main` menurut remote-tracking ref lokal (fetch tidak dijalankan).
- **Working tree tidak bersih** (belum di-commit):
  - `M src/components/landing/Clients.tsx` — kartu klien kini `<a>` dengan sanitizer `toSafeHref` (http/https + path internal; menolak `//`, backslash, whitespace, `javascript:`, `data:`, `vbscript:`), `target="_blank"` + `rel="noopener noreferrer"` untuk eksternal, `aria-label` informatif, focus ring `ring-secondary`.
  - `M About.tsx`, `M Footer.tsx`, `M SocialMedia.tsx` — penyempurnaan tampilan landing.
  - `?? screenshots/` — 16 PNG artefak QA (untracked).
- Pemeriksaan terakhir sesi: `tsc --noEmit` exit 0, `eslint` file berubah exit 0, `npm run build` exit 0 (“Compiled successfully in 14.6s”), `git diff --check` exit 0.
- Data publik hidup (dev server): heroes 10, clients 8, portfolio-projects 3, green-buildings 0, social-posts 6.

---

## Known Bugs and Technical Debt

| ID | Prioritas | Ringkasan |
|---|---|---|
| F-01 | HIGH | CSP belum dipasang (`next.config.ts`, sengaja ditunda) |
| F-02 | HIGH | `link` klien tidak divalidasi di skema tulis (`lib/clients/client.schema.ts`); sanitasi hanya di render |
| F-03 | MEDIUM | `imageAlt`/`description` tidak ada input di form (dihapus `3914244`/`84e0a90`) tetapi masih diterima API dan dipakai landing sebagai fallback |
| F-04 | MEDIUM | `.env.example` ada tetapi gitignored dan hanya memuat 4 variabel |
| F-05 | MEDIUM | Tidak ada test otomatis & CI |
| F-06 | MEDIUM | Komponen besar: `TemplateFormEditor` 1.019 baris, `mslExportPdf` 764, `MslEngineeringPage` 730, `ProgramKerjaSummaryDashboard` 719 |
| F-07 | LOW | `DashboardHeader` memakai fallback nama fiktif `"R. Triyanto S.T."` |
| F-08 | LOW | Indeks Mongo dibuat lazy saat request pertama |
| F-09 | LOW | Permission `DASHBOARD_SASAA_VIEW` belum dipakai |
| F-10 | LOW | Tidak ada pemeriksaan origin/CSRF eksplisit pada mutasi (bersandar pada `sameSite=lax`) |
| F-11 | MEDIUM | Feed green building publik kosong (0 item) — penyebab belum dipastikan (kemungkinan `publishStatus`) |
| F-12 | MEDIUM | Perubahan landing (termasuk `Clients.tsx`) belum di-commit |

Tidak ada temuan CRITICAL.

---

## Pending Tasks

1. Commit perubahan landing yang belum masuk Git (pisahkan `Clients.tsx` dari file lain bila memungkinkan).
2. Validasi `link` di skema Zod client (server-side) + pesan error form.
3. Putuskan kontrak `imageAlt`/`description`: hapus dari API (perlu migrasi dokumen Mongo) **atau** kembalikan input di form.
4. Jadikan `.env.example` ter-track (`!.env.example`) dan lengkapi 13 nama variabel, lalu tulis README onboarding nyata.
5. Tambahkan unit test untuk logika murni (`msl/score.ts`, `program-kerja/summary.ts`, `auth/permissions.ts`, `toSafeHref`) + CI `tsc + eslint + test`.
6. Susun CSP (Report-Only → enforce) dan helper `assertSameOrigin` untuk mutasi.
7. Pastikan minimal satu sertifikat green building berstatus `Published`.
8. Verifikasi kondisi database produksi (schema drift, indeks, jumlah data, daftar role pengguna).
9. Konfirmasi ke pemilik proyek status "frozen" MSL & Struktur Organisasi.
10. Rencanakan modul Dashboard SASAA (permission sudah ada, implementasi belum).

---

## Development Guidelines

Aturan yang **terbukti dipakai** di codebase — ikuti, jangan bikin pola baru:

1. **Lapisan wajib**: Route Handler → Service → Repository. Jangan query DB langsung dari route atau komponen.
2. **Otorisasi tiga lapis**: guard di layout server, cek di route (`getPermittedActor` / helper domain), dan `assert*` di service. Admin bukan alasan untuk melewati aturan integritas.
3. **Permission terpusat**: tambahkan permission baru di `src/lib/auth/permissions.ts`; jangan menulis `role === "Admin"` di komponen/route (gunakan helper `can*` dari `lib/<domain>/access.ts`).
4. **Aktor selalu dari sesi** (`requireUser()`/`getCurrentUser()`), **tidak pernah** dari body/query/header.
5. **Zod di batas HTTP**: `.strict()` untuk kontrak yang punya field immutable (MSL, Program Kerja master); jangan pakai `.partial()` pada skema ber-`.default()` (pelajaran “Hero Phase 2C” — default akan menimpa nilai tersimpan saat PATCH).
6. **Jangan pernah** mengirim `passwordHash`, `blobPathname`, `imageSource`, atau id internal ke payload publik. Gunakan pattern `*Public` + projection Mongo.
7. **Landing tanpa konten karangan**: data kosong/gagal → empty state netral. Jangan tambahkan fallback proyek/sertifikat fiktif.
8. **Storage**: verifikasi objek (`head`) sebelum simpan; tulis DB dulu, hapus objek lama setelah sukses; hapus hanya objek milik record dan tidak direferensikan modul lain (`isCmsImagePathnameReferenced`).
9. **Error domain → HTTP**: buat kelas error per modul dan map di `_helpers`/route (403/404/409/400/503/502). Jangan biarkan error domain jadi 500.
10. **Angka**: `numeric` PostgreSQL hanya dikonversi di repository; di atasnya selalu `number`.
11. **Tanggal/waktu**: tampilkan dalam zona Asia/Jakarta (lihat `OrganizationStructurePage`), bukan zona browser.
12. **Aksesibilitas**: setiap kontrol ikon punya `aria-label`; modal memakai `role="dialog"`, `aria-modal`, Escape, focus return, body scroll lock.
13. **Gambar remote CMS** memakai `<img>` (dengan `eslint-disable` beralasan) agar tidak perlu `remotePatterns`; gambar lokal memakai `next/image`.
14. **Migrasi DB**: tambahkan file baru di `drizzle/` (jangan mengedit migration lama) dan perbarui `src/lib/pg/schema.ts` pada perubahan yang sama.
15. **Jangan** menjalankan seed/migration/deploy tanpa persetujuan pemilik proyek.

---

## Important Files

| File | Kegunaan |
|---|---|
| `src/app/page.tsx` | Komposisi landing page |
| `src/components/landing/Projects.tsx` | Slider Our Projects + progress + modal trigger |
| `src/components/landing/ProjectDetailModal.tsx` | Modal detail (fokus, Escape, scroll lock) |
| `src/components/landing/Clients.tsx` | Grid klien; `toSafeHref` sanitizer (uncommitted) |
| `src/app/dashboard/layout.tsx` | Guard sesi dashboard + `DashboardShell` |
| `src/components/dashboard/DashboardSidebar.tsx` | Navigasi berbasis permission per role |
| `src/lib/auth/permissions.ts` | **Sumber kebenaran RBAC** |
| `src/lib/auth/session.ts` | Sesi opaque + cookie |
| `src/lib/auth/login-attempts.ts` | Lockout brute force |
| `src/lib/auth/current-user.ts` | `getCurrentUser`, `requireUser`, `apiAuthGuard` |
| `src/lib/pg/schema.ts` | **Seluruh skema PostgreSQL** |
| `src/lib/db/mongodb.ts` | Koneksi Mongo (cached) |
| `src/lib/cms/storage-path.ts` | Namespace & validasi pathname upload |
| `src/lib/cms/image-storage.ts` | Verifikasi & kepemilikan objek CMS |
| `src/lib/cms/image-references.ts` | Registry referensi untuk cleanup orphan |
| `src/lib/storage/blob.ts` | Blob privat (dokumen Template & Form) |
| `src/lib/msl/score.ts` | Rumus skor & band kategori MSL (murni) |
| `src/lib/program-kerja/summary.ts` | Agregasi Summary Report (murni, 701 baris) |
| `src/app/api/msl/_helpers.ts` | Pola helper API (aktor, parsing, mapping error) |
| `drizzle/*.sql` | 13 migration (0000–0012), termasuk `pg_trgm` |
| `scripts/seed-admin.ts` | Seed admin pertama (butuh env `ADMIN_*`) |

---

## Unverified Information

- Struktur & isi database produksi (PostgreSQL & MongoDB), termasuk drift terhadap schema/migration.
- Status deployment Vercel, domain, dan konfigurasi environment produksi.
- Nilai environment variable (tidak pernah dibaca).
- ~~Apakah `84e0a90` masih menjadi HEAD di GitHub~~ — **terverifikasi**: `git ls-remote --heads origin` mengembalikan `84e0a90` untuk `refs/heads/main`.
- Kebijakan resmi “frozen” untuk MSL Engineering dan Struktur Organisasi.
- Penyebab feed green building publik kosong.
- Kebijakan retensi `login_attempts` dan pembersihan `sessions` kedaluwarsa (fungsi ada, penjadwalan tidak ditemukan).
- Target performa/SLA dan anggaran infrastruktur.

---

## Instructions for Future GPT

1. **Baca dulu, ubah kemudian.** Buka file yang relevan sebelum menyimpulkan; jangan mengandalkan dokumen ini untuk detail baris kode.
2. **Periksa `git status` sebelum bekerja.** Working tree saat audit **tidak bersih** (4 file landing + `screenshots/`). Jangan menghapus, me-reset, atau menimpa perubahan yang bukan milik Anda; jangan `git add .`.
3. **Jangan mengarang kondisi.** Bila sesuatu tidak ada di repo, tulis “belum ada/belum diverifikasi”, jangan menebak.
4. **Hormati fitur frozen** (MSL, Struktur Organisasi): usulkan perubahan, jangan langsung refactor.
5. **Ikuti pola yang ada** (Route → Service → Repository, permission terpusat, Zod di batas HTTP, storage DB-first). Jangan menambahkan dependency baru tanpa persetujuan.
6. **Jangan pernah** menyentuh database, menjalankan migration/seed, deploy, atau push tanpa instruksi eksplisit.
7. **Jangan mencetak** nilai environment/secret di chat, log, atau file.
8. **Setelah mengubah kode**, jalankan minimal `npx tsc --noEmit` dan `npx eslint <file yang diubah>`; jalankan `npm run build` bila perubahan menyentuh routing/konfigurasi. Laporkan hasil sebenarnya (PASS/FAIL), bukan asumsi.
9. **Bila menambah modul**, tambahkan: permission di `permissions.ts`, `access.ts` modul, schema Zod, repository, service, route + `_helpers`, guard layout, entri sidebar, dan tile dashboard bila perlu.
10. **Bila menambah kolom/tabel**, tambahkan migration baru di `drizzle/` dan perbarui `src/lib/pg/schema.ts`.
11. **Bila mengubah kontrak publik landing**, pastikan projection `*Public` dan komponen landing tetap kompatibel, serta tidak membocorkan field internal.
12. **Bahasa**: kode & komentar Inggris; teks yang dilihat pengguna dalam Bahasa Indonesia.

---

*Dokumen ini konsisten dengan `BDWIKA_WIBEX_AUDIT_REPORT.md` (audit tanggal 3 November 2026, HEAD `84e0a90`).*
