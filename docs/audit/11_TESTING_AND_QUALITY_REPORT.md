# 11 — TESTING AND QUALITY REPORT

## 1. Infrastruktur

| Item | Kondisi | Status |
|---|---|---|
| Script `test` di package.json | tidak ada | VERIFIED |
| Framework unit test | tidak terpasang | VERIFIED |
| Framework E2E (Playwright/Cypress) | tidak ada | VERIFIED |
| File `*.test.*` / `*.spec.*` / `__tests__` | **0** | VERIFIED |
| Direktori `coverage` | tidak ada (di-ignore) | VERIFIED |
| CI/CD (`.github/workflows`) | tidak ada | VERIFIED |
| Pre-commit hook | tidak ada | VERIFIED |
| Linter | ESLint 9 flat config | VERIFIED |
| Typecheck | `tsc --noEmit` | VERIFIED |

## 2. Eksekusi Nyata (3 November 2026, sesi audit ini)

Environment: Windows, Git Bash, Node v24.18.0, npm 10.5.0, working tree dengan 4 file landing termodifikasi.

| # | Perintah | Exit | Hasil | Catatan |
|---|---|---|---|---|
| 1 | `npx tsc --noEmit` | **0** | PASS | seluruh proyek |
| 2 | `npx eslint src/components/landing/Clients.tsx` | **0** | PASS | file yang berubah; 0 error/warning |
| 3 | `git diff --check` | **0** | PASS | tanpa whitespace error |
| 4 | `npm run build` | **0** | PASS — **HISTORICAL** | "✓ Compiled successfully in 14.6s"; dijalankan pada sesi audit **sebelum** perubahan CTA WIBEX Portal; artefak `.next/` tidak di-commit. Build belum diulang setelah perubahan tersebut |
| 5 | `GET /api/heroes/public` | 200 | PASS | 10 item |
| 6 | `GET /api/clients/public` | 200 | PASS | 8 item |
| 7 | `GET /api/portfolio-projects/public` | 200 | PASS | 3 item |
| 8 | `GET /api/green-buildings/public` | 200 | PASS | **0 item** |
| 9 | `GET /api/social-posts/public` | 200 | PASS | 6 item |

Tidak dijalankan (dan tidak diklaim PASS):

| Perintah | Alasan |
|---|---|
| `npx eslint .` (seluruh proyek) | lingkup audit dibatasi pada file berubah |
| Test suite | tidak dikonfigurasi |
| Migration / seed | dilarang (mengubah DB) |
| Kueri langsung PostgreSQL/MongoDB | dilarang + tanpa skrip sementara |
| Lighthouse / bundle analyzer | tidak terpasang |
| QA browser lintas viewport penuh | hanya section Our Clients (390/768/1280/1440) |

## 3. QA Manual yang Terdokumentasi

| Area | Cakupan | Hasil |
|---|---|---|
| Landing "Our Clients" | 8 kartu, viewport 390/768/1280/1440, klik logo Mandiri, focus ring | PASS (tanpa overflow, layout stabil) |
| Project detail modal | Escape, backdrop, fokus, scroll lock | diverifikasi dari kode, bukan uji browser pada audit ini |
| Login/lockout | tidak diuji end-to-end pada audit ini | **NOT RUN** |
| CRUD tiap modul | tidak diuji pada audit ini | **NOT RUN** |

## 4. Area Kritis Tanpa Test

| Area | Risiko | Alasan prioritas |
|---|---|---|
| `lib/msl/score.ts` (skor & band) | salah kategori = laporan manajemen salah | murni, mudah diuji |
| `lib/program-kerja/summary.ts` (701 baris agregasi) | KPI/PDF salah | murni |
| `lib/auth/permissions.ts` | eskalasi akses | murni |
| `toSafeHref` di `Clients.tsx` | XSS via `javascript:` | murni |
| `lib/cms/image-storage.ts` (kepemilikan & verifikasi) | hapus objek terpakai | butuh mock Blob |
| `lib/template-form/source.ts` (allowlist MIME/ekstensi) | upload berbahaya | murni |
| Route authorization (49 endpoint) | akses tidak sah | butuh test integrasi |
| Constraint DB (CHECK/UNIQUE/RESTRICT) | integritas data | butuh DB uji |

## 5. Rekomendasi Test Minimum (belum dikerjakan)

1. **Unit murni** (`node:test` atau vitest): skor MSL (batas 0.995/1.0/4.995/5.0), `categorizeMslScore`, agregasi summary, `hasPermission` untuk 4 role × 18 permission, `toSafeHref` (tolak `//`, `javascript:`, `data:`, backslash, whitespace).
2. **Kontrak schema**: `createMslAssessmentSchema` menolak field terlarang; `updateClientSchema` tidak menimpa field yang tidak dikirim.
3. **Integrasi route**: 401 tanpa cookie, 403 untuk role salah, 200 untuk role benar — minimal satu endpoint per permission.
4. **CI**: `tsc --noEmit` + `eslint` + unit test pada setiap push/PR.

## 6. Kesimpulan

- Proyek **dapat dikompilasi dan di-build** hari ini (bukti exit 0).
- **Tidak ada jaminan otomatis** terhadap regresi; seluruh verifikasi bersifat manual.
- Status keseluruhan: **BUILD PASS, TEST NOT CONFIGURED**.
