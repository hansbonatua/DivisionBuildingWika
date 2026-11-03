# CURRENT PROJECT STATE — BDWIKA / WIBEX

Terakhir diperbarui: 3 November 2026 (setelah implementasi `LP-NAV-002`).

## 1. Repository

| Item | Nilai |
|---|---|
| Root | `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika` |
| Branch | `main`, tracking `origin/main` |
| HEAD | `84e0a90` (sama dengan `refs/heads/main` di GitHub) |
| Commit total | 68 |
| Stack | Next.js 16.3.8 · React 19.2.8 · TypeScript 5.9.3 · Tailwind 4 · Drizzle ORM · PostgreSQL · MongoDB · Vercel Blob |
| Node / npm | v24.18.0 / 10.5.0 |
| Dev server | `http://localhost:3000` (aktif, HTTP 200 saat verifikasi) |

## 2. Working Tree (belum di-commit)

| Path | Tipe | Keterangan |
|---|---|---|
| `src/components/landing/Navbar.tsx` | M | **+2 baris** — `LP-NAV-002` (Portal `target="_blank"` + `rel`) |
| `src/components/landing/About.tsx` | M | perubahan lama, tidak disentuh |
| `src/components/landing/Clients.tsx` | M | perubahan lama (sanitizer URL + kartu anchor) |
| `src/components/landing/Footer.tsx` | M | perubahan lama |
| `src/components/landing/SocialMedia.tsx` | M | perubahan lama |
| `BDWIKA_WIBEX_AUDIT_REPORT.md`, `BDWIKA_WIBEX_PROJECT_CONTEXT.md` | ?? | dokumen audit root |
| `docs/` | ?? | `docs/audit/` (19 dokumen, termasuk 23/24 hasil second pass) + `docs/development/` (3 dokumen) |
| `screenshots/` | ?? | artefak QA |

Tidak ada staged change. Tidak ada commit/push/deploy yang dilakukan. Tidak ada perubahan konfigurasi, dependency, database, atau migration.

## 3. Status Pemeriksaan Terakhir

| Pemeriksaan | Perintah | Exit | Status |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | PASS |
| ESLint (file diubah) | `npx eslint src/components/landing/Navbar.tsx` | 0 | PASS |
| Diff hygiene | `git diff --check` | 0 | PASS |
| Build produksi (sesi audit, sebelum perubahan ini) | `npm run build` | 0 | PASS |
| Test otomatis | — | — | TIDAK DIKONFIGURASI |

## 4. Perubahan Terakhir

`LP-NAV-002` — tombol **WIBEX Portal** di navbar landing kini membuka `/login` di tab baru. Detail lengkap: `DEVELOPMENT_MASTER_LOG.md` entri `DL-2026-11-03-01` dan `FEATURE_REGISTER.md`.

**Status.** `IMPLEMENTED BUT NOT FULLY VERIFIED` — TypeScript, ESLint, dan `git diff --check` PASS; markup DOM terverifikasi; tab landing tidak berpindah. **Belum terverifikasi:** tampilan `/login` di tab baru (tab baru tidak muncul pada daftar tab terkelola tooling).

Hasil yang diharapkan: klik Portal → `/login` di tab baru; landing tetap terbuka di tab sebelumnya; tombol SUSTAINABILITY dan tampilan desktop/mobile tidak berubah.

## 5. Kondisi yang Perlu Diketahui

- Perubahan landing (termasuk yang lama) **belum di-commit**; jangan `reset`, `checkout --`, `stash`, atau `clean`.
- Belum ada test otomatis dan CI.
- Feed publik Green Building masih 0 item (landing menampilkan empty state).
- Dokumentasi audit menyebut CSP belum dipasang dan `link` CMS belum divalidasi server-side.
- Modul MSL dan Struktur Organisasi diperlakukan **protected** (hanya dokumentasi, tanpa perubahan).

## 6. Langkah Berikutnya

1. Konfirmasi manual di browser bahwa `/login` benar-benar terbuka di tab baru (batasan tooling pada sesi implementasi).
2. Commit perubahan landing secara terpisah (`Navbar.tsx` sendiri; tiga file lama terpisah).
3. Perbarui `docs/audit/07_MODULE_AND_FEATURE_INVENTORY.md` agar baris Navbar mencerminkan perilaku Portal yang baru.
4. Kembali ke roadmap audit: validasi `link` server-side, `.env.example` ter-track, unit test + CI.
