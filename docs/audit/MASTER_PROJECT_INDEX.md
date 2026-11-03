# MASTER_PROJECT_INDEX.md

> **Titik masuk tunggal** untuk seluruh dokumentasi audit BDWIKA / WIBEX.
> Audit read-only, 3 November 2026.

## Identitas Proyek

| Item | Nilai |
|---|---|
| Nama | BDWIKA / **WIBEX** (WIBEX Enterprise CMS) |
| Organisasi | Building Division, PT Wijaya Karya (Persero) Tbk |
| Jenis | Landing page publik + CMS + aplikasi enterprise internal |
| Repository | `https://github.com/hansbonatua/DivisionBuildingWika.git` |
| Root audit | `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika` |
| Branch | `main` (tracking `origin/main`) |
| HEAD | `84e0a90` — *feat: improve landing CMS and project details* (2026-11-02) |
| Remote HEAD (terverifikasi) | `84e0a90` via `git ls-remote --heads origin` |
| Total commit | 68 (2026-10-01 → 2026-11-02) |
| Node / npm | v24.18.0 / 10.5.0, lockfile `package-lock.json` |
| Tanggal audit | 3 November 2026 |

## Ringkasan Sistem

- **Satu aplikasi Next.js 16 (App Router)** yang melayani tiga permukaan: landing publik, dashboard CMS, dan modul enterprise.
- **Dua database**: MongoDB (5 koleksi CMS landing) + PostgreSQL 13 tabel (enterprise). Tidak ada sinkronisasi antar-DB; masing-masing modul memiliki satu sumber data.
- **Autentikasi kustom** (NIP + password, sesi opaque di PostgreSQL) dan **RBAC terpusat** dengan empat role; Admin adalah *super-application* pada level fitur.
- **11 modul fungsional** selesai; 1 permission dicadangkan untuk modul yang belum dimulai (`DASHBOARD_SASAA_VIEW`).
- **Tanpa test otomatis dan tanpa CI.** Verifikasi saat ini bersandar pada `tsc`, ESLint, build, dan QA manual.

## Indeks Dokumen

| Dokumen | Isi | Fase |
|---|---|---|
| [01_REPOSITORY_INVENTORY.md](./01_REPOSITORY_INVENTORY.md) | Inventaris direktori, file, status track/untracked | 1 |
| [02_TECHNOLOGY_AND_CONFIGURATION.md](./02_TECHNOLOGY_AND_CONFIGURATION.md) | Versi terpasang, konfigurasi, environment | 2 |
| [03_SYSTEM_ARCHITECTURE.md](./03_SYSTEM_ARCHITECTURE.md) | Arsitektur frontend/backend, boundary, rendering | 3 |
| [04_DATABASE_SCHEMA.md](./04_DATABASE_SCHEMA.md) | Skema PostgreSQL + koleksi MongoDB + ERD | 4A/4B |
| [05_API_DOCUMENTATION.md](./05_API_DOCUMENTATION.md) | 49 route handler: method, guard, service, tabel | 4D |
| [06_AUTHENTICATION_AND_AUTHORIZATION.md](./06_AUTHENTICATION_AND_AUTHORIZATION.md) | Siklus sesi, matriks permission, risiko | 5 |
| [07_MODULE_AND_FEATURE_INVENTORY.md](./07_MODULE_AND_FEATURE_INVENTORY.md) | 19 fitur: status, bukti, batasan | 6 |
| [08_BUSINESS_PROCESS_AND_DATA_FLOW.md](./08_BUSINESS_PROCESS_AND_DATA_FLOW.md) | Alur bisnis + diagram sekuens | 7 |
| [09_INTEGRATION_AND_STORAGE.md](./09_INTEGRATION_AND_STORAGE.md) | Mongo/PG/Blob, urutan operasi upload & hapus | 8 |
| [10_SECURITY_AND_CODE_QUALITY.md](./10_SECURITY_AND_CODE_QUALITY.md) | Validasi, error, keamanan, performa, debt | 9 |
| [11_TESTING_AND_QUALITY_REPORT.md](./11_TESTING_AND_QUALITY_REPORT.md) | Hasil perintah nyata + area tanpa test | 10 |
| [12_GIT_AND_CHANGE_HISTORY.md](./12_GIT_AND_CHANGE_HISTORY.md) | Working tree, commit historis, timeline | 11 |
| [13_DEPLOYMENT_AND_ENVIRONMENT_GUIDE.md](./13_DEPLOYMENT_AND_ENVIRONMENT_GUIDE.md) | Prasyarat, env, migration, deploy | 12 |
| [14_ARCHITECTURE_DECISIONS_AND_TECHNICAL_DEBT.md](./14_ARCHITECTURE_DECISIONS_AND_TECHNICAL_DEBT.md) | Keputusan arsitektur + inventaris debt | 13 |
| [AI_DEVELOPER_HANDOFF_GUIDE.md](./AI_DEVELOPER_HANDOFF_GUIDE.md) | Panduan kerja untuk AI agent | 14 |
| [FINAL_EXECUTIVE_REPORT.md](./FINAL_EXECUTIVE_REPORT.md) | Kondisi, risiko, kesiapan, roadmap | 6 (final) |
| [23-SECOND-PASS-GAP-REGISTER.md](./23-SECOND-PASS-GAP-REGISTER.md) | 20 gap terstruktur hasil audit lanjutan | second pass |
| [24-SECOND-PASS-AUDIT-REPORT.md](./24-SECOND-PASS-AUDIT-REPORT.md) | Laporan audit lanjutan + stress test handoff | second pass |
| [25-TECHNICAL-REMEDIATION-ROADMAP.md](./25-TECHNICAL-REMEDIATION-ROADMAP.md) | Roadmap perbaikan: klasifikasi, prioritas, wave, gate, keputusan | planning |
| [26-PRIORITIZED-DEVELOPMENT-BACKLOG.md](./26-PRIORITIZED-DEVELOPMENT-BACKLOG.md) | 20 item backlog (RB-01…RB-20) + acceptance criteria | planning |
| [27-CHANGE-IMPACT-ANALYSIS.md](./27-CHANGE-IMPACT-ANALYSIS.md) | Dampak per item: modul, file, regresi, rollback, test | planning |

