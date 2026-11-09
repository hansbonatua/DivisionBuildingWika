# 07 — MODULE AND FEATURE INVENTORY

Klasifikasi memakai label yang diminta. "Bukti" = hal yang benar-benar diperiksa, bukan asumsi.

## 1. Ringkasan Status

| # | Modul/Fitur | Status | Bukti utama |
|---|---|---|---|
| 1 | Public Landing Page | **COMPLETE AND VERIFIED** | 9 komponen; 5 feed publik live |
| 2 | Hero CMS | **COMPLETE AND VERIFIED** (catatan F-03) | `dashboard/hero/*`, `api/heroes/*` |
| 3 | Our Projects CMS | **COMPLETE AND VERIFIED** | `dashboard/projects/*` |
| 4 | Green Building CMS | **COMPLETE AND VERIFIED** (data publik 0) | modul + feed kosong |
| 5 | Social Media CMS | **COMPLETE AND VERIFIED** | `dashboard/social-media/*` |
| 6 | Our Clients CMS | **COMPLETE AND VERIFIED** (+ tautan logo, uncommitted) | `dashboard/clients/*`, `landing/Clients.tsx` |
| 7 | Upload gambar CMS + cleanup | **COMPLETE AND VERIFIED** | `api/cms/*`, `lib/cms/*` |
| 8 | Authentication | **COMPLETE AND VERIFIED** | `api/auth/*`, `lib/auth/*` |
| 9 | User Control | **COMPLETE AND VERIFIED** | `dashboard/users/*` |
| 10 | User Profile | **COMPLETE AND VERIFIED** | `dashboard/profile/edit`, `PATCH /api/auth/me` |
| 11 | Program Kerja | **COMPLETE AND VERIFIED** | UI + API + transaksi |
| 12 | Program Kerja Summary + PDF | **COMPLETE AND VERIFIED** (belum diukur performa) | `summary.ts`, `*ExportPdf.ts` |
| 13 | Template & Form | **COMPLETE AND VERIFIED** | link + upload privat + download |
| 14 | Master Project | **COMPLETE AND VERIFIED** | CRUD + duplikat + RESTRICT |
| 15 | Engineering Databases | **COMPLETE AND VERIFIED** | 6 kategori + summary |
| 16 | MSL Engineering | **COMPLETE AND VERIFIED** (frozen: PERLU VERIFIKASI) | backend + UI + PDF |
| 17 | Organization Structure | **COMPLETE AND VERIFIED** (frozen: PERLU VERIFIKASI) | singleton + upload |
| 18 | Dashboard SASAA | **NOT STARTED** | hanya permission |
| 19 | Test & CI | **PARTIALLY IMPLEMENTED** | **233 unit test / 59 suite** (`npm test`), termasuk KM/CST/PDOC; belum ada CI |
| 20 | Knowledge Management V2 (Lesson Learn, Best Practice / KI KM, VA/VE) | **IMPLEMENTED BUT NOT FULLY VERIFIED** | 3 halaman + 7 route V2 + `knowledge_entries`/`knowledge_pics`/`knowledge_evidence` (+ archive/selection); `0015_knowledge_management_v2_fresh` APPLIED 2026-11-05; Admin PASS, 3 role BLOCKED |
| 21 | Calculation Sheet Template (master reference flat, 7 kategori, inline) | **IMPLEMENTED BUT NOT FULLY VERIFIED** | 1 halaman + 7 anchor, 5 endpoint, `0017_calculation_sheet_templates` **BELUM di-apply**; static checks 174/174 PASS; runtime pending Owner |
| 22 | Project Documentation V1 + Monthly Delta (rekap bulanan, filter tahun/bulan, summary 12 bulan, audit per minggu, inline, search, PDF) | **IMPLEMENTED & VERIFIED** | 3 route (root redirect + rekap + summary), 8 kolom + matriks 12 bulan, 3 endpoint, 58 test (6 file), `0018_project_documentations` + `0019_project_documentation_period` **APPLIED** (Owner-confirmed 10 November 2026); static checks 233/233 PASS; runtime browser 4 role PASS (Owner-confirmed); commit `a7527e1` |

