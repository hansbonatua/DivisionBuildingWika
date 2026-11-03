# 24 — SECOND-PASS AUDIT REPORT

Audit lanjutan (independen) atas BDWIKA / WIBEX · 3 November 2026 · read-only.
HEAD `84e0a90` (= `origin/main`) · branch `main` · Node v24.18.0 · working tree tidak bersih (5 file landing modified, dokumentasi untracked).

## 1. Ringkasan

Audit pertama menghasilkan struktur dokumentasi yang baik tetapi mengandung **8 klaim yang tidak akurat atau kedaluwarsa**, dan **melewatkan 3 area penting**: pola `_helpers.ts` di API, tautan footer yang tidak berfungsi, dan rincian guard pada empat endpoint `pic-options`. Audit lanjutan ini memverifikasi ulang **seluruh** klaim struktural (bukan menyalinnya), memperbaiki dokumen yang salah, dan menambahkan dua dokumen baru (23, 24).

**Hasil utama:**
- Tidak ada temuan **CRITICAL**.
- 3 temuan **HIGH**: jumlah layout guard (16 → 20), guard `pic-options` salah label, dan handoff yang tidak menyebut pola helper.
- Skema database, migration, matriks permission, cakupan 83 method API, dan aturan storage **terbukti akurat** — tidak ada endpoint yang hilang dan tidak ada permission yang salah dipetakan.
- Satu bug produk nyata ditemukan: footer memakai 8 tautan `href="#"` dan `mailto:` yang tidak cocok dengan teks email yang ditampilkan.

## 2. Area yang Diperiksa Ulang

| Area | Metode | Cakupan |
|---|---|---|
| Inventaris file & folder | `find`, `ls`, hitung per direktori | `src/`, `public/`, `scripts/`, `drizzle/`, `docs/` |
| Entry point & routing | enumerasi `page.tsx` (40) + `layout.tsx` (22) + `route.ts` (49) | seluruh App Router |
| API | ekstraksi method per file (83 handler) + perbandingan dengan dokumen 05 | 49 file |
| Service & repository | `find -name "service.ts"` (7) + `*.service.ts` (5) + `*.repository.ts` (5) | 12 modul domain |
| Database | schema 572 baris, 13 migration, hitung CHECK/UNIQUE/index | PostgreSQL |
| Mongo | 5 repository + projection + filter status | CMS |
| Otorisasi | `permissions.ts` + 8 `access.ts` + service assert | 18 permission |
| Storage | `lib/cms/*`, `lib/storage/*` | 2 store |
| UI landing | 9 komponen, klasifikasi client/server, tautan | landing |
| Dokumentasi | 19 dokumen audit + 3 development + 2 root | seluruh klaim struktural |
| Git | status, diff numstat, HEAD | working tree |

## 3. Temuan yang Terlewat pada Audit Pertama

| # | Temuan | Bukti | Dampak |
|---|---|---|---|
| 1 | Pola `_helpers.ts` per domain API (5 file) tidak terdokumentasi | `find src/app/api -name _helpers.ts` | agent baru bisa menulis mapping error sendiri dan menghasilkan 500 |
| 2 | Footer: 3 ikon sosial + 5 tautan legal `href="#"`; email `mailto:` ≠ teks | `Footer.tsx` baris 4–10, 148–206 | tautan mati, kredibilitas & aksesibilitas |
| 3 | 4 endpoint `pic-options` ber-otorisasi di service, bukan di route | route + `list*PicOptions` | label `VIEW` pada dokumen 05 menyesatkan |
| 4 | `apiAuthGuard()` tidak dipakai satu route pun | 0 call site | dead helper yang bisa disalahgunakan agent |
| 5 | Tidak ada `error.tsx`/`loading.tsx`/`not-found.tsx` | `find src/app` kosong | kegagalan tampil sebagai layar default Next |
| 6 | Opsi PIC tidak memfilter `status` akun (V1, komentar eksplisit) | `engineering-database/repository.ts:158` | PIC non-aktif dapat dipilih |
| 7 | Jumlah sebenarnya: 20 layout dashboard, 59 komponen dashboard | `find` count | angka dokumen lama salah |
| 8 | `Navbar` adalah client component | `"use client"` baris 1 | klasifikasi rendering dokumen 03 salah |

## 4. Klaim Audit Pertama yang Dikoreksi

