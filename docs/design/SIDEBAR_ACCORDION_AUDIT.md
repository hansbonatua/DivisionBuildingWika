# Audit — Sidebar Accordion Behavior (Knowledge Management & Metode Kerja Standar)

| Field | Nilai |
|---|---|
| Tanggal | 6 November 2026 |
| Jenis | **AUDIT ONLY** — tidak ada perubahan source code |
| Baseline | HEAD `ea70ba2` + working tree Sub-Fase A–D (belum di-commit) |
| Objek | `src/components/dashboard/DashboardSidebar.tsx` (940 baris) |
| Pemicu | Laporan Owner: membuka `/dashboard` membuat dropdown "Knowledge Management" dan "Metode Kerja Standar" langsung expanded |
| File baru | dokumen ini saja |
| File diubah | **tidak ada** |

---

## A. Executive Summary

**Penyebab pasti:** kedua accordion mengambil nilai awal dari satu fungsi murni,
`getInitialSidebarAccordionState()`, yang menggabungkan *route aktif* dengan
*role fallback*:

```tsx
// DashboardSidebar.tsx:413-417
knowledgeOpen:
  isKnowledgeManagementPath(pathname) ||
  canViewKnowledgeManagement(userRole ?? ""),
metodeKerjaOpen:
  isMetodeKerjaPath(pathname) || canViewMetodeKerja(userRole ?? ""),
```

Karena `METODE_KERJA_VIEW` dan `KNOWLEDGE_MANAGEMENT_VIEW` diberikan kepada
Admin, Head Office, Management, dan Project, maka untuk **setiap role yang
berhak** kedua nilai itu selalu `true` — termasuk di `/dashboard` yang bukan
route modul tersebut.

**Klasifikasi:**

| Modul | Status | Alasan |
|---|---|---|
| Knowledge Management | **Pattern existing yang disengaja** (bukan bug) | DL-2026-11-04-15 secara eksplisit menetapkan "Default terbuka untuk semua role yang memiliki `KNOWLEDGE_MANAGEMENT_VIEW`" |
| Metode Kerja Standar | **Menyimpang dari desain P4 Sub-Fase D** (bukan bug teknis) | Desain meminta "default collapsed, auto-expand hanya saat route aktif"; implementasi menyalin pola KM |

**Temuan tambahan yang perlu diketahui Owner:** mekanisme auto-expand di
`DashboardSidebar.tsx:476-495` **hanya pernah membuka, tidak pernah menutup**, dan
komponen sidebar tidak di-remount saat navigasi client-side. Jadi memperbaiki
nilai awal hanya mengubah tampilan saat mount pertama (load penuh / setelah
login), bukan perilaku "hanya modul aktif yang terbuka" sepanjang sesi.

Tidak ada `useEffect`, tidak ada context/provider, dan tidak ada prop global yang
memaksa semua accordion terbuka. Tidak ada bug tersembunyi di parent.

---

## B. State Definition — Tabel Lengkap

Semua state accordion dideklarasikan di dalam komponen
`DashboardSidebar` (`DashboardSidebar.tsx:428`), dengan nilai awal dari
`getInitialSidebarAccordionState(pathname, userRole)` (`:459`).

| Accordion | State | `useState` | Sumber nilai awal | Auto-expand | file:line |
|---|---|---|---|---|---|
| Knowledge Management | `knowledgeOpen` | `useState(initialAccordions.knowledgeOpen)` | `isKnowledgeManagementPath(pathname) \|\| canViewKnowledgeManagement(role)` | Ya (route change) | deklarasi `:464`, helper `:413-415`, auto-expand `:484-486`, panel `:681` / `:711` |
| Metode Kerja Standar | `metodeKerjaOpen` | `useState(initialAccordions.metodeKerjaOpen)` | `isMetodeKerjaPath(pathname) \|\| canViewMetodeKerja(role)` | Ya (route change) | deklarasi `:465-467`, helper `:416-417`, auto-expand `:487-489`, panel `:728` / `:758` |
| Program Kerja | `programKerjaOpen` | `useState(initialAccordions.programKerjaOpen)` | `isProgramKerjaRoute` saja | Ya (route change) | deklarasi `:461-463`, helper `:412`, auto-expand `:481-483`, panel `:633` / `:665` |
| Master Project | `masterProjectOpen` | `useState(initialAccordions.masterProjectOpen)` | `pathname.startsWith("/dashboard/master-project")` | Ya (route change) | deklarasi `:468-470`, helper `:418`, auto-expand `:490-492`, panel `:782` / `:817` |
| Engineering Databases | `engineeringDatabaseOpen` | `useState(initialAccordions.engineeringDatabaseOpen)` | `pathname.startsWith("/dashboard/engineering-database")` | Ya (route change) | deklarasi `:471-473`, helper `:419`, auto-expand `:493-495`, panel `:834` / `:864` |
| Landing Page Manager | `landingOpen` | `useState(initialAccordions.landingOpen)` | `isLandingRoute` saja | Ya (route change) | deklarasi `:460`, helper `:411`, auto-expand `:478-480`, panel `:572` / `:606` |
| Template & Form | — | — | — | — | Bukan accordion: `templateFormMenu` adalah satu `SidebarItem` tunggal (dirender sebagai link) |
| Struktur Organisasi | — | — | — | — | Bukan accordion: `organizationStructureMenu` adalah satu item tunggal |

