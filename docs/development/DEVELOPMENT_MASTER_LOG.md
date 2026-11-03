# DEVELOPMENT MASTER LOG — BDWIKA / WIBEX

Catatan kronologis perubahan yang dikerjakan melalui sesi pengembangan terpandu (audit → approval → implementasi → verifikasi).
Dokumentasi audit repository ada di `docs/audit/`; dokumen ini mencatat **perubahan kode**, bukan hasil audit.

---

## DL-2026-11-03-01 — Landing Page: WIBEX Portal opens in a new tab

| Field | Nilai |
|---|---|
| Feature ID | `LP-NAV-002` |
| Tanggal | 3 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** (typecheck/lint/diff PASS; markup & tidak-adanya navigasi in-place terbukti; `/login` di tab baru belum diverifikasi visual) |
| Commit | **belum di-commit** (sesuai instruksi: no commit/push) |
| Branch | `main` (tracking `origin/main` @ `84e0a90`) |
| File diubah | `src/components/landing/Navbar.tsx` (1 file, +2 / −0) |

### Latar belakang
Tombol **WIBEX Portal** di navbar landing sebelumnya memakai Next.js `<Link href="/login">` tanpa `target`, sehingga klik menavigasi **di tab yang sama** dan pengguna meninggalkan landing page. Tombol **SUSTAINABILITY** di komponen yang sama sudah membuka tab baru (`target="_blank"` + `rel="noopener noreferrer"`). Pemilik produk meminta perilaku Portal disamakan: `/login` terbuka di tab baru, landing tetap terbuka di tab asal.

### Detail perubahan
```diff
           <Link
             href="/login"
+            target="_blank"
+            rel="noopener noreferrer"
             className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-secondary px-3 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary md:h-10 md:px-4 md:text-sm"
           >
             <span>WIBEX Portal</span>
```

Tidak berubah: komponen (`Link`), `href="/login"`, seluruh className, ukuran, warna, posisi, ikon gembok, teks "WIBEX Portal", tombol SUSTAINABILITY (desktop & mobile), alur login, konfigurasi, dependency.

### Alasan teknis
- Next.js App Router memperlakukan klik sebagai navigasi browser biasa bila `target` bukan `_self`: `node_modules/next/dist/client/app-dir/link.js` baris 45–56 (`isModifiedEvent` → `target && target !== '_self'`), sehingga handler klik `return` tanpa `router.push`. Jadi dua atribut cukup; tidak perlu mengganti ke `<a>`.
- `rel="noopener noreferrer"` mencegah tab baru mengakses `window.opener` (reverse tabnabbing) dan menyamakan kebijakan dengan tautan eksternal yang sudah ada. Untuk URL internal `/login` efek `noreferrer` nihil karena halaman tidak memakai Referer.
- Client component murni: tidak ada perubahan server, route, API, database, atau storage.

### Verifikasi
| Pemeriksaan | Perintah | Exit | Hasil |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | PASS (seluruh proyek) |
| ESLint | `npx eslint src/components/landing/Navbar.tsx` | 0 | PASS (0 error/warning) |
| Whitespace | `git diff --check` | 0 | PASS |
| Diff scope | `git diff src/components/landing/Navbar.tsx` | — | hanya +2 baris (`target`, `rel`) pada elemen Portal |

### Browser testing
Dev server `http://localhost:3000` merespons HTTP 200 (Next dev, hot reload).

| Uji | Hasil |
|---|---|
| Klik WIBEX Portal (desktop 1280×~800) | klik terkirim pada koordinat (1136, 32) |
| Tab landing setelah klik | **tetap** `http://localhost:3000/` — tidak ada navigasi in-place ✔ |
| Markup hasil render | `a[href="/login"]` dengan `target="_blank"`, `rel="noopener noreferrer"`, teks "WIBEX Portal" utuh ✔ |
| Tombol SUSTAINABILITY | tetap `target="_blank"` + `rel="noopener noreferrer"` ✔ |
| Tampilan mobile (390×844) | tautan "WIBEX Portal" tetap ada di header; tidak ada perubahan CSS sehingga tampilan tidak berubah ✔ |
| Isi tab baru (`/login`) | **tidak dapat diobservasi** oleh tooling browser sesi ini — daftar tab terkelola tidak menampilkan tab baru yang dibuka Chromium. Tidak diklaim PASS. |

Kesimpulan verifikasi: perubahan markup dan tidak-adanya navigasi in-place **terbukti**; pembukaan tab baru secara visual **belum terverifikasi langsung** dan perlu konfirmasi manual di browser pengguna.

### Catatan / risiko
- Cookie `wibex_session` bersifat per-origin, jadi login di tab baru juga berlaku di tab landing (perilaku normal, bukan regresi).
- Setelah login, `router.replace("/dashboard")` berjalan di tab baru; tab landing tetap pada posisinya — ini konsekuensi yang diinginkan.
- Jika kelak `/login` menambahkan parameter tujuan (`?next=`), perilaku tab baru harus diuji ulang.
- Working tree memiliki perubahan lain yang sudah ada sebelumnya (`About.tsx`, `Clients.tsx`, `Footer.tsx`, `SocialMedia.tsx`) — tidak disentuh pada pekerjaan ini.
