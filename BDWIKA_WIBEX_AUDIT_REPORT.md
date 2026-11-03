# BDWIKA / WIBEX — FULL DEVELOPMENT AUDIT REPORT

- **Tanggal audit:** 3 November 2026
- **Lokasi:** `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika`
- **Mode:** READ-ONLY (satu-satunya penulisan: dokumen audit ini + `BDWIKA_WIBEX_PROJECT_CONTEXT.md`)
- **HEAD audit:** `84e0a90` — `feat: improve landing CMS and project details`
- **Branch:** `main` (tracking `origin/main`, identik dengan HEAD berdasarkan remote-tracking ref lokal)
- **Catatan:** `git fetch` **tidak** dijalankan (metadata remote tidak diperbarui), sehingga status "sama dengan remote" hanya berlaku untuk remote-tracking ref yang tersimpan lokal.

---

## 1. Executive Summary

WIBEX (BDWIKA) adalah aplikasi internal Building Division WIKA berbasis **Next.js 16 App Router** dengan **dua database yang dipakai bersamaan**:

| Lapisan | Database | Dipakai untuk |
|---|---|---|
| Landing Page CMS | **MongoDB Atlas** (driver `mongodb`) | Hero, Our Project, Green Building, Media Sosial, Our Client |
| Enterprise / Core | **PostgreSQL + Drizzle ORM** | User & RBAC, sesi login, Program Kerja, Template & Form, Master Project, Engineering Databases, MSL Engineering, Struktur Organisasi |

Temuan utama:

1. **11 modul aplikasi sudah terimplementasi penuh** (landing page + CMS, autentikasi, RBAC, User Control, Program Kerja, Template & Form, Master Project, Engineering Databases, MSL Engineering bulanan + PDF, Struktur Organisasi, profil mandiri). Satu permission (`DASHBOARD_SASAA_VIEW`) baru dicadangkan dan **belum ada implementasinya**.
2. **Riwayat Git bersih dan konsisten**: 68 commit, 2026-10-01 → 2026-11-02, dikerjakan bertahap per fase (landing CMS → PostgreSQL → auth/RBAC → Program Kerja → Master Project/Engineering DB → Template & Form → MSL → Struktur Organisasi).
3. **Working tree TIDAK bersih**: 4 file landing dimodifikasi dan belum di-commit (`About.tsx`, `Clients.tsx`, `Footer.tsx`, `SocialMedia.tsx`) + folder `screenshots/` untracked. Perubahan `Clients.tsx` adalah pekerjaan sesi ini (logo client bisa diklik) dan **belum masuk commit** — risiko kehilangan pekerjaan jika tidak di-commit.
4. **Tidak ada test otomatis dan tidak ada CI.** `.env.example` **ada di disk tetapi gitignored** (`.env*`) dan hanya memuat 4 variabel (tanpa `BLOB_*`/`CMS_BLOB_*`/`ADMIN_*`), sehingga clone baru tidak menerima template environment.
5. Kualitas arsitektur backend **tinggi dan konsisten**: Route Handler → Service → Repository → DB, validasi Zod, ekstraksi `numeric` PostgreSQL hanya di repository, RBAC terpusat dengan Admin sebagai *super-application*, dan pola upload "DB dulu, storage kemudian" untuk mencegah kehilangan data.
6. **Tidak ditemukan temuan CRITICAL.** Temuan HIGH terbatas pada kebijakan keamanan yang memang ditunda secara sadar (CSP) dan validasi URL yang belum ada di lapisan tulis CMS.

**Verdict ringkas:** aplikasi **layak dilanjutkan**; prioritas berikutnya bukan menambah fitur, melainkan (a) meng-commit pekerjaan `Clients.tsx`, (b) menutup celah validasi `link` CMS di server, (c) menambah `.env.example` + test minimal, (d) menyelesaikan kontrak `imageAlt`/`description` yang sekarang tidak bisa diedit dari UI.

---

## 2. Kondisi Repository Aktual

| Item | Kondisi (bukti) |
|---|---|
| Working directory | `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika` |
| Remote | `origin https://github.com/hansbonatua/DivisionBuildingWika.git` (fetch & push) |
| Branch lokal | `main` (satu-satunya) |
| Branch remote-tracking | `origin/main` → `84e0a90` |
| Jumlah commit | 68 (`git rev-list --count HEAD`) |
| File tracked | 373 |
| File TS/TSX di `src` | 281 |
| Total baris `src` | ±38.855 baris |
| Commit pertama | `3d967bd` 2026-10-01 `Initial commit` (author: hansbonatua) |
| Commit terakhir | `84e0a90` 2026-11-03 audit, tanggal commit 2026-11-02 14:49 +0700 |
| Kontributor | `Hans` 67 commit, `hansbonatua` 1 commit |
| Staged changes | **tidak ada** |
| Modified (uncommitted) | `src/components/landing/About.tsx`, `Clients.tsx`, `Footer.tsx`, `SocialMedia.tsx` |
| Untracked | `screenshots/` (16 file PNG artefak QA) |
| Tag | tidak ada |
| Workflow CI | tidak ada (`.github/` tidak ada) |
| `middleware.ts` | tidak ada (guard dilakukan di layout server + route handler) |

Perubahan uncommitted (diverifikasi lewat `git diff --stat`): `About.tsx` 75 baris, `Clients.tsx` 71 baris, `Footer.tsx` 6 baris, `SocialMedia.tsx` 4 baris — total 107 insertions / 49 deletions. **Belum ada commit/push** untuk perubahan ini.

---

## 3. Teknologi dan Versi Aktual

Versi diambil dari `node_modules/*/package.json` (bukan dari dokumentasi historis).

| Paket | `package.json` | Terpasang | Jenis |
|---|---|---|---|
| next | `16.3.8` | **16.3.8** | direct |
| react / react-dom | `19.2.8` | **19.2.8** | direct |
| typescript | `^5` | **5.9.3** | dev |
| tailwindcss | `^4` | **4.3.3** | dev |
| @tailwindcss/postcss | `^4` | terpasang | dev |
| drizzle-orm | `^0.45.4` | **0.45.4** | direct |
| drizzle-kit | `^0.31.11` | terpasang | dev |
| zod | `^4.6.5` | **4.6.5** | direct |
| mongodb | `^7.7.0` | **7.7.0** | direct |
| postgres (postgres.js) | `^3.4.9` | **3.4.9** | direct |
| bcryptjs | `^3.0.3` | terpasang | direct |
| @vercel/blob | `^2.8.2` | terpasang | direct |
| jspdf | `^4.2.1` | terpasang | direct |
| jspdf-autotable | `^5.0.9` | terpasang | direct |
| recharts | `^3.10.1` | terpasang | direct |
| eslint / eslint-config-next | `^9` / `16.3.8` | terpasang | dev |
| tsx | `^4.23.15` | terpasang | dev |

**Tidak ada** pustaka testing (jest/vitest/playwright/cypress), tidak ada state manager eksternal (Redux/Zustand), tidak ada library form (react-hook-form), tidak ada ORM MongoDB (memakai driver native), tidak ada NextAuth (autentikasi ditulis sendiri).

Konfigurasi:

- `tsconfig.json` — `strict: true`, `noEmit`, `moduleResolution: "bundler"`, path alias `@/* → ./src/*`.
- `next.config.ts` — hanya `headers()`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` minimal. **CSP sengaja tidak dipasang** (komentar eksplisit di file).
- `eslint.config.mjs` — flat config `eslint-config-next/core-web-vitals` + `/typescript`.
- `drizzle.config.ts` — `dialect: "postgresql"`, schema `./src/lib/pg/schema.ts`, output `./drizzle`, kredensial `DIRECT_URL || DATABASE_URL`, dan **command offline (`generate`/`check`) boleh jalan tanpa kredensial**.
- `postcss.config.mjs` — plugin `@tailwindcss/postcss` (Tailwind v4, tanpa `tailwind.config.*`; token tema didefinisikan di `src/app/globals.css` lewat `@theme inline`).
- Script npm: `dev`, `build`, `start`, `lint` — **tidak ada script test**.

Environment variables (nama saja, nilai tidak pernah dibaca/dicetak):

| Variabel | Dipakai di | Kegunaan |
|---|---|---|
| `DATABASE_URL` | `src/lib/pg/client.ts` | koneksi PostgreSQL (pooled, `prepare: false`) |
| `DIRECT_URL` | `drizzle.config.ts` | koneksi migrasi langsung (fallback ke `DATABASE_URL`) |
| `MONGODB_URI`, `MONGODB_DB_NAME` | `src/lib/db/mongodb.ts` | koneksi + nama database MongoDB CMS |
| `BLOB_READ_WRITE_TOKEN` | `src/lib/storage/blob.ts` | Blob store **privat** (dokumen Template & Form) |
| `VERCEL_OIDC_TOKEN`, `BLOB_STORE_ID` | `src/lib/storage/blob.ts` | alternatif OIDC untuk Blob privat |
| `CMS_BLOB_READ_WRITE_TOKEN` | `src/lib/storage/public-image.ts` (via `resolveCmsBlobReadWriteToken`) | Blob store **publik** khusus gambar CMS |
| `ADMIN_NIP`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_POSITION` | `scripts/seed-admin.ts` | seed admin pertama |
| `NODE_ENV` | route login/logout | flag `secure` cookie |

`.env.example` **ada di disk tetapi tidak ter-track**: `.gitignore` baris 44 (`.env*`) meng-ignore seluruh keluarga `.env`, termasuk file contoh. Isi file hanya 4 nama variabel (`DATABASE_URL`, `DIRECT_URL`, `MONGODB_URI`, `MONGODB_DB_NAME`); variabel Blob dan `ADMIN_*` tidak tercantum. Nilai environment tidak diaudit.

---

## 4. Struktur Folder

```
bdwika/
├── drizzle/                     13 migration SQL + meta snapshot
├── public/                      49 file (44 di public/asset, 5 SVG default Next.js)
├── scripts/                     seed-admin.ts, seed-program-kerja-groups.ts, migrate-portfolio-categories.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx           font Hanken Grotesk + Manrope, metadata WIBEX
│   │   ├── page.tsx             landing (Navbar, Hero, About, Projects, GreenBuilding, SocialMedia, Clients, Footer)
│   │   ├── globals.css          token tema (--primary #001f3f, --secondary #0061a5, dll)
│   │   ├── login/               halaman login (client component) + layout
│   │   ├── dashboard/           shell + 12 route group modul
│   │   └── api/                 14 namespace API (lihat §6)
│   ├── components/
│   │   ├── landing/             9 file, 2.384 baris
│   │   └── dashboard/           70 file, 16.201 baris
│   └── lib/                     85 file, 11.460 baris
│       ├── auth/                session, password, permissions, current-user, require-permission, login-attempts, schema
│       ├── cms/                 access, image-source, image-storage, image-references, storage-path, error-response, use-cms-image-field
│       ├── db/mongodb.ts        koneksi Mongo (cached global)
│       ├── pg/                  client, schema (572 baris), errors
│       ├── storage/             blob.ts (privat), public-image.ts (publik CMS)
│       ├── users/               roles, schema, repository, service, access, options
│       ├── program-kerja/       access, schema, repository, service, summary, summaryFormat, summaryService
│       ├── template-form/       access, schema, repository, service, source, storage-path, file-meta
│       ├── master-project/      access, schema, repository, service
│       ├── engineering-database/ access, schema, repository, service, summary, summaryFormat
│       ├── msl/                 access, schema, repository, service, score, period
│       ├── organization-structure/ access, schema, repository, service
│       ├── heroes | clients | portfolio-projects | green-buildings | social-posts/  (Mongo CMS: types, schema, repository, service)
│       └── demo/                vocabulary & tipe statis yang masih dipakai form dashboard
└── BDWIKA_WIBEX_AUDIT_REPORT.md / BDWIKA_WIBEX_PROJECT_CONTEXT.md   (hasil audit ini)
```

Route dashboard: `clients`, `engineering-database` (+`[category]`, `msl`, `summary`), `green-building`, `hero`, `master-project/manage`, `profile/edit`, `program-kerja` (+`manage`, `summary`), `projects`, `social-media`, `struktur-organisasi`, `template-form`, `users`.

Tidak ditemukan folder `hooks/`, `types/`, `utils/`, `services/`, `repositories/` — semuanya dikelompokkan **per domain** di `src/lib/<domain>/`, yang konsisten di seluruh aplikasi.

---

## 5. Arsitektur Frontend

- **App Router** murni; tidak ada Pages Router.
- **Server Components** dipakai untuk: landing (`src/app/page.tsx` merangkai section), semua `layout.tsx` dashboard (guard), dan page wrapper yang menghitung flag dari sesi (mis. `dashboard/engineering-database/msl/page.tsx` menghitung `canManage`, `dashboard/struktur-organisasi/page.tsx` menghitung `canManage`).
- **Client Components** (`"use client"`): seluruh section landing yang memuat data CMS (`Hero`, `Projects`, `GreenBuilding`, `SocialMedia`, `Clients`), modal detail proyek, dan seluruh UI dashboard.
- **Data fetching**: landing memakai `fetch()` di `useEffect` ke endpoint `/api/*/public` dengan pola **empty-first** (render kosong dulu → isi dari CMS; gagal = empty state netral, tanpa konten karangan). Dashboard memakai `fetch()` dari client component ke API terproteksi.
- **State management**: `useState`/`useEffect`/`useCallback`/`useMemo` lokal; tidak ada store global.
- **Form handling**: controlled component manual, submit lewat `fetch`, error ditampilkan inline; tidak ada library form.
- **Validasi**: klien (HTML + pengecekan ringan) **dan** server (Zod) — server yang otoritatif.
- **Error/loading state**: setiap modul punya state `loading | ready | error` + skeleton; landing memakai pesan netral tanpa detail teknis.
- **Duplikasi logika** yang tersisa: pola CRUD list/create/edit/detail di 5 modul CMS ditulis ulang per modul (komponen `*Table`, `*Form`, `*Preview`, `*StatusBadge`, `*-api.types.ts`). Konsekuensi wajar dari pembagian per domain, tetapi menambah biaya perubahan lintas modul.

Konsistensi visual: token warna terpusat (`bg-surface`, `text-primary`, `text-secondary`, `border-outline`) dan font display/body dari `next/font`.

---

## 6. Arsitektur Backend

Pola yang **dipakai konsisten**:

```
Browser (Client Component)
   ↓ fetch JSON
Route Handler (src/app/api/**/route.ts)   → auth + permission + Zod + mapping error HTTP
   ↓
Service (src/lib/<domain>/service.ts)     → business rule + otorisasi lapis kedua
   ↓
Repository (src/lib/<domain>/repository.ts) → query Drizzle / driver Mongo, tanpa aturan bisnis
   ↓
PostgreSQL (Drizzle)  /  MongoDB (native driver)
```

### Route Handler yang tersedia (62 file route/util di `src/app/api`)

| Namespace | Endpoint | Method |
|---|---|---|
| auth | `/api/auth/login`, `/logout`, `/me` | POST, POST, GET/PATCH |
| users | `/api/users`, `/api/users/[id]` | GET/POST, GET/PATCH/DELETE |
| clients | `/api/clients`, `/api/clients/[id]`, `/api/clients/public` | GET/POST, GET/PATCH/DELETE, GET publik |
| heroes | `/api/heroes`, `/api/heroes/[id]`, `/api/heroes/public` | idem |
| portfolio-projects | `/api/portfolio-projects`, `/[id]`, `/public` | idem |
| green-buildings | `/api/green-buildings`, `/[id]`, `/public` | idem |
| social-posts | `/api/social-posts`, `/[id]`, `/public` | idem |
| cms | `/api/cms/upload`, `/api/cms/upload/cleanup` | POST (token upload & cleanup objek) |
| program-kerja | `/api/program-kerja`, `/groups`, `/pic-options`, `/summary`, `/[id]`, `/[id]/ri`, `/[id]/note`, `/[id]/evidence` | GET/POST, GET, GET, GET, GET/PATCH/DELETE, PATCH, PATCH, PATCH |
| template-form | `/api/template-form`, `/pic-options`, `/upload`, `/upload/cleanup`, `/[id]`, `/[id]/file` | GET/POST, GET, POST, POST, GET/PATCH/DELETE, GET |
| master-project | `/api/master-project`, `/pic-options`, `/[id]` | GET/POST, GET, GET/PATCH/DELETE |
| engineering-database | `/api/engineering-database`, `/summary`, `/pic-options`, `/project-options`, `/[id]` | GET/POST, GET, GET, GET, GET/PATCH/DELETE |
| msl | `/api/msl`, `/assessments`, `/assessments/[id]`, `/note` | GET, POST, PATCH/DELETE, PUT |
| organization-structure | `/api/organization-structure` | GET/PUT/DELETE |

Setiap namespace memiliki `_helpers.ts` (kecuali beberapa) untuk ekstraksi aktor, parsing body JSON, parsing query, dan mapping error domain → status HTTP. Pola respons seragam: `{ data }` untuk sukses, `{ error: { message, details? } }` untuk gagal.

### Contoh alur request nyata

**A. `GET /api/portfolio-projects/public`** (landing, tanpa sesi)
`route.ts` → `portfolioProjectService.listPublicPortfolioProjects()` → `portfolioProjectRepository.findActivePublic()` → Mongo `portfolio_projects.find({status:"Active"}).sort({sortOrder:1}).project({_id:0, …})` → JSON `{ data }`. Tidak ada pengecekan auth (memang publik) dan tidak ada field internal (`blobPathname`, `imageSource`) yang keluar.

**B. `POST /api/msl/assessments`** (Management dengan `msl_access`)
`route.ts` → `getActor()` (ambil user dari sesi; 401 bila tidak login) → `parseJsonBody` → `createMslAssessmentSchema.safeParse` (strict: menolak `year`/`score`/`category`) → `createMslAssessment(actor, data)` → `assertManageAccess` (role+capaian) → cek Master Project ada → cek unik (project, month) → `insertAssessment` (menulis `numeric(3,2)`) → `findAssessmentById` → service menghitung skor & kategori dari `@/lib/msl/score` → 201 `{ data }`. Pelanggaran unik → 409, project hilang → 404, akses → 403.

**C. `POST /api/auth/login`**
`loginSchema.parse` → `evaluateLoginThrottle(nip)` (5 kegagalan / 15 menit → 429 + `Retry-After`, sebelum lookup user dan sebelum bcrypt) → `getUserForLoginByNip` → `verifyPassword` (selalu satu bcrypt, memakai `DUMMY_PASSWORD_HASH` bila user tidak ada) → gagal: `recordLoginAttempt(nip,false)` + 401 generik → sukses: `recordLoginAttempt(nip,true)` → `createSession` (token acak 32 byte, disimpan sebagai SHA-256) → cookie `wibex_session` (httpOnly, sameSite lax, 24 jam / 30 hari bila "Ingat Sesi Kerja").

---

## 7. Alur Request dan Data (ringkas)

| Lapisan | Tanggung jawab | Bukti |
|---|---|---|
| UI | render, state, fetch | `src/components/**` |
| Route | auth, parsing, status code | `src/app/api/**/route.ts` |
| Service | aturan bisnis, otorisasi kedua, transaksi | `src/lib/*/service.ts` |
| Repository | query, mapping tipe DB | `src/lib/*/repository.ts`, `src/lib/pg/schema.ts` |
| DB | integritas (CHECK, UNIQUE, FK) | 13 migration `drizzle/*.sql` |

Transaksi database dipakai pada operasi multi-tabel: `createProgram` (program + 12 baris bulanan + PIC) dan `updateProgramMaster` — `db.transaction(...)` di `src/lib/program-kerja/service.ts`.

---

## 8. Database PostgreSQL

Sumber: `src/lib/pg/schema.ts` (572 baris) + 13 migration `drizzle/0000…0012`.

| Tabel | Kolom kunci | Constraint penting |
|---|---|---|
| `users` | id, name, email, password_hash, nip, position, role, status, msl_access, photo_url | UNIQUE email, UNIQUE nip, CHECK role ∈ (Admin, Head Office, Project, Management), CHECK status ∈ (active, suspended) |
| `sessions` | id, token_hash, user_id, expires_at | UNIQUE token_hash, FK user CASCADE, index user_id & expires_at |
| `login_attempts` | identity_hash (SHA-256 NIP), succeeded, created_at | index (identity_hash, succeeded, created_at) + index created_at |
| `program_kerja_groups` | name, sort_order | UNIQUE name |
| `program_kerja` | group_id, year, name, description, start/end_month, parameter, unit, monitor, note, evidence_url, created_by | CHECK year ≥ 2000, month 1–12, start ≤ end, unit ∈ (Jumlah, Persentase); FK group RESTRICT; FK created_by NO ACTION |
| `program_kerja_monthly` | program_kerja_id, month, ra_value, ri_value, ri_updated_by | UNIQUE (program, month), CHECK month 1–12, ra ≥ 0, ri NULL atau ≥ 0 |
| `program_kerja_pics` | program_kerja_id, user_id | PK komposit, FK cascade/no-action |
| `template_forms` | name, source_type, file_url, file_name, file_mime_type, file_size_bytes, blob_pathname, uploader_pic_user_id, created_by | CHECK source_type ∈ (link, upload) + CHECK integritas sumber; UNIQUE parsial `blob_pathname`; CHECK ukuran > 0 |
| `master_projects` | name, location, year, pic_user_id, created_by | UNIQUE lower(trim(name)), lower(trim(location)); index trigram GIN name & location; CHECK year ≥ 2000 |
| `engineering_database_entries` | project_id, category, file_url, pic_user_id, note, created_by | CHECK category ∈ 6 nilai; FK project RESTRICT; index (category, project_id) |
| `msl_assessments` | project_id, assessment_month, engineering_value, metode_kerja, engineering_execution, remarks, created_by/updated_by | UNIQUE (project, month); numeric(3,2); CHECK tiap komponen 0–5 |
| `msl_year_notes` | year, note, created_by/updated_by | UNIQUE year; CHECK year ≥ 2000 |
| `organization_structure` | singleton, image_url, blob_pathname, file_name, created_by, updated_by | UNIQUE + CHECK pada `singleton` (maksimum satu baris), CHECK panjang > 0 |

