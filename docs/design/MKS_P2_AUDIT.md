# P2 — Existing System Audit: Metode Kerja Standar

**Proyek:** WIBEX — Staff Engineering Digitalisasi Building  
**Fase:** P2 — Existing System Audit (read-only)  
**Tanggal:** 2026-11-06  
**Baseline:** `main` @ `ea70ba2`  
**Status:** Audit selesai — menunggu review Owner/ChatGPT  
**P3:** Belum dimulai

---

## 0. Ruang Lingkup dan Metode

Dokumen ini memetakan pola implementasi yang sudah ada di WIBEX untuk menjadi dasar
Technical Design P3 Metode Kerja Standar (MKS). Audit dilakukan dengan membaca source
code saja. Tidak ada source, migration, `schema.ts`, database, atau runtime yang diubah
atau dijalankan.

Area yang diaudit:

1. Tabel dengan header group dan indentasi.
2. Form CRUD dengan modal.
3. PIC multi-select.
4. Summary Report dan filter.
5. PDF export.
6. RBAC/permission.
7. Sidebar.
8. Validasi URL.
9. Redirect pattern.

Referensi ditulis sebagai `path:line` atau `path:rentang-baris`. Nomor baris mengacu pada
working tree baseline `ea70ba2` (KM V2 enhancement sudah ter-commit).

---

## A. Executive Summary

### A.1 Pola yang dapat di-reuse

| Pola | Sumber utama | Kesesuaian untuk MKS |
|---|---|---|
| Permission registry + helper modul | `src/lib/auth/permissions.ts:24-118`; `src/lib/*/access.ts` | **Tinggi** — pola baku seluruh modul |
| Modal CRUD dengan focus trap, Escape, body lock, dirty guard | `KnowledgeFormDialog.tsx:289-349, 532-570` | **Tinggi** — tetapi belum berupa komponen generik |
| PIC checklist multi-select | `ProgramKerjaForm.tsx:492-516`; `KnowledgeFormDialog.tsx:656-719` | **Tinggi** — perlu diekstrak agar konsisten |
| Summary Report server-side | `summaryService.ts:81-135`; `ProgramKerjaSummaryDashboard.tsx` | **Tinggi** untuk arsitektur; domain MKS berbeda |
| PDF berbasis jsPDF + autoTable | Empat exporter existing | **Tinggi** untuk konvensi; ukuran kertas perlu diputuskan |
| Sidebar accordion dengan Summary pertama | `DashboardSidebar.tsx:145-179, 259-274, 570-760` | **Tinggi** — pola navigasi sudah matang |
| Redirect root ke halaman default | `src/app/dashboard/*/page.tsx` | **Tinggi** — persis kebutuhan P1 |
| Validasi URL absolut http/https | `knowledge-management/schema.ts:38-70` | **Tinggi** jika MKS menyimpan URL |

### A.2 Pola yang perlu dibuat baru

| Kebutuhan MKS | Kondisi existing | Dampak |
|---|---|---|
| Tabel 3 level: disiplin → sub-kategori → item, dengan header disiplin full-width dan indentasi | Belum ada. Program Kerja hanya 1 level group; KM hanya rowSpan per project | **Komponen baru** |
| CRUD sub-kategori dan item dalam satu master reference | Belum ada modul master reference berjenjang | **Schema, service, API, UI baru** |
| Modal generik yang dapat dipakai form sub-kategori dan item | Modal KM masih inline di satu file | **Ekstraksi atau duplikasi terkelola** |
| PIC multi-select Head Office yang dapat dipakai ulang | Ada dua implementasi berbeda (checkbox biasa vs search + status) | **Komponen baru hasil ekstraksi** |
| Summary Report MKS | Summary existing berbasis project/program, bukan master reference | **Agregasi dan halaman baru** |
| Permission namespace MKS | Belum ada | **Dua permission baru + access helper** |
| Menu MKS | Belum ada | **Menu/top-level accordion baru** |

**Kesimpulan eksekutif:** arsitektur WIBEX sudah menyediakan hampir semua pola
pendukung (RBAC, sidebar, modal, PIC, PDF, redirect, summary). Celah utamanya adalah
**tabel berjenjang 3 level** dan **CRUD master reference berjenjang**; keduanya belum
punya padanan langsung dan harus menjadi fokus P3.

---

## B. Audit A — Tabel dengan Header Group dan Indentasi

### B.1 Program Kerja — grouping per kelompok program

**File:** `src/components/dashboard/program-kerja/ProgramKerjaTable.tsx`

- Group dibentuk dengan `Map` berdasarkan `program.groupId`, sehingga urutan grup
  mengikuti kemunculan pertama pada data: `:111-123`.
- Header tabel memakai tiga baris:
  - kolom identitas dan kolom akhir `rowSpan={3}`: `:281-299`;
  - header tahun `colSpan={12}`: `:291`;
  - triwulan `colSpan={3}`: `:303`;
  - nama bulan sebagai baris ketiga: `:307-312`.
- Setiap grup dirender sebagai baris pemisah penuh:
  `<td colSpan={TOTAL_COLUMNS}>` dengan latar gelap dan teks uppercase: `:319-327`.
- Setiap program memakai dua baris (RA dan RI); kolom identitas memakai
  `rowSpan={2}`: `:333-390`.
- Container hanya `overflow-x-auto`; **tidak ada sticky header** dan tidak ada
  sticky kolom pertama: `:278-280`.