**Kesimpulan tabel:** hanya dua accordion yang memakai *role fallback* (KM dan
MKS). Empat accordion lain murni berbasis route sehingga default-nya collapsed di
`/dashboard`. Tidak ada `templateFormOpen` atau `organizationOpen` di file ini.

Tipe state-nya sendiri eksplisit dan konsisten (`SidebarAccordionState`,
`:388-396`), sehingga tidak ada nilai `undefined` yang membuat React memperlakukan
panel sebagai terbuka.

---

## C. Logic Auto-Expand

### C.1 Tidak ada `useEffect`

`grep -nE "useEffect|useState\("` pada file ini hanya menemukan `useState`
(`:431`, `:460`, `:461`, `:464`, `:465`, `:468`, `:471`, `:474`) — **nol**
`useEffect`. Jadi tidak ada effect yang berjalan setelah render untuk membuka
accordion.

### C.2 Mekanisme yang sebenarnya: sinkronisasi state saat render

```tsx
// DashboardSidebar.tsx:474-495
const [previousPathname, setPreviousPathname] = useState(pathname);

if (pathname !== previousPathname) {
  setPreviousPathname(pathname);
  if (isLandingRoute) { setLandingOpen(true); }              // :478-480
  if (isProgramKerjaRoute) { setProgramKerjaOpen(true); }    // :481-483
  if (isKnowledgeManagementRoute) { setKnowledgeOpen(true); }// :484-486
  if (isMetodeKerjaRoute) { setMetodeKerjaOpen(true); }      // :487-489
  if (isMasterProjectRoute) { setMasterProjectOpen(true); }  // :490-492
  if (isEngineeringDatabaseRoute) { setEngineeringDatabaseOpen(true); } // :493-495
}
```

Ini pola React "adjusting state when props change": memanggil setter saat render
lalu React langsung re-render sebelum commit. Konsekuensi penting:

1. Blok ini **tidak pernah** memanggil `set...(false)`. Accordion tidak pernah
   menutup otomatis saat pengguna meninggalkan route modul.
2. Karena `DashboardSidebar` hidup di `DashboardShell` (layout dashboard) dan
   tidak di-remount antar navigasi client-side, nilai `useState` awal hanya
   berlaku pada **mount pertama** (full page load, hard refresh, atau setelah
   login). Setelah itu state bertahan.
3. Jadi laporan Owner di `/dashboard` paling mungkin terjadi pada load pertama: di
   titik itu kedua nilai awal sudah `true` karena role fallback, bukan karena
   auto-expand.

### C.3 Tidak ada logic global

| Lokasi yang diperiksa | Hasil |
|---|---|
| `DashboardSidebar.tsx` (seluruh 940 baris) | Tidak ada loop setter, tidak ada `useEffect`, tidak ada provider |
| `src/components/dashboard/DashboardShell.tsx` | Hanya `useState(sidebarOpen)` untuk drawer mobile; meneruskan `open`, `onClose`, `userRole`, `mslAccess` ke sidebar (`:20-25`). Tidak ada prop accordion |
| `src/app/dashboard/layout.tsx` | Hanya guard `requireUser()` lalu `<DashboardShell user={user}>`; tidak meneruskan state accordion |
| Context / store | Tidak ada; seluruh state accordion lokal di komponen sidebar |

Dengan demikian tidak ada "buka semua" yang tidak sengaja. Satu-satunya penyebab
adalah ekspresi `|| canView...` pada helper nilai awal.

---

## D. Analisis Per Route

Matriks untuk role yang punya `KNOWLEDGE_MANAGEMENT_VIEW` **dan**
`METODE_KERJA_VIEW` (Admin, Head Office, Management, Project):