Ekstensi: `CREATE EXTENSION IF NOT EXISTS "pg_trgm"` di `drizzle/0004_master_projects.sql`.

**Kondisi database produksi tidak diverifikasi** pada audit ini (tidak ada koneksi DB yang dijalankan). Yang bisa dipastikan hanya: skema di source code, migration yang ada, dan perilaku API hidup (lihat §17).

---

## 9. Database MongoDB

Koneksi: `src/lib/db/mongodb.ts` — `MongoClient` di-cache pada `globalThis` (aman untuk hot reload), nama DB dari `MONGODB_DB_NAME`.

| Collection | Sumber | Indeks (dibuat lazy saat request pertama) | Field publik (projection) |
|---|---|---|---|
| `heroes` | `hero.repository.ts` | `{ status: 1, sortOrder: 1 }` | imageUrl, imageAlt, projectName, location, title |
| `portfolio_projects` | `portfolio-project.repository.ts` | `{ status: 1, sortOrder: 1 }` | title, category, location, progress, imageUrl, imageAlt, description |
| `green_building_certificates` | `green-building.repository.ts` | `{ publishStatus: 1, sortOrder: 1 }` | projectName, certificationBody, imageUrl, imageAlt, level, year, score, description |
| `social_posts` | `social-post.repository.ts` | `{ status: 1, sortOrder: 1 }` | platform, account, caption, url, type, imageUrl |
| `clients` | `client.repository.ts` | `{ status: 1, sortOrder: 1 }` | name, shortName, logoUrl, logoAlt, link |

Karakteristik lain: metadata kepemilikan gambar (`imageSource`, `blobPathname`) bersifat **opsional dan aditif** (tanpa migrasi Mongo); dokumen legacy tanpa field tersebut dianggap `external` sehingga tidak pernah dihapus otomatis. Semua dokumen CMS memiliki `sortOrder`, `createdAt`, `updatedAt`, dan status publikasi.

Indeks dibuat **saat runtime**, bukan lewat skrip migrasi/index terpisah — lihat temuan F-10.

---

## 10. Authentication dan Authorization

**Autentikasi**
- Kredensial: **NIP + password**. Hash `bcryptjs` cost 12 (`src/lib/auth/password.ts`).
- Sesi: tabel `sessions` menyimpan **SHA-256 token**, cookie menyimpan token mentah (`wibex_session`, httpOnly, `sameSite: lax`, `secure` hanya di produksi, 24 jam atau 30 hari bila "remember").
- Logout: hapus baris sesi + cookie `maxAge: 0`.
- Proteksi brute force: 5 kegagalan / 15 menit per NIP (hash NIP sebagai kunci) → 429 dengan `Retry-After`; kegagalan tidak ditulis saat akun terkunci; sukses menetralkan streak tanpa menghapus audit trail.
- Anti-enumerasi: NIP tidak dikenal tetap menjalankan satu verifikasi bcrypt terhadap hash dummy.
- Aktivasi/suspend: user `suspended` tidak pernah lolos `getCurrentUser()` (dianggap tidak terautentikasi), password benar pada akun suspended → 403.

**Otorisasi** — berlapis tiga:
1. **Layout server** per modul (`src/app/dashboard/*/layout.tsx`) → redirect `/login` atau `/dashboard`.
2. **Route handler** → `getPermittedActor(permission)` / helper domain → 401/403.
3. **Service** → `assert*` (mis. `assertCanManageCms`, `assertManageAccess`) sebagai jaring pengaman bila route terlewat.

Permission terpusat di `src/lib/auth/permissions.ts`; **Admin = super-application** (`hasPermission()` selalu `true` untuk fitur), tetapi tidak melewati aturan integritas (last active admin, FK, field immutable).

| Role | Akses yang ditemukan | Bukti implementasi |
|---|---|---|
| **Admin** | Semua permission fitur (CMS, User, Program Kerja, Template & Form, Master Project, Engineering DB, MSL, Struktur Organisasi) | shortcut `isAdmin()` di `hasPermission` (`permissions.ts`) |
| **Head Office** | CMS ✗, User ✗, Program Kerja **view + manage + edit RI** (RI hanya bila menjadi PIC), Template & Form **view + manage**, Master Project **view + create + edit + delete**, Engineering DB **view + manage**, MSL **view saja**, Struktur Organisasi **view**, `DASHBOARD_SASAA_VIEW` ✔ | `NON_ADMIN_PERMISSION_ROLES`; `canUpdateProgramRi` (record-level PIC, `program-kerja/access.ts`) |
| **Management** | CMS ✗, User ✗, Program Kerja **view saja**, Template & Form **view**, Master Project **view**, Engineering DB **view**, MSL **hanya jika `users.msl_access = true`** (view + manage), Struktur Organisasi **view**, SASAA ✔ | `msl/access.ts` (`isManagement && mslAccess`), `program-kerja/access.ts` |
| **Project** | CMS ✗, User ✗, Program Kerja ✗, Template & Form **view**, Master Project **view + edit**, Engineering DB **view + manage**, Struktur Organisasi **view**, MSL ✗ | `NON_ADMIN_PERMISSION_ROLES`, `engineering-database/access.ts` |
| Role tak dikenal | Tidak ada akses (tidak pernah cocok dengan daftar) | `hasPermission` fallback `false` |

Catatan: `MASTER_PROJECT_DELETE` hanya untuk **Head Office** (bukan Project), sedangkan `ENGINEERING_DATABASE_MANAGE` mencakup **Project**. `CMS_MANAGE`, `USER_MANAGE`, `MSL_MANAGE`, `ORGANIZATION_STRUCTURE_MANAGE` kosong untuk non-Admin → efektif Admin-only (MSL_MANAGE dapat diberikan ke Management lewat capability).

Tidak ada `middleware.ts`; proteksi halaman sepenuhnya lewat layout server + API. Ini bukan celah selama setiap route API memeriksa sesi sendiri (diverifikasi: seluruh route non-publik memanggil `getPermittedActor`/`getActor`/`apiAuthGuard`/`requireUser`).

---

## 11. Daftar Seluruh Fitur