**Kelebihan:** pemisah grup sangat jelas, cocok untuk tabel lebar, dan pola
`rowSpan`/`colSpan` sudah terbukti.  
**Keterbatasan:** hanya satu tingkat group. Tidak ada indentasi sub-item.

### B.2 Knowledge Management — grouping per Master Project

**File:** `src/components/dashboard/knowledge-management/KnowledgeTable.tsx`

- Group dibentuk oleh `groupKnowledgeRecords` (pure helper di `types.ts`) dan dirender
  sebagai satu `<tbody>` per project: `:401-403`.
- Nama project hanya muncul pada record pertama, memakai
  `<th scope="rowgroup" rowSpan={group.records.length}>`: `:409-421`.
- Tidak ada baris header grup; project berfungsi sebagai label di kolom kedua.
- Header tabel statis; tidak ada sticky header: `:378-397`.
- Tidak ada indentasi karena record tidak berjenjang.

**Kelebihan:** `rowSpan` per group mengurangi pengulangan nama project dan tetap
mempertahankan satu baris per record.  
**Keterbatasan:** tidak dapat langsung dipakai untuk hirarki disiplin → sub-kategori →
item karena tidak ada level perantara.

### B.3 Engineering Database — tabel flat per kategori

**File:** `src/components/dashboard/engineering-database/EngineeringDatabaseTable.tsx`

- Tabel flat: No, Nama Proyek, File, PIC, Note, Aksi: `:74-103`.
- Tidak ada grouping, header group, atau indentasi.
- Skeleton loading dirender sebagai baris tabel: `:29-58`.
- Empty state memakai `colSpan={6}`: `:103-111`.
- Header tidak sticky; hanya `overflow-x-auto`: `:71-73`.

**Kesimpulan:** Engineering Database bukan acuan untuk tampilan berjenjang.

### B.4 Engineering Database Summary — matriks, bukan group

**File:** `src/components/dashboard/engineering-database/EngineeringDatabaseSummaryTable.tsx`

- Satu baris per Master Project, satu kolom per kategori: `:80-95`.
- Header kategori berasal dari konstanta kanonik, bukan data: `:11-19, 87-92`.
- Tidak ada group/indentasi; hanya matriks kehadiran.

### B.5 Rekomendasi untuk MKS

Pola yang paling dekat adalah **Program Kerja group separator** (`colSpan` penuh),
tetapi MKS membutuhkan tiga level. Rekomendasi arah P3:

1. **Disiplin A–F** menjadi baris header penuh, misalnya
   `<tr><th colSpan={n}>A. DISIPLIN</th></tr>` dengan latar gelap seperti
   `ProgramKerjaTable.tsx:318-326`.
2. **Sub-kategori** menjadi baris tersendiri dengan teks bold dan `padding-left`
   tingkat pertama.
3. **Item** menjadi baris dengan `padding-left` lebih dalam, kolom lain mengikuti.
4. Sticky header **hanya untuk baris kolom**; baris disiplin tidak dijadikan sticky
   karena akan bertabrakan dengan sticky column header pada tabel lebar.
5. Bila tabel lebih lebar dari viewport, pertahankan `overflow-x-auto` dan
   `min-w-[...]` seperti existing; jangan memaksa `table-fixed` sebelum lebar kolom
   final ditentukan.

**Celah yang harus diselesaikan P3:** belum ada komponen tabel yang mendukung
header group berulang, indentasi berjenjang, dan empty state per disiplin.

---

## C. Audit B — Form CRUD dengan Modal

### C.1 Knowledge Management — modal form paling lengkap

**File:** `src/components/dashboard/knowledge-management/KnowledgeFormDialog.tsx`

Modal ini adalah acuan terbaik karena menangani hampir semua kebutuhan form modal:

- Body scroll lock dan pemulihan overflow: `:289-298`.
- Fokus awal ke `[data-autofocus]` atau elemen pertama, lalu mengembalikan fokus ke
  elemen pemicu saat ditutup: `:291-298`.
- Dirty detection melalui snapshot JSON (project, content, PIC terurut, evidence):
  `:75-91`; perbandingan snapshot membentuk `dirty`.
- Peringatan `beforeunload` saat dirty: `:305-309`.
- Konfirmasi tutup saat dirty: `:311-318`.
- Escape menutup modal, kecuali dialog delete sedang terbuka: `:320-328`.
- Focus trap Tab/Shift+Tab di dalam dialog: `:330-345`.
- Klik backdrop menutup melalui pengecekan `event.target === event.currentTarget`:
  `:528-535`.
- Atribut `role="dialog"`, `aria-modal="true"`, `aria-labelledby`: `:536-542`.
- Layout dua area: body scrollable dan footer aksi tetap: `:576-590, 838-860`.

**Keterbatasan:** seluruh implementasi berada di satu file 878 baris. Tidak ada
komponen `Modal`/`Dialog` yang dapat dipakai modul lain. `KnowledgeDeleteDialog`
menduplikasi body lock dan focus trap: `KnowledgeDeleteDialog.tsx:44-48, 63-84,
125-140`.

### C.2 Engineering Database — full-page editor

**File:** `src/components/dashboard/engineering-database/EngineeringDatabaseEditor.tsx`

- Form Add/Edit adalah halaman penuh, bukan modal: `:350-610`.
- PIC dimuat dari endpoint: `:132-170`; validasi submit di `:421-449`.
- Tidak ada dirty detection, `beforeunload`, atau focus trap karena bukan dialog.
- Navigasi sukses/gagal ditangani oleh halaman/route, bukan `onClose`.

