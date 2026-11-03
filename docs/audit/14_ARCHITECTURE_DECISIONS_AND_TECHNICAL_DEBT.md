# 14 — ARCHITECTURE DECISIONS AND TECHNICAL DEBT

## 1. Keputusan Arsitektur

Setiap entri hanya memuat alasan yang **terbukti** dari komentar kode, commit, atau schema. Alasan yang tidak terbukti ditandai.

### ADR-01 — Dua database: MongoDB untuk CMS, PostgreSQL untuk enterprise
- **Status:** documented (komentar kode + riwayat commit `f4e0d20`).
- **Konteks:** konten landing berbentuk dokumen bebas (field berbeda per modul), sedangkan data enterprise butuh relasi & constraint.
- **Keputusan:** Mongo untuk `heroes`, `portfolio_projects`, `green_building_certificates`, `social_posts`, `clients`; PostgreSQL untuk 13 tabel relasional.
- **Konsekuensi:** tidak ada JOIN lintas DB; konsistensi referensi gambar diselesaikan lewat registry `image-references.ts`; dua set kredensial dan dua model kegagalan.

### ADR-02 — Route Handler → Service → Repository
- **Status:** documented.
- **Konsekuensi:** aturan bisnis dapat diuji tanpa HTTP; route tipis; menambah endpoint baru butuh 3 file + skema.

### ADR-03 — RBAC terpusat dengan Admin sebagai super-application
- **Status:** documented (`permissions.ts`).
- **Keputusan:** Admin tidak didaftarkan di setiap daftar role; `hasPermission` mengembalikan `true` lebih dulu untuk Admin.
- **Konsekuensi:** tidak mungkin lupa memberi akses ke Admin; namun Admin tidak melewati integritas (admin terakhir, FK, field immutable).

### ADR-04 — Sesi opaque di database (bukan JWT)
- **Status:** documented.
- **Keputusan:** token acak di cookie, SHA-256 di `sessions`; logout/suspend langsung mencabut akses.
- **Konsekuensi:** setiap request melakukan satu query sesi; tidak ada revocation list yang perlu dikelola.

### ADR-05 — Lockout berbasis baris, tanpa flag
- **Status:** documented (`login-attempts.ts`).
- **Keputusan:** status terkunci diturunkan dari 5 kegagalan terakhir dalam 15 menit; tidak ada kolom `locked` maupun cron.
- **Konsekuensi:** tidak bisa drift; tabel tumbuh hanya selama percobaan aktif.

### ADR-06 — Alt text & description dihapus dari UI, dipertahankan di kontrak
- **Status:** documented (commit `3914244`, `84e0a90`).
- **Konsekuensi:** menimbulkan field "hantu" (F-03); perlu keputusan lanjutan pemilik produk.

### ADR-07 — Blob publik untuk gambar, privat untuk dokumen; token terpisah
- **Status:** documented (`public-image.ts`, `blob.ts`).
- **Keputusan:** `CMS_BLOB_READ_WRITE_TOKEN` **tidak** fallback ke `BLOB_READ_WRITE_TOKEN`.
- **Konsekuensi:** isolasi data benar; konfigurasi dua token wajib.

### ADR-08 — Cleanup objek setelah DB sukses, fail-closed
- **Status:** documented (`image-storage.ts`).
- **Konsekuensi:** kegagalan storage tidak menggagalkan penyimpanan; objek yatim mungkin tertinggal dan dibersihkan lewat route cleanup.

### ADR-09 — Guard halaman di layout, bukan middleware
- **Status:** documented (`next.config.ts` + 20 file layout: 1 shell + 19 modul).
- **Konsekuensi:** tidak ada request hop tambahan; guard harus diingat per modul.

### ADR-10 — Tanpa CSP (ditunda)
- **Status:** documented (komentar `next.config.ts`).
- **Konsekuensi:** risiko XSS tanpa lapisan kedua (F-01).

## 2. Inventaris Technical Debt

