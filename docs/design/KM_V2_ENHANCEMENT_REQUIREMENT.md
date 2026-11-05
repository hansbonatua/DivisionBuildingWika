# KNOWLEDGE MANAGEMENT V2 — ENHANCEMENT REQUIREMENT (F-01…F-04)

**Project:** BDWIKA / WIBEX
**Fase:** P1 Requirement + P2 Audit (belum desain, belum implementasi)
**Tanggal:** 5 November 2026
**Baseline:** `main` @ `303ca9b` (KM V2 ter-commit & push)
**Status:** OWNER DECISIONS APPLIED — 4 keputusan final tercatat; **P3 belum dimulai**
**Source code / migration / database / test:** TIDAK diubah, TIDAK dijalankan

> Dokumen ini adalah requirement + audit pola existing. Tidak ada klaim yang
> tanpa rujukan `file:line`. Hal yang belum dapat dipastikan ditandai
> **BELUM DIKETAHUI**, bukan diasumsikan.

---

## 1. Ringkasan

KM V2 saat ini menampilkan tabel record per kategori dengan aksi **Edit** saja
(`KnowledgeTable.tsx:342-355`), tanpa filter, dan tanpa cara membaca content
panjang selain kolom tabel. Empat enhancement yang diminta:

| ID | Fitur | Tujuan |
|---|---|---|
| F-01 | Modal **Lihat** (read-only) | Membaca satu record utuh tanpa membuka form edit |
| F-02 | **Download PDF** | Membagikan/mengarsipkan record atau tabel dalam format cetak |
| F-03 | **Filter tahun** | Memfokuskan tabel pada satu tahun Master Project |
| F-04 | **Search dropdown proyek** | Memfokuskan tabel pada satu Master Project |

Keempatnya adalah enhancement tampilan/komunikasi data. **Tidak ada perubahan
model data, migration, atau aturan bisnis V2.**

### 1.1 Rekomendasi eksekutif

| ID | Rekomendasi | Alasan singkat |
|---|---|---|
| F-01 | Komponen baru `KnowledgeViewDialog` + modifikasi kolom Aksi `KnowledgeTable` (D-KM-ENH-04), bukan mode baru di `KnowledgeFormDialog` | Form existing 900+ baris dengan dirty-tracking, PIC fetch, submit, delete; kolom Aksi saat ini hanya untuk Manage sehingga role View tak punya tombol |
| F-02 | **Keduanya** (D-KM-ENH-01): tabel terfilter **primary**, per-record menyusul | Mengikuti preseden MSL/Program Kerja yang mengekspor "apa yang tampil"; tombol di modal Lihat juga diminta Owner |
| F-03 | **Client-side**, opsi dari record yang sudah dimuat (D-KM-ENH-02) | < 100 record/halaman, tanpa endpoint baru; hindari tahun tanpa record |
| F-04 | **Single-select** (D-KM-ENH-03), opsi dari record yang sudah dimuat + aksi "Semua proyek" | `project-options` existing **Manage-only** (`service.ts:410`) dan `LIMIT 50` (`repository.ts:415,420`), tidak layak untuk role read-only |

## Owner Decisions (5 November 2026)

| ID | Keputusan | Konsekuensi |
|---|---|---|
| D-KM-ENH-01 | PDF per-record + tabel | Dua varian, tabel **primary** |
| D-KM-ENH-02 | Tahun dari record | Dropdown client-side, bukan `master_projects.year` |
| D-KM-ENH-03 | Filter proyek single-select | UI lebih sederhana, tanpa chip/multi-pilih |
| D-KM-ENH-04 | `KnowledgeTable.tsx` dimodifikasi | Kolom Aksi selalu dirender; Edit kondisional, Lihat selalu |

Keputusan ini final dan tidak dapat diubah tanpa revisi requirement terpisah.

---

## 2. Scope

### 2.1 In-scope

