# 01 — REPOSITORY INVENTORY

Status keseluruhan: **VERIFIED** (kecuali disebut lain). Root: `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika`.

## 1. Root Repository

| Entri | Jenis | Tracked | Fungsi |
|---|---|---|---|
| `src/` | direktori | ya | seluruh kode aplikasi (281 file TS/TSX) |
| `drizzle/` | direktori | ya | 13 migration SQL + snapshot meta |
| `public/` | direktori | ya | 49 file aset statis (44 di `public/asset/`) |
| `scripts/` | direktori | ya | 3 skrip operasional (seed/migrasi data) |
| `docs/audit/` | direktori | **tidak** (baru, hasil audit) | dokumentasi audit ini |
| `screenshots/` | direktori | **tidak** (untracked) | 16 PNG artefak QA |
| `package.json` / `package-lock.json` | file | ya | manifest + lockfile npm |
| `tsconfig.json`, `next-env.d.ts`, `tsconfig.tsbuildinfo` | file | `tsconfig.json` ya; sisanya di-ignore | konfigurasi TS + artefak build |
| `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `drizzle.config.ts` | file | ya | konfigurasi framework/tooling |
| `AGENTS.md`, `CLAUDE.md` | file | ya | aturan Next.js versi ini untuk agent (`CLAUDE.md` hanya `@AGENTS.md`) |
| `README.md` | file | ya | **masih boilerplate create-next-app** (bukan dokumentasi proyek) |
| `LICENSE` | file | ya | lisensi |
| `.env.local`, `.env.example` | file | **tidak** (`.env*` di-ignore) | environment; hanya nama variabel yang diaudit |
| `.next/`, `.vercel/`, `.freebuff/`, `.cloud-attachments/` | direktori | tidak | artefak build/tooling |
| `DivisionBuildingWika/` | direktori | tidak | **repository Git terpisah** berisi hanya `.git`, `LICENSE`, `README.md` — bukan bagian aplikasi, asal-usul **BELUM DIKETAHUI** |

Catatan `DivisionBuildingWika/`: direktori ini memiliki `.git` sendiri sehingga Git memperlakukannya sebagai nested repository, bukan file aplikasi. Tidak ada kode di dalamnya dan tidak dipakai oleh build. Jangan dihapus tanpa konfirmasi pemilik.

## 2. Struktur `src/`

| Direktori | File | Baris | Tanggung jawab |
|---|---|---|---|
| `src/app/` | 119 | 8.810 | routing App Router: landing, login, dashboard, 49 route API |
| `src/components/landing/` | 9 | 2.384 | section landing (client components) |
| `src/components/dashboard/` | 59 | ±16.200 | UI dashboard per modul + shell/header/sidebar |
| `src/lib/` | 85 | 11.460 | domain: auth, cms, storage, pg, db, 12 modul bisnis |
| **Total `src/`** | **281** | **±38.855** | |

### `src/app/`
- `layout.tsx` — root layout: font Hanken Grotesk + Manrope, metadata WIBEX.
- `page.tsx` — komposisi landing.
- `globals.css` — Tailwind v4 `@import` + token `@theme inline`.
- `login/` — halaman + layout login.
- `dashboard/` — 12 namespace: `clients`, `engineering-database` (+`[category]`, `msl`, `summary`), `green-building`, `hero`, `master-project/manage`, `profile/edit`, `program-kerja` (+`manage`, `summary`), `projects`, `social-media`, `struktur-organisasi`, `template-form`, `users`.
- `api/` — 14 namespace (lihat dokumen 05).

### `src/lib/` per domain
`auth/` (7 file) · `cms/` (7) · `db/` (1) · `pg/` (3) · `storage/` (2) · `users/` (6) · `program-kerja/` (7) · `template-form/` (7) · `master-project/` (5) · `engineering-database/` (6) · `msl/` (6) · `organization-structure/` (4) · `heroes|clients|portfolio-projects|green-buildings|social-posts/` (4–5 tiap modul) · `demo/` (4).

Tidak ada `hooks/`, `types/`, `utils/`, `services/`, `repositories/` global — semua dikelompokkan per domain. Ini konsisten dan harus dipertahankan.

**Koreksi second pass (3 Nov 2026):** jumlah aktual `src/components/dashboard` adalah **59** file (bukan 70), sehingga total `src/components` = **68** (59 dashboard + 9 landing). Angka diverifikasi dengan `find src/components/dashboard -name "*.tsx" | wc -l`.

## 3. `scripts/`

| Skrip | Fungsi | Menyentuh DB |
|---|---|---|
| `seed-admin.ts` | membuat admin pertama dari env `ADMIN_*` | ya (INSERT) — **tidak dijalankan saat audit** |
| `seed-program-kerja-groups.ts` | mengisi kelompok Program Kerja awal | ya |
| `migrate-portfolio-categories.ts` | memetakan kategori Our Project lama → label baru | ya (Mongo) |

## 4. `drizzle/` (13 migration)

`0000_lumpy_iron_lad` → `0001_naive_iron_patriot` → `0002_thankful_scarlet_spider` → `0003_template_forms` → `0004_master_projects` (**`CREATE EXTENSION pg_trgm`**) → `0005_groovy_marvel_apes` → `0006_colorful_prism` → `0007_login_attempts` → `0008_reflective_inhumans` → `0009_msl_access` → `0010_grey_obadiah_stane` → `0011_msl_monthly_assessment` → `0012_organization_structure`.

## 5. `public/`

- `public/asset/` — 44 berkas: `hero/`, `about/`, logo (`wibex-header.png`, `wibex-icon*`), gambar proyek/sertifikat, `DivisiBX.jpg`, dsb.
- Root `public/`: ikon aplikasi + **5 SVG default Next.js** (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) yang **tidak diimpor** oleh `src/` (diverifikasi grep) → kandidat dead asset (F-08 dokumen 10).

## 6. File Konfigurasi & Artefak

| File | Status | Catatan |
|---|---|---|
| `package.json` | tracked | 4 script; tanpa `test` |
| `package-lock.json` | tracked | npm; jangan diganti package manager |
| `next.config.ts` | tracked | hanya `headers()` (4 header keamanan) |
| `eslint.config.mjs` | tracked | flat config `core-web-vitals` + `typescript` |
| `postcss.config.mjs` | tracked | `@tailwindcss/postcss` |
| `drizzle.config.ts` | tracked | `DIRECT_URL || DATABASE_URL`, offline `generate`/`check` tanpa kredensial |
| `tsconfig.json` | tracked | `strict`, `noEmit`, alias `@/*` |
| `.gitignore` | tracked | `.env*` (line 44), `.next`, `.vercel`, `*.tsbuildinfo`, `next-env.d.ts` |
| `.env.local`, `.env.example` | **ignored** | lihat dokumen 02 §Environment |

## 7. Kesimpulan Fase 1

- Struktur domain-first konsisten; tidak ada kode mati besar selain aset SVG default dan `src/lib/demo/*` yang **masih dipakai** form dashboard (bukan dead code, hanya penamaan menyesatkan).
- Satu anomali: direktori `DivisionBuildingWika/` (nested repo tanpa kode).
- Tracking bersih di level commit, tetapi working tree memiliki 4 file landing termodifikasi + `screenshots/` untracked (lihat dokumen 12).