| ID | Kategori | Severity | Lokasi | Bukti | Dampak | Remediasi | Kompleksitas | Risiko regresi | Persetujuan owner |
|---|---|---|---|---|---|---|---|---|---|
| F-01 | Keamanan | HIGH | `next.config.ts` | komentar eksplisit | tanpa mitigasi XSS | CSP Report-Only → enforce | sedang | sedang | ya |
| F-02 | Keamanan/validasi | HIGH | `lib/clients/client.schema.ts` | `link` hanya `max(500)` | URL berbahaya tersimpan | `refine` http(s)/path internal | rendah | rendah | tidak |
| F-03 | Konsistensi kontrak | MEDIUM | form CMS + `lib/*/schema.ts` | input alt dihapus, API masih menerima | field tak bisa diperbaiki | putuskan hapus/kembalikan | sedang | sedang | ya |
| F-04 | DX | MEDIUM | `.gitignore`, `.env.example` | ignored + hanya 4 var | onboarding gagal | `!.env.example` + lengkapi | rendah | nihil | tidak |
| F-05 | Kualitas | MEDIUM | seluruh repo | 0 test, tanpa CI | regresi tak terdeteksi | unit + CI dasar | sedang | nihil | tidak |
| F-06 | Maintainability | MEDIUM | 5 file > 700 baris | `wc -l` | sulit diubah | pecah per tanggung jawab | tinggi | sedang | ya |
| F-07 | UI | LOW | `DashboardHeader.tsx` | fallback `"R. Triyanto S.T."` | nama fiktif tampil | fallback netral / prop wajib | rendah | nihil | tidak |
| F-08 | Performa | LOW | 5 repository Mongo | `indexesEnsured` | indeks dibuat saat request | skrip index idempoten | rendah | nihil | tidak |
| F-09 | Kebersihan | LOW | `lib/auth/permissions.ts` | `DASHBOARD_SASAA_VIEW` tak dipakai | permission mati | biarkan/hapus | rendah | nihil | tidak |
| F-10 | Keamanan | LOW | semua mutasi | tanpa cek Origin/CSRF | bergantung `sameSite` | helper `assertSameOrigin` | rendah | rendah | tidak |
| F-11 | Data | MEDIUM | feed green building | 0 item | section kosong | periksa `publishStatus` | rendah | nihil | ya (data) |
| F-12 | Proses | MEDIUM | working tree | 4 file M | pekerjaan bisa hilang | commit terpisah | rendah | nihil | ya |
| F-13 | Dokumentasi | MEDIUM | `README.md` | boilerplate | tidak ada onboarding | tulis README nyata | rendah | nihil | tidak |
| F-14 | Kebersihan | LOW | `public/*.svg` | tak diimpor | noise | hapus setelah konfirmasi | rendah | nihil | ya |
| F-15 | Penamaan | LOW | `src/lib/demo/*` | dipakai form nyata | menyesatkan | rename ke `constants`/`types` | sedang | sedang | ya |
| F-16 | Kualitas landing | MEDIUM | `landing/Footer.tsx` | 8 `href="#"` + email mismatch | tautan mati | isi URL nyata / non-interaktif | rendah | nihil | ya |
| F-17 | Dead code | LOW | `lib/auth/current-user.ts` | `apiAuthGuard` 0 call site | helper menyesatkan | hapus / tandai unused | rendah | nihil | tidak |
| F-18 | UX/data PIC | MEDIUM | `*/repository.ts` opsi PIC | status tidak difilter | PIC non-aktif dapat dipilih | filter `status='active'` | rendah | rendah | ya |
| F-19 | DB constraint | MEDIUM | `program_kerja` | tanpa UNIQUE domain | duplikasi program | konfirmasi niat + UNIQUE | rendah | sedang | ya |

## 3. Debt Struktural

| Aspek | Kondisi | Catatan |
|---|---|---|
| Duplikasi 5 modul CMS | pola table/form/preview diulang | sengaja demi isolasi modul; biaya perubahan lintas modul |
| Guard 19 layout modul (+1 shell) | pola mirip, manual | kandidat helper bersama |
| Komponen klien besar | 4 file > 700 baris | sebagian karena PDF/chart |
| Tidak ada abstraction untuk fetch | setiap komponen menulis `fetch` + state | konsisten tetapi repetitif |

## 4. Prioritas Remediasi (belum dikerjakan)

1. Commit pekerjaan landing (F-12).
2. Validasi `link` server-side (F-02).
3. `.env.example` + README (F-04, F-13).
4. Unit test + CI (F-05).
5. Kontrak alt/description (F-03).
6. CSP (F-01).
7. Origin check (F-10).
8. Pecah komponen besar (F-06) — hanya bila area itu akan diubah.

## 5. Larangan

Jangan mengubah MSL Engineering dan Struktur Organisasi tanpa persetujuan eksplisit, meskipun ada peluang perbaikan (F-06 menyentuh `MslEngineeringPage.tsx`). Dokumentasikan sebagai usulan.