- F-01 Modal read-only: project, kategori, content penuh, seluruh PIC, evidence, record history; hanya **Tutup** (+ **Download PDF** bila F-02).
- F-02 Export PDF **dua varian** (D-KM-ENH-01): F-02b seluruh tabel (primary) + F-02a per-record, mengikuti library & gaya existing.
- F-03 Filter tahun (single-select, default semua tahun; opsi dari record — D-KM-ENH-02).
- F-04 Filter Master Project (searchable, **single-select** — D-KM-ENH-03, default semua proyek), kombinasi **AND** dengan F-03.
- **Modifikasi resmi `KnowledgeTable.tsx`** (D-KM-ENH-04): kolom Aksi selalu dirender, Edit kondisional untuk Manage, Lihat selalu untuk role View; ringkasan jumlah record mengikuti filter.

### 2.2 Out-of-scope (eksplisit)

- Pagination (client atau server) — H.5 masih berlaku.
- Export Excel/CSV, print stylesheet, copy-to-clipboard.
- Sorting kolom, column chooser/resize, saved views.
- Bulk select / bulk delete / bulk export.
- Filter PIC, evidence, pembuat, tanggal, atau full-text content.
- Perubahan RBAC, endpoint baru, migration, perubahan `schema.ts`.
- Perubahan pada `KnowledgeFormDialog` selain pemakaian ulang combobox; `KnowledgeTable.tsx` **boleh** diubah terbatas pada kolom Aksi (D-KM-ENH-04).
- Multi-select proyek, chip/tag filter, atau filter kategori (D-KM-ENH-03).
- Deep-link/URL state untuk filter (kecuali diputuskan lain di §5).
- Refactor exporter MSL/Program Kerja (duplikasi `loadWibexLogoDataUrl` dibiarkan; lihat §3.1).

---

## 3. Audit pola existing (P2)

### 3.1 PDF Export

**Library & versi.** `jspdf ^4.2.1` + `jspdf-autotable ^5.0.9`
(`package.json:16-17`), keduanya direct dependency, sudah dipakai tiga exporter:

| File | Orientasi/format | Ciri | Trigger |
|---|---|---|---|
| `mslExportPdf.ts` (764 baris) | A4 **landscape**, margin 12 mm (`:46`, `:659`) | Tema `plain`, garis horizontal saja, header navy + aksen, legend chip, footer "Halaman x / y", note tahunan | `MslEngineeringPage.tsx:472` dynamic import; menu PDF `:510-599` |
| `programKerjaExportPdf.ts` (270 baris) | A3 **landscape** (`:91-93`) | Tema `grid`, header 3 tingkat + `rowSpan`/`colSpan`, filter line, logo kanan atas | `program-kerja/manage/page.tsx:180`; menu `:354-380` |
| `programKerjaSummaryExportPdf.ts` (642 baris) | A3 landscape | Multi-section (KPI, chart ringkas, tabel program), filter line `Tahun/Kelompok/Unit/PIC` (`:70-77`), page number (`:492-510`) | `ProgramKerjaSummaryDashboard.tsx:251` |

**Konvensi bersama yang konsisten:**

1. **Dynamic import** saat tombol diklik, agar jsPDF tidak masuk initial bundle
   (`MslEngineeringPage.tsx:471-473`; komentar `mslExportPdf.ts:18-21`).
2. **Logo** `/asset/logo-top.png` → data URL, di-skip bila gagal
   (`mslExportPdf.ts:723-742`); helper `loadWibexLogoDataUrl` **diduplikasi 3×**
   (`mslExportPdf.ts:723`, `programKerjaSummaryExportPdf.ts:595`,
   `programKerjaExportPdf.ts:230`).
3. **Header dokumen**: judul bold + subjudul + periode/filter + "Tanggal export"
   + garis aksen; **footer** merek + `Halaman x / y` di setiap halaman
   (`mslExportPdf.ts:614-676`).
4. **Data yang diekspor = state layar** (tahun/bulan/filter aktif), tanpa request
   tambahan (`MslEngineeringPage.tsx:465-470`).
5. **Dua aksi**: `view` (blob → tab baru, revoke ≤ 60 s) dan `download`
   (`doc.save`) — `mslExportPdf.ts:744-764`.
