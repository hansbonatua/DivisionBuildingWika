# 26 — PRIORITIZED DEVELOPMENT BACKLOG

Backlog terprioritas untuk BDWIKA / WIBEX. Setiap item berasal dari gap yang punya bukti di repository. **Perencanaan saja — belum ada implementasi.**

Legenda: `NEEDS_BUSINESS_APPROVAL` = butuh keputusan pemilik · `NEEDS_PROD_ACCESS` = butuh akses/verifikasi environment · `DONE` = sudah selesai pada audit lanjutan.

## 1. Ringkasan Backlog

| ID | Judul | Prioritas | Severity | Kompleksitas | Status verifikasi | Approval |
|---|---|---|---|---|---|---|
| RB-01 | Commit pekerjaan landing yang belum tersimpan | P0 | MEDIUM | LOW | VERIFIED | tidak |
| RB-02 | Validasi URL `link` klien di server | P0 | HIGH | LOW | VERIFIED | tidak |
| RB-03 | Integritas tautan footer + `mailto:` | P1 | MEDIUM | LOW | VERIFIED (kondisi) | sebagian (URL) |
| RB-04 | Bootstrap developer: `.env.example` + README | P3 | MEDIUM | LOW | VERIFIED | ya (D-07) |
| RB-05 | Hapus/tandai `apiAuthGuard` yang tidak dipakai | P2 | LOW | LOW | VERIFIED | tidak |
| RB-06 | CSP Report-Only → enforce | P1 | HIGH | MEDIUM | VERIFIED | ya (D-06) |
| RB-07 | Cek same-origin untuk mutasi | P2 | LOW | LOW | VERIFIED | tidak |
| RB-08 | Filter status akun pada opsi PIC | P2 | MEDIUM | LOW–MEDIUM | PARTIALLY VERIFIED | ya (D-03) |
| RB-09 | Error/loading/not-found boundary | P2 | LOW | LOW | VERIFIED | tidak |
| RB-10 | Unit test murni + CI dasar | P1 | MEDIUM | MEDIUM | VERIFIED (tidak ada test) | tidak |
| RB-11 | UNIQUE domain Program Kerja | P3 | MEDIUM | MEDIUM | PERLU VERIFIKASI | ya (D-01) |
| RB-12 | Data Green Building publik | P1 | MEDIUM | LOW | BELUM DIKETAHUI | ya (data) |
| RB-13 | Kontrak `imageAlt`/`description` | P3 | MEDIUM | MEDIUM | VERIFIED | ya (D-02) |
| RB-14 | Verifikasi drift schema vs DB | P0 | MEDIUM | LOW | BELUM DIKETAHUI | akses |
| RB-15 | Skrip index Mongo idempoten | P3 | LOW | LOW | VERIFIED | tidak |
| RB-16 | Pecah komponen > 700 baris | P4 | LOW | HIGH | VERIFIED (ukuran) | ya (D-04) |
| RB-17 | Rename `src/lib/demo/*` | P4 | LOW | MEDIUM | VERIFIED | tidak |
| RB-18 | Hapus SVG default yang tak dipakai | P4 | INFO | LOW | VERIFIED | ya (aset) |
| RB-19 | Dokumentasi audit: koreksi angka & gap | DONE | — | — | VERIFIED | tidak |
| RB-20 | Dashboard SASAA | P3 | — | HIGH | NOT STARTED | ya (spesifikasi) |

## 2. Detail Backlog

### RB-01 — Commit pekerjaan landing yang belum tersimpan
- **Deskripsi masalah:** 5 file landing berubah di working tree tanpa commit (`About` 40+/35−, `Clients` 65+/6−, `Footer` 0+/6−, `Navbar` 2+/0−, `SocialMedia` 2+/2−) total 109+/49−.
- **Evidence:** `git status -sb`; `git diff --numstat -- src/`.
- **Root cause:** pekerjaan diselesaikan tanpa commit; belum ada review/PR.
- **Severity:** MEDIUM (risiko kehilangan pekerjaan).
- **Business impact:** perubahan tampilan/CTA bisa hilang oleh operasi Git berikutnya.
- **Technical impact:** semua perubahan kode lain berisiko konflik.
- **File/modul terdampak:** 5 file `src/components/landing/*`.
- **Dependency:** tidak ada; **prasyarat untuk semua item lain**.
- **Proposed solution:** commit terpisah: (a) `Navbar` CTA Portal, (b) `Clients` sanitizer + anchor, (c) `About`/`Footer`/`SocialMedia` penyempurnaan tampilan. Tanpa `git add .`.
- **Testing requirements:** sebelum commit: `tsc`, ESLint file berubah, `git diff --check`, cek manual landing.
- **Regression risks:** pesan commit mencampur topik → sulit revert. Mitigasi: satu commit per topik.
- **Acceptance criteria:** `git status` bersih untuk 5 file tersebut; setiap commit dapat di-revert sendiri.
- **Complexity:** LOW. **Verification:** VERIFIED.