### C.3 Master Project — full-page editor

**File:** `src/components/dashboard/master-project/MasterProjectEditor.tsx`

- Form full-page: `:320-570`.
- PIC single-select dimuat dari `/api/master-project/pic-options`: `:120-170`.
- Validasi field dan submit: `:350-400`.
- Tidak ada dirty guard atau modal behavior.

### C.4 Template & Form — full-page editor

**File:** `src/components/dashboard/template-form/TemplateFormEditor.tsx`

- Form full-page; PIC single-select: `:901-940`.
- Tidak ada dirty guard.

### C.5 Modal lain

- `OrganizationStructureDialog.tsx:53-73` adalah viewer full-screen, bukan form CRUD.
- `KnowledgeViewDialog.tsx:47-111` adalah modal read-only dengan body lock, Escape,
  focus trap, dan fokus awal; pola ini dapat dipakai untuk modal detail MKS.

### C.6 Rekomendasi untuk MKS

MKS membutuhkan minimal dua form (sub-kategori dan item). P3 sebaiknya memilih salah
satu secara sadar:

- **Opsi A — ekstrak `FormDialog` generik** dari `KnowledgeFormDialog` (title, body,
  footer, `dirty`, `onClose`, `busy`). Risiko: menyentuh file KM yang baru diuji.
- **Opsi B — buat `MetodeKerjaFormDialog` baru** dengan menyalin pola yang sudah
  terbukti, tanpa merefaktor KM. Risiko: duplikasi, tetapi perubahan terisolasi.

Untuk fase implementasi yang menghindari regresi modul lain, **Opsi B lebih aman**;
ekstraksi dapat dilakukan terpisah setelah MKS stabil. Yang wajib dipertahankan:
body lock, restore focus, Escape, focus trap, dirty confirmation, dan `aria-modal`.

---

## D. Audit C — PIC Multi-Select

### D.1 Program Kerja — checkbox multi-select sederhana

**File:** `src/components/dashboard/program-kerja/ProgramKerjaForm.tsx`

- State `formPicIds: string[]` dan `togglePic`: `:129, 179-181`.
- Opsi berasal dari prop `picOptions` yang dimuat halaman: `:113-116`.
- Render checkbox dalam grid scrollable: `:492-516`.
- Label tegas “PIC (Head Office)” dan bantuan “Minimal 1 PIC. Hanya user Head Office.”:
  `:492, 516`.
- Validasi minimal satu PIC: `:207-210`.
- Tidak ada search, tidak ada label non-aktif, tidak ada batas jumlah.

### D.2 Knowledge Management — checkbox + search + status

**File:** `src/components/dashboard/knowledge-management/KnowledgeFormDialog.tsx`

- State `picIds` dan `togglePic`: `:347-353`.
- Opsi dimuat dari `/api/knowledge-management/pic-options`: `:240-275`.
- Search lokal dengan `picSearch`: `:226-228`.
- Checkbox dan label `(non-aktif)` untuk user non-active: `:676-718`.
- Validasi minimal satu PIC: `:436-438`.
- Bantuan: “Hanya user Head Office. Status suspended tetap dapat dipilih.”: `:720-722`.
- Eligibility role-only, status akun sengaja diabaikan:
  `src/lib/knowledge-management/access.ts:24-31`.

### D.3 PIC single-select pada modul lain

| Modul | File | Perilaku |
|---|---|---|
| Engineering Database | `EngineeringDatabaseEditor.tsx:553-596` | `<select>` satu PIC; role Admin/Head Office/Project |
| Master Project | `MasterProjectEditor.tsx:513-555` | `<select>` satu PIC; Admin/Head Office |
| Template & Form | `TemplateFormEditor.tsx:901-940` | `<select>` satu PIC |

Endpoint `pic-options` mengikuti pola route tipis → service:
`src/app/api/master-project/pic-options/route.ts`,
`src/app/api/knowledge-management/pic-options/route.ts`.

### D.4 Rekomendasi untuk MKS

P1 menyebut PIC terhubung ke User Directory dan **Head Office only**. Pola yang paling
sesuai adalah Knowledge Management, bukan Program Kerja, karena:

- ada search untuk daftar user yang panjang;
- label `(non-aktif)` mencegah PIC “hilang” secara diam-diam;
- eligibility ditegakkan di service/API, bukan hanya UI.

Rekomendasi P3: buat **`PicMultiSelect`** dengan props `options`, `value`, `onChange`,
`disabled`, `searchable`, `showInactiveLabel`, dan pesan validasi. Sumber opsi harus
endpoint server-side baru (mis. `/api/metode-kerja-standar/pic-options`) yang
memfilter Head Office, bukan mengambil seluruh User Directory di browser.

**Open question:** apakah MKS mengizinkan lebih dari satu PIC? P1 menyebut “PIC” tanpa
menjelaskan kardinalitas. Jika satu PIC, komponen single-select existing lebih tepat;
jika banyak, gunakan pola KM.

---

## E. Audit D — Summary Report + Filter

### E.1 Program Kerja — KPI + chart + tabel, filter server-side

**File:** `src/components/dashboard/program-kerja/ProgramKerjaSummaryDashboard.tsx`

- URL summary dibangun dari empat filter (`year`, `groupId`, `unit`, `picId`):
  `:39-50`.