6. **Nama file** memuat scope + timestamp `YYYYMMDD-HHMMSS`
   (`mslExportPdf.ts:200-207`).
7. Warna di-hardcode sebagai RGB token dashboard; tidak ada Tailwind di PDF
   (`mslExportPdf.ts:62-100`).

**Rekomendasi KM.** Buat **satu** file
`src/components/dashboard/knowledge-management/knowledgeExportPdf.ts` berisi
`buildKnowledgeRecordPdf` (A4 **portrait**) dan `buildKnowledgeTablePdf`
(A4 **landscape**, 7 kolom), plus `download…`/`view…`. Ikuti konvensi di atas
(dynamic import, logo, footer halaman, nama file
`Knowledge-<kategori>-<scope>-<timestamp>.pdf`). **Jangan** merefactor tiga
exporter lama pada P3 ini; salin pola, catat duplikasi logo sebagai tech debt.
Alasan: perubahan lintas modul berisiko regresi pada modul yang sudah PASS dan
di luar scope enhancement.

### 3.2 Searchable dropdown

Ada **dua** implementasi combobox, keduanya tanpa library (native `input` +
`role="combobox"`/`listbox`):

| Aspek | KM (`KnowledgeFormDialog.tsx:144-357`) | Engineering DB (`EngineeringDatabaseProjectCombobox.tsx:33-340`) |
|---|---|---|
| Endpoint | `/api/knowledge-management/project-options` (`:186`) | `/api/engineering-database/project-options` (`:100`) |
| DTO | `{ project_id, name, location, year }` | `{ id, name, location }` |
| Debounce | 250 ms (`:170`) | 300 ms (`:79-84`) |
| Race handling | `AbortController` + `requestIdRef` (`:183-241`) | idem (`:87-146`) |
| Keyboard | Arrow/Enter/Escape (`:245-277`) | + Tab menutup (`:170-207`) |
| Clear | ✗ (hanya ganti pilihan) | ✓ tombol X (`:212-232`) |
| Limit notice | ≥ 50 → pesan (`:345-350`) | idem (`:321-326`) |
| Accessibility | `aria-expanded/controls/autocomplete/activedescendant` (`:261-276`) | idem + `aria-invalid` (`:185-200`) |
| Ekspor | **tidak diekspor** (fungsi privat) | `export default` |

**Rekomendasi KM.** Ekstrak combobox KM menjadi
`KnowledgeProjectCombobox.tsx` yang dapat dipakai form **dan** filter, dengan
prop `value/onChange/allowClear`. Untuk filter, opsi berasal dari **record yang
sudah dimuat** (distinct project), bukan endpoint. Ini menghindari dua masalah
nyata: (a) `listKnowledgeProjectOptions` memanggil `assertManageAccess`
(`service.ts:410`) sehingga Management/Project akan 403; (b) `LIMIT 50`
(`repository.ts:415,420`) membuat proyek tertentu tak terjangkau tanpa mengetik.
Alasan memilih single-select: filter tabel satu nilai, rowspan per project, dan
multi-select menuntut chip + logika "semua" yang tidak diminta.

**BELUM DIKETAHUI:** apakah Owner menginginkan filter proyek multi-select.
Lihat Q-04.

### 3.3 Filter

| Modul | Sumber opsi | Sisi | UI | Bukti |
|---|---|---|---|---|
| Program Kerja (Kelola) | `availableYears` dari data ter-muat | **Client** (`useMemo`, AND dengan search/group/unit) | Toolbar: search + 3 `select` native, "Semua Tahun" | `program-kerja/manage/page.tsx:38,250-266,441-455` |
| Program Kerja Summary | `summary.options.years` dari API | **Server** (query param) | Grid filter 4 kolom + tombol Reset | `ProgramKerjaSummaryDashboard.tsx:278-286,414-431` |
| MSL Engineering | `yearOptions` dari API | **Server** | `select` tahun di header | `MslEngineeringPage.tsx:584-600` |
| Engineering Database Summary | — | — | **tidak ada filter** | `EngineeringDatabaseSummaryPage.tsx` |