| # | Fitur | Status | Lokasi utama |
|---|---|---|---|
| 1 | Landing page publik (Hero, About, Projects, Green Building, Media Sosial, Clients, Footer, Navbar) | **COMPLETE** | `src/app/page.tsx`, `src/components/landing/*` |
| 2 | Landing CMS — Hero Banner | **COMPLETE** | `dashboard/hero/*`, `lib/heroes/*` |
| 3 | Landing CMS — Our Project (portfolio) | **COMPLETE** | `dashboard/projects/*`, `lib/portfolio-projects/*` |
| 4 | Landing CMS — Green Building Certificate | **COMPLETE** (data publik kosong) | `dashboard/green-building/*`, `lib/green-buildings/*` |
| 5 | Landing CMS — Media Sosial (kurasi Instagram) | **COMPLETE** | `dashboard/social-media/*`, `lib/social-posts/*` |
| 6 | Landing CMS — Our Client | **COMPLETE** (+ tautan logo, uncommitted) | `dashboard/clients/*`, `lib/clients/*`, `landing/Clients.tsx` |
| 7 | Upload gambar CMS publik + cleanup orphan | **COMPLETE** | `api/cms/upload*`, `lib/cms/*`, `lib/storage/public-image.ts` |
| 8 | Autentikasi (login/logout/me) + hardening brute force | **COMPLETE** | `api/auth/*`, `lib/auth/*` |
| 9 | RBAC global + User Control | **COMPLETE** | `lib/auth/permissions.ts`, `dashboard/users/*` |
| 10 | Program Kerja (manage, RI, note, evidence, summary + PDF) | **COMPLETE** | `dashboard/program-kerja/*`, `lib/program-kerja/*` |
| 11 | Template & Form (link / upload privat, download terautentikasi) | **COMPLETE** | `dashboard/template-form/*`, `lib/template-form/*`, `lib/storage/blob.ts` |
| 12 | Master Project | **COMPLETE** | `dashboard/master-project/*`, `lib/master-project/*` |
| 13 | Engineering Databases (6 kategori + summary chart) | **COMPLETE** | `dashboard/engineering-database/*`, `lib/engineering-database/*` |
| 14 | MSL Engineering (bulanan, skor, kategori, PDF V2.5) | **COMPLETE** (klaim "frozen" PERLU VERIFIKASI) | `dashboard/engineering-database/msl/*`, `lib/msl/*` |
| 15 | Struktur Organisasi (satu chart, upload Admin) | **COMPLETE** | `dashboard/struktur-organisasi/*`, `lib/organization-structure/*` |
| 16 | Profil mandiri (nama, telepon, foto) | **COMPLETE** | `dashboard/profile/edit`, `api/auth/me` |
| 17 | Dashboard SASAA | **NOT STARTED** (hanya permission `DASHBOARD_SASAA_VIEW`) | `lib/auth/permissions.ts` |
| 18 | Test otomatis & CI | **NOT CONFIGURED** | — |

---

## 12. Status MSL Engineering Monthly Assessment

**Status: COMPLETE** (implementasi terbukti end-to-end di repository).

- Halaman: `src/app/dashboard/engineering-database/msl/page.tsx` (+ `layout.tsx` guard `canViewMsl`), UI `MslEngineeringPage.tsx` (730 baris), `MslTable`, `MslLegend`, `MslYearNote`, `msl-draft.ts`.
- API: `GET /api/msl?year&month`, `POST /api/msl/assessments`, `PATCH|DELETE /api/msl/assessments/[id]`, `PUT /api/msl/note`.
- Service/repository: `lib/msl/service.ts`, `repository.ts` (satu-satunya batas konversi `numeric` → number).
- Database: `msl_assessments` (UNIQUE project+month, komponen 0–5), `msl_year_notes` (UNIQUE year).
- Skor & kategori: **selalu diturunkan**, tidak disimpan — `lib/msl/score.ts` (rata-rata 3 komponen, 2 desimal, band: <1 Tidak Peduli, <2 Peduli, <3 Tahap Belajar, <4 Kompeten, <5 Pengajar, 5 Berinovasi).
- PDF: `mslExportPdf.ts` (764 baris, jsPDF + autotable) — komentar sumber menyebut **"V2.5 visual polish"**, sesuai catatan historis; fitur *View PDF* dan *Download PDF* ada di UI.
- Hak akses: Admin (manage), Head Office (view), Management hanya dengan `msl_access`, Project tidak sama sekali.
- Riwayat: 8 commit berurutan 2026-10-28 → 2026-10-29 (`32e7c15` → `287c733`) menunjukkan fitur dibangun bertahap lalu dipoles, bukan sekali jadi.
- Klaim "frozen / tidak boleh diubah": **PERLU VERIFIKASI** — tidak ada dokumen kebijakan di repository yang menyatakan itu.

---

## 13. Status Organization Structure

**Status: COMPLETE.**

- Halaman: `src/app/dashboard/struktur-organisasi/page.tsx` (guard view; `canManage` dihitung di server), viewer `OrganizationStructureViewer.tsx`, pengelola `OrganizationStructurePage.tsx`.
- API: satu resource `GET/PUT/DELETE /api/organization-structure` (bukan collection + `[id]`), PUT/DELETE hanya Admin dan **diverifikasi ulang di service**.
- Data: PostgreSQL `organization_structure` dengan pola singleton (`CHECK (singleton)` + `UNIQUE (singleton)`) → maksimal satu baris; "belum ada" = tidak ada baris.
- Storage: namespace publik `cms/organization/` (bukan landing), object diverifikasi ulang (`verifyCmsUploadedImage`), nama file diturunkan server, cleanup hanya setelah tulisan DB sukses dan hanya bila objek tidak lagi direferensikan.
- Riwayat: `f7c9cc5` (backend) dan `36536c0` (dashboard), 2026-10-29.
- Klaim "frozen": **PERLU VERIFIKASI** (tidak ada dokumen kebijakan).

---

## 14. Status Hero CMS

**Status: COMPLETE**, dengan catatan kontrak field (F-03).

- Form: `src/components/dashboard/hero/HeroForm.tsx`; field saat ini = **file gambar, URL gambar, title, status, project, location**. Tidak ada input `imageAlt` maupun `description` (dihapus pada commit `3914244` untuk modul lain dan `84e0a90` untuk Hero).
- Skema API masih menerima `imageAlt` (default `""`) dan `description` (default `""`) — `lib/heroes/hero.schema.ts`; data lama tetap tersimpan dan dipakai landing sebagai fallback `alt`/teks.
- CRUD: `dashboard/hero/page.tsx`, `add`, `[id]/edit`; API `/api/heroes` + `/public`.
- Upload: dua sumber (`upload` ke Blob publik `cms/hero/`, atau `external` URL/`/asset`), verifikasi objek sebelum simpan, hapus objek lama hanya setelah DB sukses.
- Perbaikan historis "pengelolaan Hero CMS" terverifikasi: commit `84e0a90` menyentuh `HeroForm.tsx` (−16 baris), `hero/add/page.tsx` (−1), `hero/[id]/edit/page.tsx` (−1) — konsisten dengan penghapusan input.
- Data publik hidup: `GET /api/heroes/public` → **10 item**, field `imageAlt, imageUrl, location, projectName, title`.

---

## 15. Status Our Projects

**Status: COMPLETE** (commit `84e0a90` menambahkan modal detail).

Checklist terhadap spesifikasi historis:

| Persyaratan | Implementasi | Status |
|---|---|---|
| Project listing | slider horizontal `snap-x`, kartu dari `/api/portfolio-projects/public` | ✔ |
| Progress 0–100 | `clampProgress()` di `Projects.tsx` | ✔ |
| Progress 0% | dirender sebagai bar 0% + label "0%" (bukan "unknown") | ✔ |
| Progress null/undefined | `progress: number \| null`; null → **tidak ada bar** sama sekali | ✔ |
| Progress bar | `role="progressbar"` + `aria-valuenow/min/max` + label aksesibel | ✔ |
| Modal detail | `ProjectDetailModal.tsx` (`role="dialog"`, `aria-modal`, `aria-labelledby`) | ✔ |
| Gambar / kategori / judul / lokasi / deskripsi lengkap | semua dirender dari record CMS yang sama | ✔ |
| Tombol tutup | tombol X dengan `aria-label="Tutup detail proyek"` | ✔ |
| Backdrop | klik overlay menutup, klik isi dialog tidak (`stopPropagation`) | ✔ |
| Escape key | listener `keydown` khusus Escape | ✔ |
| Focus management | fokus dipindah ke tombol tutup saat mount, dikembalikan ke pemicu saat unmount | ✔ |
| Body scroll locking | `document.body.style.overflow = "hidden"` + restore di cleanup | ✔ |
| Responsivitas | `items-end sm:items-center`, `max-h-[92dvh]`, `sm:max-w-3xl` | ✔ |

---

## 16. Riwayat Perubahan Git

Verifikasi dua commit historis:

**`3914244` — `refactor: remove alt text inputs from landing CMS` (2026-11-02)**
Ada di riwayat branch aktif (ancestor HEAD). 16 file, **105 deletions, 0 insertions**: `ClientForm` (−18), `CertificateForm` (−18), `HeroForm` (−16), `ProjectForm` (−16), `SocialPostForm` (−21), `About.tsx` (−1), plus halaman `add`/`edit` tiap modul.

**`84e0a90` — `feat: improve landing CMS and project details` (2026-11-02)**
HEAD dan `origin/main`. 7 file, +231 / −23: `ProjectDetailModal.tsx` **baru 175 baris**, `Projects.tsx` +56, `HeroForm.tsx` −16, halaman hero add/edit −1, `portfolio-project.repository.ts` +1, `portfolio-project.types.ts` +4.

Keduanya **ada di riwayat `main`**. Status push: `origin/main` menunjuk ke `84e0a90` pada remote-tracking ref lokal — artinya commit tersebut **pernah** terkirim ke remote (tidak diverifikasi ulang ke GitHub, karena `git fetch` tidak dijalankan).

### Timeline perkembangan (68 commit, berdasarkan tanggal commit)

| Periode | Fase | Commit kunci |
|---|---|---|
| 2026-10-01 | Inisialisasi | `3d967bd` Initial commit, `f9d2dee` Create Next App |
| 2026-10-06 – 10-09 | Landing CMS awal (Mongo) | `ff09440` progress 20%, `e930e97` merge, `8c9ee7f` green building + social CMS, `3a4cd45` CMS Our Project, `2c14a27` cleanup demo data, `7195d21`/`d54f757` fix social media, `61f92b7` hapus aset tak terpakai |
| 2026-10-09 – 10-12 | PostgreSQL + autentikasi + User Control | `f4e0d20` PG + Drizzle, `552a8e5`/`5ecfb1d` auth backend & API, `da53ad8` proteksi dashboard, `ab92b93`–`e2beb3e` CRUD user lengkap, `425db5e` profil nyata, `ba5a73c` Our Project dari CMS |
| 2026-10-13 – 10-16 | Kontrak role + Program Kerja | `5fa704f` role contract, `016a79a`–`57186f3` Program Kerja bertahap, `61551a6`/`588cf45`/`27cbcda`/`c763397` PDF |
| 2026-10-21 – 10-22 | Summary Report + Template & Form | `be382ad`–`ee7c1a2` summary & PDF, `28d581b`/`1bf749d` Template & Form |
| 2026-10-23 – 10-27 | Master Project, Engineering DB, RBAC, upload privat | `616b4e9`, `d7a04d8`, `0b146cb` consolidasi RBAC, `67e9d32` upload privat |
| 2026-10-28 – 10-29 | MSL Engineering + Struktur Organisasi | `0d580aa` msl_access, `32e7c15`–`287c733` MSL (skema, API, UI, PDF, paritas visual), `f7c9cc5`/`36536c0` organisasi |
| 2026-10-30 – 11-02 | Penyempurnaan landing CMS | `ecd1ab1` kategori Our Project, `6893e77` About, `3914244` hapus alt text, `84e0a90` modal detail + Hero |

---

## 17. Hasil Testing dan QA

| Pemeriksaan | Status | Bukti |
|---|---|---|
| TypeScript (`npx tsc --noEmit`) | **PASS** | dijalankan pada sesi audit ini, exit 0 |
| ESLint (`npx eslint src/components/landing/Clients.tsx`) | **PASS** | exit 0, 0 error / 0 warning (file yang berubah) |
| ESLint seluruh proyek | **NOT RUN** | hanya file berubah yang diperiksa (batas waktu audit) |
| `git diff --check` | **PASS** | exit 0 (tidak ada whitespace error) |
| Build produksi (`npm run build`) | **PASS** | dijalankan pada sesi ini, exit 0, "✓ Compiled successfully in 14.6s"; artefak `.next/` bersifat sementara |
| Unit test | **NOT CONFIGURED** | 0 file `*.test.*` / `*.spec.*` / `__tests__` |
| E2E test (Playwright/Cypress) | **NOT CONFIGURED** | tidak ada konfigurasi |
| CI/CD | **NOT CONFIGURED** | tidak ada `.github/workflows` |
| Coverage | **NOT CONFIGURED** | — |
| QA API publik (live, read-only) | **PASS** | dev server `localhost:3000` menjawab HTTP 200; `heroes=10`, `clients=8`, `portfolio-projects=3`, `green-buildings=0`, `social-posts=6` item |
| QA browser landing (viewport 390/768/1280/1440) | **PASS** | dilakukan pada sesi ini untuk section Our Clients: 8 kartu anchor, tata letak & ukuran logo tidak berubah, tanpa overflow horizontal |
| Database produksi | **NOT RUN** | keterbatasan akses; tidak ada koneksi DB dibuka saat audit |

Artefak: `.next/` (hasil build, tidak di-commit), `screenshots/` (16 PNG QA, untracked).

---

## 18. Security Review

Yang sudah baik (terverifikasi):

- Password `bcrypt` cost 12; hash tidak pernah keluar dari `SafeUser` (fungsi `toSafeUser` membuang `passwordHash`).
- Token sesi acak 32 byte; DB hanya menyimpan SHA-256.
- Lockout login per NIP yang di-hash (tanpa menyimpan NIP mentah), respons 429 seragam.
- Verifikasi bcrypt tetap dijalankan untuk NIP tak dikenal (anti timing/enumerasi).
- Cookie httpOnly + `sameSite=lax` + `secure` di produksi.
- Admin terakhir tidak bisa di-suspend/di-hapus; user tidak bisa suspend/hapus diri sendiri; sesi dicabut saat suspend/ganti password.
- Semua route non-publik memeriksa sesi; mutasi memeriksa permission di route **dan** service.
- Upload: allowlist MIME/ekstensi (JPG/PNG/WEBP/AVIF, tanpa SVG), batas 5 MB (CMS) dan 50 MB (dokumen), pathname dibatasi namespace (`cms/<module>/<uuid>/<file>`), verifikasi objek ulang via `head`, `allowOverwrite: false`, token CMS **tidak** memakai fallback `BLOB_READ_WRITE_TOKEN` (mencegah gambar landing masuk ke store dokumen privat).
- Dokumen Template & Form: store privat, download hanya lewat route terautentikasi berbasis id record (pathname tidak pernah dikirim ke klien).
- Header keamanan dasar aktif (`nosniff`, `DENY` framing, `Referrer-Policy`, `Permissions-Policy`).