## 2. Public Landing Page

| Bagian | Perilaku terverifikasi | Catatan |
|---|---|---|
| Navbar | tautan section internal + tautan eksternal `https://sustainability.wika.co.id/` (`target=_blank`, `rel=noopener noreferrer`) + **CTA WIBEX Portal** ke `/login` | Navbar: VERIFIED · **CTA WIBEX Portal: IMPLEMENTED BUT NOT FULLY VERIFIED** |
| Hero | data dari `/api/heroes/public`; alt memakai `imageAlt` atau `title` | `Hero.tsx` |
| About | konten statis/aset lokal | dimodifikasi (uncommitted) |
| Our Projects | slider `snap-x`, progress bar, tombol "Lihat Detail" → modal | `Projects.tsx` |
| Green Building | kartu sertifikat dari feed publik; kosong bila tidak ada data | feed = 0 item |
| Social Media | kartu kurasi Instagram + glyph bila tanpa gambar | `SocialMedia.tsx` |
| Our Clients | grid logo; **kini** kartu menjadi `<a>` dengan sanitasi URL | `Clients.tsx` (uncommitted) |
| Footer | konten statis | dimodifikasi (uncommitted) |

**Navbar — CTA WIBEX Portal (new tab behavior, `LP-NAV-002`):**
Elemen `<Link href="/login">` pada header kini memakai `target="_blank"` dan `rel="noopener noreferrer"`, sehingga `/login` dibuka di **tab browser baru** dan landing page tetap berada di tab asal. Komponen tetap Next.js `Link`; URL, className, ikon gembok, dan teks tidak berubah. Alasan teknis: `next/dist/client/app-dir/link.js` baris 45–56 memperlakukan `target` selain `_self` sebagai navigasi browser (bukan `router.push`), jadi dua atribut sudah cukup. `rel="noopener noreferrer"` mencegah tab baru mengakses `window.opener`.

Yang terverifikasi: `npx tsc --noEmit` exit 0; `npx eslint src/components/landing/Navbar.tsx` exit 0; `git diff --check` exit 0; markup hasil render memuat `target="_blank"` + `rel="noopener noreferrer"`; klik Portal **tidak** menavigasi tab landing (tetap `http://localhost:3000/`); tombol SUSTAINABILITY tetap `target="_blank"` + `rel="noopener noreferrer"`; tampilan mobile 390×844 tidak berubah.

Batasan pengujian browser (dicatat jujur): tab baru yang dibuka Chromium **tidak muncul** pada daftar tab terkelola tooling sesi implementasi, sehingga **isi halaman `/login` di tab baru belum diverifikasi secara visual**. Status fitur karena itu tetap `IMPLEMENTED BUT NOT FULLY VERIFIED` sampai ada konfirmasi manual di browser pengguna. Rincian dan riwayat perubahan: `docs/development/DEVELOPMENT_MASTER_LOG.md` (`DL-2026-11-03-01`) dan `docs/development/FEATURE_REGISTER.md` (`LP-NAV-002`).

**Our Projects — detail modal (terverifikasi penuh):**
`role="dialog"`, `aria-modal="true"`, `aria-labelledby`; fokus dipindah ke tombol tutup saat mount dan dikembalikan ke pemicu saat unmount; body scroll dikunci lalu dipulihkan; Escape menutup (`preventDefault`); klik backdrop menutup, klik isi tidak; progress 0% dirender sebagai bar, `null` tidak dirender; deskripsi `whitespace-pre-line`; gambar lokal memakai `next/image`, remote memakai `<img>`.

## 3. Landing CMS (Mongo)

Pola seragam untuk 5 modul: list → form → preview → status publikasi → `sortOrder` → upload/URL eksternal → verifikasi objek → hapus objek lama setelah sukses.