**Rekomendasi KM.** Client-side, karena: daftar record per halaman kecil
(rekomendasi < 100), sudah dimuat seluruhnya oleh `GET /api/knowledge-management`
(`KnowledgeTable.tsx:63-66`), dan filter client-side tidak menambah round-trip
atau endpoint. Pakai toolbar kartu + `select` native seperti Program Kerja
Kelola (`:404-455`), tetapi **opsi tahun diturunkan dari record**, bukan dari
seluruh `master_projects.year`: tahun tanpa record akan menghasilkan tabel kosong
dan terasa seperti bug. Konsekuensi ini perlu keputusan Owner (Q-03).

**Catatan penting.** Ringkasan "`N record pada M Master Project`"
(`KnowledgeTable.tsx:133`) harus dihitung dari hasil filter, bukan data
mentah; jika tidak, angka bertentangan dengan isi tabel.

### 3.4 Kendala existing yang memengaruhi requirement

| # | Temuan | Bukti | Dampak |
|---|---|---|---|
| K-1 | Kolom **Aksi** hanya dirender untuk `canManage` | `KnowledgeTable.tsx:248-251,342-355` | Role Management/Project (View-only) **tidak punya kolom aksi**, jadi tombol Lihat tidak muncul tanpa mengubah kondisi render |
| K-2 | Tombol Edit ada di kolom Aksi, bukan per-baris terpisah | `:556-563` | F-01 harus menambah tombol di sel yang sama; layout `whitespace-nowrap` perlu diuji |
| K-3 | `project-options` **Manage-only** | `service.ts:406-417` | Filter proyek tidak boleh bergantung pada endpoint ini untuk role View |
| K-4 | `project-options` `LIMIT 50` | `repository.ts:403-431` | Daftar proyek tidak lengkap untuk dropdown filter |
| K-5 | List API mengembalikan **content penuh**, bukan potongan | `repository.ts:56-111`; `route.ts:14-37` | Modal Lihat tidak perlu request tambahan; payload maksimum 20.000 char/record |
| K-6 | PDF existing mengekspor **seluruh** data terfilter, bukan per-baris | `MslEngineeringPage.tsx:465-470`; `program-kerja/manage/page.tsx:178-190` | Tidak ada preseden PDF per-record; F-02 per-record adalah pola baru (tetap memakai library yang sama) |
| K-7 | Rowspan dihitung dari grouping record | `types.ts:49-72`; `KnowledgeTable.tsx:108,271` | Filter harus dilakukan **sebelum** grouping agar rowspan benar |
| K-8 | Tidak ada test UI/E2E | `package.json:11` (`node --test` hanya `*.test.ts`) | Acceptance F-01…F-04 diverifikasi manual di browser, bukan automated |

---

## 4. Spesifikasi per fitur

### F-01 — Modal Lihat (read-only)

**Deskripsi.** Tombol **Lihat** (ikon mata + teks) di kolom Aksi, di samping
Edit, membuka modal read-only berisi snapshot record.

**User journey.**

1. Semua role dengan `KNOWLEDGE_MANAGEMENT_VIEW` (Admin, Head Office,
   Management, Project — `access.ts`) melihat kolom Aksi dan tombol Lihat.
2. Hanya Admin/Head Office yang juga melihat **Edit**; Management/Project hanya
   **Lihat**. Ini menutup K-1.
3. Klik Lihat → modal `role="dialog"` `aria-modal="true"`, fokus awal ke tombol
   Tutup, fokus terperangkap, `Esc` dan klik backdrop menutup, `body` overflow
   dikunci — pola `KnowledgeDeleteDialog.tsx:41-86`.
4. Isi modal: badge kategori; **Project** (nama, lokasi, tahun); **Kategori**;
   **Content** penuh (`whitespace-pre-wrap`, area scroll, tanpa `line-clamp`);
   **PIC** semua (chip/badge, status non-aktif ditandai); **Evidence** tautan
   aktif `target="_blank" rel="noopener noreferrer"`; **Record History**
   Created By/Date dan Updated By/Date (`—` bila belum pernah diubah).