Risiko yang tersisa: lihat §20 (F-01 CSP, F-02 validasi URL, F-12 CSRF/origin check).

---

## 19. Technical Debt

| Area | Bukti | Dampak |
|---|---|---|
| Duplikasi pola CRUD CMS di 5 modul | `components/dashboard/{hero,projects,green-building,social-media,clients}/` | perubahan lintas modul harus disentuh 5× |
| Komponen sangat besar | `TemplateFormEditor.tsx` 1.019 baris; `mslExportPdf.ts` 764; `MslEngineeringPage.tsx` 730; `ProgramKerjaSummaryDashboard.tsx` 719; `lib/program-kerja/summary.ts` 701 | sulit diuji/di-refactor dengan aman |
| Tidak ada test & CI | §17 | regresi hanya terdeteksi manual |
| `.env.example` tidak ada | pesan error di `pg/client.ts` & `db/mongodb.ts` menyuruh menyalinnya | onboarding baru gagal di langkah pertama |
| Guard halaman tersebar di banyak `layout.tsx` | 16 layout dengan pola mirip | risiko lupa menambah guard saat menambah modul |
| Field `imageAlt`/`description` yatim | §14, F-03 | data tidak bisa diperbaiki dari UI |
| Modul `lib/demo/*` bernama "demo" | dipakai form nyata (`INTERVAL_OPTIONS`, `shortTitle`, `instagramAccounts`, `getAccountPostCount`) | kebingungan; pernah jadi sumber data karangan sebelum `b43c326` |
| Aset default Next.js | `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` tidak diimpor di `src` | noise di repo |
| README boilerplate | `README.md` default create-next-app | dokumentasi onboarding tidak ada |

---

## 20. Daftar Bug dan Potensi Masalah

Tidak ada temuan **CRITICAL**.

**F-01 — Content-Security-Policy belum dipasang**
- Status: VERIFIED
- Lokasi: `next.config.ts` (blok `SECURITY_HEADERS`, komentar "Deliberately NOT included: Content-Security-Policy …")
- Kondisi: hanya 4 header dasar; CSP tidak ada.
- Dampak: tidak ada lapisan kedua terhadap XSS/inline script injection; risiko naik karena landing memuat gambar remote dari Blob dan URL eksternal.
- Rekomendasi: susun CSP bertahap (Report-Only dulu) dengan allowlist `blob:`/host Blob, lalu aktifkan.

**F-02 — `link` CMS tidak divalidasi saat ditulis**
- Status: VERIFIED
- Lokasi: `src/lib/clients/client.schema.ts` (`link: z.string().trim().max(500)`, create & update)
- Kondisi: nilai apa pun ≤500 karakter diterima dan disimpan. Sanitasi hanya ada di sisi render (`src/components/landing/Clients.tsx`, `toSafeHref`, masih **uncommitted**).
- Dampak: DB dapat menyimpan `javascript:`/`data:`; konsumen lain (CMS preview, laporan) tidak otomatis terlindungi.
- Rekomendasi: tambahkan `refine` skema (http(s) absolut atau path internal yang diawali `/`, tolak `//`, backslash, whitespace) + pesan error form.

**F-03 — Alt text & short description tidak bisa diedit lagi, tetapi masih ada di kontrak API**
- Status: VERIFIED
- Lokasi: `src/components/dashboard/hero/HeroForm.tsx` (tidak ada input `imageAlt`/`description`), `src/lib/heroes/hero.schema.ts` (field masih diterima), commit `3914244` & `84e0a90`
- Kondisi: UI menghapus input; API/DB/landing masih memakai field (fallback ke `title`/`projectName`).
- Dampak: dokumen lama tidak bisa diperbaiki alt-nya dari CMS; dokumen baru selalu `""` sehingga landing memakai fallback. Menimbulkan kesan "field hantu".
- Rekomendasi: putuskan satu arah — hapus field dari kontrak API (breaking, perlu migrasi dokumen) atau kembalikan input (kecil, aman).

**F-04 — `.env.example` tidak ter-track Git dan tidak lengkap**
- Status: VERIFIED (dikoreksi pada audit lanjutan)
- Lokasi: `.gitignore` baris 44 (`.env*`); `.env.example` di root (ignored)
- Kondisi: file contoh ada di disk, tetapi ikut ter-ignore sehingga tidak masuk repository. Isinya hanya `DATABASE_URL`, `DIRECT_URL`, `MONGODB_URI`, `MONGODB_DB_NAME` — `BLOB_READ_WRITE_TOKEN`, `CMS_BLOB_READ_WRITE_TOKEN`, `VERCEL_OIDC_TOKEN`, `BLOB_STORE_ID`, dan `ADMIN_*` tidak tercantum.
- Dampak: clone baru tidak punya template environment sama sekali; pesan error `src/lib/pg/client.ts` (`Missing DATABASE_URL…`) menyuruh menyalin file yang tidak diterima repository.
- Rekomendasi: tambahkan `!.env.example` pada `.gitignore`, lengkapi seluruh nama variabel **tanpa nilai**, dan tautkan dari README.

**F-05 — Tidak ada test otomatis & CI**
- Status: VERIFIED
- Lokasi: seluruh repo
- Dampak: aturan bisnis paling sensitif (skor MSL, perhitungan RA/RI Program Kerja, izin per role, sanitizer URL) hanya terlindungi review manual.
- Rekomendasi: mulai dari unit test murni tanpa DB (`lib/msl/score.ts`, `lib/program-kerja/summary.ts`, `lib/auth/permissions.ts`, `toSafeHref`) memakai test runner bawaan Node atau vitest; jalankan di CI minimal `tsc + eslint + test`.

**F-06 — Beberapa komponen melebihi 700–1.000 baris**
- Status: VERIFIED
- Lokasi: `TemplateFormEditor.tsx` (1.019), `mslExportPdf.ts` (764), `MslEngineeringPage.tsx` (730), `ProgramKerjaSummaryDashboard.tsx` (719), `lib/program-kerja/summary.ts` (701)
- Dampak: sulit dites dan rawan regresi saat diubah.
- Rekomendasi: pecah berdasarkan tanggung jawab (bukan refactor besar sekaligus), utamakan file yang sering berubah.

**F-07 — Fallback nama pengguna fiktif di header dashboard**
- Status: VERIFIED
- Lokasi: `src/components/dashboard/DashboardHeader.tsx` (`const displayName = user?.name ?? "R. Triyanto S.T.";`)
- Dampak: bila prop `user` tidak terkirim, UI menampilkan nama orang yang tidak berhubungan dengan sesi.
- Rekomendasi: fallback netral (`"Pengguna"` / inisial "WB") atau jadikan prop wajib.

