# 02 — TECHNOLOGY AND CONFIGURATION

Semua versi "terpasang" dibaca dari `node_modules/<pkg>/package.json`.

## 1. Runtime & Package Manager

| Item | Nilai | Status |
|---|---|---|
| Node.js | v24.18.0 | VERIFIED (dijalankan) |
| npm | 10.5.0 | VERIFIED |
| Package manager | **npm** (`package-lock.json`), tidak ada pnpm/yarn/bun lockfile | VERIFIED |
| `engines` di package.json | tidak dideklarasikan | VERIFIED (tidak ada) |

## 2. Dependensi Produksi

| Paket | Deklarasi | Terpasang | Dipakai di | Peran |
|---|---|---|---|---|
| `next` | `16.3.8` (pin) | **16.3.8** | seluruh app | framework |
| `react` / `react-dom` | `19.2.8` (pin) | **19.2.8** | seluruh UI | UI runtime |
| `drizzle-orm` | `^0.45.4` | **0.45.4** | `src/lib/pg/*`, modul PG | ORM PostgreSQL |
| `postgres` | `^3.4.9` | **3.4.9** | `src/lib/pg/client.ts` | driver PG |
| `mongodb` | `^7.7.0` | **7.7.0** | `src/lib/db/mongodb.ts`, 5 repository CMS | driver Mongo |
| `zod` | `^4.6.5` | **4.6.5** | semua `*/schema.ts` + route | validasi |
| `bcryptjs` | `^3.0.3` | terpasang | `src/lib/auth/password.ts` | hash password |
| `@vercel/blob` | `^2.8.2` | terpasang | `src/lib/storage/*` | object storage |
| `jspdf` | `^4.2.1` | terpasang | export PDF (Program Kerja, MSL, summary) | dokumen PDF |
| `jspdf-autotable` | `^5.0.9` | terpasang | tabel PDF | plugin |
| `recharts` | `^3.10.1` | terpasang | chart summary Program Kerja & Engineering DB | charting |

## 3. Dependensi Development

| Paket | Deklarasi | Peran |
|---|---|---|
| `typescript` | `^5` (**5.9.3**) | typecheck |
| `tailwindcss` + `@tailwindcss/postcss` | `^4` (**4.3.3**) | styling (v4, tanpa file config) |
| `eslint` | `^9` | lint (flat config) |
| `eslint-config-next` | `16.3.8` | preset Next |
| `drizzle-kit` | `^0.31.11` | migration tooling |
| `tsx` | `^4.23.15` | menjalankan `scripts/*.ts` |
| `@types/node`, `@types/react`, `@types/react-dom` | `^20`, `^19`, `^19` | tipe |

**Tidak ada** framework test, mocking tool, prettier, atau library form/state.

## 4. Konfigurasi Framework

### `next.config.ts`
Hanya `headers()` untuk semua path `/:path*`:

| Header | Nilai |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` |

**Tidak ada** `Content-Security-Policy` dan **tidak ada** CORS — keduanya disebut eksplisit sebagai keputusan sadar dalam komentar file (landing memuat gambar Blob remote + bentuk inline; belum ada konsumen lintas origin). Lihat F-01.

Tidak ada `images.remotePatterns` → gambar CMS remote dirender dengan `<img>` + `eslint-disable`, sedangkan gambar lokal memakai `next/image`.

### `tsconfig.json`
`strict: true`, `noEmit`, `moduleResolution: "bundler"`, `paths: { "@/*": ["./src/*"] }`. Tidak ada `any` global atau `skipLibCheck` yang menonaktifkan pemeriksaan proyek.

### ESLint
`eslint.config.mjs` — `core-web-vitals` + `typescript` dari `eslint-config-next`, mengabaikan `.next`, `node_modules`, `drizzle` (output generated).

### Tailwind v4
Tanpa `tailwind.config.*`. Token di `src/app/globals.css`:

```css
:root { --background:#f8f9ff; --foreground:#061d30; --primary:#001f3f;
        --secondary:#0061a5; --surface:#ffffff; --outline:#c3c6cf; }
@theme inline { --color-primary: var(--primary); ... --font-sans: var(--font-body);
                --font-display: var(--font-display); }
```

Konsekuensi: warna hanya boleh dipakai lewat nama token (`bg-surface`, `text-primary`, `border-outline`, `ring-secondary`).

### `drizzle.config.ts`
- Dialect `postgresql`, schema `./src/lib/pg/schema.ts`, output `./drizzle`.
- Kredensial: `DIRECT_URL` (utama) → `DATABASE_URL` (fallback).
- `generate`/`check` berjalan tanpa kredensial; perintah live gagal cepat dengan pesan jelas.

## 5. Environment Variables

Nilai **tidak pernah** dibaca/dicetak. Hanya nama + pemakaian.

| Variabel | Dibaca di | Wajib? | Kegunaan |
|---|---|---|---|
| `DATABASE_URL` | `src/lib/pg/client.ts` | ya (runtime) | koneksi PG (pooled, `prepare:false`) |
| `DIRECT_URL` | `drizzle.config.ts` | disarankan | koneksi migrasi langsung |
| `MONGODB_URI` | `src/lib/db/mongodb.ts` | ya (runtime landing CMS) | koneksi Mongo |
| `MONGODB_DB_NAME` | `src/lib/db/mongodb.ts` | ya | nama database CMS |
| `BLOB_READ_WRITE_TOKEN` | `src/lib/storage/blob.ts` | ya untuk dokumen Template & Form | Blob **privat** |
| `VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID` | `src/lib/storage/blob.ts` | alternatif token statis | Blob privat via OIDC |
| `CMS_BLOB_READ_WRITE_TOKEN` | `src/lib/storage/public-image.ts` | ya untuk upload gambar CMS | Blob **publik** CMS |
| `ADMIN_NIP`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_POSITION` | `scripts/seed-admin.ts` | hanya saat seed | akun admin pertama |
| `NODE_ENV` | route login/logout | otomatis | flag `secure` cookie |

### Kondisi dokumentasi environment (F-04, dikoreksi)

- `.env.local` **ada** di disk dan **di-ignore** oleh `.gitignore` (`/.env*/` → pola `.env*`, line 44).
- `.env.example` **juga ada** di disk, tetapi **ikut ter-ignore** sehingga **tidak masuk repository**. Isinya hanya 4 nama: `DATABASE_URL`, `DIRECT_URL`, `MONGODB_URI`, `MONGODB_DB_NAME`.
- Variabel `BLOB_READ_WRITE_TOKEN`, `CMS_BLOB_READ_WRITE_TOKEN`, `VERCEL_OIDC_TOKEN`, `BLOB_STORE_ID`, dan `ADMIN_*` **tidak tercantum** di `.env.example`.

**Dampak:** clone baru tidak memiliki template environment sama sekali; developer harus menebak variabel Blob/admin. **Rekomendasi:** commit `.env.example` dengan `!.env.example` di `.gitignore` dan lengkapi seluruh nama variabel (tanpa nilai).

## 6. Integrasi Pihak Ketiga

| Layanan | Library | Titik masuk | Status verifikasi |
|---|---|---|---|
| MongoDB Atlas (asumsi hosting; host tidak diperiksa) | `mongodb` | `src/lib/db/mongodb.ts` | VERIFIED (kode) |
| PostgreSQL (Neon disebut pada baseline historis; host tidak diverifikasi) | `postgres` + `drizzle-orm` | `src/lib/pg/client.ts` | PARTIALLY VERIFIED (host produksi tidak diketahui) |
| Vercel Blob (publik + privat) | `@vercel/blob` | `src/lib/storage/*` | VERIFIED (kode) |
| Vercel (deployment) | — | `.vercel/` (ignored) | PERLU VERIFIKASI (tidak ada `vercel.json`) |

Tidak ada layanan auth pihak ketiga, tidak ada email/SMS, tidak ada payment, tidak ada analytics, tidak ada monitoring.

## 7. Temuan Fase 2

| ID | Temuan | Status | Dampak |
|---|---|---|---|
| T-01 | `.env.example` tidak ter-track dan tidak lengkap | VERIFIED | onboarding gagal di langkah pertama |
| T-02 | `README.md` masih boilerplate create-next-app (menyebut Geist, `app/page.tsx`, Vercel) | VERIFIED | dokumentasi proyek tidak ada |
| T-03 | `engines.node` tidak dideklarasikan padahal Node 24 dipakai | VERIFIED | build bisa gagal di Node lama |
| T-04 | Next/React di-pin persis, dependensi lain memakai caret | VERIFIED | upgrade tidak sengaja mungkin terjadi untuk lib non-framework |
| T-05 | Tidak ada `vercel.json`; konfigurasi deployment hanya `.vercel/` lokal (ignored) | PARTIALLY VERIFIED | perilaku deploy tidak terdokumentasi di repo |