| Modul | Field yang dapat diedit (form) | Status publikasi | Catatan |
|---|---|---|---|
| Hero | file/URL gambar, title, status, project, location | `active` / `standby` | **tanpa** input `imageAlt` dan `description` (F-03) |
| Our Projects | judul, kategori (10 label), lokasi, progress, deskripsi, gambar | `Active` / `Draft` | progress 0–100 |
| Green Building | project, badan sertifikasi, tipe, level, tahun, nomor, skor, deskripsi, gambar | `Draft`/`Published`/`Archived` + verifikasi | feed publik kosong |
| Social Media | platform, akun, caption, URL post, tipe, gambar | `Published`/`Draft`/`Hidden` | kurasi manual, bukan Graph API |
| Clients | nama, shortName, kategori, **link**, logo, status | `active` / `hidden` | `link` belum divalidasi di server (F-02) |

## 4. Program Kerja

| Aspek | Implementasi |
|---|---|
| Struktur | master program + 12 baris bulanan (`ra_value` wajib, `ri_value` NULL/angka) + banyak PIC |
| Tahun | terkunci saat dibuat (immutable di service) |
| Unit | `Jumlah`/`Persentase`; **tidak bisa diubah setelah ada RI** (pesan: "Unit tidak dapat diubah karena Program Kerja sudah memiliki data RI.") |
| RA | wajib; saat unit berubah, RA harus dikirim ulang |
| RI | Head Office hanya bila PIC; Admin selalu; Mencatat `ri_updated_by`/`ri_updated_at` |
| Catatan & bukti | setara manage |
| Summary | filter tahun/grup/unit/PIC; KPI, status, grup, trend bulanan, tabel, PDF |
| Transaksi | create & update master memakai `db.transaction` |
| Akses | Project tidak memiliki akses sama sekali |

## 5. Template & Form

| Aspek | Implementasi |
|---|---|
| Sumber | `link` (URL eksternal) atau `upload` (dokumen privat) — dijaga CHECK integritas |
| Upload | Blob **privat**, maks 50 MB, MIME allowlist (PDF dll. di `source.ts`) |
| Metadata | `file_name`, `file_mime_type`, `file_size_bytes`, `blob_pathname` |
| Download | `GET /api/template-form/[id]/file` — resolusi by id, bukan pathname |
| PIC | wajib Head Office ("PIC harus user dengan role Head Office") |
| Ganti sumber | objek lama dihapus **setelah** DB sukses dan tidak direferensikan |
| Akses | semua role bisa melihat; hanya Admin/Head Office mengelola |

## 6. Master Project

- Direktori proyek kanonik; `(name, location)` unik case-insensitive → duplikat 409.
- `year` adalah satu-satunya sumber tahun untuk MSL; dapat diubah lewat edit.
- Hapus ditolak bila dipakai Engineering DB, MSL, atau Project Documentation (RESTRICT → 409).
- PIC: Admin/Head Office.

## 7. Engineering Databases

- 6 kategori tetap (CHECK), banyak entri per (proyek, kategori).
- `project_id` wajib menunjuk Master Project (tidak ada teks bebas).
- Ringkasan: `buildEngineeringDatabaseSummary`, `buildCategoryCoverage`, `buildProjectCompleteness` (6 komponen).
- Akses: semua role melihat; Admin/Head Office/Project mengelola.

## 8. MSL Engineering (protected)

| Aspek | Implementasi |
|---|---|
| Penilaian | per proyek **per bulan**; UNIQUE (project, month) → 409 |
| Bulan | immutable; pindah bulan = hapus + buat |
| Tahun | dari `master_projects.year` (tidak disimpan di assessment) |
| Komponen | 3 nilai 0.00–5.00 (2 desimal), CHECK database |
| Skor | rata-rata, aritmetika sen → bebas drift float |
| Kategori | 6 band dari skor yang sudah dibulatkan (`<1` Tidak Peduli … `=5` Berinovasi) |
| Catatan | satu per tahun (`msl_year_notes`) |
| PDF | `mslExportPdf.ts` (764 baris), komentar "V2.5 visual polish" |
| Akses | Admin manage; Head Office view; Management hanya `msl_access`; Project none |
| Status frozen | **PERLU VERIFIKASI** |

