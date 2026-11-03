# 27 — CHANGE IMPACT ANALYSIS

Analisis dampak untuk setiap backlog item pada `26-PRIORITIZED-DEVELOPMENT-BACKLOG.md`. **Perencanaan saja** — tidak ada perubahan yang dilakukan.

## 1. Peta Modul dan Tingkat Dampak

| Modul | File kunci | Item backlog yang menyentuh | Blast radius |
|---|---|---|---|
| Landing (komponen) | `components/landing/*` | RB-01, RB-02, RB-03, RB-06, RB-13 | **Tinggi** (halaman publik pertama) |
| CMS Clients | `lib/clients/*`, `api/clients/*` | RB-02, RB-13 | Sedang |
| CMS lain (Hero/Project/Green/Social) | `lib/{heroes,portfolio-projects,green-buildings,social-posts}/*` | RB-13 | Sedang |
| Auth & sesi | `lib/auth/*`, `api/auth/*` | RB-05, RB-07 | Sedang (semua user) |
| Users & PIC | `lib/users/*`, `*/repository.ts` opsi PIC | RB-08 | Sedang |
| Program Kerja | `lib/program-kerja/*`, `pg/schema.ts` | RB-11, RB-16 | **Tinggi** (data + laporan) |
| MSL (protected) | `lib/msl/*`, `components/dashboard/msl/*` | RB-16 (ditunda), RB-13 (tidak) | Tinggi bila disentuh |
| Struktur Organisasi (protected) | `lib/organization-structure/*` | tidak ada | Tinggi bila disentuh |
| Template & Form | `lib/template-form/*`, `lib/storage/*` | RB-08, RB-13 | Sedang |
| Master Project | `lib/master-project/*` | RB-08, RB-11 (tidak langsung) | Sedang |
| Engineering DB | `lib/engineering-database/*` | RB-08 | Sedang |
| Config & infra | `next.config.ts`, `.gitignore`, `package.json` | RB-04, RB-06, RB-10 | **Tinggi** (global) |
| Database | `schema.ts`, `drizzle/*` | RB-11, RB-14 | **Tinggi** (irreversible tanpa rollback) |

## 2. Analisis per Item

### RB-01 — Commit landing
- **File:** 5 komponen landing.
- **Modul terdampak:** landing saja.
- **Risiko regresi:** sangat rendah (tidak ada perubahan kode baru); risiko utama adalah commit mencampur topik.
- **Test sebelum:** `tsc`, ESLint file, `git diff --check`, inspeksi visual landing.
- **Test sesudah:** tidak ada (konten sama).
- **Rollback:** `git revert` per commit.

### RB-02 — Validasi `link`
- **File:** `lib/clients/client.schema.ts` (+ test), opsional `Clients.tsx` (tetap).
- **Modul terdampak:** CMS Clients, API `/api/clients*`, landing Our Clients.
- **Risiko regresi:** data lama dengan URL non-http bisa ditolak saat edit; klien internal yang mengirim URL relatif tanpa `/` bisa gagal.
- **Test sebelum:** inventaris nilai `link` existing (read-only) untuk memahami bentuk nyata.
- **Test sesudah:** matriks URL valid/invalid; API 400 untuk `javascript:`; landing tetap merender tautan sah; tombol/kartu tanpa link tetap non-interaktif.
- **Rollback:** revert file schema (data tidak berubah).

### RB-03 — Footer
- **File:** `Footer.tsx`.
- **Modul terdampak:** landing footer.
- **Risiko regresi:** perubahan markup dapat menggeser layout; `<Link>` → teks dapat mengubah warna/hover.
- **Test sebelum:** screenshot/inspection desktop + mobile.
- **Test sesudah:** tidak ada `href="#"`; email `mailto:` = teks; layout identik.
- **Rollback:** revert satu file.

### RB-04 — Env & README
- **File:** `.gitignore`, `.env.example`, `README.md`.
- **Modul terdampak:** seluruh onboarding; tidak ada runtime.
- **Risiko regresi:** `!.env.example` yang salah pola dapat membuat `.env.local` ikut ter-track — **risiko keamanan**; mitigasi: pola sempit + `git status` sebelum commit.
- **Test sebelum:** `git check-ignore -v .env.local .env.example`.
- **Test sesudah:** clone simulasi; `git ls-files | grep env` hanya `.env.example`.
- **Rollback:** revert commit (tanpa menyentuh file lokal).

### RB-05 — `apiAuthGuard`
- **File:** `lib/auth/current-user.ts`.
- **Risiko regresi:** build gagal bila masih diimpor (terdeteksi `tsc`).
- **Test sesudah:** `tsc`, ESLint, build.
- **Rollback:** revert.

### RB-06 — CSP
- **File:** `next.config.ts`.
- **Modul terdampak:** **seluruh permukaan** (header global): landing, login, dashboard, API (header tidak memengaruhi JSON), aset.
- **Risiko regresi:** gambar Blob diblokir; inline style Next diblokir; PDF/`window.open` tidak terdampak CSP header; `img-src` yang kurang luas mematikan seluruh gambar CMS.
- **Test sebelum:** inventaris sumber daya aktual (Blob host, font, inline style) dari halaman berjalan.
- **Test sesudah:** semua section landing, modal proyek, dashboard chart, login; console bebas error CSP; `curl -I` memverifikasi header.
- **Rollback:** hapus header CSP (satu baris) — instan.