### RB-02 — Validasi URL `link` klien di server
- **Deskripsi:** `createClientSchema`/`updateClientSchema` hanya `z.string().trim().max(500)`; `javascript:`, `data:`, `//evil`, backslash diterima dan tersimpan.
- **Evidence:** `src/lib/clients/client.schema.ts`; sanitasi saat ini hanya `toSafeHref` di `Clients.tsx` (uncommitted).
- **Root cause:** validasi tipe string tanpa pembatasan skema URL.
- **Severity:** HIGH.
- **Business impact:** tautan berbahaya pada halaman publik (reputasi, keamanan pengunjung).
- **Technical impact:** data lama mungkin sudah mengandung nilai tidak valid → perlu keputusan migrasi/penolakan saat baca.
- **File/modul terdampak:** `lib/clients/client.schema.ts`; `components/landing/Clients.tsx` (tetap pertahankan sanitizer); `api/clients/*`.
- **Dependency:** RB-01 (agar perubahan tidak bercampur dengan working tree lama).
- **Proposed solution:** `refine` menerima `https?://` absolut atau path internal `/...`; tolak `//`, backslash, whitespace, skema lain; kosong/`null` tetap boleh. Pertahankan sanitizer render sebagai lapis kedua.
- **Testing requirements:** unit test matriks URL (valid/invalid ±20 kasus); uji API create/update menolak `javascript:` dengan 400; uji data lama tetap tampil.
- **Regression risks:** klien dengan URL eksisting non-http (mis. `www.` tanpa skema) bisa ditolak. Mitigasi: tentukan apakah `www.` dinormalisasi atau ditolak; uji dengan data nyata (read-only).
- **Acceptance criteria:** API menolak skema non-http(s) dan `//`; landing tidak pernah merender `href` berbahaya; test lulus.
- **Complexity:** LOW. **Verification:** VERIFIED.

### RB-03 — Integritas tautan footer + `mailto:`
- **Deskripsi:** 3 ikon sosial dan 5 tautan legal memakai `href="#"`; `mailto:corporate@wibex.co.id` menampilkan teks `wibexwika@gmail.com`.
- **Evidence:** `Footer.tsx` baris 4–10, 148–206.
- **Root cause:** placeholder sejak awal; belum ada URL resmi.
- **Severity:** MEDIUM.
- **Business impact:** tautan mati pada halaman publik; email salah tujuan.
- **Technical impact:** minimal (satu komponen server).
- **File/modul terdampak:** `src/components/landing/Footer.tsx`.
- **Dependency:** keputusan D-05 untuk URL; perbaikan `mailto:` bisa langsung tanpa approval.
- **Proposed solution:** samakan `mailto:` dengan teks; sampai URL tersedia, render label sebagai teks non-interaktif (bukan `<Link href="#">`).
- **Testing requirements:** cek visual desktop/mobile; pastikan tidak ada `<a href="#">` tersisa; uji klik email membuka klien mail.
- **Regression risks:** menghapus `<Link>` dapat mengubah gaya; pertahankan className.
- **Acceptance criteria:** tidak ada `href="#"` di footer; email yang diklik = email yang tampil.
- **Complexity:** LOW. **Verification:** VERIFIED (kondisi); URL final **NEEDS_BUSINESS_APPROVAL**.