## 9. Struktur Organisasi (protected)

- Model singleton (`CHECK`+`UNIQUE` pada `singleton`), maksimal satu baris.
- Viewer untuk semua role; ganti/hapus hanya Admin (route + service).
- Gambar di namespace publik `cms/organization/`; objek diverifikasi ulang; nama file diturunkan server.
- Status frozen: **PERLU VERIFIKASI**.

## 10. Fitur yang Belum Selesai / Terbuka

| Item | Status | Keterangan |
|---|---|---|
| Dashboard SASAA | NOT STARTED | permission `DASHBOARD_SASAA_VIEW` sudah ada, tidak dipakai |
| Test otomatis & CI | NOT STARTED | lihat dokumen 11 |
| Kontrak `imageAlt`/`description` | PARTIALLY IMPLEMENTED | input dihapus, API masih menerima (F-03) |
| Validasi `link` client | PARTIALLY IMPLEMENTED | sanitasi hanya di render, uncommitted (F-02) |
| Data Green Building | BLOCKED (data) | feed publik 0 item; penyebab belum dipastikan |
| Commit perubahan landing | PENDING | working tree, belum di-commit (F-12) |
| Verifikasi visual `/login` di tab baru (CTA Portal) | PARTIALLY IMPLEMENTED | markup & tidak-adanya navigasi in-place terbukti; tab baru tidak dapat diobservasi tooling (`LP-NAV-002`) |
| Tautan footer (sosial & legal) | PLACEHOLDER | 3 ikon sosial + 5 tautan legal `href="#"`; `mailto:` ≠ teks email (GAP-11) |
| CTA WIBEX Portal | IMPLEMENTED BUT NOT FULLY VERIFIED | `/login` di tab baru; halaman tab baru belum diamati visual (`LP-NAV-002`) |
| Kebijakan frozen | UNKNOWN | tidak ada dokumen |

## 11. Modul yang Tidak Ditemukan

Tidak ada modul notifikasi, email, audit log umum, pencarian global, export Excel, atau manajemen dokumen versi. Jangan mengasumsikan keberadaannya.

## 12. Knowledge Management (V1 → V2, 5 November 2026)

**V2 (menggantikan V1).** Tabel kini berisi **record** (bukan semua Master Project): satu project dapat punya banyak record per kategori, ditambah tombol **+ Tambah**. Kolom: No · Master Project (merged `rowspan` per project) · Knowledge Content · PIC · Evidence · Record History · Aksi. Create/Edit memakai **modal** (`KnowledgeFormDialog`), delete memakai dialog konfirmasi terpisah. Evidence **tepat satu** per record, PIC **minimal satu**, dan concurrency memakai integer `version` (`expected_version`). Data V1 (1 test record) di-drop sesuai keputusan Owner; migration `0015_knowledge_management_v2_fresh` APPLIED, journal 16.

**Status V2.** `IMPLEMENTED BUT NOT FULLY VERIFIED` — API/concurrency/regresi PASS; runtime browser Admin PASS; Head Office/Management/Project **BLOCKED** (tanpa kredensial). Detail: `DL-2026-11-05-02`.

**Enhancement 2026-11-05 (P4).** Status tetap `IMPLEMENTED BUT NOT FULLY VERIFIED`; runtime Admin PASS (**Owner confirmed**), tiga role tetap BLOCKED. Detail: `DL-2026-11-05-03`.