5. Footer: **Tutup** (primary-secondary sesuai tema) + **Download PDF**
   (F-02a, D-KM-ENH-01). Tidak ada Save/Hapus.
6. Tidak ada request jaringan: data berasal dari `KnowledgeRecordDto` baris.

**Acceptance criteria.**

- AC-01: Tombol Lihat tampil untuk keempat role; Edit hanya untuk role Manage.
- AC-02: Modal menampilkan seluruh content (record 20.000 karakter dapat
  digulir sampai karakter terakhir; tidak ada elipsis).
- AC-03: Seluruh PIC tampil; PIC non-aktif diberi penanda.
- AC-04: Evidence dapat diklik dan membuka tab baru.
- AC-05: `Esc`, backdrop, dan Tutup menutup modal; fokus kembali ke tombol Lihat.
- AC-06: Tidak ada tombol yang memutasi data di modal.
- AC-07: Modal tidak memicu `GET /api/knowledge-management/[id]` (dibuktikan di
  Network tab).
- AC-08: Tidak ada horizontal scroll pada viewport 360 px (modal full-width,
  konten membungkus).

**Pola.** Shell dialog dari `KnowledgeDeleteDialog.tsx`; tipografi dari
`KnowledgeFormDialog.tsx` (label uppercase, `formatKnowledgeDate`,
`EMPTY_VALUE`). Komponen baru `KnowledgeViewDialog.tsx`.

#### Perubahan `KnowledgeTable.tsx` (D-KM-ENH-04)

- Kolom Aksi **selalu dirender** untuk semua role (bukan hanya `canManage`).
- **Edit**: kondisional, hanya `canManage` (Admin, Head Office).
- **Lihat**: selalu muncul untuk semua role dengan `KNOWLEDGE_MANAGEMENT_VIEW`
  (Admin, Head Office, Management, Project).
- Referensi existing: `KnowledgeTable.tsx:248-251` (header Aksi) dan
  `:342-355` (sel aksi + tombol Edit). Perubahan: dari "tidak render untuk
  non-Manage" menjadi "selalu render, Edit kondisional".
- **Alasan:** F-01 membutuhkan tombol Lihat untuk role View-only, tetapi kolom
  Aksi saat ini hanya ada saat `canManage` (K-1). Tanpa perubahan ini, fitur
  Lihat tidak dapat diakses Management/Project.
- Modifikasi ini **bagian resmi scope P4**, bukan opsional; tidak mengubah
  aturan izin, hanya visibilitas kolom.

---

### F-02 — Download PDF (D-KM-ENH-01: dua varian)

**Keputusan Owner.** F-02 mencakup **dua** varian dengan satu exporter:
**F-02b seluruh tabel = primary** (dikerjakan lebih dulu), **F-02a per-record =
menyusul atau bersamaan**. Keduanya memakai `knowledgeExportPdf.ts` dan
konvensi jsPDF + autotable (§3.1).

#### F-02b — Seluruh tabel (primary)

**Deskripsi.** Menu **PDF** di page header dengan dua item **View PDF** /
**Download PDF** (pola `MslEngineeringPage.tsx:553-599`), satu dokumen A4
**landscape** dengan kolom: No, Master Project, Knowledge Content, PIC,
Evidence, Record History. Data = hasil filter F-03/F-04 saat itu; header
mencetak filter aktif (pola `programKerjaExportPdf.ts:26-40`).

**User journey.** Klik PDF → dynamic import → logo dimuat → dokumen dibangun
dari state di memori → tab baru (view) atau unduh. Tombol disabled saat memuat,
export berjalan, atau tabel kosong.

**Acceptance criteria (F-02b).**

- AC-09: PDF dibangun tanpa request API tambahan (hanya logo).
- AC-10: Nama file memuat kategori + scope + timestamp, mis.
  `Knowledge-Lesson-Learn-2026-20261105-153000.pdf`.
