# FINAL EXECUTIVE REPORT — BDWIKA / WIBEX

Audit read-only, 3 November 2026 · HEAD `84e0a90` (= `origin/main`) · 68 commit · Node 24.18.0.

**Second pass (3 Nov 2026):** angka struktural diverifikasi ulang; koreksi tercatat di `24-SECOND-PASS-AUDIT-REPORT.md` dan gap di `23-SECOND-PASS-GAP-REGISTER.md` (20 gap, 0 CRITICAL).

## A. Kondisi Proyek Secara Keseluruhan

**Apa aplikasinya.** WIBEX adalah aplikasi web internal Building Division WIKA yang menggabungkan tiga produk dalam satu codebase Next.js 16:
1. **Landing page publik** — profil divisi, portofolio proyek (dengan modal detail), sertifikat green building, kurasi media sosial, dan logo klien.
2. **CMS landing** — lima editor (Hero, Our Project, Green Building, Media Sosial, Our Client) dengan upload gambar ke Blob publik, status publikasi, dan pengurutan.
3. **Modul enterprise** — User Control + RBAC, Program Kerja (RA/RI bulanan, PIC, catatan, bukti, summary + PDF), Template & Form (tautan atau dokumen privat), Master Project, Engineering Databases (6 kategori + ringkasan), MSL Engineering (penilaian bulanan + PDF), Struktur Organisasi, dan profil mandiri.

**Arsitekturnya.** App Router dengan pemisahan tegas `route handler → service → repository → database`. Dua database: MongoDB untuk konten CMS, PostgreSQL (13 tabel, 13 migration) untuk data enterprise. Autentikasi kustom (NIP + bcrypt, sesi opaque di DB, lockout 5/15 menit) dan RBAC terpusat dengan empat role.

**Yang bekerja dan terverifikasi.** 17 fitur berstatus COMPLETE: seluruh landing + CMS, upload/cleanup gambar, autentikasi, user control, profil, Program Kerja + summary + PDF, Template & Form, Master Project, Engineering DB, MSL, Struktur Organisasi. Lima feed publik merespons 200 (hero 10, klien 8, proyek 3, media sosial 6, green building **0**). `tsc`, ESLint (file berubah), `git diff --check`, dan `next build` semuanya exit 0 pada sesi ini.

**Yang belum pasti.** Isi dan drift database produksi, status deployment Vercel, kebijakan resmi "frozen" untuk MSL/Struktur Organisasi, penyebab feed green building kosong, serta seluruh nilai secret (tidak dibaca).

## B. Penilaian Arsitektur

| Aspek | Nilai | Dasar |
|---|---|---|
| Konsistensi arsitektur | **Kuat** | 49 file route (83 method handler) mengikuti pola yang sama; 12 service, repository tanpa aturan bisnis |
| Pemisahan tanggung jawab | **Kuat** | HTTP di route, aturan di service, query di repository, constraint di DB |
| Desain database | **Kuat** | CHECK/UNIQUE komposit/FK RESTRICT dipakai tepat; trigram untuk pencarian; skor MSL tidak diduplikasi |
| Desain API | **Baik** | amplop konsisten, status code tepat, error domain dipetakan |
| Otorisasi | **Kuat** | tiga lapis, permission terpusat, Admin tidak melewati integritas |
| Maintainability | **Sedang** | 5 file > 700 baris; duplikasi 5 modul CMS; guard tersebar di 19 layout modul (+1 shell) |
| Extensibilitas | **Baik** | menambah modul = permission + access + schema + repo + service + route + layout + sidebar (jalur jelas) |

## C. Risiko

| ID | Temuan | Klasifikasi | Alasan |
|---|---|---|---|
| F-01 | CSP tidak dipasang | **HIGH** | satu-satunya lapisan mitigasi XSS hilang pada aplikasi yang merender URL/gambar dari CMS |
| F-02 | `link` CMS tidak divalidasi di server | **HIGH** | data berbahaya (`javascript:`) bisa tersimpan permanen; pertahanan saat ini hanya di satu komponen yang belum di-commit |
| F-03 | `imageAlt`/`description` yatim | MEDIUM | aksesibilitas & kualitas data; bukan risiko keamanan |
| F-04 | `.env.example` ignored & tidak lengkap | MEDIUM | menghambat onboarding/handover, bukan produksi |
| F-05 | Tanpa test & CI | MEDIUM | risiko regresi pada logika kritikal (skor MSL, summary, permission) |
| F-11 | Feed green building kosong | MEDIUM | fitur tampak "tidak jadi" padahal modul selesai |
| F-12 | 4 file landing belum di-commit | MEDIUM | pekerjaan dapat hilang |
| F-06 | Komponen > 700 baris | LOW | biaya perubahan, bukan kegagalan |
| F-07 | Nama fallback fiktif | LOW | kosmetik/kepercayaan |
| F-08, F-09, F-10, F-14 | index lazy, permission mati, tanpa CSRF eksplisit, aset default | LOW/INFORMATIONAL | dampak terbatas |