### Pemetaan ke daftar dokumen handoff yang diminta

Beberapa nama dokumen pada spesifikasi tumpang tindih isinya. Agar tidak ada dua versi yang bisa saling menyimpang, isinya digabung ke satu dokumen per topik. **Tidak ada topik yang dihilangkan.**

| Dokumen yang diminta | Lokasi isi |
|---|---|
| `PROJECT_OVERVIEW.md` | indeks ini (§Ringkasan Sistem) + `FINAL_EXECUTIVE_REPORT.md` §A |
| `TECHNOLOGY_STACK.md` | `02_TECHNOLOGY_AND_CONFIGURATION.md` |
| `SYSTEM_ARCHITECTURE.md` | `03_SYSTEM_ARCHITECTURE.md` |
| `REPOSITORY_STRUCTURE.md` | `01_REPOSITORY_INVENTORY.md` |
| `DATABASE_SCHEMA.md` | `04_DATABASE_SCHEMA.md` |
| `API_DOCUMENTATION.md` | `05_API_DOCUMENTATION.md` |
| `AUTHENTICATION_AND_AUTHORIZATION.md` | `06_AUTHENTICATION_AND_AUTHORIZATION.md` |
| `MODULE_AND_FEATURE_INVENTORY.md` | `07_MODULE_AND_FEATURE_INVENTORY.md` |
| `BUSINESS_PROCESS_AND_DATA_FLOW.md` | `08_BUSINESS_PROCESS_AND_DATA_FLOW.md` |
| `INTEGRATION_AND_STORAGE.md` | `09_INTEGRATION_AND_STORAGE.md` |
| `COMPLETED_FEATURES.md` | `07_...` §Fitur Selesai + `08_...` |
| `INCOMPLETE_FEATURES_AND_OPEN_TASKS.md` | `07_...` §Belum Selesai + `14_...` §Debt |
| `GIT_AND_CHANGE_HISTORY.md` | `12_GIT_AND_CHANGE_HISTORY.md` |
| `TESTING_AND_QUALITY_REPORT.md` | `11_TESTING_AND_QUALITY_REPORT.md` |
| `SECURITY_AND_TECHNICAL_DEBT.md` | `10_SECURITY_AND_CODE_QUALITY.md` + `14_...` |
| `DEPLOYMENT_AND_ENVIRONMENT_GUIDE.md` | `13_DEPLOYMENT_AND_ENVIRONMENT_GUIDE.md` |
| `ARCHITECTURE_DECISIONS.md` | `14_ARCHITECTURE_DECISIONS_AND_TECHNICAL_DEBT.md` |
| `RISKS_AND_RECOMMENDATIONS.md` | `FINAL_EXECUTIVE_REPORT.md` §C/§E |
| `AI_DEVELOPER_HANDOFF_GUIDE.md` | `AI_DEVELOPER_HANDOFF_GUIDE.md` |
| `MASTER_PROJECT_INDEX.md` | dokumen ini |
| `SECOND_PASS_GAP_REGISTER` / `SECOND_PASS_AUDIT_REPORT` | `23-...` / `24-...` (audit lanjutan) |
| `TECHNICAL_REMEDIATION_ROADMAP` / `PRIORITIZED_DEVELOPMENT_BACKLOG` / `CHANGE_IMPACT_ANALYSIS` | `25-...` / `26-...` / `27-...` (perencanaan) |

## Aturan Arsitektur Wajib