- **View modal (F-01).** `KnowledgeViewDialog` read-only: Master Project, kategori, isi knowledge penuh, PIC (label non-aktif), evidence (link + URL), serta Record History. Focus trap, Escape/backdrop, dan fokus kembali ke tombol Lihat.
- **PDF tabel (F-02b).** A4 landscape dari header page; hanya record yang lolos filter; header kolom berulang, footer `Halaman x / y`.
- **PDF per-record (F-02a).** A4 portrait dari modal View; content panjang terpaginasikan, evidence sebagai link.
- **Filter tahun + search proyek (F-03/F-04).** Client-side, AND, opsi berasal dari record ter-muat; reset mengembalikan seluruh record. Combobox proyek reusable juga dipakai form Add/Edit.
- **Kolom Aksi (D-KM-ENH-04).** Selalu render; Lihat untuk semua role, Edit hanya Manage.
- **Tidak berubah.** API, schema, migration, database, MSL/Org; tanpa dependency baru.

### Detail V1 (historis — SUPERSEDED)

| Submenu | Route | Isi kolom |
|---|---|---|
| Lesson Learn | `/dashboard/knowledge-management/lesson-learn` | No · Nama Proyek · Lesson Learn · Evidence · PIC · Aksi |
| Best Practice / KI KM | `/dashboard/knowledge-management/best-practice` | idem, kolom knowledge = Best Practice / KI KM |
| VA/VE | `/dashboard/knowledge-management/va-ve` | idem, kolom knowledge = VA/VE |

**Navigasi (diperbarui 4 November 2026).** Knowledge Management adalah item top-level di sidebar, sibling Program Kerja (bukan lagi accordion di dalamnya). Accordion-nya punya state sendiri, default terbuka untuk Admin/Head Office/Management/Project, dan otomatis terbuka pada route KM. Urutan grup: Struktur Organisasi → Program Kerja → Knowledge Management → Template & Form → Master Project → Engineering Databases. Route dan guard tidak berubah. Verifikasi browser Head Office (desktop/mobile, active route) **PASS**; Admin/Management/Project **NOT RUN**.

**Sumber baris.** Seluruh Master Project selalu tampil di ketiga tabel lewat `LEFT JOIN`; tidak ada baris placeholder yang ditulis ke database. Proyek baru otomatis muncul. Satu proyek maksimal satu record per submenu (`UNIQUE(project_id, knowledge_type)`), sehingga maksimal tiga record total.

**Mekanik (inline table editing).** Satu baris diedit pada satu waktu: kolom Knowledge Content menjadi `<textarea>` dan kolom PIC menjadi daftar checkbox Head Office, dengan tombol Simpan/Batal di kolom Aksi. Tidak ada modal dan tidak ada halaman form terpisah.

**Isi knowledge.** `<textarea>` multiline, disimpan sebagai teks apa adanya (paragraf, `-` bullet, `1.` numbered list, line break dipertahankan), dirender `whitespace-pre-wrap` tanpa truncation. Tidak ada rich-text editor maupun Markdown renderer. **Wajib diisi** dan tidak boleh hanya spasi.

**Evidence.** Banyak link per record, nama + URL, ditampilkan sebagai hyperlink `target="_blank"` + `rel="noopener noreferrer"` di kolom Evidence. Setiap baris evidence punya tombol `Ubah`/`Hapus` sendiri, dan `+ Tambah evidence` membuka form kecil di sel yang sama — semuanya lewat endpoint evidence tersendiri sehingga tidak mengubah konten/PIC dan tidak memicu konflik editor konten. Evidence **opsional**: record boleh dibuat tanpa evidence dan evidence boleh ditambahkan kapan saja. URL divalidasi Zod di server (hanya http/https absolut). Record harus sudah ada sebelum evidence pertama dapat ditambahkan.

**PIC.** **Minimal satu** user Head Office per record, disimpan sebagai `user_id`. Status akun tidak difilter sehingga user suspended tetap eligible dan ditandai "(non-aktif)" pada pilihan. Batas minimal ditegakkan Zod, service, dan constraint trigger database. Admin dan Head Office dapat mengubah; Management dan Project hanya melihat.