### RB-04 — Bootstrap developer: `.env.example` + README
- **Deskripsi:** `.env.example` ada di disk tetapi ter-ignore `.env*` dan hanya memuat 4 dari ±13 variabel; README masih boilerplate.
- **Evidence:** `.gitignore` baris 44; isi `.env.example` (nama saja); `README.md`.
- **Root cause:** tidak ada pengecualian `!.env.example`; README tidak pernah ditulis.
- **Severity:** MEDIUM.
- **Business impact:** onboarding developer/AI baru gagal di langkah pertama.
- **Technical impact:** clone bersih tidak bisa boot tanpa menebak variabel Blob/admin.
- **File/modul terdampak:** `.gitignore` (konfigurasi → butuh approval), `.env.example`, `README.md`.
- **Dependency:** D-07.
- **Proposed solution:** tambah `!.env.example`; lengkapi 13 nama variabel **tanpa nilai**; README: stack, cara jalan, struktur, perintah verifikasi, tautan `docs/`.
- **Testing requirements:** clone bersih simulasi (tanpa `.env.local`) mengikuti README; tidak ada nilai secret di file.
- **Regression risks:** kebijakan repo berubah (file env kini ter-track) — pastikan hanya template.
- **Acceptance criteria:** `.env.example` ter-track dan lengkap; README menjelaskan cara menjalankan + verifikasi.
- **Complexity:** LOW. **Verification:** VERIFIED. **NEEDS_BUSINESS_APPROVAL (D-07).**

### RB-05 — Hapus/tandai `apiAuthGuard`
- **Deskripsi:** helper diekspor tetapi tidak dipakai route mana pun.
- **Evidence:** `lib/auth/current-user.ts` 47–60; 0 call site.
- **Root cause:** helper dibuat untuk pola yang kemudian tidak dipakai (setiap domain memakai `getActor` di `_helpers.ts`).
- **Severity:** LOW.
- **File/modul terdampak:** `lib/auth/current-user.ts`; dokumen 03/06.
- **Dependency:** tidak ada.
- **Proposed solution:** hapus, atau beri komentar `@deprecated` + alasan. Pilihan aman: tandai unused tanpa menghapus API publik.
- **Testing requirements:** `tsc` + ESLint setelah perubahan.
- **Regression risks:** jika ada import tak terdeteksi (dynamic) → build gagal; dicegah `tsc`.
- **Acceptance criteria:** tidak ada helper menganggur yang membingungkan; build tetap hijau.
- **Complexity:** LOW. **Verification:** VERIFIED.

### RB-06 — CSP Report-Only → enforce
- **Deskripsi:** `next.config.ts` tidak memasang CSP (keputusan sadar).
- **Evidence:** komentar eksplisit di `next.config.ts`.
- **Root cause:** landing memuat gambar Blob remote + bentuk inline style/script yang belum diinventarisasi.
- **Severity:** HIGH.
- **Business impact:** tidak ada lapisan mitigasi XSS meski konten berasal dari CMS.
- **Technical impact:** perlu allowlist `img-src` Blob, `style-src` inline, `script-src` Next.
- **File/modul terdampak:** `next.config.ts`; landing (gambar), dashboard (chart/PDF tidak terdampak CSP server header).
- **Dependency:** RB-02 (URL tervalidasi mengurangi permukaan), D-06.
- **Proposed solution:** tahap 1 `Content-Security-Policy-Report-Only` + kumpulkan laporan; tahap 2 enforce dengan `default-src 'self'`, `img-src 'self' https://*.public.blob.vercel-storage.com data:`, `style-src 'self' 'unsafe-inline'`, `font-src 'self'`.
- **Testing requirements:** uji landing (hero/project/green/social/clients), dashboard (chart + PDF), login; pastikan tidak ada blokir di console; uji header via `curl -I`.
- **Regression risks:** gambar CMS gagal tampil; Next inline script diblokir; PDF/download tidak terpengaruh.
- **Acceptance criteria:** Report-Only tanpa pelanggaran yang tidak dijelaskan; setelah enforce, seluruh halaman utama bebas error CSP.
- **Complexity:** MEDIUM. **Verification:** VERIFIED (absen). **NEEDS_BUSINESS_APPROVAL (D-06).**

### RB-07 — Cek same-origin untuk mutasi
- **Deskripsi:** tidak ada validasi `Origin`/`Sec-Fetch-Site`/token CSRF; mitigasi hanya `sameSite=lax`.
- **Evidence:** seluruh route `POST/PATCH/PUT/DELETE`; tidak ada helper origin.
- **Severity:** LOW.
- **File/modul terdampak:** helper baru di `lib/auth` + 5 `_helpers.ts` + route CMS.
- **Dependency:** RB-02 (urutan keamanan), bukan prasyarat teknis.
- **Proposed solution:** `assertSameOrigin(request)` dipanggil pada mutasi; tolak 403 bila `Origin` ada dan tidak cocok; biarkan request tanpa `Origin` (same-origin form) sesuai kebijakan.
- **Testing requirements:** uji fetch same-origin (200), Origin asing (403), tanpa Origin (200 sesuai kebijakan).
- **Regression risks:** klien non-browser (curl/Postman) dengan Origin salah akan ditolak — terdokumentasi.
- **Acceptance criteria:** mutasi lintas origin ditolak; alur dashboard normal tidak berubah.
- **Complexity:** LOW. **Verification:** VERIFIED.