1. `Route Handler → Service → Repository → DB`. Tidak ada query DB dari route atau komponen.
2. Otorisasi tiga lapis: guard layout server, cek di route, `assert*` di service.
3. Permission hanya di `src/lib/auth/permissions.ts`; jangan menulis literal `role === "Admin"` di modul.
4. Aktor selalu dari sesi (`requireUser()`), tidak pernah dari body/query/header.
5. Zod di batas HTTP; skema PATCH bebas `.default()` agar tidak menimpa nilai tersimpan.
6. Payload publik hanya lewat projection `*Public`; `blobPathname`/`imageSource`/`passwordHash` tidak pernah keluar.
7. Storage: verifikasi objek sebelum simpan; tulis DB dulu; hapus objek lama setelah sukses dan hanya jika tidak direferensikan.
8. Landing tidak pernah menampilkan konten karangan (empty state netral).

## Modul Terlindungi (Protected)

| Modul | Klaim | Status klaim |
|---|---|---|
| MSL Engineering (bulanan + PDF V2.5) | "selesai & frozen" | **PERLU VERIFIKASI** — tidak ada dokumen kebijakan di repo |
| Struktur Organisasi | "selesai & frozen" | **PERLU VERIFIKASI** — idem |

Sampai klaim dikonfirmasi pemilik proyek: **dokumentasikan, jangan modifikasi**.

## Temuan Kritis yang Masih Terbuka

| ID | Prioritas | Ringkasan | Dokumen |
|---|---|---|---|
| F-01 | HIGH | CSP belum dipasang (keputusan sadar di `next.config.ts`) | 10, 14 |
| F-02 | HIGH | `link` CMS tidak divalidasi di skema tulis; sanitasi hanya di render (uncommitted) | 10, 14 |
| F-03 | MEDIUM | `imageAlt`/`description` tidak bisa diedit dari form tetapi masih diterima API | 07, 10 |
| F-04 | MEDIUM | `.env.example` ada di disk tetapi **gitignored** dan hanya memuat 4 variabel | 02, 13 |
| F-05 | MEDIUM | Tidak ada test otomatis / CI | 11 |
| F-11 | MEDIUM | Feed green building publik = 0 item | 07, 12 |
| F-12 | MEDIUM | Perubahan landing belum di-commit | 12 |

## Completeness Matrix (second pass)

| Dokumen | Akurasi setelah second pass | Gap yang tersisa |
|---|---|---|
| 01 Inventaris | Diperbaiki (59 komponen dashboard, 68 total) | — |
| 02 Teknologi | Akurat (versi, env, config) | `.env.example` belum ter-track |
| 03 Arsitektur | Diperbaiki (Navbar client, 19+1 layout, 5 helper API) | — |
| 04 Database | Akurat + catatan GAP-13 | drift produksi BELUM DIKETAHUI |
| 05 API | Diperbaiki (83 method, guard `pic-options`) | skema respons per field tidak dirinci (disengaja) |
| 06 Auth | Diperbaiki (jumlah layout, PIC suspended, `apiAuthGuard`) | kebijakan frozen belum ada |
| 07 Fitur | Diperbaiki (footer placeholder, CTA Portal) | Green Building 0 item |
| 08 Alur bisnis | Akurat | — |
| 09 Integrasi/storage | Akurat | retensi/backup tidak diketahui |
| 10 Keamanan | Diperbaiki (+F-16..F-18, error boundary) | CSP & validasi `link` belum diperbaiki |
| 11 Testing | Diperbaiki (build = HISTORICAL) | 0 test, tanpa CI |
| 12 Git | Diperbaiki (5 file, 109/49, 19+3 dokumen) | — |
| 13 Deployment | Akurat | status Vercel/domain tidak diketahui |
| 14 ADR/debt | Diperbaiki (+F-16..F-19) | — |
| 23/24 | **Baru** | — |

## Batasan Audit

- Tidak ada koneksi ke PostgreSQL/MongoDB produksi → kondisi data nyata **BELUM DIKETAHUI**.
- Tidak ada deployment/migration/seed yang dijalankan; `.env.local` hanya dibaca nama variabelnya.
- Build produksi pernah dijalankan pada sesi ini (exit 0); artefak `.next/` tidak di-commit.
- Kebijakan "frozen", status Vercel, dan nilai secret tidak dapat dipastikan dari repository.
- Audit lanjutan (second pass) menambahkan `23-...` dan `24-...`; seluruh angka struktural diverifikasi ulang dengan perintah (bukan disalin dari audit pertama).

## Status Kelengkapan Audit
| Fase | Status |
|---|---|
| 1 Inventaris | SELESAI |
| 2 Teknologi & konfigurasi | SELESAI |
| 3 Arsitektur | SELESAI |
| 4 Database & API | SELESAI (kondisi produksi tidak diverifikasi) |
| 5 Auth & otorisasi | SELESAI |
| 6 Modul & status fitur | SELESAI |
| 7 Business process | SELESAI |
| 8 Integrasi & storage | SELESAI |
| 9 Kualitas & keamanan | SELESAI |
| 10 Testing & build | SELESAI (test tidak dikonfigurasi) |
| 11 Git & riwayat | SELESAI |
| 12 Deployment | SELESAI (produksi PERLU VERIFIKASI) |
| 13 ADR & debt | SELESAI |
| 14 Handoff | SELESAI |