**Konkurensi.** Token `updatedAt` adalah string UTC presisi mikrodetik yang dikembalikan PostgreSQL apa adanya (tanpa konversi `Date`); guard `updated_at = token::timestamptz` menolak penulisan basi hingga 1 mikrodetik. Token hanya berlaku untuk content + PIC; perubahan evidence tidak mengubah token. Setiap update sukses menulis `updated_at = GREATEST(clock_timestamp(), updated_at + 1 microsecond)`, menjamin timestamp baru selalu naik ketat.

**Status acceptance.** Admin **PASS** (API + browser). Uji HTTP paralel **NOT RUN** (tanpa DB uji terisolasi/fixture tambahan). Head Office, Management, Project **BLOCKED** (tanpa kredensial/handoff). Monotonicity **PASS** via unit test dan bukti SQL tabel sementara.

**Status database.** `0013` dan `0014` sudah **APPLIED** pada `neondb` (PostgreSQL 18.6, 4 November 2026); 3 tabel, 11 constraint, dan 2 trigger deferred terverifikasi, dengan 23/23 uji constraint PASS di transaksi rollback (0 baris tertinggal).

## 13. Calculation Sheet Template (9 November 2026)

**Status:** `IMPLEMENTED BUT NOT FULLY VERIFIED` — implementasi P4 A–D selesai, static checks PASS; migration `0017` belum dijalankan dan runtime browser/DB belum diuji.

- **Tujuan:** master reference calculation sheet yang dipakai lintas proyek, bukan data per proyek.
- **Halaman:** `/dashboard/calculation-sheet-template` — satu tabel inline dengan tujuh `<tbody>`, header kategori `colSpan={6}` dan anchor (`#arsitektur`, `#struktur`, `#infrastruktur`, `#geoteknik`, `#green_building`, `#meep`, `#lainnya`).
- **Kolom:** Kode · Nama · PIC · Evidence · Catatan · Aksi. PIC single-select Head Office; evidence berupa URL `http`/`https` (≤2.048); catatan ≤2.000. Tanpa upload, reorder, PDF, atau modal.
- **Inline editing:** satu baris diedit dan satu draft create pada satu waktu; Simpan memanggil `PUT`/`POST`, Batal `✕`, error validasi/API tampil di baris `colSpan={6}`. Management/Project tidak menerima tombol Edit/Hapus/Tambah.
- **API:** `GET` list flat, `POST` create (201), `PUT`/`DELETE` per id, `GET pic-options` (Manage-only). Kategori immutable setelah create.
- **RBAC:** `CALCULATION_SHEET_VIEW` (4 role), `CALCULATION_SHEET_MANAGE` (Admin, Head Office; HO termasuk Delete).
- **Database:** tabel `calculation_sheet_templates`, unique kode per kategori, FK ke users; migration `0017_calculation_sheet_templates` + snapshot dibuat, **BELUM di-apply**.
- **Sidebar:** accordion top-level dengan tujuh submenu anchor; submenu aktif mengikuti hash dan membuka accordion otomatis pada route CST.
- **Verifikasi:** `tsc`/`eslint`/`npm test` (174/174)/`git diff --check` PASS. Runtime **NOT RUN**. Detail: `DL-2026-11-09-02`.

**Batasan.** Uji API terautentikasi (200/201/400/403/404/409) dan uji browser empat role **NOT RUN** karena tidak ada kredensial akun uji. Yang terverifikasi runtime tanpa sesi: 401 pada semua endpoint, 405 pada hapus record, 307 pada halaman dashboard. Status karena itu `IMPLEMENTED BUT NOT FULLY VERIFIED`.

## 14. Project Documentation V1 + Monthly Delta (10 November 2026)