- Setiap perubahan filter memicu fetch ulang; tidak ada tombol “Terapkan”:
  `:223-228`.
- Request memakai `AbortController` + request id agar respons lama tidak menimpa
  respons baru: `:146-190`.
- Filter bar berisi Tahun, Kelompok Program, Unit, PIC, dan Reset:
  `:409-505`.
- Layout: empat KPI card (`:620-684`), donut status (`:691-694`), chart per kelompok
  (`:697-703`), lalu tabel flat (`:706-708`).
- Tabel ringkasan: `ProgramKerjaSummaryTable.tsx:40-126` — kolom Program, Kelompok,
  Unit, Periode, PIC, Pencapaian, Status.
- Agregasi seluruhnya server-side: `src/lib/program-kerja/summaryService.ts:98-121`;
  filter diterapkan ke satu dataset sebelum `aggregateSummary` (`:102-120`).
- Endpoint hanya GET: `src/app/api/program-kerja/summary/route.ts:1-45`.

**Kelebihan:** satu sumber data untuk KPI, chart, dan tabel; filter konsisten; tidak ada
N+1; error lama tidak menghapus data yang sudah tampil.  
**Keterbatasan:** filter selalu server-side, sehingga setiap perubahan memicu request.
Untuk master reference MKS yang jumlahnya kecil, ini bisa over-engineering.

### E.2 Engineering Database — dua chart + matriks, tanpa filter

**File:** `src/components/dashboard/engineering-database/EngineeringDatabaseSummaryPage.tsx`

- Satu request ke `/api/engineering-database/summary`: `:21, 45-57`.
- Data yang sama membentuk dua chart dan matriks: `:150-158, 215-219`.
- Tidak ada filter UI; seluruh Master Project ditampilkan.
- Chart coverage: `EngineeringDatabaseCategoryCoverageChart.tsx:78`.
- Chart completeness: `EngineeringDatabaseProjectCompletenessChart.tsx:81`.
- Matriks: `EngineeringDatabaseSummaryTable.tsx:80-126`.

**Kelebihan:** sederhana dan konsisten karena chart dan tabel memakai satu payload.  
**Keterbatasan:** tidak ada filter disiplin/kategori; semua data selalu dimuat.

### E.3 MSL Engineering — period selector, bukan summary report

**File:** `src/components/dashboard/msl/MslEngineeringPage.tsx`

- Data berasal dari `GET /api/msl?year=&month=`: komentar kontrak `:18-25`.
- Tahun dan bulan dikelola terpisah: `:49-52`.
- Tidak ada halaman Summary Report terpisah; halaman ini adalah tabel penilaian
  per project: `MslTable.tsx:136-175`.
- Tidak ada KPI/chart; filter hanya periode.

**Kesimpulan:** MSL bukan acuan untuk Summary Report MKS, tetapi acuan untuk
**period selector server-side** dan tabel editable per baris.

### E.4 Knowledge Management — filter client-side

**File:** `src/components/dashboard/knowledge-management/KnowledgeFilterToolbar.tsx`

- Filter tahun dan proyek; seluruh record sudah dimuat lebih dulu: `:1-115`.
- Combobox proyek memakai mode `local`, tanpa fetch: `:70-86`.
- KnowledgeTable memfilter di memori dan menghitung hasil: `KnowledgeTable.tsx:340-370`.
- Tidak ada KPI atau chart.

**Kelebihan:** instan, tanpa request tambahan, cocok untuk dataset kecil.  
**Keterbatasan:** tidak skalabel untuk ribuan record; tidak ada agregasi server.

### E.5 Rekomendasi untuk MKS

P1 menyebut Summary Report di posisi paling atas submenu, tetapi belum menentukan
isinya. P3 perlu memilih secara eksplisit:

- **Jika Summary MKS hanya menghitung jumlah sub-kategori/item per disiplin:**
  gunakan pola Engineering Database (satu payload, chart/tabel dari sumber yang sama,
  tanpa filter) dan tambahkan filter disiplin secara client-side.
- **Jika Summary harus memfilter PIC/status/tahun:** gunakan pola Program Kerja
  (server-side query + satu dataset terfilter), tetapi jangan menambah chart jika
  tidak ada dimensi waktu.
- **Jangan** memakai pola KM client-side jika data MKS dapat tumbuh besar atau
  membutuhkan agregasi lintas disiplin.

---

## F. Audit E — PDF Export

### F.1 Ringkasan exporter

| Exporter | Orientasi/format | Logo | Footer halaman | Filter line | Nama file |
|---|---|---|---|---|---|
| `mslExportPdf.ts` | **A4 landscape** `:659` | Kanan atas `:557-575` | Ya, “Halaman x / y” `:617-650` | Periode `:568-578` | `MSL-Engineering-...pdf` `:201-207` |
| `programKerjaExportPdf.ts` | **A3 landscape** `:93` | Kanan atas `:101-109` | **Tidak ada** | Tahun/Kelompok/Unit/Pencarian `:37-47` | `Program-Kerja-...pdf` `:49-52` |
| `programKerjaSummaryExportPdf.ts` | **A3 landscape** `:515` | Kanan atas `:526-539` | Ya, “Halaman x / y” `:491-509` | Tahun/Kelompok/Unit/PIC `:64-72` | `Summary-Program-Kerja-...pdf` `:84-90` |
| `knowledgeExportPdf.ts` | **A4 landscape** tabel `:90-95`; **A4 portrait** record `:217-222` | Kanan atas `:420-432` | Ya, “Halaman x / y” `:455-476` | Tahun/Proyek `:99-103` | `Knowledge-<tipe>-<timestamp>.pdf` `:57-71` |

