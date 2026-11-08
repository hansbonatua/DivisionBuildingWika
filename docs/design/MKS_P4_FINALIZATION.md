# P4 — Finalisasi Metode Kerja Standar (Sub-Fase E: Regression & Documentation)

| Field | Nilai |
|---|---|
| Tanggal | 8 November 2026 |
| Jenis | **REGRESSION + DOCUMENTATION** — dua perbaikan terarah + penutupan P4 |
| Baseline | HEAD `ea70ba2` + P4 Sub-Fase A–D (belum di-commit) |
| Migration | `0016_metode_kerja_standar` **APPLIED** (journal 17 entry) |
| Status akhir | `IMPLEMENTED BUT NOT FULLY VERIFIED` — static checks PASS; runtime visual menunggu Owner |
| Commit / push / deploy | Tidak ada (instruksi task) |

---

## A. Ringkasan

Sub-Fase A–D sudah selesai dan migration `0016` sudah diterapkan. Owner
mengonfirmasi runtime MKS berjalan baik, lalu meminta dua perbaikan sebelum P4
ditutup:

1. **Sidebar KM** harus mengikuti perilaku MKS — tidak lagi terbuka otomatis di
   `/dashboard` (keputusan Owner 8 November 2026, menggantikan perilaku awal
   DL-2026-11-04-15).
2. **UI tabel MKS** dirapikan: tinggi baris lebih ringkas dan tombol aksi tidak
   lagi membungkus ke beberapa baris.

Setelah dua perbaikan itu, Sub-Fase E menjalankan regresi penuh dan menutup
dokumentasi P4.

Tidak ada perubahan API, service, repository, schema, migration, maupun
dependency pada fase ini.

---

## B. Perbaikan 1 — Sidebar Knowledge Management

**File:** `src/components/dashboard/DashboardSidebar.tsx`

Sebelum (dua modul memakai *role fallback*):

```tsx
knowledgeOpen:
  isKnowledgeManagementPath(pathname) ||
  canViewKnowledgeManagement(userRole ?? ""),
metodeKerjaOpen: isMetodeKerjaPath(pathname),
```

Sesudah (keduanya murni berbasis route):

```tsx
knowledgeOpen: isKnowledgeManagementPath(pathname),
metodeKerjaOpen: isMetodeKerjaPath(pathname),
```

Signature helper juga disederhanakan menjadi `getInitialSidebarAccordionState(pathname)`.
Parameter role dihapus, bukan diabaikan, agar tidak ada pembaca kode yang
mengira peran masih memengaruhi ekspansi awal.

**Yang tidak berubah:**

- `getSidebarVisibility()` tetap memakai `canViewKnowledgeManagement` /
  `canViewMetodeKerja` untuk menentukan apakah panel dirender sama sekali.
- Blok sinkronisasi pathname tetap hanya membuka accordion modul aktif; tidak ada
  auto-collapse baru.
- Program Kerja, Master Project, Engineering Databases, dan Landing Page Manager
  tidak disentuh.

**Matriks perilaku setelah perbaikan** (semua role berizin):

| Route | KM | MKS | Program Kerja | Master Project | Eng. DB | Landing |
|---|---|---|---|---|---|---|
| `/dashboard` | closed | closed | closed | closed | closed | closed |
| `/dashboard/users` | closed | closed | closed | closed | closed | closed |
| `/dashboard/knowledge-management/*` | **open** | closed | closed | closed | closed | closed |
| `/dashboard/metode-kerja-standar/*` | closed | **open** | closed | closed | closed | closed |
| `/dashboard/program-kerja/*` | closed | closed | **open** | closed | closed | closed |
| `/dashboard/master-project/*` | closed | closed | closed | **open** | closed | closed |
| `/dashboard/engineering-database/*` | closed | closed | closed | closed | **open** | closed |
| `/dashboard/hero` | closed | closed | closed | closed | closed | **open** |

**Batasan yang tetap berlaku:** blok sinkronisasi hanya membuka, tidak menutup.
Memperbaiki nilai awal mengubah tampilan saat mount pertama; accordion yang sudah
dibuka pengguna tetap terbuka sampai ditutup manual. Perilaku "hanya satu modul
terbuka sepanjang sesi" tetap pekerjaan terpisah (lihat
`SIDEBAR_ACCORDION_AUDIT.md` §F.3).

---

## C. Perbaikan 2 — UI Tabel MKS

**File:** `src/components/dashboard/metode-kerja-standar/MetodeKerjaTable.tsx`

| Aspek | Sebelum | Sesudah | Alasan |
|---|---|---|---|
| Padding sel isi | `py-3` | `py-2` | Tinggi baris didominasi padding, bukan isi |
| Padding header | `py-3` | `py-2.5` | Proporsional dengan sel isi |
| Chip PIC | `px-2 py-1` | `px-2 py-0.5 leading-tight` | Mengurangi tinggi baris dengan banyak PIC |
| Catatan | clamp 3 baris, `leading-relaxed` | clamp 2 baris, `leading-snug` | Catatan panjang tidak lagi mendikte tinggi baris |
| Tombol aksi | `px-2 py-1` (tinggi tidak seragam) | `inline-flex h-7`, teks `leading-none` | Toolbar satu tinggi, sejajar |
| Tombol urutan ↑/↓ | teks `px-2 py-1` | ikon persegi `h-7 w-7` | Lebih ringkas, target klik tetap 28px |
| Kontainer aksi | `flex flex-wrap` | `flex items-center justify-end gap-1 whitespace-nowrap` | Tombol tidak membungkus ke baris kedua |
| Tombol aksi | tanpa `shrink-0` | `shrink-0` pada ketiga varian | Flex tidak menyempitkan tombol sampai teksnya membungkus |
| Sel Aksi | `align-top` (ikut sel isi) | `align-middle` (konstanta terpisah) | Tombol tidak "mengambang" di atas saat sel lain lebih tinggi |
| Latar sub-kategori | `bg-background/40` | `bg-blue-50`, teks `text-blue-900`/`text-blue-800`, hover `bg-blue-100/70` | Level 1 mudah dibedakan; baris item tetap putih |
| Baris item | transparan | `bg-white` | Kontras tiga level konsisten |
| Kolom Aksi | `w-[150px]` | `w-[240px]` | Lima kontrol muat satu baris |
| Lebar minimum tabel | `min-w-[1080px]` | `min-w-[1180px]` | Mengimbangi kolom Aksi yang lebih lebar |