**Status:** `IMPLEMENTED & VERIFIED` — commit fitur `a7527e1`; dokumentasi `062f8d4`; static checks PASS; migration `0018` + `0019` APPLIED (Owner-confirmed 10 November 2026); runtime browser 4 role PASS (Owner-confirmed 10 November 2026).

- **Tujuan:** dokumentasi lima minggu per Master Project **per periode tahun/bulan**, dengan jejak uploader/timestamp per minggu, catatan project, rekap bulanan, dan summary 12 bulan.
- **Halaman/routing:** root `/dashboard/project-documentation` redirect ke `/rekap-bulanan`; rekap di `/dashboard/project-documentation/rekap-bulanan` menampilkan tabel 8 kolom (Nama Proyek · Minggu 1–5 · Catatan · Aksi); Summary Report di `/dashboard/project-documentation/summary` menampilkan semua project × 12 bulan.
- **Filter:** rekap memakai dropdown Tahun/Bulan; perubahan filter memicu fetch ulang dan menyimpan ke periode aktif. Summary memakai filter tahun dan read-only.
- **Inline editing:** satu baris diedit pada satu waktu; field yang tidak diubah tidak dikirim; Simpan memanggil `PUT` upsert per periode, Batal mengembalikan draft. Error validasi/API tampil di baris `colSpan` penuh.
- **URL + audit:** URL `http`/`https` (≤2.048); link memakai ikon 🔗 dan metadata `Oleh: [Nama], [Tanggal id-ID]`; URL kosong tampil `—`. Mengosongkan URL menghapus pasangan audit minggu tersebut; URL yang sama tidak mengubah timestamp.
- **Search + PDF:** search client-side berdasarkan nama project; PDF A4 landscape dari baris yang terlihat, URL dipotong, metadata uploader tidak dicetak; PDF rekap mencantumkan periode.
- **Summary:** setiap sel berisi `completed_weeks/5`; `5/5` hijau, `1–4/5` amber, `0/5` abu-abu. Project dan bulan tanpa dokumentasi tetap tampil `0/5`.
- **API:** `GET /api/project-documentation?year&month` (rekap), `PUT /api/project-documentation/[projectId]/[year]/[month]` (upsert per periode), dan `GET /api/project-documentation/summary?year`. Tidak ada `POST`/`DELETE`; `Cache-Control: no-store`.
- **RBAC:** `DOCUMENTATION_VIEW` (Admin, Head Office, Management, Project); `DOCUMENTATION_MANAGE` (Admin, Head Office, Project). Management read-only; Project mengelola semua project. Summary dapat dibaca semua role View.
- **Database:** tabel `project_documentations` beridentitas `(project_id, year, month)` dengan unique composite, lima URL + pasangan audit minggu, `catatan`, audit baris, FK ke Master Project/users; migration `0018_project_documentations` **APPLIED** (Owner-confirmed). Migration `0019_project_documentation_period` menambah `year`/`month`, mengganti unique, dan menambah index/CHECK; **APPLIED** (Owner-confirmed 10 November 2026). Delete Master Project yang masih direferensikan ditolak FK RESTRICT (409).
- **Sidebar:** accordion **Project Documentation** dengan submenu **Rekap Bulanan** dan **Summary Report**, terlihat dengan `DOCUMENTATION_VIEW`.
- **Verifikasi:** `tsc`/`eslint`/`npm test` (233/233, 59 suite; 58 test PDOC di 6 file)/`git diff --check` PASS. Runtime visual + RBAC 4 role **PASS** (Owner-confirmed 10 November 2026) untuk filter periode, lifecycle inline, Summary, PDF, sidebar, dan responsif. Detail: `DL-2026-11-10-03`; `DL-2026-11-10-02` historis.

**Batasan.** Runtime dijalankan Owner di browser; Freebuff tidak mereproduksi sesi 4 role pada pass dokumentasi ini. Status `0018` dan `0019` APPLIED berasal dari konfirmasi Owner; tidak ada verifikasi DB independen pada pass ini.