### F.2 Detail per exporter

**MSL**

- `jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })`: `:659`.
- Header dokumen: judul, subjudul, periode, tanggal export, garis aksen:
  `:546-583`.
- Legend kategori: `:585-587`.
- Footer dan running header halaman lanjutan: `:589-650`.
- `downloadMslPdf` memanggil `doc.save(mslPdfFileName(...))`: `:746-749`.
- Preview memakai object URL + `window.open`, revoke tertunda 60 detik:
  `:751-764`.

**Program Kerja (Kelola)**

- A3 landscape: `:93`.
- Filter line dan timestamp: `:37-52`.
- Header tabel tiga tingkat dan group separator di autoTable: `:117-211`.
- Tidak ada `getNumberOfPages`/footer nomor halaman; ini **gap konsistensi**.
- `doc.save(exportFileName(meta.yearFilter))`: `:216-218`.

**Program Kerja Summary**

- A3 landscape: `:515`.
- KPI, distribusi status, chart per kelompok, dan tabel program dirender sebagai
  beberapa section; tabel program memakai `showHead: "everyPage"`: `:480-493`.
- Nomor halaman: `:491-509`.
- `doc.save(exportFileName(meta.year, now))`: `:617-625`.

**Knowledge Management**

- Tabel A4 landscape: `:90-95`; record A4 portrait: `:217-222`.
- `drawDocumentTitle` menangani logo, judul, subjudul, filter line, tanggal, garis:
  `:413-453`.
- `drawFooters` menangani garis footer, brand, dan nomor halaman: `:455-476`.
- Empat wrapper: view/download tabel dan view/download record: `:363-407`.
- Nama file tabel dan record sengaja identik (timestamp detik): `:57-71`; risiko
  tabrakan dua unduhan pada detik yang sama sudah tercatat sebagai known limitation.

### F.3 Pola dynamic import

Semua exporter dimuat saat aksi PDF dipilih, bukan di bundle awal:

- MSL: `MslEngineeringPage.tsx:472`.
- Program Kerja Manage: `src/app/dashboard/program-kerja/manage/page.tsx:180`.
- Program Kerja Summary: `ProgramKerjaSummaryDashboard.tsx:251`.
- Knowledge tabel dan record: `KnowledgeTable.tsx:155, 536`.

Logo helper `loadWibexLogoDataUrl` diduplikasi di setiap exporter
(`mslExportPdf.ts:723`, `programKerjaExportPdf.ts:230`,
`programKerjaSummaryExportPdf.ts:595`, `knowledgeExportPdf.ts:549`). Ini pola yang
disengaja agar exporter existing tidak disentuh; P3 dapat mengikuti pola tersebut
atau mengekstrak helper baru tanpa merefaktor yang lama.

### F.4 Rekomendasi untuk MKS

- Gunakan **A4 landscape** untuk tabel master 6 disiplin; jika kolom sub-kategori dan
  item membuat lebar melebihi A4, gunakan **A3 landscape** seperti Program Kerja.
- Wajib ada footer nomor halaman; jangan mengulang gap `programKerjaExportPdf`.
- Sertakan filter line yang benar-benar aktif (disiplin/sub-kategori/pencarian) dan
  timestamp lokal.
- Nama file yang disarankan: `Metode-Kerja-Standar-<timestamp>.pdf`; jika per disiplin,
  `Metode-Kerja-Standar-<disiplin>-<timestamp>.pdf`.
- Gunakan dynamic import dan `loadWibexLogoDataUrl`; jangan menambah dependency PDF
  baru karena `jspdf` + `jspdf-autotable` sudah menjadi standar proyek.

---

## G. Audit F — RBAC / Permission

### G.1 Registry terpusat

**File:** `src/lib/auth/permissions.ts`

- Semua permission berupa konstanta string: `:24-58`.
- Mapping role non-Admin: `:63-105`.
- Admin adalah super-application: `hasPermission` mengembalikan `true` untuk semua
  permission feature-level: `:108-118`.
- Role yang tidak dikenal tidak pernah dianggap Admin: `:112-118`.
- Record-level rule tidak ditempatkan di registry; contoh RI Program Kerja berada di
  `src/lib/program-kerja/access.ts:37-51`.

Mapping yang relevan:

| Permission | Role non-Admin | Baris |
|---|---|---|
| `PROGRAM_KERJA_VIEW` | Head Office, Management | `:70` |
| `PROGRAM_KERJA_MANAGE` | Head Office | `:71` |
| `ENGINEERING_DATABASE_VIEW` | Head Office, Project, Management | `:83` |
| `ENGINEERING_DATABASE_MANAGE` | Head Office, Project | `:84` |
| `KNOWLEDGE_MANAGEMENT_VIEW` | Head Office, Project, Management | `:90` |
| `KNOWLEDGE_MANAGEMENT_MANAGE` | Head Office | `:91` |
| `MSL_VIEW` | Head Office | `:98` |

### G.2 Helper per modul

Setiap modul membungkus permission dengan helper yang aman diimpor Client Component:

- Program Kerja: `src/lib/program-kerja/access.ts:16-51`.
- Knowledge: `src/lib/knowledge-management/access.ts:11-31`.
- Engineering Database: `src/lib/engineering-database/access.ts:87-105`.
- Master Project: `src/lib/master-project/access.ts:8-21`.
- Template & Form: `src/lib/template-form/access.ts:8-13`.
- MSL: `src/lib/msl/access.ts:31-45` (role + capability).

### G.3 Penegakan berlapis

- Layout dashboard memeriksa autentikasi: `src/app/dashboard/layout.tsx:7-16`.
- Layout modul memeriksa permission dan redirect: contoh
  `src/app/dashboard/program-kerja/layout.tsx:7-17`,
  `src/app/dashboard/knowledge-management/layout.tsx:14-22`.
- API memakai `getActor` lalu service memeriksa akses; contoh
  `src/lib/program-kerja/summaryService.ts:53-59`.
- Sidebar memakai helper yang sama, bukan literal role:
  `DashboardSidebar.tsx:303-337`.
- Service tetap menjadi otoritas akhir; layout bukan pengganti API guard.

### G.4 Cara menambah permission MKS

Pola yang harus diikuti:

1. Tambah `METODE_KERJA_STANDAR_VIEW` dan `METODE_KERJA_STANDAR_MANAGE` di
   `PERMISSIONS`.
2. Tambah mapping role non-Admin di `NON_ADMIN_PERMISSION_ROLES`.
3. Buat `src/lib/metode-kerja-standar/access.ts` dengan `canView...` dan
   `canManage...`.
4. Pakai helper tersebut di layout, sidebar, API, dan service.
5. Tambah test permission/sidebar seperti `DashboardSidebar.test.ts`.

**Open question:** P1 belum menetapkan role MKS. Pilihan yang paling konsisten dengan
KM adalah Admin + Head Office manage, Management + Project view-only. Jika MKS hanya
internal Head Office, mapping harus lebih sempit. Keputusan ini wajib sebelum P3.

---

## H. Audit G — Sidebar

### H.1 Struktur menu

**File:** `src/components/dashboard/DashboardSidebar.tsx`

- Grup “DASHBOARD ADMIN” (Landing Page Manager) khusus Admin: `:376-427`.
- Grup “Core Enterprise” menampung seluruh modul: `:429-760`.
- Struktur Organisasi adalah item tunggal, bukan accordion: `:129-142, 435-443`.
- Program Kerja adalah accordion dengan dua item; **Summary Report berada di urutan
  pertama**: `:145-171`.
- Knowledge Management adalah accordion dengan tiga submenu: `:173-213`.
- Template & Form adalah item tunggal: `:215-229`.
- Master Project adalah accordion: `:231-243`.
- Engineering Databases adalah accordion; Summary Report berada di urutan pertama,
  diikuti MSL dan enam kategori: `:247-274`.
- “ADMINISTRASI” berisi User Directory: `:770-810`.

### H.2 State dan visibilitas

- `getSidebarVisibility` memetakan permission ke flag tampil: `:296-337`.
- Accordion state awal ditentukan pathname dan role: `:339-379`.
- Saat pathname berubah, accordion terkait dibuka: `:398-414`.
- Item aktif memakai `aria-current="page"` dan styling biru: `:434-455`.
- Render Program Kerja: `:570-617`; Knowledge: `:619-666`; Template: `:668-675`;
  Master Project: `:677-718`; Engineering: `:720-760`.

### H.3 Cara menambah MKS

Pola yang disarankan:

1. Tambah array `metodeKerjaMenu` dengan **Summary Report sebagai elemen pertama**,
   lalu submenu disiplin/master.
2. Tambah flag `showMetodeKerja` di `SidebarVisibility` dan
   `showCoreEnterprise`.
3. Tambah state accordion `metodeKerjaOpen` + deteksi pathname
   `/dashboard/metode-kerja-standar`.
4. Render accordion di dalam Core Enterprise, konsisten dengan Program Kerja.
5. Tambah test urutan submenu dan visibilitas role di `DashboardSidebar.test.ts`.

**Catatan:** jika P1 menghendaki disiplin A–F sebagai submenu, array tersebut dapat
dibangun dari konstanta kanonik (pola `ENGINEERING_DATABASE_CATEGORIES`), sehingga
label dan slug tidak dapat melenceng dari backend.

---

## I. Audit H — Validasi URL

### I.1 Knowledge Management — paling ketat

**File:** `src/lib/knowledge-management/schema.ts`

- `isSafeEvidenceUrl` mencoba `new URL()` dan hanya menerima protocol `http:` atau
  `https:`: `:38-46`.
- Field evidence memakai `.refine(isSafeEvidenceUrl)`: `:62-70`.
- Panjang maksimum 2048 karakter: `:60-61`.
- Ada CHECK constraint database: `src/lib/pg/schema.ts:351`.
- Test menolak `javascript:`: `src/lib/knowledge-management/knowledge.test.ts:177`.

### I.2 Engineering Database dan Template & Form

- Engineering: `isHttpUrl` + `.refine`: `src/lib/engineering-database/schema.ts:9-27`.
- Template: pola identik: `src/lib/template-form/schema.ts:17-33`.
- Pesan error: “File URL harus menggunakan http atau https”.

### I.3 Program Kerja — lebih lemah

**File:** `src/lib/program-kerja/schema.ts:80-87`