| Klaim lama | Kondisi aktual | Bukti | Tindakan |
|---|---|---|---|
| "guard tersebar di 16 layout" | **20** file `layout.tsx` di `src/app/dashboard` (1 shell + 19 modul) | `find src/app/dashboard -name layout.tsx \| wc -l` | diperbaiki di 03, 06, 14, executive, index |
| "12 service" tanpa rincian | benar: 7 `service.ts` + 5 `*.service.ts` | `find src/lib -name service.ts` | ditambah rincian (GAP-20) |
| "49 route handler" | benar sebagai file; **83** method handler | `grep -c "export ... function (GET\|POST...)"` | klarifikasi di 05 |
| "Navbar/About/Footer server" | Navbar **client**; About/Footer server | `head -1` tiap file | diperbaiki di 03 |
| "components/dashboard 70 file" | **59** file | `find` count | diperbaiki di 01 |
| "18 fitur" / "16 COMPLETE" | **19** item; **17** COMPLETE | tabel 07 | diperbaiki di index + executive |
| "`pic-options` VIEW" | MANAGE (3 modul) / EDIT (master-project), dicek di service | route + service | diperbaiki di 05 |
| "build 14.6s" tanpa konteks | historis, sebelum perubahan Navbar | sesi audit sebelumnya | diberi label HISTORICAL |
| "4 file landing modified, docs 17" | 5 file modified (Navbar +2), docs 19+3 | `git status`, `git diff --numstat` | diperbarui di 12 |

## 5. Database Gaps

| Item | Status | Catatan |
|---|---|---|
| 13 tabel | VERIFIED | seluruh `pgTable(` dihitung; nama tabel dicek satu per satu |
| 23 CHECK constraint | VERIFIED | dihitung dari `schema.ts` |
| UNIQUE komposit (program_kerja_monthly, msl_assessments, msl_year_notes) | VERIFIED | sesuai dokumen 04 |
| UNIQUE parsial `template_forms.blob_pathname` | VERIFIED | `uniqueIndex ... where not null` |
| `pg_trgm` + GIN index | VERIFIED | migration 0004 + schema |
| FK `RESTRICT` (master_project → eng DB/MSL) | VERIFIED | schema + migration |
| FK `NO ACTION` pada `created_by` | VERIFIED | mencegah hapus user yang masih direferensikan |
| UNIQUE domain `program_kerja` | **TIDAK ADA** (GAP-13) | niat bisnis belum jelas |
| Drift produksi / row count / index nyata | BELUM DIKETAHUI | tanpa koneksi DB |
| Fungsi, trigger, view, RLS | **TIDAK ADA** di schema/migration | tidak ditemukan; bukan klaim negatif atas produksi |

## 6. API Gaps

| Item | Status |
|---|---|
| 49 file route, 83 method | VERIFIED; seluruh 83 tercantum di dokumen 05 |
| Endpoint publik (5 feed) tanpa auth | VERIFIED dan disengaja |
| Route tanpa autentikasi yang seharusnya terlindungi | **tidak ditemukan** |
| Otorisasi hanya di service pada 4 `pic-options` | VERIFIED — tetap aman, tetapi label dokumen diperbaiki |
| Konsistensi amplop `{ data }` / `{ error }` | VERIFIED |
| Error tak tertangani → 500 | ada pola `try/catch` + `mapDomainError`; `console.error` dipakai |
| Skema respons per field | **tidak didokumentasikan** (sengaja; sumber otoritatif `lib/*/schema.ts`) — gap dokumentasi yang diterima |

## 7. Feature Gaps

| Fitur | Status | Catatan |
|---|---|---|
| CTA WIBEX Portal new tab | IMPLEMENTED BUT NOT FULLY VERIFIED | tab baru belum diamati visual |
| Footer sosial & legal | PLACEHOLDER (`href="#"`) | GAP-11 |
| Email footer | INCONSISTENT (mailto vs teks) | GAP-11 |
| Dashboard SASAA | NOT STARTED | hanya permission |
| Test otomatis & CI | NOT STARTED | 0 file, tanpa `.github/` |
| Green Building publik | 0 item | penyebab belum dipastikan |
| Kontrak `imageAlt`/`description` | PARTIALLY IMPLEMENTED | form tanpa input, API masih menerima |

## 8. Security Gaps

