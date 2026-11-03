# FEATURE REGISTER — BDWIKA / WIBEX

Register fitur dan perubahan perilaku yang dikelola melalui alur audit → approval → implementasi.
Status memakai: `COMPLETE AND VERIFIED` · `IMPLEMENTED BUT NOT FULLY VERIFIED` · `PARTIALLY IMPLEMENTED` · `NOT STARTED` · `PLACEHOLDER` · `UNKNOWN`.

## 1. Ringkasan

| Feature ID | Nama | Area | Status | Commit |
|---|---|---|---|---|
| `LP-NAV-001` | Navbar landing: tautan section + SUSTAINABILITY (tab baru) | Landing | COMPLETE AND VERIFIED | `84e0a90` |
| `LP-NAV-002` | **WIBEX Portal membuka `/login` di tab baru** | Landing | **IMPLEMENTED BUT NOT FULLY VERIFIED** | belum di-commit |
| `LP-CLIENTS-001` | Kartu Our Client dapat diklik + sanitizer URL | Landing | IMPLEMENTED BUT NOT FULLY VERIFIED | belum di-commit (perubahan lama) |
| `LP-SOCIAL-001` | Media Sosial: tautan Instagram tab baru | Landing | COMPLETE AND VERIFIED | `84e0a90` |
| `CMS-HERO` | Hero CMS | CMS | COMPLETE AND VERIFIED | — |
| `CMS-PROJECT` | Our Project CMS + modal detail | CMS | COMPLETE AND VERIFIED | `84e0a90` |
| `CMS-GREEN` | Green Building CMS | CMS | IMPLEMENTED (data publik 0 item) | — |
| `CMS-SOCIAL` | Media Sosial CMS | CMS | COMPLETE AND VERIFIED | — |
| `CMS-CLIENT` | Our Client CMS | CMS | COMPLETE AND VERIFIED | — |
| `ENT-AUTH` | Login NIP + sesi + lockout | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-USER` | User control + RBAC | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-PROKER` | Program Kerja + summary + PDF | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-TEMPLATE` | Template & Form (dokumen privat) | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-MASTER` | Master Project | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-ENGDB` | Engineering Databases | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-MSL` | MSL Engineering (protected) | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-ORG` | Struktur Organisasi (protected) | Enterprise | COMPLETE AND VERIFIED | — |
| `ENT-SASAA` | Dashboard SASAA | Enterprise | NOT STARTED | — |

## 2. Detail `LP-NAV-002` — WIBEX Portal New Tab Behavior

**Latar belakang.** Tombol WIBEX Portal di navbar landing membuka `/login` di tab yang sama sehingga pengguna meninggalkan landing page. Tombol SUSTAINABILITY di komponen yang sama sudah membuka tab baru. Perilaku disamakan.

**File yang diubah.** `src/components/landing/Navbar.tsx` — satu elemen `<Link href="/login">` pada CTA kanan header (+2 baris).

**Perubahan.**
- `target="_blank"` → dokumen tujuan dibuka di tab baru.
- `rel="noopener noreferrer"` → menutup akses `window.opener` dan konsisten dengan tautan eksternal lain di komponen ini.

**Yang tidak berubah.** Komponen tetap Next.js `Link`; URL tetap `/login`; className, ukuran, warna, posisi, ikon, dan teks tidak berubah; tombol SUSTAINABILITY tidak disentuh; alur autentikasi, API, database, storage, dan konfigurasi tidak berubah.

**Alasan teknis.** `next/dist/client/app-dir/link.js` (baris 45–56) memperlakukan `target` selain `_self` sebagai navigasi browser, bukan `router.push`. Karena itu dua atribut cukup tanpa mengganti komponen atau menambah handler.

**Hasil verifikasi.**
- TypeScript `npx tsc --noEmit` → exit 0 (PASS).
- ESLint `npx eslint src/components/landing/Navbar.tsx` → exit 0 (PASS).
- `git diff --check` → exit 0 (PASS).
- Diff hanya menambah dua baris pada elemen Portal.
- Browser: klik Portal tidak menavigasi tab landing (tetap `/`); markup ter-render `target="_blank"` + `rel="noopener noreferrer"`; SUSTAINABILITY tetap sama; mobile 390×844 tidak berubah.
- Keterbatasan: tab baru tidak muncul pada daftar tab terkelola tooling, sehingga isi `/login` di tab baru belum diamati langsung.

**Status.** `IMPLEMENTED BUT NOT FULLY VERIFIED` — kode & tooling hijau, konfirmasi visual tab baru menunggu pemeriksaan manual.

**Commit.** Belum di-commit (instruksi task: no commit/push).
