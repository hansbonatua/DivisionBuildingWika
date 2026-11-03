# 12 — GIT AND CHANGE HISTORY

## 1. Kondisi Git Aktual (VERIFIED)

| Item | Nilai |
|---|---|
| Branch | `main`, tracking `origin/main` |
| HEAD | `84e0a90e077d271fb6477eea14296c7eef3a5b04` |
| Remote (fetch/push) | `https://github.com/hansbonatua/DivisionBuildingWika.git` |
| Remote HEAD | `refs/heads/main` = `84e0a90` (via `git ls-remote`, read-only) |
| Commit total | 68 |
| Tag | tidak ada |
| Staged | tidak ada |
| Branch lain | tidak ada |
| `git fetch` | **tidak dijalankan** (remote dibaca dengan `ls-remote`) |

**Kesimpulan:** HEAD lokal **identik** dengan `main` di GitHub. Tidak ada commit lokal yang belum terkirim.

## 2. Working Tree

| Path | Tipe | Diff | Dampak |
|---|---|---|---|
| `src/components/landing/Clients.tsx` | M | 65+/6− | kartu klien bisa diklik; `toSafeHref` menolak `//`, backslash/whitespace pada path, non-http(s), `javascript:`/`data:`/`vbscript:` |
| `src/components/landing/Navbar.tsx` | M | **2+/0−** | CTA WIBEX Portal `target="_blank"` + `rel="noopener noreferrer"` (`LP-NAV-002`, uncommitted) |
| `src/components/landing/About.tsx` | M | ±75 | penyempurnaan tampilan |
| `src/components/landing/Footer.tsx` | M | ±6 | penyempurnaan tampilan |
| `src/components/landing/SocialMedia.tsx` | M | ±4 | penyempurnaan tampilan |
| `screenshots/` | ?? | 16 PNG | artefak QA |
| `BDWIKA_WIBEX_AUDIT_REPORT.md`, `BDWIKA_WIBEX_PROJECT_CONTEXT.md` | ?? | 2 file | dokumentasi audit (root) |
| `docs/audit/` | ?? | 19 file | dokumentasi audit (01–14, index, handoff, executive, 23, 24) |
| `docs/development/` | ?? | 3 file | master log, feature register, current state |

Total diff kode: **109 insertions / 49 deletions** pada **5** file landing (`About` 40+/35−, `Clients` 65+/6−, `Footer` 0+/6−, `Navbar` 2+/0−, `SocialMedia` 2+/2−). Tidak ada perubahan pada schema, konfigurasi, dependency, atau route.

Risiko: pekerjaan ini hanya ada di disk. `git checkout .`/`git reset --hard` akan menghapusnya. **Jangan** di-reset, stash, atau di-stage paksa oleh agent berikutnya.

## 3. Commit Historis yang Wajib Diverifikasi

### `3914244` — `refactor: remove alt text inputs from landing CMS` (2026-11-02)
- 16 file, **−105 / +0**.
- Menghapus input alt text dari `ClientForm` (−18), `CertificateForm` (−18), `HeroForm` (−16), `ProjectForm` (−16), `SocialPostForm` (−21), `About.tsx` (−1), serta halaman `add`/`edit`.
- **Ada di riwayat `main`** (ancestor HEAD). Status: VERIFIED.

### `84e0a90` — `feat: improve landing CMS and project details` (2026-11-02)
- 7 file, **+231 / −23**.
- Menambah `ProjectDetailModal.tsx` (175 baris), `Projects.tsx` +56, `portfolio-project.repository.ts` +1, `portfolio-project.types.ts` +4, `HeroForm.tsx` −16, dua halaman hero −1.
- HEAD sekaligus remote HEAD. Status: VERIFIED.

**Konsekuensi yang perlu dipahami:** setelah `3914244` + `84e0a90`, **tidak ada** input `imageAlt`/`description` di form CMS mana pun, tetapi skema API, dokumen Mongo, projection publik, dan landing masih memakai field tersebut dengan fallback (`title`/`projectName`). Ini temuan F-03, bukan bug fungsional.

## 4. Timeline (68 commit)

| Tanggal | Fase | Commit penting |
|---|---|---|
| 10-01 | Inisialisasi | `3d967bd`, `f9d2dee` (Create Next App) |
| 10-06 → 10-09 | Landing CMS awal (Mongo) | `ff09440` (progress 20%), `e930e97` merge, `8c9ee7f` green building+social, `3a4cd45` Our Project, `2c14a27` cleanup data demo, `7195d21`/`d54f757` fix social, `61f92b7` hapus aset |
| 10-09 → 10-12 | PostgreSQL + auth + user control | `f4e0d20` PG/Drizzle, `552a8e5`/`5ecfb1d` auth, `da53ad8` proteksi dashboard, `ab92b93`–`e2beb3e` CRUD user, `425db5e` profil nyata, `ba5a73c` proyek dari CMS |
| 10-13 → 10-16 | Role contract + Program Kerja | `5fa704f`, `016a79a`–`57186f3`, PDF `61551a6`/`588cf45`/`27cbcda`/`c763397` |
| 10-21 → 10-22 | Summary + Template & Form | `be382ad`–`ee7c1a2`, `28d581b`, `1bf749d` |
| 10-23 → 10-27 | Master Project, Engineering DB, RBAC, upload privat | `616b4e9`, `d7a04d8`, `0b146cb`, `67e9d32`, `b43c326` (hapus fallback karangan) |
| 10-28 → 10-29 | MSL + Struktur Organisasi | `0d580aa`, `32e7c15`–`287c733`, `f7c9cc5`, `36536c0` |
| 10-30 → 11-02 | Penyempurnaan landing | `ecd1ab1`, `6893e77`, `3914244`, `84e0a90` |

Kontributor: `Hans` 67 commit, `hansbonatua` 1 commit (initial).

## 5. Keputusan Arsitektur yang Terlihat dari Riwayat

| Commit | Keputusan | Bukti |
|---|---|---|
| `f4e0d20` | PostgreSQL dipilih untuk data enterprise, Mongo untuk CMS | dua client terpisah |
| `5fa704f` | Role dikonsentrasikan di satu modul (`lib/users/roles.ts`) | komentar "single source of truth" |
| `0b146cb` | RBAC global (bukan cek per route) | `lib/auth/permissions.ts` |
| `b43c326` | Menghapus konten landing karangan | landing empty-first |
| `502a333`/`67e9d32` | Blob publik untuk gambar, privat untuk dokumen | dua modul storage |
| `64158fb` | Hardening brute force | `login_attempts` + dummy hash |
| `3914244` | Alt text dihapus dari UI | form tanpa input alt |
| `84e0a90` | Detail proyek via modal, bukan halaman baru | `ProjectDetailModal.tsx` |

## 6. Perubahan yang Tidak Ada di Riwayat

- Tidak ada revert/force-push yang terlihat pada 68 commit.
- Tidak ada commit yang menghapus tabel (semua migration aditif).
- Tidak ada tag rilis.
- Tidak ada branch fitur tersisa; seluruh pekerjaan masuk langsung ke `main`.