| Item | Klasifikasi | Catatan |
|---|---|---|
| CSP tidak ada | Confirmed gap (HIGH) | keputusan sadar terdokumentasi |
| `link` CMS tanpa validasi server | Confirmed gap (HIGH) | sanitasi hanya di render |
| Tanpa cek Origin/CSRF | Potential issue (LOW) | bergantung `sameSite=lax` |
| Rate limit selain login | Potential issue (LOW) | tidak ada limiter |
| Opsi PIC termasuk akun suspended | Confirmed issue (MEDIUM) | komentar menyatakan disengaja di V1 |
| `apiAuthGuard` menganggur | Informational | dead code |
| Secret di repo | Tidak ditemukan | `.env*` ignored |
| SQL/NoSQL injection | Tidak ditemukan | query parameterized / nilai tervalidasi |
| XSS melalui CMS URL | Potential issue (HIGH, = F-02) | `javascript:` dapat tersimpan |

Tidak ada klaim vulnerability baru yang dibuat hanya dari pola kode mencurigakan; setiap item di atas punya lokasi dan bukti.

## 9. Cross-Module Dependency Gaps

Dependency matrix terdokumentasi di 03 §6 dan diverifikasi ulang; tambahan yang belum tercatat:

| Sumber | Tujuan | Mekanisme | Risiko perubahan |
|---|---|---|---|
| 5 modul CMS | `lib/cms/image-references.ts` | registry 6 cek referensi | menambah uploader tanpa mendaftar → objek terpakai terhapus |
| 4 domain API | `_helpers.ts` masing-masing | `getActor` + `mapDomainError` | perubahan bentuk error satu domain tidak memengaruhi yang lain |
| Users | 4 endpoint `pic-options` | query role (tanpa filter status) | perubahan definisi role menyentuh 4 query |
| `lib/users/roles.ts` | sidebar, permission, seed, PIC | konstanta role | perubahan nama role = perubahan luas |
| `master_projects.year` | MSL list + filter | tahun dari proyek | perubahan year menggeser seluruh data MSL |

Diagram dependency tidak berubah dari dokumen 03 (tidak ada edge baru yang terbukti).

## 10. AI Handoff Stress Test

| # | Pertanyaan | Jawaban tersedia? | Rujukan / gap |
|---|---|---|---|
| 1 | Cara menjalankan proyek | ✔ | 13 §3 (`npm ci`, dev, build) |
| 2 | Stack aktual | ✔ | 02 §1–3 |
| 3 | Entry point aplikasi | ✔ | `src/app/layout.tsx`, `page.tsx`, `dashboard/layout.tsx` (01, 03) |
| 4 | Cara routing bekerja | ✔ | 03 §2; 40 page + 22 layout |
| 5 | Frontend mengakses backend | ✔ | 03 §3 (fetch + `no-store`) |
| 6 | Business logic diorganisasikan | ✔ | 03 §4 (route→service→repository) |
| 7 | Database diakses | ✔ | 04, 09 (Drizzle/Mongo client) |
| 8 | Authentication | ✔ | 06 §1 |
| 9 | Authorization | ✔ | 06 §2–3 (3 lapis, 18 permission) |
| 10 | Menambah fitur baru | ✔ | AI guide §3–5; index "Aturan Arsitektur" |
| 11 | Menambah endpoint baru | **sebagian** | AI guide menyebut `_helpers.ts` tanpa isi → **GAP-18**, diperbaiki |
| 12 | Perubahan database | ✔ | 13 §3, AI guide §4 (migration baru, jangan edit lama) |
| 13 | Validasi form | ✔ | 10 §1, AI guide §4 |
| 14 | Menangani error | ✔ | 10 §2 (kelas domain + `mapDomainError`) |
| 15 | Testing | ✔ (jujur: tidak ada) | 11 |
| 16 | Modul saling bergantung | ✔ | 03 §6 + laporan ini §9 |
| 17 | File berdampak luas | ✔ | 10 §5, 14 §3 |
| 18 | Bagian belum selesai | ✔ | 07 §10, 23 |
| 19 | Risiko teknis terbesar | ✔ | executive §C, 10 §3 |
| 20 | Prioritas berikutnya | ✔ | executive §E, 14 §4 |

**Kesimpulan stress test:** 19/20 pertanyaan terjawab penuh; 1 sebagian (pola endpoint) dan sudah diperbaiki pada audit lanjutan.

## 11. Dokumen yang Diperbaiki