- AC-11: Setiap halaman memiliki footer merek + `Halaman x / y`.
- AC-12: PDF tabel memuat **hanya** baris yang lolos filter aktif, dan header
  mencantumkan tahun/proyek terpilih ("Semua" bila kosong).
- AC-13: Content panjang membungkus dan tidak terpotong; baris tidak terbelah
  antar halaman (`rowPageBreak: "avoid"`).
- AC-14: PDF tabel memuat seluruh PIC tiap record dalam satu sel, dipisah baris
  dan tidak terpotong.
- AC-15: Bila logo gagal dimuat, PDF tetap terbentuk tanpa logo (tanpa error ke
  pengguna).
- AC-16: Export tidak berjalan saat tabel kosong; tombol disabled.

#### F-02a — Per-record (menyusul)

**Deskripsi.** Tombol **Download PDF** di footer `KnowledgeViewDialog` (F-01),
menghasilkan satu halaman A4 **portrait**: project (nama, lokasi, tahun),
kategori, content, seluruh PIC, evidence (nama + URL), dan record history.

**User journey.** Dari modal Lihat → klik Download PDF → dynamic import → logo
→ PDF satu record diunduh; modal tetap terbuka dan tidak ada perubahan data.

**Acceptance criteria (F-02a).**

- AC-30: Tombol Download PDF tampil di modal Lihat untuk semua role View dan
  tidak memutasi data.
- AC-31: PDF memuat project (nama, lokasi, tahun), kategori, content, seluruh
  PIC, evidence (nama + URL), serta Created/Updated By dan tanggalnya.
- AC-32: Dokumen A4 portrait dengan footer merek + `Halaman x / y`.
- AC-33: Nama file memuat kategori + nama project + timestamp, mis.
  `Knowledge-Lesson-Learn-Tower-A-20261105-153000.pdf`.
- AC-34: Content 20.000 karakter tercetak utuh (membungkus, tidak terpotong).
- AC-35: URL evidence tercetak lengkap dan dapat dibaca (wrap), bukan terpotong
  di tepi halaman.
- AC-36: PDF dibangun dari DTO record di memori, tanpa `GET /api/knowledge-management/[id]`.
- AC-37: Bila logo gagal dimuat, PDF tetap terbentuk tanpa logo.

**Pola.** `mslExportPdf.ts` untuk header/footer/logo/view-download; F-02b `theme:
"plain"` + garis horizontal untuk estetika dashboard; F-02a layout satu kolom.
`rowSpan` project **tidak** dipertahankan di PDF tabel — nama project diulang
per baris (atau ditandai "↳") agar aman saat page break (Q-02 masih terbuka).

---

### F-03 — Filter tahun

**Deskripsi.** `select` "Tahun" di toolbar atas tabel; opsi = tahun unik dari
record yang dimuat, urut **DESC** (tahun terbaru dulu); default **Semua tahun**
(`value=""`).

**Sumber opsi (D-KM-ENH-02).** Hanya tahun yang **memiliki record** pada data
ter-muat. Bukan distinct `master_projects.year`, bukan endpoint baru, dan bukan
query server. Alasan: tahun tanpa record akan menghasilkan tabel kosong yang
terlihat seperti bug.

**User journey.** Pilih tahun → tabel langsung menyaring (tanpa loading), rowspan
dihitung ulang, nomor urut mulai 1, ringkasan `N record pada M Master Project`
ikut berubah; kombinasi dengan F-04 memakai **AND**. Bila hasil kosong, tampilkan
empty state "Tidak ada record untuk filter yang dipilih" + tombol **Reset
filter**.

**Acceptance criteria.**

- AC-17: Default menampilkan seluruh record.
- AC-18: Memilih tahun hanya menampilkan record dengan `project.year` tersebut.
- AC-19: Rowspan tiap project = jumlah record project itu **setelah** filter.
- AC-20: Nomor urut dan ringkasan jumlah konsisten dengan hasil filter.
- AC-21: Kombinasi tahun + proyek = irisan (AND), bukan gabungan.
- AC-22: Reset mengembalikan kedua filter ke "Semua" dan memulihkan tabel penuh.
- AC-23: Tidak ada request jaringan saat filter berubah.