- Hanya memeriksa `startsWith("http://")` atau `startsWith("https://")`.
- Nilai seperti `https://` lolos tanpa host valid.
- UI juga hanya memeriksa prefix: `ProgramKerjaTable.tsx:234-240`.
- Ini bukan bug baru, tetapi **bukan pola yang boleh ditiru** untuk MKS.

### I.4 Clients — tidak ada validasi URL

**File:** `src/lib/clients/client.schema.ts:17, 34`

- `link` hanya string maksimum 500 karakter; tidak ada refine protocol.
- Jika MKS membutuhkan link referensi, jangan meniru pola ini.

### I.5 Rekomendasi untuk MKS

- Jika MKS menyimpan URL (evidence/referensi), gunakan `new URL()` + protocol
  whitelist seperti Knowledge, bukan `startsWith`.
- Untuk field opsional yang boleh kosong, gunakan refine yang mengizinkan string
  kosong secara eksplisit, misalnya `value === "" || isHttpUrl(value)`; jangan
  memaksa `.url()` yang menolak kosong bila field tidak wajib.
- Pertahankan pesan error Bahasa Indonesia dan tampilkan detail field dari API.
- Jangan menambah validasi hanya di client; schema server tetap otoritas.

---

## J. Audit I — Redirect Pattern

### J.1 Server component `redirect()`

- Dashboard layout: jika `UnauthenticatedError`, redirect ke `/login`:
  `src/app/dashboard/layout.tsx:7-16`.
- Root Program Kerja langsung redirect ke Summary:
  `src/app/dashboard/program-kerja/page.tsx:1-5`.
- Root Engineering Database redirect ke Summary:
  `src/app/dashboard/engineering-database/page.tsx:1-7`.
- Root Knowledge Management redirect ke Lesson Learn:
  `src/app/dashboard/knowledge-management/page.tsx:1-7`.
- Layout modul memeriksa user lalu permission:
  `program-kerja/layout.tsx:7-17`,
  `knowledge-management/layout.tsx:14-22`,
  `engineering-database/layout.tsx:8-24`.

### J.2 Client component

- Redirect client hanya dipakai untuk aksi, bukan guard halaman: logout memakai
  `router.replace("/login")` dan `router.refresh()`:
  `DashboardSidebar.tsx:416-432`.
- Halaman dashboard adalah Server Component; `redirect()` dipanggil sebelum render.

### J.3 Rekomendasi untuk MKS

- Buat `src/app/dashboard/metode-kerja-standar/page.tsx` sebagai Server Component
  yang langsung `redirect("/dashboard/metode-kerja-standar/summary")`.
- Letakkan guard auth + permission di `layout.tsx` namespace MKS, bukan di setiap page.
- Jangan memakai `useRouter().push()` untuk redirect awal; itu menyebabkan flash
  halaman kosong dan tidak terlindungi di server.
- Jika Summary adalah halaman default, pastikan root page tidak merender konten
  sendiri agar tidak ada dua sumber kebenaran.

---

## K. Rekomendasi Komponen Baru

### K.1 Komponen yang perlu dibuat

| Komponen/modul | Fungsi | Alasan belum ada |
|---|---|---|
| `MetodeKerjaTable.tsx` | Tabel 3 level, header disiplin full-width, indentasi sub-kategori/item, empty state per disiplin | Tidak ada tabel berjenjang |
| `MetodeKerjaFormDialog.tsx` | Modal create/edit sub-kategori dan item | Modal KM tidak generik |
| `PicMultiSelect.tsx` | Checklist PIC dengan search, label non-aktif, validasi minimal | Dua implementasi PIC berbeda |
| `MetodeKerjaSummaryPage.tsx` | Ringkasan jumlah/status per disiplin | Summary existing berbasis program/project |
| `metodeKerjaExportPdf.ts` | Export tabel/summary MKS | Tidak ada exporter MKS |
| `src/lib/metode-kerja-standar/access.ts` | View/manage MKS | Namespace permission baru |
| `src/lib/metode-kerja-standar/schema.ts` | Validasi create/update sub-kategori/item | Schema baru |
| `src/lib/metode-kerja-standar/service.ts` + repository | Akses data dan aturan hapus/urut | Domain baru |
| `src/app/api/metode-kerja-standar/...` | CRUD + PIC options + summary | API baru |

### K.2 Komponen existing yang dapat di-reuse

| Existing | Reuse untuk MKS | Catatan |
|---|---|---|
| `PERMISSIONS` + `hasPermission` | Permission MKS | Tambah dua konstanta dan mapping |
| `getSidebarVisibility` | Visibilitas menu | Tambah flag dan test |
| Pola modal `KnowledgeFormDialog` | Form sub-kategori/item | Copy pola atau ekstrak |
| `KnowledgeDeleteDialog` | Konfirmasi hapus | Pola body lock/focus trap |
| Pola PIC KM | `PicMultiSelect` | Search + label non-aktif |
| `ProgramKerjaSummaryDashboard` | Arsitektur summary | Domain dan chart disesuaikan |
| `EngineeringDatabaseSummaryPage` | Summary satu payload tanpa filter | Jika MKS summary sederhana |
| Pola exporter Knowledge/MSL | PDF MKS | Footer, logo, filter line, dynamic import |
| Root redirect Program Kerja | Landing MKS | Salin pola 4 baris |
| `Section` card di `ProgramKerjaForm.tsx:89-105` | Pembungkus section form | Saat ini lokal; ekstrak bila perlu |