| Route | KM | MKS | Program Kerja | Master Project | Eng. Databases | Landing |
|---|---|---|---|---|---|---|
| `/dashboard` | **OPEN** | **OPEN** | closed | closed | closed | closed |
| `/dashboard/users` | **OPEN** | **OPEN** | closed | closed | closed | closed |
| `/dashboard/knowledge-management/*` | **OPEN** | **OPEN** | closed | closed | closed | closed |
| `/dashboard/metode-kerja-standar/*` | **OPEN** | **OPEN** | closed | closed | closed | closed |
| `/dashboard/program-kerja/*` | **OPEN** | **OPEN** | OPEN | closed | closed | closed |
| `/dashboard/master-project/*` | **OPEN** | **OPEN** | closed | OPEN | closed | closed |
| `/dashboard/engineering-database/*` | **OPEN** | **OPEN** | closed | closed | OPEN | closed |
| `/dashboard/hero` (landing) | **OPEN** | **OPEN** | closed | closed | closed | OPEN |

Untuk role tanpa izin (mis. `Guest` atau role tak dikenal), `canView...` bernilai
`false`, sehingga `knowledgeOpen`/`metodeKerjaOpen` hanya `true` bila route-nya
aktif — tetapi panelnya juga tidak dirender karena visibility `false`.

**Penjelasan ringkas:**

1. `/dashboard` — KM dan MKS open karena `canViewKnowledgeManagement(role)` dan
   `canViewMetodeKerja(role)` true (helper `:413-417`). Accordion lain closed
   karena hanya bergantung pada prefix route (`:411-412`, `:418-419`).
2. `/dashboard/knowledge-management/*` — KM open karena route **dan** karena role.
   MKS tetap open karena role fallback, walau route-nya tidak aktif.
3. `/dashboard/metode-kerja-standar/*` — MKS open karena route **dan** role; KM
   tetap open karena role fallback. Efek samping inilah yang membuat sidebar
   terlihat "selalu terbuka di dua tempat".

---

## E. MKS vs Desain P4 Sub-Fase D

| Aspek | Implementasi saat ini | Desain P4 Sub-Fase D | Selisih |
|---|---|---|---|
| Nilai awal | `isMetodeKerjaPath(pathname) \|\| canViewMetodeKerja(role)` (`:416-417`) | Default **collapsed** | Ada tambahan `\|\| canViewMetodeKerja(role)` |
| Auto-expand | Ya, saat pathname berubah ke route MKS (`:487-489`) | Ya, saat route aktif | Sesuai |
| Auto-collapse saat keluar route | Tidak ada | Tidak disebut eksplisit ("auto-expand jika route aktif") | Berpotensi selisih tafsir |
| Pola acuan | Menyalin KM (`:413-415`) | — | MKS mengikuti pattern KM, bukan desainnya sendiri |

**Kesimpulan E:** implementasi MKS **menyimpang** dari desain D. Ini bukan bug
tak sengaja: Sub-Fase D memakai Knowledge Management sebagai acuan perilaku
accordion, dan KM memang default open. Penyimpangan terjadi karena "pola acuan"
dan "desain tertulis" berbeda.

Catatan penting: desain "auto-expand hanya saat route aktif" secara harfiah
mengizinkan accordion modul lain tetap terbuka (karena tidak menyebut
auto-collapse). Jika Owner menginginkan *hanya* modul aktif yang terbuka, itu
perubahan perilaku tambahan, bukan sekadar mengubah nilai awal.

---

## F. Rekomendasi

### F.1 Apakah perlu fix?

Tergantung keputusan Owner, dengan dua pertimbangan:

- Jika **desain P4 dianggap kontrak**, ya — minimal satu ekspresi di `:416-417`.
- Jika **konsistensi dengan KM** lebih penting (KM default open sudah disetujui
  dan diuji pada 4 November), tidak perlu fix; cukup perbarui dokumen desain.

### F.2 Opsi

| Opsi | Perubahan | Dampak | Effort |
|---|---|---|---|
| **A. Biarkan (konsisten dengan KM)** | Tidak ada kode | KM dan MKS tetap expanded di semua route. Sidebar Core Enterprise selalu menampilkan 3 submenu KM + 7 submenu MKS, sehingga daftar panjang dan modul lain terdorong ke bawah. Tidak ada risiko regresi. | 0 baris |
| **B. Fix MKS saja** | `:416-417` → `metodeKerjaOpen: isMetodeKerjaPath(pathname),` | MKS collapsed di `/dashboard`, terbuka otomatis saat masuk route MKS (blok `:487-489`). KM tetap default open seperti keputusan 4 November. Konsisten dengan Program Kerja/Master Project/Eng. DB. Perlu ubah 1 assertion test. | ± 3 baris (1 produksi + 1–2 test) |
| **C. Fix KM + MKS (default collapsed untuk keduanya)** | `:413-417` → dua ekspresi berbasis route saja | Semua accordion konsisten: hanya modul aktif yang terbuka saat mount. Menyimpang dari DL-2026-11-04-15, sehingga log keputusan dan dokumen terkait perlu diperbarui. Perlu ubah 2 test KM + 1 test MKS. | ± 6–8 baris + pembaruan dokumen |