**Penyimpangan dari P3 Section H.2 (didokumentasikan):** desain menyebut kolom
Aksi 140px. Dengan lima kontrol (Tambah Item, Edit, Hapus, ↑, ↓) kolom 140px
memaksa `flex-wrap` dan justru menambah tinggi baris — masalah yang dilaporkan
Owner. Lebar 240px dipilih agar toolbar tetap satu baris (total label ≈ 208px +
padding sel); kolom lain dan urutan delapan kolom (No, Kode, Nama, PIC, Evidence,
Catatan, Item, Aksi) tidak berubah.

**Tidak berubah:** struktur tiga level (header disiplin → sub-kategori → item),
`colSpan` header disiplin, inden `pl-4`/`pl-10`, empty state, `aria-label` setiap
tombol, aturan visibilitas (Manage = Head Office, Hapus = Admin), dan seluruh
callback reorder.

---

## D. Regresi Sub-Fase E

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | **PASS** (exit 0) |
| ESLint (sidebar + seluruh folder MKS) | `npx eslint src/components/dashboard/DashboardSidebar.tsx src/components/dashboard/DashboardSidebar.test.ts src/components/dashboard/metode-kerja-standar` | **PASS** (exit 0, 0 warning) |
| Test otomatis | `npm test` | **PASS — 115/115, 30 suite, 0 fail** |
| Diff hygiene | `git diff --check` | **PASS** |
| Migration | — | Tidak dijalankan ulang; `0016` sudah APPLIED sebelumnya |
| Database | — | Tidak disentuh pada fase ini (0 write, 0 schema change) |
| Build | — | Tidak dijalankan pada fase ini |

**Cakupan test yang relevan dengan perubahan:**

- `DashboardSidebar.test.ts` — KM collapsed di `/dashboard` dan `/dashboard/users`,
  terbuka hanya pada route KM, independen dari Program Kerja, serta visibilitas
  empat role tetap utuh.
- `metodeKerjaSidebar.test.ts` — MKS collapsed di semua route non-MKS, terbuka
  pada route MKS, tidak menyeret modul lain, dan tidak lagi bergantung pada role.
- `MetodeKerjaTable.test.ts` dan test summary/PDF tidak berubah perilakunya;
  keduanya tetap PASS.

Jumlah test naik dari 112 → 115 (satu test accordion lama dipecah menjadi empat
test yang lebih spesifik pada perbaikan MKS, lalu dirapikan untuk signature baru).

---

## E. Inventaris P4 (akhir)

| Kelompok | Jumlah / Lokasi |
|---|---|
| Schema | `src/lib/pg/schema.ts` (+3 tabel MKS) |
| Migration | `drizzle/0016_metode_kerja_standar.sql`, journal index 16 (17 entry total) |
| Lib | `src/lib/metode-kerja-standar/{access,constants,schema,service,repository,summary}.ts` + 4 test |
| API | 10 route di `src/app/api/metode-kerja-standar/**` |
| Frontend | 7 komponen + exporter PDF di `src/components/dashboard/metode-kerja-standar/**` |
| Route UI | `src/app/dashboard/metode-kerja-standar/{layout,page,summary/page,[disiplin]/page}.tsx` |
| Sidebar | `DashboardSidebar.tsx` (menu MKS, helper path, nilai awal accordion) |
| Dokumen | `MKS_P2_AUDIT.md`, `MKS_P3_TECHNICAL_DESIGN.md`, `SIDEBAR_ACCORDION_AUDIT.md`, dokumen ini |

**Object database terverifikasi saat migration:** 3 tabel, 16 index, 2 constraint
trigger `DEFERRABLE INITIALLY DEFERRED`, CHECK disiplin A–F, dan unique
`(disiplin, lower(btrim(kode)))`.

---

## F. Known Limitations

1. **Runtime visual belum diverifikasi Freebuff.** Perubahan tinggi baris dan
   tombol aksi bersifat visual; Freebuff tidak memiliki sesi Admin/Head Office.
   Owner perlu memeriksa satu halaman disiplin (mis. C-MEP) pada lebar desktop
   dan mobile untuk mengonfirmasi kepadatan baris terasa benar.
2. **Tidak ada auto-collapse antar-route dalam satu sesi** (lihat §B).
3. **Kredensial role selain Admin** tidak tersedia, sehingga penerimaan runtime
   Head Office/Management/Project tetap mengandalkan konfirmasi Owner.
4. **Kolom Aksi 200px** menyimpang dari angka P3 (140px) dengan alasan yang
   didokumentasikan di §C.

---

## G. Status

`IMPLEMENTED BUT NOT FULLY VERIFIED` — seluruh pemeriksaan statis PASS
(TypeScript, ESLint, 115 test, diff hygiene), migration sudah diterapkan, dan
perubahan bersifat terbatas pada dua file produksi + dua file test. Verifikasi
visual akhir dan penerimaan Owner masih diperlukan sebelum status dapat
dinaikkan menjadi `COMPLETE AND VERIFIED`.