### RB-07 — Same-origin
- **File:** helper baru + pemanggilan di 5 `_helpers.ts` + route CMS.
- **Modul terdampak:** semua mutasi.
- **Risiko regresi:** klien non-browser dengan `Origin` berbeda ditolak; integrasi eksternal (tidak ada yang diketahui) akan gagal.
- **Test sebelum:** pastikan tidak ada pemanggil lintas origin (tidak ditemukan).
- **Test sesudah:** same-origin 200; origin asing 403; tanpa Origin sesuai kebijakan.
- **Rollback:** hapus pemanggilan helper.

### RB-08 — Filter PIC
- **File:** 4 repository/opsi.
- **Modul terdampak:** Program Kerja, Template & Form, Master Project, Engineering DB (dropdown PIC), tidak memengaruhi data tersimpan.
- **Risiko regresi:** PIC existing non-aktif hilang dari dropdown edit → UI tampak kosong; RI untuk PIC itu tetap gagal (sudah begitu sebelumnya).
- **Test sebelum:** daftar PIC existing per modul (read-only).
- **Test sesudah:** opsi hanya aktif; record lama tetap menampilkan PIC tersimpan.
- **Rollback:** revert query.

### RB-09 — Error boundary
- **File:** `src/app/error.tsx`, `not-found.tsx`.
- **Risiko regresi:** `error.tsx` harus client component; menempatkan di root dapat menutupi error layout.
- **Test sesudah:** simulasi error (mis. Mongo tidak tersedia) dan 404.
- **Rollback:** hapus file.

### RB-10 — Test + CI
- **File:** `package.json`, `package-lock.json`, test baru, `.github/workflows/*`.
- **Risiko regresi:** penambahan devDependency mengubah lockfile; CI yang salah konfigurasi dapat memblokir PR.
- **Test sebelum:** tidak ada (baseline).
- **Test sesudah:** `npm test` lokal + CI hijau; `tsc` dan ESLint tetap.
- **Rollback:** hapus workflow + dependency.

### RB-11 — UNIQUE Program Kerja
- **File:** `schema.ts`, migration baru, service, API.
- **Modul terdampak:** Program Kerja + summary + PDF (bila duplikat selama ini dihitung).
- **Risiko regresi:** **migration gagal** bila data duplikat sudah ada → deploy tertahan; penolakan create yang sebelumnya diterima.
- **Test sebelum:** query read-only mencari duplikat potensial.
- **Test sesudah:** create duplikat → 409; create valid → 201; data lama tetap.
- **Rollback:** drop index (migration terpisah, tidak otomatis).

### RB-12 — Green Building data
- **File:** tidak ada (data) atau filter repository bila terbukti salah.
- **Risiko regresi:** rendah; bila mengubah filter, feed bisa menampilkan sertifikat yang belum layak.
- **Test sesudah:** jumlah item > 0 dan sesuai status.
- **Rollback:** kembalikan filter.

### RB-13 — Kontrak alt/description
- **File:** 5 schema CMS, 5 form/preview, 5 projection, 4 komponen landing.
- **Modul terdampak:** seluruh CMS + landing.
- **Risiko regresi:** **tinggi** — perubahan kontrak lintas 5 modul; alt hilang dapat menurunkan aksesibilitas; data lama bisa tak terpakai.
- **Test sebelum:** inventaris field terisi (read-only).
- **Test sesudah:** create/update; landing alt fallback; aksesibilitas (`alt` tidak kosong).
- **Rollback:** revert schema + projection (data tetap).

### RB-14 — Drift DB
- **File:** tidak ada.
- **Risiko:** nihil (read-only), kecuali perintah dijalankan di produksi — gunakan environment aman.
- **Test:** laporan perbedaan.

### RB-15 — Index Mongo
- **File:** `scripts/`, opsional repository.
- **Risiko regresi:** rendah; index baru dapat memperlambat write sedikit.
- **Test:** jalankan dua kali, cek `getIndexes`.

### RB-16 — Pecah komponen
- **File:** 4 komponen besar + 1 modul logika.
- **Risiko regresi:** **tinggi** (UI state, PDF layout, chart); wajib setelah RB-10 dan dengan perbandingan visual.
- **Test:** manual before/after per layar; unit test logika diekstrak.
- **Rollback:** revert per file.

### RB-17 — Rename `lib/demo`
- **File:** 4 file + 10 import.
- **Risiko:** build gagal bila import terlewat (`tsc` menangkap).
- **Rollback:** revert.

### RB-18 — Hapus SVG
- **File:** `public/*.svg`.
- **Risiko:** jika dipakai di tempat tak terduga → 404 aset; grep membuktikan tidak diimpor.
- **Rollback:** restore dari Git.