**Rekomendasi teknis:** **Opsi B** bila Owner ingin MKS sesuai desain P4 tanpa
membuka kembali keputusan KM; **Opsi C** bila tujuan akhirnya sidebar ringkas dan
konsisten. Opsi C adalah satu-satunya yang menghapus keluhan "dua dropdown
terbuka" secara menyeluruh, karena keduanya yang dilaporkan.

### F.3 Batasan fix (berlaku untuk B dan C)

Memperbaiki nilai awal **tidak** membuat accordion menutup otomatis saat pengguna
pindah modul dalam satu sesi, karena state bertahan (lihat C.2). Jika Owner
menginginkan perilaku "hanya satu modul terbuka setiap saat", perlu perubahan
tambahan di blok `:476-495` untuk menutup accordion modul lain — di luar cakupan
audit ini dan lebih berisiko terhadap regresi navigasi.

---

## G. File Impact jika fix

| File | Opsi A | Opsi B | Opsi C |
|---|---|---|---|
| `src/components/dashboard/DashboardSidebar.tsx` | 0 | 2 baris (`:416-417`) | 4 baris (`:413-417`) |
| `src/components/dashboard/metodeKerjaSidebar.test.ts` | 0 | 1 assertion ("the accordion opens on MKS routes and for authorized roles" — ekspektasi `/dashboard` Head Office) | 1 assertion (sama) |
| `src/components/dashboard/DashboardSidebar.test.ts` | 0 | 0 | 2 test ("defaults open while Program Kerja stays collapsed on the dashboard", "is independent of Program Kerja state on routes without either module") |
| Dokumentasi (`DEVELOPMENT_MASTER_LOG.md`, dokumen desain P4 D) | 0 | 0 | 1 entri log baru + koreksi klaim "default terbuka" |
| API / DB / migration / schema | 0 | 0 | 0 |

---

## H. Verifikasi Audit

| Pemeriksaan | Hasil |
|---|---|
| Source code diubah | Tidak — audit ini hanya membaca |
| Dokumentasi existing diubah | Tidak |
| Test dijalankan | Tidak (sesuai larangan) |
| Runtime / browser | Tidak dijalankan |
| Migration / database | Tidak disentuh |
| Commit / push / deploy | Tidak |
| `git status --short src/` | Hanya perubahan Sub-Fase A–D yang sudah ada sebelumnya (`DashboardSidebar.tsx`, `permissions.ts`, `schema.ts` + folder MKS baru); tidak ada perubahan baru dari audit |
| File baru dari audit | `docs/design/SIDEBAR_ACCORDION_AUDIT.md` (satu file) |

### Bukti pembanding baseline (read-only)

`git show HEAD:src/components/dashboard/DashboardSidebar.tsx`:

- `HEAD` sudah memiliki `knowledgeOpen: ... || canViewKnowledgeManagement(...)` (baris 366-368 pada versi HEAD) → **default open KM sudah ada sebelum MKS**, sesuai DL-2026-11-04-15.
- `HEAD` tidak memuat kata `metode` sama sekali (0 kecocokan) → seluruh perilaku MKS berasal dari Sub-Fase D di working tree (+104 baris pada file ini).

---

## I. Ringkasan Satu Paragraf

KM dan MKS terbuka di `/dashboard` karena `getInitialSidebarAccordionState()`
memberi nilai awal `true` untuk setiap role yang memiliki izin VIEW
(`DashboardSidebar.tsx:413-417`). Untuk KM ini perilaku yang disengaja sejak
4 November 2026; untuk MKS ini menyalin pola tersebut dan karenanya menyimpang
dari desain P4 Sub-Fase D yang meminta default collapsed. Tidak ada effect,
context, atau prop global yang memaksa semua accordion terbuka. Perbaikan minimal
adalah satu ekspresi (Opsi B), dan perbaikan menyeluruh adalah dua ekspresi
(Opsi C) dengan konsekuensi memperbarui keputusan KM beserta test-nya.