| Dokumen | Perubahan |
|---|---|
| `01_REPOSITORY_INVENTORY.md` | jumlah komponen dashboard 59; total komponen 68 |
| `03_SYSTEM_ARCHITECTURE.md` | Navbar = client; 19+1 layout; rincian 12 service; `_helpers.ts` |
| `04_DATABASE_SCHEMA.md` | catatan GAP-13 (tanpa UNIQUE domain program kerja) |
| `05_API_DOCUMENTATION.md` | 49 file / 83 method; guard `pic-options` dikoreksi |
| `06_AUTHENTICATION_AND_AUTHORIZATION.md` | jumlah layout guard; catatan otorisasi service-level; PIC suspended |
| `07_MODULE_AND_FEATURE_INVENTORY.md` | tautan footer placeholder; jumlah item |
| `10_SECURITY_AND_CODE_QUALITY.md` | F-16 footer, F-17 `apiAuthGuard`, F-18 PIC status |
| `11_TESTING_AND_QUALITY_REPORT.md` | build diberi label HISTORICAL |
| `12_GIT_AND_CHANGE_HISTORY.md` | working tree 5 file, 109/49, dokumen baru |
| `14_ARCHITECTURE_DECISIONS_AND_TECHNICAL_DEBT.md` | ADR-09 & debt layout 19+1; debt baru |
| `MASTER_PROJECT_INDEX.md` | tautan 23/24, angka fitur, completeness matrix |
| `AI_DEVELOPER_HANDOFF_GUIDE.md` | helper API, 83 method, 20 layout, tautan placeholder |
| `23-SECOND-PASS-GAP-REGISTER.md` | **baru** |
| `24-SECOND-PASS-AUDIT-REPORT.md` | **baru** (dokumen ini) |

## 12. Informasi yang Masih Belum Diketahui

- Kondisi nyata database produksi (drift, index, row count, data green building).
- Status deployment Vercel, domain, dan environment produksi.
- Kebijakan resmi "frozen" untuk MSL Engineering & Struktur Organisasi.
- URL resmi kanal sosial dan halaman legal footer.
- Apakah duplikasi nama Program Kerja diizinkan (GAP-13).
- Apakah filter status pada opsi PIC akan diubah (GAP-15).
- Nilai seluruh secret (tidak dibaca, sesuai aturan).
- Ukuran bundle produksi dan hasil Lighthouse.

## 13. Risiko yang Masih Memerlukan Investigasi

| Risiko | Mengapa belum selesai | Langkah |
|---|---|---|
| Drift migration produksi | tanpa koneksi DB | jalankan `drizzle-kit check`/bandingkan `information_schema` di environment aman |
| Feed Green Building kosong | data vs kode | inspeksi `publishStatus` di Mongo (bukan saat audit) |
| `link` CMS berbahaya | perbaikan belum diimplementasikan | validasi Zod + commit pekerjaan landing |
| PIC non-aktif | keputusan produk | filter status atau beri label |
| Tab baru `/login` belum diamati | batasan tooling browser | konfirmasi manual |

## 14. Perbandingan Sebelum vs Sesudah

| Aspek | Sebelum second pass | Sesudah |
|---|---|---|
| Akurasi angka struktural | 6 angka salah (layout, komponen, fitur, method, working tree, status build) | seluruh angka diverifikasi lewat perintah |
| Cakupan API | 49 route / 83 method (hanya file yang disebut) | 83 method eksplisit, guard per endpoint |
| Pola implementasi | route→service→repository | + peran `_helpers.ts` per domain |
| Otorisasi `pic-options` | dilabeli VIEW | MANAGE/EDIT di service, terdokumentasi |
| UI landing | hanya menyebut section | + tautan placeholder & email mismatch |
| Handoff AI | 157 baris, 1 gap | diperkuat; stress test 19/20 penuh |
| Gap tercatat | 15 item debt (F-01..F-15) | + 20 gap terstruktur (GAP-01..GAP-20) |
| Dokumen | 17 audit + 3 development | + 2 (23, 24) = 19 + 3 |

## 15. Kriteria Penerimaan

| Kriteria | Status |
|---|---|
| Seluruh dokumen utama diperiksa | ✔ 19 audit + 3 development + 2 root |
| Semua gap tercatat | ✔ 20 gap (23) |
| Temuan penting punya bukti | ✔ setiap gap memuat path + perintah/bukti |
| Informasi tak diketahui tetap ditandai | ✔ §12 |
| Ketidaksesuaian antar dokumen diperbaiki/dijelaskan | ✔ §4 + §11 |
| AI handoff diuji (20 pertanyaan) | ✔ §10 |
| Source code tidak berubah | ✔ `git diff --numstat` hanya Navbar 2+/0− (perubahan sebelumnya) |
| Konfigurasi/database tidak berubah | ✔ tidak ada perintah yang menyentuh keduanya |
| Tidak ada commit/perubahan Git | ✔ `git status` hanya working tree yang sudah ada |