**Pola.** Toolbar & `select` dari `program-kerja/manage/page.tsx:404-455`;
filter client-side `useMemo` (`:250-266`); grouping ulang lewat
`groupKnowledgeRecords` (`types.ts:49-72`).

---

### F-04 — Search dropdown proyek

**Deskripsi.** Combobox searchable single-select di toolbar; opsi = Master
Project unik dari record yang dimuat, label `Nama — Lokasi (Tahun)`; tombol X
untuk kembali ke **Semua proyek**; pencarian mencocokkan nama **dan** lokasi
(case-insensitive, substring).

**Keputusan Owner (D-KM-ENH-03): single-select final.** Tidak ada multi-select,
chip, tag, atau pilihan ganda. Satu proyek aktif pada satu waktu; memilih proyek
lain menggantikan pilihan sebelumnya; reset hanya lewat X/"Semua proyek".

**User journey.** Fokus → daftar terbuka (maks. tinggi 64), ketik → filter
in-memory, Arrow/Enter/Escape berfungsi, pilih → tabel menyaring; X atau Escape
saat tertutup mengosongkan pilihan. Tidak ada fetch.

**Acceptance criteria.**

- AC-24: Dropdown dapat dibuka keyboard dan mouse (role combobox/listbox,
  `aria-activedescendant`).
- AC-25: Mengetik "jakarta" mencocokkan lokasi; "tower" mencocokkan nama.
- AC-26: Memilih proyek hanya menampilkan record proyek itu; rowspan menjadi
  satu sel setinggi jumlah record-nya.
- AC-27: X/"Semua proyek" mengosongkan filter dan mempertahankan filter tahun.
- AC-28: Tidak ada request jaringan; opsi berasal dari record ter-muat.
- AC-29: Bila tidak ada hasil pencarian, tampil pesan "Tidak ada proyek yang
  cocok" (bukan daftar kosong tanpa penjelasan).
- AC-29a: Tidak ada kontrol multi-pilih, chip, atau tag; memilih proyek kedua
  menggantikan proyek pertama (bukan menambah).

**Pola.** Ekstraksi combobox KM (`KnowledgeFormDialog.tsx:144-357`) + tombol
clear dari `EngineeringDatabaseProjectCombobox.tsx:212-232`.

**Catatan keputusan.** Alternatif "pakai endpoint `project-options`" ditolak
untuk v1 karena K-3/K-4; jika Owner ingin proyek tanpa record tetap dapat
dipilih, endpoint harus diberi izin View dan batas baru — itu perubahan API di
luar scope P1/P2.

---

## 5. Dampak ke desain V2

| Area | Dampak | Perlu revisi desain? |
|---|---|---|
| **H.3 Filter** (`DESIGN:844-852`) | Desain sudah menyatakan filter menghitung ulang `rowSpan` dan tidak mempertahankan span lama — persis yang dibutuhkan. Tambahan: filter dilakukan sebelum grouping; definisi "record count" mengikuti hasil filter | **Tidak** — hanya penegasan implementasi |
| **H.5 Pagination** (`:865-875`) | Tetap tanpa pagination; filter client-side justru mengurangi baris. Tidak ada rowspan lintas halaman | **Tidak** |
| **API** | Tidak ada endpoint/query param baru; F-01 memakai DTO list, F-02 client-side, F-03/F-04 in-memory sesuai D-KM-ENH-02/03 | **Tidak** |
| **Rowspan** | Grup dibentuk dari koleksi terfilter; `rowSpan = group.records.length`; nomor urut global dihitung ulang; project dengan 1 record = `rowSpan=1` | **Tidak** |
| **Kolom Aksi** | **Bagian resmi scope P4 (D-KM-ENH-04):** selalu dirender; Edit kondisional `canManage`, Lihat selalu (View permission) — perubahan pada `KnowledgeTable.tsx:248-251,342-355` | **Ya, terbatas** — bukan opsional |
| **Header tabel** | Tombol PDF + toolbar filter menambah tinggi header; layout `flex` existing (`:160-205`) perlu diubah menjadi dua baris (judul/aksi, lalu toolbar filter) | **Ya, minor** |
| **Modal** | Komponen baru; tidak mengubah `KnowledgeFormDialog` | **Ya, aditif** |
| **Test** | Tidak ada harness UI otomatis (K-8); acceptance manual | **Ya** — rencana verifikasi P3 |