### RB-08 — Filter status akun pada opsi PIC
- **Deskripsi:** opsi PIC tidak memfilter `status='active'`; komentar menyatakan sengaja di V1 (Engineering DB). Pola serupa pada Program Kerja/Template & Form; Master Project memakai query terpisah.
- **Evidence:** `engineering-database/repository.ts:158–168`; `listHeadOfficePicOptions`.
- **Severity:** MEDIUM.
- **Business impact:** PIC non-aktif bisa dipilih, lalu RI tidak dapat diisi (tidak bisa login).
- **Technical impact:** perubahan query pada 4 repository/opsi.
- **File/modul terdampak:** `lib/{engineering-database,program-kerja,template-form,master-project}/repository.ts`.
- **Dependency:** D-03.
- **Proposed solution:** tambahkan `eq(users.status, "active")`, atau tampilkan label "(non-aktif)" bila tetap ingin mempertahankan riwayat.
- **Testing requirements:** uji daftar opsi dengan user suspended; pastikan PIC existing tetap tampil pada record lama (bila label dipilih).
- **Regression risks:** PIC existing yang suspended hilang dari dropdown edit → data lama bisa terlihat "kosong"; mitigasi: tampilkan nilai tersimpan meski tidak ada di opsi.
- **Acceptance criteria:** opsi hanya berisi akun aktif (atau berlabel); edit record lama tidak kehilangan PIC.
- **Complexity:** LOW–MEDIUM. **Verification:** PARTIALLY VERIFIED. **NEEDS_BUSINESS_APPROVAL (D-03).**

### RB-09 — Error/loading/not-found boundary
- **Deskripsi:** tidak ada `error.tsx`, `loading.tsx`, `not-found.tsx`, `global-error.tsx`.
- **Evidence:** `find src/app` → kosong.
- **Severity:** LOW.
- **File/modul terdampak:** `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/dashboard/error.tsx` (opsional).
- **Proposed solution:** halaman error netral Bahasa Indonesia tanpa stack; tombol "Coba lagi"/"Kembali ke Beranda".
- **Testing requirements:** simulasi error (mis. Mongo mati) → tampil halaman error; 404 route acak.
- **Regression risks:** `error.tsx` wajib client component; jangan menangkap error di root layout.
- **Acceptance criteria:** error runtime menampilkan pesan terkontrol; tidak ada stack di produksi.
- **Complexity:** LOW. **Verification:** VERIFIED.

### RB-10 — Unit test murni + CI dasar
- **Deskripsi:** 0 file test, tanpa `.github/workflows`, tanpa script `test`.
- **Evidence:** `find` test = 0; `package.json` tanpa `test`.
- **Severity:** MEDIUM (jangka panjang HIGH).
- **Business impact:** regresi pada logika kritikal (skor MSL, summary, permission) tidak terdeteksi.
- **File/modul terdampak:** `package.json` (script + devDependency), test baru, CI workflow.
- **Dependency:** RB-01, RB-04 (konvensi), tidak butuh DB.
- **Proposed solution:** vitest/node:test untuk modul murni: `lib/msl/score.ts`, `lib/program-kerja/summary.ts`, `lib/auth/permissions.ts`, `toSafeHref`, allowlist MIME; CI: `tsc --noEmit` + `eslint` + test.
- **Testing requirements:** (meta) test harus lulus lokal dan CI; tanpa network/DB.
- **Regression risks:** menambah devDependency mengubah lockfile → butuh persetujuan dependency.
- **Acceptance criteria:** `npm test` berjalan; CI hijau pada PR; cakupan area kritikal minimal tercakup.
- **Complexity:** MEDIUM. **Verification:** VERIFIED.