**Tidak ada temuan CRITICAL** (tidak ada eksekusi kode arbitrer, kebocoran secret, bypass otorisasi, atau kehilangan data yang terbukti).

## D. Kesiapan Pengembangan

**Verdict: SIAP untuk melanjutkan pengembangan fitur**, dengan tiga syarat administratif sebelum menambah modul baru:

1. **Commit** pekerjaan landing yang sekarang hanya ada di working tree.
2. **Tutup F-02** (validasi `link`) karena itu perubahan kecil dengan dampak keamanan langsung.
3. **Lengkapi F-04/F-13** agar developer/AI berikutnya tidak menebak konfigurasi.

Tidak perlu perbaikan arsitektur besar: pola yang ada konsisten dan cukup untuk modul baru (contoh terdekat: Dashboard SASAA, yang permission-nya sudah tersedia).

Belum layak disebut "production-hardened" sampai F-01 (CSP) dan F-05 (test/CI) dikerjakan, dan sampai kondisi database produksi diverifikasi.

## E. Roadmap Rekomendasi (belum dikerjakan)

**1. Stabilisasi segera**
- Commit `Clients.tsx` (dan tiga file landing lain) sebagai commit terpisah.
- Verifikasi `publishStatus` sertifikat green building agar landing tidak kosong.
- Pastikan `.env.local` di setiap environment memuat `CMS_BLOB_READ_WRITE_TOKEN` dan `BLOB_READ_WRITE_TOKEN`.

**2. Keamanan & integritas data**
- `refine` pada `link` client (http(s) absolut atau path internal; tolak `//`, backslash, whitespace).
- Helper `assertSameOrigin` untuk semua mutasi.
- CSP Report-Only, lalu enforce setelah allowlist Blob terbukti lengkap.

**3. Testing & kualitas**
- Unit test murni: `msl/score.ts`, `program-kerja/summary.ts`, `auth/permissions.ts`, `toSafeHref`, allowlist MIME.
- CI: `tsc --noEmit` + `eslint` + unit test.

**4. Dokumentasi & DX**
- `.env.example` lengkap + `!.env.example` di `.gitignore`.
- README proyek nyata (menggantikan boilerplate).
- Skrip indeks Mongo idempoten.

**5. Penyelesaian fitur**
- Putuskan kontrak `imageAlt`/`description` (hapus dari API atau kembalikan input).
- Hapus/perbaiki fallback nama di `DashboardHeader`.

**6. Modul baru**
- Dashboard SASAA (permission sudah ada; belum ada route/UI/skema).

**7. Jangka panjang**
- Pecah komponen > 700 baris bila area tersebut akan diubah.
- Pertimbangkan helper guard layout bersama untuk mengurangi duplikasi 19 file layout modul (+1 shell).
- Rename `src/lib/demo/*` → `constants`/`types`.

## F. Ringkasan Angka

| Metrik | Nilai |
|---|---|
| Commit / kontributor | 68 / 2 identitas (`Hans`, `hansbonatua`) |
| File tracked | 373 (281 TS/TSX di `src`) |
| Baris `src` | ±38.855 |
| Route handler | 49 |
| Tabel PostgreSQL | 13 (13 migration, `pg_trgm`) |
| Koleksi MongoDB | 5 |
| Permission | 18 (17 dipakai, 1 dicadangkan) |
| Role | 4 |
| Fitur COMPLETE | 16 |
| Fitur NOT STARTED | 2 (Dashboard SASAA, test/CI) |
| Pemeriksaan hijau | `tsc`, `eslint` (file berubah), `git diff --check`, `next build` |
| Test otomatis | 0 |