**Kesimpulan:** tidak ada arsitektur baru, migration, atau endpoint baru.
Revisi desain bersifat aditif (komponen baru) **plus satu modifikasi resmi**
`KnowledgeTable.tsx` untuk kolom Aksi (D-KM-ENH-04).

---

## 6. Keputusan Owner & Open Questions

### 6.1 DECIDED by Owner (5 November 2026)

| ID | Keputusan | Konsekuensi | Ref |
|---|---|---|---|
| Q-01 | **Keduanya** (per-record + tabel); tabel = primary | F-02a + F-02b; urutan tabel dulu | D-KM-ENH-01 |
| Q-03 | **Tahun yang punya record** | Dropdown client-side dari data ter-muat | D-KM-ENH-02 |
| Q-04 | **Single-select** | Tanpa multi-select/chip/tag | D-KM-ENH-03 |
| Q-09 | **Ya**, tombol Lihat selalu muncul | Kolom Aksi selalu dirender; Edit kondisional | D-KM-ENH-04 |

### 6.2 Masih terbuka (boleh dijawab di P3)

| ID | Pertanyaan | Default rekomendasi | Alasan |
|---|---|---|---|
| Q-02 | Rowspan project di PDF tabel: dipertahankan atau diulang per baris? | **Diulang per baris** | Rowspan + page break berisiko memotong sel; keterbacaan cetak lebih penting |
| Q-05 | Apakah proyek tanpa record harus bisa dipilih di filter? | **Tidak** | Tidak ada baris untuk ditampilkan; menghindari perubahan izin API |
| Q-06 | PDF mengikuti filter aktif atau selalu seluruh data? | **Mengikuti filter** | Konsisten dengan "yang tampil itulah yang diekspor" (MSL/Program Kerja) |
| Q-07 | Tombol Download PDF tersedia untuk semua role View? | **Ya** | PDF read-only; tidak membocorkan data di luar izin View |
| Q-08 | Apakah filter disimpan di URL (bisa di-bookmark/di-refresh)? | **Tidak (state sesi)** | Di luar scope; menambah kompleksitas routing |
| Q-10 | Perlu kolom/filter "Kategori" di toolbar? | **Tidak** | Kategori sudah ditentukan halaman/submenu |

---

## 7. Rekomendasi P3

**Siap masuk P3.** Empat keputusan Owner sudah terkunci (D-KM-ENH-01…04); enam
open question tersisa (Q-02, Q-05…Q-08, Q-10) cukup dijawab di P3 dan tidak
menghalangi desain. Tidak ada blocker teknis: library sudah ada, tidak perlu
API/migration, dan pola UI/PDF sudah terbukti.

Urutan implementasi yang disarankan:

1. **F-03 + F-04** — toolbar filter, grouping ulang, rowspan.
2. **F-01 + modifikasi `KnowledgeTable.tsx`** — modal Lihat dan kolom Aksi
   selalu render (D-KM-ENH-04).
3. **F-02b** — PDF seluruh tabel (primary).
4. **F-02a** — PDF per-record dari modal Lihat.

Verifikasi manual empat role; Admin sebagai gate. Head Office, Management, dan
Project tetap **BLOCKED** untuk runtime sesuai known limitation KM V2 sampai
kredensial uji tersedia.

**Yang tidak boleh dilakukan sebelum approval:** desain teknis final,
implementasi, perubahan source, migration, commit/push/deploy.