### RB-11 — UNIQUE domain Program Kerja
- **Deskripsi:** tidak ada UNIQUE pada identitas bisnis (mis. group+year+name); duplikasi tidak dicegah DB/service.
- **Evidence:** `schema.ts` tabel `program_kerja`; tidak ada constraint terkait.
- **Severity:** MEDIUM.
- **Business impact:** laporan bisa menghitung program ganda.
- **Technical impact:** perlu migration + penanganan 409 + kemungkinan pembersihan data duplikat.
- **File/modul terdampak:** `lib/pg/schema.ts`, `drizzle/` (migration baru), `lib/program-kerja/service.ts`, `api/program-kerja`.
- **Dependency:** RB-14 (pastikan data existing), D-01.
- **Proposed solution:** tentukan kunci unik; cek duplikat existing (read-only) sebelum migration; tangani `23505` → 409.
- **Testing requirements:** unit test service; uji API create duplikat → 409; uji data lama.
- **Regression risks:** migration gagal bila data duplikat sudah ada; rollback butuh drop index.
- **Acceptance criteria:** duplikasi ditolak konsisten; data lama valid.
- **Complexity:** MEDIUM. **Verification:** PERLU VERIFIKASI. **NEEDS_BUSINESS_APPROVAL (D-01).**

### RB-12 — Data Green Building publik
- **Deskripsi:** feed publik mengembalikan 0 item; penyebab belum dipastikan (kemungkinan `publishStatus`/`status`).
- **Evidence:** `GET /api/green-buildings/public` → 200, 0 item; landing menampilkan empty state.
- **Severity:** MEDIUM (fitur tampak belum jadi).
- **File/modul terdampak:** data Mongo `green_building_certificates`; kode hanya bila filter salah.
- **Dependency:** akses production/DB.
- **Proposed solution:** inspeksi read-only `publishStatus`/`status`/`sortOrder`; bila data ada tetapi terfilter, dokumentasikan aturan; bila kosong, input via CMS (bukan audit).
- **Testing requirements:** setelah data benar, cek `/api/green-buildings/public` > 0 dan section landing terisi.
- **Regression risks:** rendah — tidak mengubah kode pada tahap verifikasi.
- **Acceptance criteria:** penyebab terdokumentasi; section menampilkan sertifikat atau dinyatakan memang belum ada data.
- **Complexity:** LOW. **Verification:** BELUM DIKETAHUI. **NEEDS_PROD_ACCESS.**

### RB-13 — Kontrak `imageAlt`/`description`
- **Deskripsi:** input alt/description dihapus dari form (`3914244`), tetapi API/skema/projection/landing masih memakai field tersebut.
- **Evidence:** commit `3914244`; `lib/*/schema.ts`; `Hero.tsx` fallback alt.
- **Severity:** MEDIUM.
- **File/modul terdampak:** 5 modul CMS (schema, form, preview, landing), dokumentasi 07/10.
- **Dependency:** D-02.
- **Proposed solution:** pilih (a) kembalikan input alt (aksesibilitas) atau (b) hapus field dari API + projection + landing fallback, dengan migration data Mongo bila perlu.
- **Testing requirements:** uji create/update tanpa alt; uji landing alt fallback; regresi kontrak API.
- **Regression risks:** perubahan kontrak memutus klien lain (tidak ada konsumen eksternal yang diketahui) dan menghilangkan alt yang sudah ada.
- **Acceptance criteria:** satu keputusan terdokumentasi; API dan UI konsisten; landing tetap punya alt bermakna.
- **Complexity:** MEDIUM. **Verification:** VERIFIED. **NEEDS_BUSINESS_APPROVAL (D-02).**

### RB-14 — Verifikasi drift schema vs database
- **Deskripsi:** seluruh skema diverifikasi dari kode/migration; tidak ada pemeriksaan ke database nyata.
- **Evidence:** 13 tabel + 13 migration; tidak ada query DB dijalankan.
- **Severity:** MEDIUM (risiko operasional).
- **File/modul terdampak:** tidak ada file; proses verifikasi.
- **Dependency:** akses environment.
- **Proposed solution:** jalankan `drizzle-kit check` (offline) lalu bandingkan `information_schema.columns/constraints/indexes` di environment non-produksi terlebih dahulu.
- **Testing requirements:** laporan perbedaan per tabel; tanpa menulis data.
- **Regression risks:** tidak ada bila read-only.
- **Acceptance criteria:** daftar drift (atau "tidak ada drift") terdokumentasi.
- **Complexity:** LOW. **Verification:** BELUM DIKETAHUI. **NEEDS_PROD_ACCESS.**

### RB-15 — Skrip index Mongo idempoten
- **Deskripsi:** index dibuat lazy pada request pertama; tidak ada bootstrap eksplisit.
- **Evidence:** `indexesEnsured` pada 5 repository.
- **Severity:** LOW.
- **File/modul terdampak:** `scripts/` (baru), 5 repository (opsional).
- **Proposed solution:** skrip `ensure-indexes` idempoten; jalankan manual saat deploy.
- **Testing requirements:** jalankan dua kali; tidak ada error; index terdaftar.
- **Regression risks:** menambah koneksi Mongo saat deploy; aman.
- **Acceptance criteria:** index konsisten tanpa menunggu request pertama.
- **Complexity:** LOW. **Verification:** VERIFIED.