## 3. Matriks Regresi Lintas Modul

| Perubahan | Landing | CMS | Auth | Program Kerja | MSL | Template | Master Project | Eng DB | DB |
|---|---|---|---|---|---|---|---|---|---|
| RB-01 commit | — | — | — | — | — | — | — | — | — |
| RB-02 link | **ya** | ya | — | — | — | — | — | — | — |
| RB-03 footer | ya | — | — | — | — | — | — | — | — |
| RB-04 env | — | — | — | — | — | — | — | — | — |
| RB-06 CSP | **ya** | ya | ya | ya | ya | ya | ya | ya | — |
| RB-07 origin | ya | ya | ya | ya | ya | ya | ya | ya | — |
| RB-08 PIC | — | — | — | ya | — | ya | ya | ya | — |
| RB-11 unique | — | — | — | **ya** | — | — | — | — | **ya** |
| RB-13 alt | **ya** | **ya** | — | — | — | — | — | — | — |
| RB-16 refactor | — | — | — | ya | **ya** | ya | — | — | — |

## 4. File dengan Dampak Terluas (hati-hati)

| File | Alasan | Item |
|---|---|---|
| `next.config.ts` | header global semua route | RB-06 |
| `src/lib/auth/permissions.ts` | dipakai sidebar, 20 layout, route, service | tidak ada item (stabil) |
| `src/lib/users/roles.ts` | role dipakai di seluruh modul | tidak ada item |
| `src/lib/pg/schema.ts` | sumber semua tabel + constraint | RB-11 |
| `src/components/landing/Navbar.tsx` | header semua halaman publik | RB-01 (sudah berubah) |
| `src/lib/clients/client.schema.ts` | validasi + form + landing | RB-02 |
| `src/lib/cms/image-references.ts` | hapus objek lintas 6 modul | tidak ada item (jangan diubah tanpa registrasi) |

## 5. Strategi Rollback

| Item | Rollback | Reversibel? |
|---|---|---|
| RB-01 | `git revert` per commit | ya |
| RB-02 | revert file schema | ya (data tidak berubah) |
| RB-03 | revert file | ya |
| RB-04 | revert commit | ya (file lokal tetap) |
| RB-06 | hapus header CSP | ya, instan |
| RB-07 | hapus pemanggilan helper | ya |
| RB-08 | revert query | ya |
| RB-09 | hapus file boundary | ya |
| RB-10 | hapus workflow/dependency | ya |
| RB-11 | migration drop index | **tidak mudah** — butuh migration baru |
| RB-13 | revert schema | ya, tetapi data alt bisa hilang |
| RB-16 | revert per file | ya, tetapi berisiko konflik |

## 6. Urutan Aman (Ringkas)

```
RB-01 → RB-02 → RB-03 → RB-14 → RB-12
      → RB-09 → RB-05 → RB-07 → RB-06
      → RB-10 → RB-04 → RB-15
      → (keputusan) RB-11 / RB-13 / RB-20
      → (ditunda) RB-16 / RB-17 / RB-18
```

Alasan: commit dulu (RB-01), lalu perbaikan kecil berdampak publik (RB-02/03), verifikasi data (RB-14/12), lalu hardening yang menyentuh semua halaman (RB-06/07), lalu fondasi test (RB-10) sebelum perubahan struktural.

## 7. Dampak pada Modul Protected

| Modul | Item yang menyentuh | Status |
|---|---|---|
| MSL Engineering | RB-16 (pecah `MslEngineeringPage.tsx`, `mslExportPdf.ts`) | **DITUNDA** sampai D-04 disetujui |
| Struktur Organisasi | tidak ada | aman |

## 8. Dampak pada Dokumentasi

| Item | Dokumen yang wajib diperbarui setelah implementasi |
|---|---|
| RB-02 | 05 (kontrak validasi), 10 (F-02 ditutup), 14 |
| RB-03 | 07, 10 (F-16), AI guide |
| RB-04 | 02, 13, README |
| RB-06 | 02, 10 (F-01), 14 |
| RB-07 | 06, 10 (F-10) |
| RB-08 | 06, 10 (F-18) |
| RB-10 | 11, AI guide |
| RB-11 | 04, 14 (F-19) |
| RB-13 | 05, 07, 10 (F-03) |
| RB-16 | 10, 14 |

## 9. Kesimpulan Analisis

- **Blast radius tertinggi:** CSP (global header), perubahan kontrak alt (5 modul CMS + landing), dan UNIQUE Program Kerja (migration).
- **Perubahan paling aman:** RB-01, RB-03, RB-05, RB-09, RB-15, RB-18 (satu file/terisolasi, rollback mudah).
- **Wajib verifikasi sebelum menyentuh:** RB-11 (data duplikat), RB-12 (data Green Building), RB-14 (drift), RB-02 (bentuk URL existing).
- **Tidak boleh dimulai tanpa persetujuan:** RB-04 (kebijakan repo), RB-06 (kebijakan CSP), RB-08 (aturan PIC), RB-11, RB-13, RB-16, RB-20.