### K.3 Komponen existing yang perlu diekstrak (opsional, bukan prasyarat)

| Ekstraksi | Dari | Manfaat | Risiko |
|---|---|---|---|
| `FormDialog` generik | `KnowledgeFormDialog` | Menghindari duplikasi modal | Menyentuh modul KM yang baru diuji |
| `PicMultiSelect` | `KnowledgeFormDialog` + `ProgramKerjaForm` | Konsistensi PIC | Perlu test regresi dua modul |
| `PdfBranding`/`loadWibexLogoDataUrl` | Empat exporter | Satu sumber header/footer | Refactor exporter existing |
| `FormSection` | `ProgramKerjaForm` | Konsisten antar form | Perubahan kecil pada form existing |

Untuk implementasi MKS, **prioritaskan komponen baru yang terisolasi**. Ekstraksi
komponen existing hanya dilakukan jika Owner secara eksplisit mengizinkan refactor
modul lain.

---

## L. Risiko dan Open Questions untuk P3

### L.1 Risiko teknis

1. **Tabel 3 level belum terbukti.** `rowSpan` + header group + indentasi + horizontal
   scroll berpotensi menghasilkan kolom tidak sejajar. P3 harus menetapkan struktur
   `<thead>/<tbody>` dan lebar kolom sebelum coding.
2. **Sticky header.** Belum ada implementasi sticky di seluruh dashboard. Menambahkan
   sticky pada tabel lebar memerlukan perhatian pada z-index, border, dan group row.
3. **CRUD berjenjang.** Menghapus sub-kategori yang masih memiliki item, atau
   menghapus disiplin yang masih memiliki sub-kategori, harus punya aturan eksplisit
   (block vs cascade). Jangan mengandalkan `ON DELETE CASCADE` tanpa keputusan produk.
4. **Urutan item.** P1 tidak menyebut mekanisme ordering. Tanpa `sort_order`, urutan
   bergantung pada `created_at`/ID dan dapat berubah setelah edit.
5. **Enam disiplin hardcoded.** Konstanta A–F aman untuk label, tetapi sub-kategori dan
   item harus persisted. Perlu diputuskan apakah disiplin disimpan sebagai tabel
   reference atau hanya enum/konstanta.
6. **PIC inactive.** Jika memakai pola KM, user suspended tetap dapat dipilih dan
   diberi label. Jika MKS tidak menghendaki PIC non-aktif, endpoint harus memfilter
   status dan UI tidak perlu label.
7. **PDF A3 vs A4.** Program Kerja memakai A3; MSL dan Knowledge memakai A4. MKS harus
   memilih sadar, bukan mengikuti kebetulan exporter terdekat.
8. **Duplikasi modal.** Menyalin 300+ baris modal KM menambah utang teknis; mengekstrak
   berisiko regresi. P3 perlu memilih salah satu dan mencatat konsekuensinya.
9. **Konsistensi permission.** Jika MKS memakai nama permission baru tetapi lupa
   menambahkannya ke sidebar/API/service, akan ada permukaan yang tidak terlindungi.
   Test permission wajib.
10. **Data master vs per-project.** P1 menegaskan MKS adalah master reference, bukan
    per-project. Jangan meminjam skema Knowledge yang berelasi ke Master Project.

### L.2 Open questions

1. **Role MKS:** siapa yang boleh view dan manage? Apakah Management/Project hanya
   view, atau MKS internal Head Office saja?
2. **Kardinalitas PIC:** satu PIC atau multi-PIC? Apakah PIC wajib?
3. **Status PIC:** apakah user non-aktif boleh tetap menjadi PIC (pola KM) atau harus
   diblokir?
4. **Isi Summary Report:** KPI apa yang dihitung? Jumlah sub-kategori/item per disiplin,
   status kelengkapan, atau daftar item terbaru?
5. **Filter Summary:** berdasarkan disiplin, sub-kategori, PIC, atau teks?
6. **Penghapusan:** block jika masih ada child, cascade, atau soft delete?
7. **Urutan:** alphabetical, `sort_order` manual, atau urutan input?
8. **“F. Lainnya”:** apakah disiplin ini selalu ada, boleh kosong, dan apakah
   sub-kategori baru otomatis masuk ke sana?
9. **PDF:** apakah perlu export Summary, tabel penuh, atau keduanya? Format A4/A3?
10. **Landing:** apakah root MKS harus selalu ke Summary, termasuk saat user hanya
    punya akses view?
11. **Audit trail:** apakah MKS membutuhkan `created_by`/`updated_by` seperti KM?
12. **URL:** apakah MKS menyimpan link evidence/referensi? Jika tidak, audit H hanya
    relevan untuk masa depan.

---

## M. Verification

Audit ini tidak mengubah source, migration, `schema.ts`, database, atau konfigurasi.
Verifikasi yang dilakukan pada baseline `ea70ba2`:

- `git status --short src/` — **kosong**; tidak ada source yang berubah.
- `git status --short docs/` — hanya `docs/design/MKS_P2_AUDIT.md` yang baru.
- `git status --short migrations src/lib/pg/schema.ts` — **kosong**; tidak ada
  migration atau schema database yang berubah.
- `git diff --check` — bersih.
- Tidak ada commit, push, deploy, atau operasi database.

**Status handoff:** audit selesai. Jika Owner/ChatGPT menyatakan **PASS**, lanjut ke P3
Technical Design. Jika **CONDITIONAL**, revisi bagian yang ditandai.