### RB-16 — Pecah komponen > 700 baris
- **Deskripsi:** `TemplateFormEditor` 1.019, `mslExportPdf` 764, `MslEngineeringPage` 730, `ProgramKerjaSummaryDashboard` 719, `lib/program-kerja/summary.ts` 701.
- **Severity:** LOW (maintainability).
- **Dependency:** RB-10 (test dulu), D-04 untuk MSL.
- **Proposed solution:** ekstrak subkomponen/logika murni per tanggung jawab; jangan ubah perilaku.
- **Testing requirements:** snapshot/manual sebelum-sesudah; unit test logika yang diekstrak.
- **Regression risks:** tinggi (UI kompleks, PDF layout). Karena itu ditunda.
- **Acceptance criteria:** file < 500 baris, perilaku identik.
- **Complexity:** HIGH. **Verification:** VERIFIED (ukuran). **NEEDS_BUSINESS_APPROVAL (D-04).**

### RB-17 — Rename `src/lib/demo/*`
- **Deskripsi:** folder bernama `demo` tetapi dipakai form nyata (konstanta/tipe).
- **Severity:** LOW.
- **Proposed solution:** rename ke `constants`/`types` + update 10 import.
- **Testing requirements:** `tsc` + build.
- **Regression risks:** import terlewat → build gagal (terdeteksi `tsc`).
- **Complexity:** MEDIUM. **Verification:** VERIFIED.

### RB-18 — Hapus SVG default
- **Deskripsi:** 5 SVG Next.js tidak diimpor.
- **Severity:** INFO.
- **Proposed solution:** hapus setelah konfirmasi tidak dipakai di `public/` lain.
- **Complexity:** LOW. **Verification:** VERIFIED. **Approval:** ya (aset).

### RB-19 — Dokumentasi audit (DONE)
- **Deskripsi:** 12 dokumen dikoreksi + 2 dokumen baru pada second pass.
- **Severity:** —.
- **Acceptance criteria:** angka konsisten, tidak ada tautan rusak, klaim punya bukti.
- **Status:** **DONE** (3 Nov 2026). Tidak ada pekerjaan kode.

### RB-20 — Dashboard SASAA
- **Deskripsi:** permission `DASHBOARD_SASAA_VIEW` ada, modul belum ada.
- **Severity:** —.
- **Proposed solution:** menunggu spesifikasi produk; permission jangan dihapus sebelum keputusan.
- **Complexity:** HIGH. **Verification:** NOT STARTED. **NEEDS_BUSINESS_APPROVAL.**

## 3. Verification Tasks (bukan backlog kode)

| ID | Verifikasi | Metode | Butuh |
|---|---|---|---|
| VER-01 | Tab baru `/login` | klik manual di browser | tidak |
| VER-02 | Feed Green Building | inspeksi Mongo read-only | akses data |
| VER-03 | Drift schema DB | `drizzle-kit check` + `information_schema` | akses DB |
| VER-04 | Status deployment & domain | konfirmasi pemilik / dashboard Vercel | akses |
| VER-05 | Data klien dengan URL non-http | query read-only sebelum RB-02 | akses data |

## 4. Matriks Prioritas Ringkas

| Wave | Item | Alasan urutan |
|---|---|---|
| 1 | RB-01, RB-02, RB-03, RB-14, RB-12 | kehilangan pekerjaan & celah HIGH lebih dulu |
| 2 | RB-06, RB-07, RB-09, RB-05, RB-08 | hardening setelah celah langsung |
| 3 | RB-10, RB-04, RB-15 | fondasi kualitas sebelum perubahan besar |
| 4 | RB-11, RB-13, RB-20 | butuh keputusan bisnis |
| 5 | RB-16, RB-17, RB-18 | struktural/kosmetik, ditunda |

## 5. Definition of Ready & Done per Item

**Ready:** bukti ada, file terdampak teridentifikasi, keputusan (bila perlu) tercatat, tidak ada perubahan lain yang bertabrakan.
**Done:** acceptance criteria terpenuhi, `tsc` + ESLint + test relevan hijau, diff terbatas pada file yang direncanakan, dokumentasi diperbarui bila kontrak berubah, status dilaporkan apa adanya.