**F-08 — Indeks MongoDB dibuat lazy saat request pertama**
- Status: VERIFIED (kode) / PARTIALLY VERIFIED (kondisi DB)
- Lokasi: `src/lib/{heroes,clients,portfolio-projects,green-buildings,social-posts}/*.repository.ts` (`let indexesEnsured = false; await collection.createIndex(...)`)
- Dampak: instance baru membuat indeks pada request pertama (biaya satu kali); tidak ada jaminan indeks ada sebelum trafik. Tidak berbahaya untuk skala sekarang.
- Rekomendasi: pindahkan ke skrip seed/index idempoten dan dokumentasikan di README.

**F-09 — Permission `DASHBOARD_SASAA_VIEW` belum dipakai**
- Status: VERIFIED
- Lokasi: `src/lib/auth/permissions.ts`
- Dampak: bukan bug; menandakan modul yang direncanakan belum dimulai.
- Rekomendasi: biarkan (sudah dikomentari) atau hapus sampai modulnya dikerjakan.

**F-10 — Belum ada pemeriksaan origin/CSRF eksplisit pada mutasi API**
- Status: PARTIALLY VERIFIED
- Lokasi: seluruh route `POST/PATCH/PUT/DELETE`
- Kondisi: mitigasi saat ini bersandar pada cookie `sameSite=lax` (POST lintas situs tidak mengirim cookie) + `Content-Type: application/json`. Tidak ada pemeriksaan `Origin`/`Sec-Fetch-Site` dan tidak ada token CSRF.
- Dampak: cukup aman untuk browser modern; berkurang bila ada klien non-browser atau bug browser lama.
- Rekomendasi: tambahkan helper `assertSameOrigin(request)` untuk mutasi (murah, tanpa state).

**F-11 — Data Green Building publik kosong**
- Status: VERIFIED (kondisi data) / penyebab UNKNOWN
- Lokasi: `GET /api/green-buildings/public` → 0 item (diverifikasi live)
- Dampak: section "Green Building Certificate" menampilkan empty state di landing meskipun modul selesai.
- Rekomendasi: periksa `publishStatus` dokumen di CMS (bukan bug kode; filter `publishStatus: "Published"`).

**F-12 — Perubahan `Clients.tsx` belum di-commit**
- Status: VERIFIED
- Lokasi: working tree (`src/components/landing/Clients.tsx`, 71 baris)
- Dampak: pekerjaan bisa hilang (checkout/reset), dan build/deploy berikutnya bergantung pada isi working tree, bukan commit.
- Rekomendasi: review lalu commit terpisah dengan pesan jelas.

---

## 21. Pekerjaan yang Belum Selesai

1. **Commit perubahan landing** (`About.tsx`, `Clients.tsx`, `Footer.tsx`, `SocialMedia.tsx`) — saat ini hanya di working tree.
2. **Validasi `link` di lapisan tulis** (F-02) dan keputusan kontrak `imageAlt`/`description` (F-03).
3. **`.env.example`** + README onboarding yang benar (F-04).
4. **Test minimal + CI** (F-05).
5. **CSP** (F-01) dan pemeriksaan origin untuk mutasi (F-10).
6. **Dashboard SASAA** — belum dimulai (hanya permission).
7. **Data Green Building** — pastikan sertifikat berstatus `Published` agar landing tidak kosong (F-11).
8. **Verifikasi database produksi** (schema drift, jumlah baris, role pengguna nyata) — belum dilakukan.
9. **Kebijakan "frozen" MSL & Struktur Organisasi** — belum ada dokumen resmi di repo.

---

## 22. Rekomendasi Prioritas Pengembangan

| Prioritas | Rekomendasi | Alasan | Dampak bila dilakukan |
|---|---|---|---|
| 1 | Commit pekerjaan landing yang sekarang uncommitted (F-12) | mencegah kehilangan pekerjaan; memisahkan QC dari working tree | riwayat bersih, deploy reproducible |
| 2 | Validasi URL pada skema client (F-02) | menutup celah penyimpanan URL berbahaya di sumbernya | pertahanan tidak bergantung pada satu komponen render |
| 3 | Tambah `.env.example` + README nyata (F-04) | onboarding & handover | developer baru bisa menjalankan proyek tanpa menebak |
| 4 | Unit test untuk logika murni + CI dasar (F-05) | logika bisnis kritikal (skor MSL, summary RA/RI, permission, sanitizer) | regresi tertangkap otomatis |
| 5 | Selesaikan kontrak alt text/description (F-03) | menghilangkan field hantu dan memperbaiki aksesibilitas gambar | data CMS konsisten, alt bisa diisi |
| 6 | CSP Report-Only lalu enforce (F-01) | lapisan mitigasi XSS | risiko injeksi turun tanpa mematahkan gambar Blob |
| 7 | Pemeriksaan origin pada mutasi API (F-10) | pertahanan CSRF eksplisit | aman untuk klien non-browser |
| 8 | Rapikan `lib/demo` → `lib/constants`/`lib/types` (F-07/F-09 teknis) | nama menyesatkan setelah pembersihan data demo | navigasi kode lebih jelas |
| 9 | Verifikasi data & indeks produksi (F-08, F-11) | memastikan kondisi nyata, bukan asumsi | landing tidak kosong, performa terukur |
| 10 | Rencanakan modul Dashboard SASAA | sudah ada permission, belum ada implementasi | modul baru tanpa mengubah RBAC |

Semua rekomendasi di atas **belum dikerjakan** (audit read-only).

---

## 23. Daftar Informasi yang BELUM DIKETAHUI

| Informasi | Status |
|---|---|
| Struktur & isi database PostgreSQL/MongoDB produksi (schema drift, jumlah baris, role pengguna nyata) | **BELUM DIKETAHUI** — tidak ada koneksi DB dibuka saat audit |
| Status deployment Vercel (project, domain, environment variables produksi) | **BELUM DIKETAHUI** |
| Nilai seluruh environment variable | **TIDAK DIBACA** (sengaja; hanya nama yang dicatat) |
| Kepemilikan/akses remote GitHub (siapa punya hak tulis) | **BELUM DIKETAHUI** |
| Apakah `84e0a90` benar-benar ada di GitHub saat ini | **TERVERIFIKASI** — `git ls-remote --heads origin` → `refs/heads/main` = `84e0a90` |
| Kebijakan resmi "MSL & Struktur Organisasi frozen" | **PERLU VERIFIKASI** (hanya catatan historis) |
| Alasan data Green Building publik kosong | **BELUM DIKETAHUI** (kemungkinan `publishStatus` bukan `Published`) |
| Kebijakan retensi `login_attempts` / pembersihan `sessions` kedaluwarsa | **BELUM DIKETAHUI** — fungsi `deleteExpiredSessions` ada, tetapi tidak ditemukan penjadwalan |
| Target performa/SLA dan anggaran biaya infrastruktur | **BELUM DIKETAHUI** |
| Riwayat perubahan sebelum 2026-10-01 | **TIDAK ADA** (commit pertama adalah initial commit) |

---

*Laporan ini disusun hanya dari bukti repository pada HEAD `84e0a90` + working tree saat audit. Tidak ada file source, konfigurasi, dependency, schema, atau database yang diubah.*

*Dokumentasi audit lengkap 14 fase tersedia di `docs/audit/` (mulai dari `docs/audit/MASTER_PROJECT_INDEX.md`).*
