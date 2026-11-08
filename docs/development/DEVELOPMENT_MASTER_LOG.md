# DEVELOPMENT MASTER LOG — BDWIKA / WIBEX

Catatan kronologis perubahan yang dikerjakan melalui sesi pengembangan terpandu (audit → approval → implementasi → verifikasi).
Dokumentasi audit repository ada di `docs/audit/`; dokumen ini mencatat **perubahan kode dan/atau dokumentasi/governance**, bukan hasil audit.

---

## DL-2026-11-04-16 — WIBEX Development Governance organization-wide

| Field | Nilai |
|---|---|
| Feature ID | `GOV-WIBEX-001` |
| Tanggal | 4 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED — READY FOR OWNER REVIEW** — preliminary review ChatGPT selesai; koreksi diterapkan; final review dan approval Owner pending |
| Commit | **belum di-commit** (instruksi: no commit/push) |
| Branch | `main` (HEAD `d342bda`) |
| File baru | `docs/development/WIBEX_DEVELOPMENT_GOVERNANCE.md` |
| File diubah | `docs/development/WIBEX_ENGINEERING_WORKFLOW.md`, `docs/development/FEATURE_REGISTER.md`, `docs/development/DEVELOPMENT_MASTER_LOG.md`, `docs/audit/MASTER_PROJECT_INDEX.md`, `docs/audit/AI_DEVELOPER_HANDOFF_GUIDE.md` |

### Keputusan
- Menyiapkan usulan standar governance resmi untuk **seluruh WIBEX**, bukan hanya Knowledge Management V1.1.
- Menetapkan pembagian tugas: **Owner** sebagai decision maker, **ChatGPT** sebagai technical reviewer, **Freebuff** sebagai implementer.
- Menetapkan lifecycle sembilan phase: requirement, audit, desain, implementasi, integrasi, QA, regresi, dokumentasi, final acceptance.
- Menetapkan **Mandatory Review Gate** per phase dengan status **PASS / CONDITIONAL / FAIL**; gate tidak boleh dilewati.
- Menetapkan status verifikasi **PASS / FAIL / NOT RUN / NOT APPLICABLE / HISTORICAL** dan status final **IMPLEMENTED & VERIFIED / IMPLEMENTED BUT NOT FULLY VERIFIED / BLOCKED / NOT ACCEPTED**.
- Menetapkan standard evidence, change safety, data protection, Git/deploy governance, documentation governance, dan acceptance.
- Menetapkan Knowledge Management V1.1 sebagai **penerapan pertama** standar, bukan batas cakupan.

### Audit dokumen existing
- `WIBEX_ENGINEERING_WORKFLOW.md` ditemukan sebagai prosedur operasional existing; dipertahankan dan diturunkan di bawah governance kanonik.
- Workflow lama belum memuat peran reviewer independen dan review gate per phase; bagian tersebut ditambahkan sebagai rujukan, bukan duplikasi aturan.
- `FEATURE_REGISTER.md` memakai status fitur yang berbeda dari status review/acceptance; governance menetapkan pemetaan eksplisit.
- `DEVELOPMENT_MASTER_LOG.md` sebelumnya menyebut hanya perubahan kode; cakupan diperluas ke dokumentasi/governance.
- `AI_DEVELOPER_HANDOFF_GUIDE.md` sudah memakai PASS/FAIL/NOT RUN; ditambahkan rujukan wajib ke governance.
- Tidak ditemukan dokumen governance organization-wide lain di repository.

### Verifikasi
| Pemeriksaan | Hasil |
|---|---|
| Struktur dokumen governance | **PASS** — 15 bagian, roles, 12 scope, lifecycle, gate, evidence, safety, Git/deploy, docs, acceptance |
| Cross-reference workflow | **PASS** — workflow menyatakan tunduk pada governance |
| Cross-reference master index | **PASS** — kedua dokumen development ditautkan |
| Feature register | **PASS** — `GOV-WIBEX-001` tercatat |
| Perubahan source code | **TIDAK ADA** |
| Perubahan database/migration | **TIDAK ADA** |
| `git diff --check` | **PASS** |
| Technical review ChatGPT | **PRELIMINARY COMPLETED** — koreksi diterapkan; final review pending |
| Final acceptance Owner | **PENDING** — status keseluruhan `READY FOR OWNER REVIEW` |

### Batasan
- Governance ini mengatur proses; ia tidak mengubah runtime, API, database, atau modul mana pun.
- Status `IMPLEMENTED BUT NOT FULLY VERIFIED` dipakai secara sengaja karena review independen belum dijalankan; jangan membaca dokumen ini sebagai bukti final acceptance fitur.
- Detail requirement V1.1 tidak disalin ke dokumen governance ini; V1.1 tetap berstatus target yang disetujui dan belum diimplementasikan.
- **Documentation debt:** `docs/development/CURRENT_PROJECT_STATE.md` sengaja tidak diubah; snapshot 3 November 2026 dipertahankan sampai ada task pembaruan khusus.

---

## DL-2026-11-04-15 — Knowledge Management menjadi item top-level sidebar

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` |
| Tanggal | 4 November 2026 |
| Status | **IMPLEMENTED** — unit test, typecheck, ESLint, build PASS; browser Head Office **PASS**; Admin/Management/Project **NOT RUN** (tanpa sesi/kredensial) |
| Commit | **belum di-commit** (instruksi: no commit/push) |
| Branch | `main` (HEAD `d342bda`) |
| File diubah | `src/components/dashboard/DashboardSidebar.tsx`, `docs/audit/06_AUTHENTICATION_AND_AUTHORIZATION.md`, `docs/audit/07_MODULE_AND_FEATURE_INVENTORY.md`, `docs/audit/MASTER_PROJECT_INDEX.md`, `docs/development/FEATURE_REGISTER.md`, dokumen ini |
| File baru | `src/components/dashboard/DashboardSidebar.test.ts` (16 test) |

### Perubahan
- Knowledge Management dipindah dari accordion di dalam Program Kerja menjadi **item top-level sendiri**, sibling Program Kerja di grup Core Enterprise.
- Accordion KM memakai state `knowledgeOpen` sendiri; render tidak lagi bergantung pada `programKerjaOpen`.
- Default terbuka untuk semua role yang memiliki `KNOWLEDGE_MANAGEMENT_VIEW`; tetap dapat ditutup manual dan otomatis terbuka saat route `/dashboard/knowledge-management/*` aktif.
- Program Kerja tidak lagi memuat KM dan tidak lagi ikut terbuka otomatis saat masuk route KM. Dua link Program Kerja tidak berubah.
- Tiga route KM tidak berubah: Lesson Learn, Best Practice / KI KM, VA/VE.
- Model visibilitas/state murni diekspor dari `DashboardSidebar.tsx` agar dapat diuji tanpa DOM.

### Tanpa perubahan
Permission (`permissions.ts` tidak disentuh), API, database, migration, service/repository, guard route, MSL Engineering, dan Struktur Organisasi.

### Verifikasi
| Pemeriksaan | Hasil |
|---|---|
| Focused sidebar test | **PASS 16/16** |
| `npm test` (full) | **PASS 39/39** |
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npx eslint DashboardSidebar.tsx DashboardSidebar.test.ts` | **PASS** (exit 0) |
| `npx next build` | **PASS** (71 route, termasuk 4 route KM) |
| `git diff --check` | **PASS** (exit 0) |
| Browser Head Office — desktop 1280×800 | **PASS** — KM item top-level, expanded, 3 submenu terlihat; Program Kerja collapsed |
| Browser Head Office — mobile 390×844 | **PASS** — sidebar off-canvas dibuka, KM dan 3 submenu terlihat |
| Browser Head Office — active route | **PASS** — `/dashboard/knowledge-management/lesson-learn` auto-expand, `aria-current="page"` + highlight |
| Browser Head Office — independensi | **PASS** — Program Kerja dibuka (2 link) tanpa menutup KM; tidak ada entri ganda |
| Browser Admin / Management / Project | **NOT RUN** — tidak ada sesi atau kredensial role tersebut |

### Keterbatasan
- Komentar lama di `src/lib/auth/permissions.ts` masih menyebut KM "under Program Kerja"; file itu di luar batas perubahan yang disetujui, sehingga komentar tidak diubah. Perilaku izin tetap benar dan tercakup unit test.
- Verifikasi visual baru dilakukan untuk Head Office. Admin, Management, dan Project belum diuji di browser karena tidak ada sesi/kredensial; kelulusan tiga role tersebut hanya berlaku pada model navigasi (unit test), bukan browser.
- Console browser Head Office hanya berisi HMR/Fast Refresh dan warning ukuran gambar header yang sudah ada sebelumnya; tidak ada error aplikasi.

---

## DL-2026-11-04-02 — Knowledge Management V1: remediasi temuan second pass

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` |
| Tanggal | 4 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** (typecheck/lint/unit test/build PASS; migration tetap belum dijalankan) |
| Commit | **belum di-commit** |
| Branch | `main` (HEAD `d342bda`) |

### Perubahan
- **KM-01 (FIXED).** `evidence` dan `picIds` tidak lagi memiliki `default([])` (`lib/knowledge-management/schema.ts`). Keduanya wajib; payload tanpa salah satunya → 400. `[]` eksplisit tetap sah sebagai instruksi mengosongkan.
- **KM-02 (DISABLED).** Tombol hapus seluruh record dihapus dari `KnowledgeTable`; `DELETE /api/knowledge-management/entry/[id]` kini menjawab **405**. Service/repository delete ikut dihapus agar tidak ada jalur kode yang tidak terpakai. Penghapusan evidence per baris di editor tetap ada.
- **KM-03 (IMPLEMENTED).** Token `expectedUpdatedAt` (ISO/null) ditambahkan ke kontrak; `GET` mengembalikan `updatedAt` per baris. Service membandingkan token (`conflict.ts`), lalu menulis dengan `UPDATE … WHERE id = ? AND updated_at = ?`; nol baris → 409. UI menampilkan pesan dan tombol "Muat ulang & batalkan perubahan".
- **KM-04 (PENDING).** Validasi content tidak diubah (Zod `min(1)` + CHECK database). Perubahan yang diperlukan bila owner memutuskan opsional didokumentasikan di `FEATURE_REGISTER`.
- **KM-06 (FIXED).** Pesan 409 Master Project kini menyebut Knowledge Management.
- **KM-08 (FIXED).** `23503`/`23001` dipetakan ke `KnowledgeConflictError` → 409, bukan 500.
- **KM-05 (DEFERRED).** Snapshot/`prevId` tidak disentuh; tetap tercatat sebagai task maintenance terpisah.

### Verifikasi
| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint <file berubah>` | PASS |
| `npm test` | PASS 21/21 (9 test baru: 4 kontrak array + 5 concurrency token) |
| `npx next build` | PASS |
| `git diff --check` | PASS |
| Migration dijalankan | **TIDAK** (tidak ada perubahan skema pada remediasi ini) |

### Catatan
Tidak ada perubahan skema/migration pada remediasi ini: KM-01, KM-02, KM-03, KM-06, dan KM-08 murni perubahan kode. `drizzle/meta` tidak disentuh.

---

## DL-2026-11-04-01 — Knowledge Management V1 (Lesson Learn, Best Practice / KI KM, VA/VE)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` |
| Tanggal | 4 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** (tsc/ESLint/unit test/build PASS; migration belum dijalankan; uji browser end-to-end belum) |
| Commit | **belum di-commit** (instruksi: no commit/push) |
| Branch | `main` (HEAD `d342bda`) |
| File baru | `lib/knowledge-management/*` (4), `api/knowledge-management/**` (4 route + `_helpers`), `dashboard/knowledge-management/**` (layout + 4 page), `components/dashboard/knowledge-management/KnowledgeTable.tsx`, `drizzle/0013_knowledge_management.sql`, 1 file test |
| File diubah | `lib/auth/permissions.ts`, `lib/pg/schema.ts`, `components/dashboard/DashboardSidebar.tsx`, `package.json`, dokumen audit/development |

### Keputusan arsitektur
- **Satu tabel bersama** `knowledge_entries` + `UNIQUE(project_id, knowledge_type)`; tiga submenu dibedakan `knowledge_type` (`lesson_learn`, `best_practice`, `va_ve`). Alasan: kolom identik, dan constraint tunggal menjamin aturan "satu data per proyek per submenu".
- **Daftar proyek dari Master Project** (`LEFT JOIN`), bukan baris placeholder. Proyek tanpa knowledge tetap tampil; proyek baru otomatis muncul.
- **Routing terpisah.** Halaman di `/dashboard/knowledge-management/*` dengan layout guard `KNOWLEDGE_MANAGEMENT_VIEW`. Guard `/dashboard/program-kerja` **tidak diubah** (tetap menolak Project). Sidebar menampilkan grup Program Kerja yang berisi accordion Knowledge Management, sehingga hierarki visual sesuai permintaan tanpa melemahkan guard lama.
- **PIC tanpa filter status.** Hanya role Head Office; user suspended tetap eligible dan diberi label "(non-aktif)" pada pilihan.
- **Evidence** disimpan sebagai nama + URL; tidak ada upload atau penyalinan file ke Blob.

### Database
Migration aditif `0013_knowledge_management.sql`: 3 tabel, 3 CHECK pada `knowledge_entries`, 2 CHECK pada evidence, `UNIQUE(project_id, knowledge_type)`, 3 index, 6 FK (project RESTRICT; entry cascade; user NO ACTION/SET NULL).

Catatan penting: `drizzle-kit generate` semula juga mengeluarkan `organization_structure` dan kolom MSL karena snapshot `0011`/`0012` tidak ada. Statement itu dihapus manual dari `0013`; hanya objek Knowledge Management yang tersisa.

### Verifikasi
| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npx eslint <file berubah>` | PASS (exit 0, setelah memindahkan setState keluar dari body effect) |
| `npm test` (baru, `node --import tsx --test`) | PASS 12/12 (URL evidence, konten multiline, tipe, permission) |
| `npx next build` | PASS; 4 route knowledge muncul di output |
| Migration dijalankan | **TIDAK** — butuh database; bukan bagian dari instruksi |
| Uji API/UI per role | **BELUM** — server dev perlu dijalankan ulang dan login 4 role |

### Risiko / catatan
- Migration belum diterapkan: tabel belum ada di database mana pun, sehingga endpoint knowledge akan gagal sampai `0013` dijalankan (setelah backup).
- Rollback: drop `knowledge_pics`, `knowledge_evidence`, `knowledge_entries` (urutan itu), lalu hapus baris jurnal `0013` bila migration dicabut.
- Tanpa CI: unit test berjalan lokal lewat `npm test`.

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

## DL-2026-11-04-03 — Knowledge Management: inline editing + evidence per baris

**Permintaan.** Final business requirement: inline table editing mengacu pola MSL Engineering (modul MSL tidak diubah); content wajib; PIC minimal satu user Head Office dan semua status akun eligible; evidence opsional dan ditambahkan kapan saja; multiple PIC/evidence tetap didukung; optimistic concurrency dipertahankan; hapus seluruh record tetap nonaktif.

**Perubahan.**
- `schema.ts`: payload inline = `content` + `picIds` (min 1) + `expectedUpdatedAt`; `evidence` dikeluarkan dari kontrak record dan punya `evidencePayloadSchema` sendiri.
- `service.ts`: operasi evidence individual (`addKnowledgeEvidence`, `updateKnowledgeEvidenceById`, `deleteKnowledgeEvidenceById`); PIC kosong → 400; `23514` → 400; inline save tidak lagi menulis evidence.
- `repository.ts`: helper evidence per baris + `max(sort_order)`; `replaceKnowledgeEvidence` dihapus.
- Route baru: `POST /[projectId]/[type]/evidence`, `PATCH|DELETE /evidence/[id]`.
- `KnowledgeTable.tsx`: textarea + checkbox PIC inline; setiap evidence punya `Ubah`/`Hapus`; `+ Tambah evidence` di sel Evidence; token tetap dikirim pada inline save.
- `drizzle/0014_knowledge_pic_minimum.sql`: dua constraint trigger deferred yang menegakkan minimal 1 PIC, plus entri journal.
- Dokumentasi: `04_DATABASE_SCHEMA.md`, `05_API_DOCUMENTATION.md`, `07_MODULE_AND_FEATURE_INVENTORY.md`, `08_BUSINESS_PROCESS_AND_DATA_FLOW.md`, `FEATURE_REGISTER.md`.

**Verifikasi.**

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | PASS |
| ESLint | `npx eslint` (seluruh file berubah) | PASS |
| Unit test | `npm test` | PASS 21/21 |
| Build | `npx next build` | PASS |
| Migration check | `npx drizzle-kit check` | PASS ("Everything's fine") |
| Whitespace | `git diff --check` | PASS |

**Batasan.** Migration `0013`/`0014` belum dijalankan; belum ada uji HTTP/DB end-to-end; tidak ada commit, push, deployment, atau migration produksi.

## DL-2026-11-04-04 — Knowledge Management V1: staging verification (BLOCKED di Phase 2)

**Phase 1 — Repository readiness: PASS.** Branch `main`, HEAD `d342bda`; 14 file termodifikasi dan seluruh path untracked dipertahankan (termasuk `docs/development/WIBEX_ENGINEERING_WORKFLOW.md`). Journal `0000`–`0014` konsisten; `0013`/`0014` direview; remediasi terakhir (evidence per baris, PIC minimum, trigger) terpasang.

**Phase 2 — Staging database safety: BLOCKED (STOP).** Satu-satunya kredensial menunjuk Neon `ep-tiny-sunset-b4im0t43.c-6.us-east-2.aws.neon.tech`, database `neondb`, `sslmode=require`. Tidak ada penanda staging/non-produksi, tidak ada kredensial pembanding, dan tidak tersedia `pg_dump`, `psql`, maupun Docker untuk membuat dan memverifikasi backup. Sesuai stop condition (environment tidak dapat dibuktikan non-produksi; backup tidak dapat dibuat/diverifikasi), **tidak ada migration yang dijalankan** dan database Neon tidak disentuh.

**Phase 3–5 — Migration, DB integration, API end-to-end: NOT RUN.** Konsekuensi langsung stop condition di atas.

**Runtime HTTP yang diamati (tanpa sesi, tanpa operasi tulis):**

| Request | Status | Body |
|---|---|---|
| `GET /api/knowledge-management?type=lesson_learn` | **401** | `{"error":{"message":"Unauthenticated"}}` |
| `GET /api/knowledge-management/pic-options` | **401** | idem |
| `POST /api/knowledge-management/[projectId]/[type]/evidence` | **401** | idem |
| `PATCH /api/knowledge-management/evidence/[id]` | **401** | idem |
| `DELETE /api/knowledge-management/evidence/[id]` | **401** | idem |
| `PUT /api/knowledge-management/[projectId]/[type]` | **401** | idem |
| `DELETE /api/knowledge-management/entry/[id]` | **405** | pesan fitur hapus dinonaktifkan |
| `GET /dashboard/knowledge-management/lesson-learn` | **307** | redirect ke login |

**Phase 6 — Browser testing empat role: NOT RUN.** Tidak ada kredensial akun untuk Admin/Head Office/Management/Project. Tidak ada screenshot fitur yang dapat diambil tanpa sesi; tidak ada hasil yang diklaim PASS.

**Phase 7 — Regression: PASS (statis).** `git status` menunjukkan tidak ada perubahan pada `src/lib/msl`, `src/lib/organization-structure`, maupun route/halaman MSL/Struktur Organisasi (frozen). `npx next build` berhasil mengompilasi seluruh route, termasuk modul lain.

**Phase 8 — QA: PASS.** `npx tsc --noEmit` 0 · ESLint file berubah 0 · `npm test` 21/21 · `npx drizzle-kit check` PASS · `npx next build` PASS · `git diff --check` 0.

**Phase 9 — Backup, rollback, status.** Backup **tidak dibuat** (tidak ada tool yang tersedia; stop condition). Rollback belum diperlukan karena tidak ada DDL yang dijalankan. Bila migration kelak dijalankan: `DROP TRIGGER knowledge_entries_require_pic_trigger ON knowledge_entries; DROP TRIGGER knowledge_pics_require_remaining_trigger ON knowledge_pics; DROP FUNCTION knowledge_entries_require_pic(); DROP FUNCTION knowledge_pics_require_remaining();` lalu untuk `0013` drop `knowledge_pics`, `knowledge_evidence`, `knowledge_entries` (urutan anak → induk).

**Final status: BLOCKED.** Migration wajib, uji DB, API terautentikasi, dan browser empat role belum dieksekusi. Owner perlu menyediakan database non-produksi yang terkonfirmasi beserta tool backup, dan akun uji untuk empat role.

## DL-2026-11-04-05 — Knowledge Management: migration `0013`/`0014` di `neondb` (APPLIED)

**Otorisasi.** Owner mengesahkan implementasi objek database pada database WIBEX Neon yang ada (`neondb`), tanpa database/branch staging baru.

**1. Target terverifikasi.** Koneksi `DIRECT_URL` → host Neon `ep-tiny-sunset-b4im0t43.c-6.us-east-2.aws.neon.tech`, database `neondb`, `sslmode=require`; server PostgreSQL 18.6. Kredensial tidak dicetak.

**2. Audit riwayat sebelum eksekusi.** `drizzle.__drizzle_migrations` berisi **13 baris**; hash SHA-256 setiap baris cocok dengan file `0000`–`0012`, tidak ada entri tak dikenal, dan seluruh tabel historis yang diharapkan ada (`users`, `sessions`, `program_kerja*`, `template_forms`, `master_projects`, `engineering_database_entries`, `login_attempts`, `msl_assessments`, `msl_year_notes`, `organization_structure`). Tidak ada tabel/trigger Knowledge Management. Pending tepat `0013` dan `0014`. Data saat audit: 7 Master Project; user aktif 3 Admin, 5 Head Office, 1 Management, 1 Project.

**3. Eksekusi.** `npx drizzle-kit migrate` (hash resmi Drizzle) → `migrations applied successfully`, exit 0. Hanya `0013_knowledge_management` dan `0014_knowledge_pic_minimum` yang dijalankan; tidak ada DDL pada modul lain.

**4. Verifikasi objek (23/23 PASS).**

| Objek | Hasil |
|---|---|
| `knowledge_entries`, `knowledge_evidence`, `knowledge_pics` | PASS — ada |
| `UNIQUE(project_id, knowledge_type)` | PASS |
| CHECK content, tipe, nama evidence, URL `^https?://` | PASS |
| 6 foreign key (RESTRICT ke Master Project, NO ACTION/SET NULL ke users, CASCADE evidence/PIC) | PASS |
| `knowledge_entries_require_pic_trigger` | PASS — `enabled=O`, `deferrable=true`, `initdeferred=true` |
| `knowledge_pics_require_remaining_trigger` | PASS — deferrable, initdeferred |
| Riwayat migrasi | 15 baris; hash `0013`/`0014` cocok dengan file |

**5. Uji perilaku (semua di dalam transaksi yang di-rollback).** Entry tanpa PIC → `23514`; entry + 1 PIC + evidence → diterima; hapus PIC terakhir → `23514`; content spasi saja → `23514`; URL evidence `javascript:` → `23514`; duplikasi `(project, type)` → `23505`. Setelah seluruh uji: **0 baris** Knowledge Management tertinggal.

**6. Inkonsistensi/error.** Tidak ada. Satu NOTICE `schema "drizzle" already exists` dan `relation "__drizzle_migrations" already exists` dari migrator — normal, bukan kegagalan.

**7. Final status database: APPLIED & VERIFIED.** Sisa yang belum diuji: API terautentikasi empat role dan browser end-to-end (tidak ada kredensial akun uji). Tidak ada deployment, commit, atau push.

## DL-2026-11-04-06 — Post-migration application verification (BLOCKED: tanpa kredensial; fixture belum disetujui)

**Phase A — API read-only terautentikasi: NOT RUN.** Tidak ada kredensial akun untuk Admin/Head Office/Management/Project. `sessions` berisi 7 baris, tetapi token mentah tidak tersedia (yang disimpan hanya hash) dan memakai sesi milik pengguna lain tidak diotorisasi. Permintaan tanpa sesi yang sudah diuji tetap **401** pada seluruh endpoint Knowledge Management dan **307** pada halaman dashboard.

**Matriks permission (runtime, eksekusi kode — bukan HTTP):**

| Role | `KNOWLEDGE_MANAGEMENT_VIEW` | `KNOWLEDGE_MANAGEMENT_MANAGE` | `PROGRAM_KERJA_VIEW` |
|---|---|---|---|
| Admin | true | true | true |
| Head Office | true | true | true |
| Management | true | false | true |
| Project | true | false | **false** |

Hasil ini konsisten dengan desain: Project tetap dapat membuka Knowledge Management tetapi tidak dapat membuka halaman Program Kerja lain.

**Phase B — negative API: NOT RUN** (butuh sesi). Validasi tingkat skema sudah tercakup unit test 21/21: content kosong/spasi ditolak, `picIds` hilang/`[]` ditolak, evidence bukan bagian payload record, URL tidak aman ditolak. Status HTTP sebenarnya belum diuji.

**Phase C — fixture safety gate: STOPPED sesuai instruksi.** Tidak ada fixture dibuat. `knowledge_entries`/`knowledge_evidence`/`knowledge_pics` = **0/0/0** baris.

**Usulan fixture (menunggu persetujuan owner):**
- 1 Master Project sementara: `name` = `ZZ-KM-VERIFY-<timestamp>`, `location` = `TEST-ONLY`, `year` = 2026, `pic_user_id`/`created_by` = user Admin yang ada.
- Akun uji: cukup kredensial 4 akun existing (Admin, Head Office aktif, Head Office `suspended`, Management, Project); tidak perlu user baru.
- Record uji: 1 entry `lesson_learn` (content multiline) + 2 PIC Head Office (1 aktif, 1 suspended) + 2 evidence valid; 1 entry `va_ve` tanpa evidence.
- Cleanup: hapus evidence → PIC → entry untuk `project_id` fixture, lalu hapus Master Project; verifikasi count = 0 dan tidak ada baris yatim.

**Phase D — browser: NOT RUN.** Tidak ada akun; tidak ada screenshot yang diklaim.

**Phase E — regression: PASS (statis).** Tidak ada perubahan pada modul frozen (MSL Engineering, Struktur Organisasi) dan `npx next build` mengompilasi seluruh route. Uji fungsional runtime modul lain belum dijalankan.

**Status akhir putaran ini: BLOCKED** — menunggu kredensial akun uji (Phase A/B/D) dan persetujuan fixture (Phase C). Tidak ada deployment, commit, atau push.

## DL-2026-11-04-07 — Fixture execution preflight: STOP (kredensial empat role tidak tersedia)

**Pemeriksaan secret lokal (nama variabel saja, nilai tidak dibaca/dicetak).** `.env.local` memuat koneksi database, Blob/Vercel, MongoDB, dan hanya kredensial **Admin** (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Tidak ada variabel untuk Head Office, Management, maupun Project; tidak ada file `.env.test.local`/credential file lain di workspace.

**Konsekuensi.** Sesuai prioritas eksekusi (berhenti bila kredensial empat role belum tersedia), **tidak ada Master Project fixture dan tidak ada Knowledge Management record yang dibuat**. Tidak ada login, sesi, atau operasi tulis lain yang dijalankan.

**Verifikasi database tetap bersih (read-only).** Master Project 7, `knowledge_entries` 0, `knowledge_evidence` 0, `knowledge_pics` 0, Engineering Database 0, MSL assessment 7 — identik dengan kondisi sebelum audit. Tidak ada artefak fixture di working tree.

**Yang masih diperlukan dari owner.** (1) Tambahkan ke `.env.local` (untracked, jangan di-commit): `HO_EMAIL`/`HO_PASSWORD`, `MANAGEMENT_EMAIL`/`MANAGEMENT_PASSWORD`, `PROJECT_EMAIL`/`PROJECT_PASSWORD`; (2) keputusan untuk skenario PIC Head Office **suspended** — saat ini tidak ada user Head Office suspended, dan membuat/men-suspend user memerlukan persetujuan terpisah; (3) persetujuan tertulis pembuatan fixture `ZZ-KM-VERIFY-*` di `neondb`.

**Status: BLOCKED.** API terautentikasi, browser empat role, dan cleanup belum dapat dijalankan karena fixture belum boleh dibuat.

## DL-2026-11-04-08 — Eksekusi mandiri: kredensial Admin ditolak, fixture tidak dibuat

**Percobaan login (nilai kredensial tidak dicetak).** `.env.local` memuat `ADMIN_NIP`, `ADMIN_PASSWORD`, dan `ADMIN_EMAIL`, tetapi `POST /api/auth/login` mengembalikan **401 Invalid NIP or password** baik dengan NIP maupun dengan email. Artinya kredensial yang tersimpan tidak cocok dengan database yang sedang dipakai; tidak dilakukan tebakan password dan tidak ada sesi yang dibuat.

**Fixture.** Tidak ada Master Project maupun record Knowledge Management yang dibuat karena autentikasi gagal sebelum langkah tersebut. Skrip uji sementara dan log sudah dihapus.

**Verifikasi database (read-only) sesudah percobaan.** Master Project 7, fixture `ZZ-KM-VERIFY-%` 0, `knowledge_entries` 0, `knowledge_evidence` 0, `knowledge_pics` 0, `sessions` tidak bertambah. Dua percobaan login gagal tercatat pada ledger `login_attempts` (perilaku normal keamanan; tidak dihapus).

**Yang masih diperlukan.** Kredensial Admin yang valid untuk database aktif, plus kredensial Head Office, Management, dan Project bila uji empat role ingin diselesaikan. Tanpa itu, API/browser terautentikasi tetap **BLOCKED**.

## DL-2026-11-04-09 — Investigasi blocker login: target DB cocok, NIP env salah

**Target database.** `DIRECT_URL` = host direct `ep-tiny-sunset-b4im0t43...neon.tech`, `DATABASE_URL` = host pooler `ep-tiny-sunset-b4im0t43-pooler...neon.tech`; keduanya database **neondb**, PostgreSQL 18.6, `sslmode=require`. Aplikasi memakai `DATABASE_URL` (`src/lib/pg/client.ts`), migrasi memakai `DIRECT_URL` (`drizzle.config.ts`). Kedua koneksi melihat `drizzle.__drizzle_migrations` **15 baris dengan timestamp terakhir identik** dan data `users` yang sama — direct dan pooler menunjuk endpoint Neon yang sama, bukan database berbeda.

**Kontrak login.** Identifier adalah **NIP saja** (`loginSchema.nip`), lookup `users.nip`, verifikasi bcrypt, lalu status harus `active`. Email tidak pernah dipakai sebagai identifier.

**Temuan akar masalah.** `ADMIN_EMAIL` cocok dengan user **Administrator** (Admin, `active`, id `b0d26ba2-...`), dan `ADMIN_PASSWORD` **cocok dengan hash bcrypt akun tersebut**. Namun `ADMIN_NIP` di `.env.local` **tidak sama** dengan NIP tersimpan: panjang 7 vs 8 karakter, karakter pertama berbeda. Jadi 401 disebabkan identifier yang salah, bukan password atau database yang salah.

**Dampak keamanan.** Tercatat 3 kegagalan pada 2026-11-04 (2 untuk identity NIP salah, 1 untuk identity email): di bawah ambang lockout 5 kegagalan/15 menit, sehingga akun **tidak terkunci** dan tetap `active`. Tidak ada baris `login_attempts` yang dihapus.

**Resolusi.** Owner perlu mengoreksi `ADMIN_NIP` di `.env.local` (satu karakter awal) memakai NIP akun Administrator yang sebenarnya; password tidak perlu diubah. Kredensial Head Office, Management, dan Project tetap belum tersedia.

## DL-2026-11-04-10 — Eksekusi Admin end-to-end, bug KM-03 ditemukan & diperbaiki, fixture bersih

**Login Admin.** NIP benar diambil langsung dari database untuk `ADMIN_EMAIL` (nilai tidak dicetak); login **200**, role Admin. Tidak ada reset password atau perubahan user. Head Office/Management/Project tetap tanpa kredensial sehingga uji role tersebut BLOCKED.

**Runtime API (fixture 1 proyek, 3 record, 4 PIC, 3 evidence).** Suite pertama 40 cek: **36 PASS, 4 FAIL**. Semua kegagalan berasal dari satu bug: guarded UPDATE membandingkan `updated_at` PostgreSQL (mikrodetik) dengan token JSON (milidetik), sehingga setiap inline edit pertama mengembalikan **409**; PIC replacement ikut gagal dan uji "content untouched" gagal sebagai akibatnya.

**Perbaikan.** `updateKnowledgeContentIfUnchanged` (`src/lib/knowledge-management/repository.ts`) sekarang membandingkan epoch milidetik: `floor(extract(epoch from updated_at) * 1000) = expected.getTime()`. Tidak ada migration; presisi token tetap sama dengan yang diterima browser sehingga konflik nyata tetap ditolak.

**Verifikasi ulang pada fixture yang sama:** **10/10 PASS** — edit token fresh **200**, token basi **409**, konten tersimpan, stale write tidak menimpa, PIC replacement **200**, PIC menjadi 1, evidence tetap 1, PATCH evidence **200**.

**Browser (Admin, cookie via gate lokal).** Tiga submenu (Lesson Learn, Best Practice/KI KM, VA/VE) merender fixture; inline edit dilakukan lewat UI dan tersimpan (dikonfirmasi di database: konten 199 karakter memuat penanda UI). Console hanya berisi HMR/Fast Refresh, tanpa error aplikasi.

**Validasi API lain yang PASS:** content kosong 400, PIC hilang/[] 400, PIC Admin 409, `javascript:`/URL relatif 400, tipe tidak valid 400, hapus record 405, hapus proyek saat masih direferensikan 409, tanpa sesi 401, serta batas PIC/evidence sesuai scope.

**Cleanup.** Evidence (2) → PIC (3) → entry (3) → Master Project dihapus dalam satu transaksi; **CLEANUP PASS**, tanpa baris yatim. Database akhir: 7 Master Project, 0 fixture, 0 entry/evidence/PIC, 0 Engineering Database, 7 MSL, 10 user. Logout **200**.

**Regression & kualitas.** `tsc --noEmit` 0, ESLint 0, unit test **21/21**, `next build` **0**, `git diff --check` 0. Modul frozen (MSL Engineering, Struktur Organisasi) tidak berubah. Tidak ada deployment, commit, atau push.

**Status.** Admin: **PASS**. Head Office, Management, Project: **BLOCKED** (kredensial tidak tersedia). Knowledge Management V1 siap untuk acceptance Admin; acceptance empat role belum lengkap.

## DL-2026-11-04-11 — Token concurrency presisi mikrodetik, session cleanup, regresi final

**Audit presisi.** Implementasi sebelumnya membandingkan epoch milidetik, sehingga dua penyimpanan dalam milidetik yang sama dapat menerima token basi. Token sekarang adalah string UTC `YYYY-MM-DDTHH:MM:SS.ffffffZ` yang dihasilkan PostgreSQL (`to_char(... AT TIME ZONE 'UTC', '...US...')`) dan dikembalikan apa adanya; klien tidak lagi melewati `Date`. `findKnowledgeEntry` mengembalikan string yang sama, `updateKnowledgeContentIfUnchanged` memakai `updated_at = $token::timestamptz` dan menulis `updated_at = now()`, sehingga presisi penuh dipertahankan tanpa migration.

**Bukti.** Unit test **22/22** (termasuk token berbeda 1 mikrodetik dalam milidetik yang sama dianggap basi). Bukti guard SQL dengan tabel sementara (tanpa baris produksi): token fresh = 1 baris, replay token yang sama = 0, token beda 500 mikrodetik pada milidetik yang sama = 0, token tepat = 1 — **GUARD_PROOF PASS**. Uji HTTP concurrency pasca-perubahan **NOT RUN** karena pembuatan fixture tambahan dilarang pada fase ini; jalur HTTP Admin (fresh 200, stale 409) terakhir terverifikasi pada DL-10.

**Session security.** Lima sesi uji Admin (dibuat 06:27–06:37 UTC) dihapus berdasarkan ID tepat; `sessions` kembali **7** (baseline), sesi pra-uji 03:36 dan sesi pengguna lain tidak disentuh.

**QA final.** `tsc` 0, ESLint 0, unit test 22/22, `next build` 0, `drizzle-kit check` PASS, `git diff --check` 0. Modul frozen tidak berubah. Database: 7 Master Project, 0 fixture, 0 entry/evidence/PIC, 7 sesi, 10 user. Tidak ada migration, deployment, commit, atau push.

**Role.** Head Office, Management, Project tetap **BLOCKED**: tidak ada kredensial di `.env.local` maupun file secret lain; hanya `ADMIN_*` yang tersedia. Akun existing teridentifikasi (5 Head Office aktif, 1 Management, 1 Project) tetapi password tidak tersedia dan tidak boleh direset/dibuat.

**Status.** Admin **PASS**; concurrency **PASS (unit + SQL guard)**; HTTP concurrency pasca-perubahan **NOT RUN**; tiga role **BLOCKED**; acceptance empat role belum lengkap.

## DL-2026-11-04-12 — Timestamp monotonic ketat & keputusan acceptance final

**Monotonicity.** `updated_at = now()` diganti menjadi `greatest(clock_timestamp(), updated_at + interval '1 microsecond')`. `now()` adalah waktu mulai transaksi dan dapat berulang atau mundur bila jam disesuaikan; GREATEST menjamin setiap update sukses memiliki token yang **naik ketat** minimal 1 mikrodetik, tanpa mengubah tipe kolom, serialisasi string, atau semantik guard.

**Bukti monotonicity (tabel sementara, tanpa baris produksi).** Dengan `updated_at` diset ke 2030 (simulasi jam mundur), dua update menghasilkan `2030-01-01T00:00:00.123457Z` lalu `.123458Z`; pada jalur jam normal dua update menghasilkan token berbeda yang naik. **MONO_PROOF PASS**. Unit test bertambah menjadi **23/23 PASS**, termasuk token berbeda tepat 1 mikrodetik.

**Uji HTTP paralel — NOT RUN.** Tidak ada database uji terisolasi (`docker`, `psql`, `pg_ctl`, `initdb`, `postgres` semuanya tidak tersedia) dan tidak ada persetujuan fixture produksi tambahan, sehingga dua request simultan dengan token yang sama belum diuji lewat HTTP. Bukti yang ada: guard SQL (fresh=1 baris, replay=0 baris) dan unit test.

**RBAC tiga role — BLOCKED.** Tidak ada kredensial Head Office/Management/Project di `.env.local` atau file secret lain, dan tidak ada handoff browser dari pemilik akun. Tidak ada impersonasi, pembuatan user, atau reset password. Akun existing tetap: 5 Head Office aktif, 1 Management, 1 Project.

**QA final.** `tsc` 0, ESLint 0, unit test 23/23, `next build` 0, `drizzle-kit check` PASS, `git diff --check` 0. Modul frozen tidak berubah. Database tetap 7 Master Project, 0 fixture, 0 entry/evidence/PIC, 7 sesi (baseline), 10 user.

**Keputusan acceptance.** Admin: **PASS**. Timestamp monotonicity: **PASS**. Uji HTTP paralel: **NOT RUN**. Head Office/Management/Project: **BLOCKED**. Status keseluruhan: **BELUM READY FOR FINAL ACCEPTANCE** sampai uji paralel dan tiga role diselesaikan.

## DL-2026-11-04-13 — Verifikasi akhir: environment tidak tersedia, role BLOCKED

**A1 — kesiapan lingkungan.** Tidak ada database uji terisolasi: tidak ada `.env.test*`, `docker-compose`, atau workflow CI; `docker`/`psql`/`pg_ctl`/`initdb`/`postgres` tidak ada di PATH. Port 5432 memang terbuka dengan proses `postgres.exe` (PID 6764, service Windows), tetapi tidak ada kredensial, DSN, skema uji, atau konfigurasi proyek yang menunjuk ke sana; aplikasi tetap memakai `DATABASE_URL` produksi `neondb`. Membuat database/fixture baru dilarang tanpa persetujuan owner baru.

**A2 — uji HTTP paralel: NOT RUN.** Tidak dapat dijalankan tanpa lingkungan terisolasi atau fixture produksi tambahan. Bukti tidak langsung tetap berlaku: guard SQL (fresh=1 baris, replay=0 baris) dan unit test 23/23.

**A3 — timestamp integrity: PASS (dari DL-12, tidak berubah).** Serialisasi 6 digit mikrodetik, `GREATEST(clock_timestamp(), updated_at + 1µs)` menjamin kenaikan ketat, token fresh diterima, token basi ditolak, dua token dalam milidetik sama dibedakan, dan simulasi jam mundur (2030) tetap menghasilkan +1µs.

**A4 — regresi final.** `tsc` 0, ESLint 0, unit test **23/23**, `next build` 0, `drizzle-kit check` 0, `git diff --check` 0; modul frozen tidak berubah.

**B — role acceptance: BLOCKED.** Browser tidak memiliki sesi terautentikasi (tab dashboard diarahkan ke `/login`), hanya ada satu tab, dan tidak ada handoff dari pemilik akun Head Office/Management/Project. Kredensial ketiga role juga tidak ada di secret lokal. Tidak ada impersonasi, pembuatan user, suspend, atau reset password. Akun aktif tetap 5 Head Office, 1 Management, 1 Project.

**C — keamanan & integritas.** Tidak ada mutasi tak sah yang dijalankan pada fase ini. Database: 7 Master Project, 0 fixture, 0 entry/evidence/PIC, 7 sesi (baseline), 10 user. Tidak ada sesi uji tersisa.

**Keputusan akhir.** Admin **PASS**; timestamp **PASS**; uji HTTP paralel **NOT RUN**; tiga role **BLOCKED**. Status keseluruhan **BELUM READY FOR FINAL ACCEPTANCE**.

## DL-2026-11-04-14 — Role handoff tidak tersedia; PostgreSQL lokal tidak dapat diakses

**Phase A — role testing: BLOCKED.** Browser hanya memiliki tab di `/login` (tidak ada sesi terautentikasi); tidak ada handoff dari pemilik akun Head Office/Management/Project. Secret lokal tetap hanya `ADMIN_*`; tidak ada `HO_*`/`MANAGEMENT_*`/`PROJECT_*`. Tidak ada impersonasi, pembuatan user, suspend, atau reset password. Uji GET, visibilitas, mutasi, PIC options, dan pembatasan Program Kerja untuk ketiga role **NOT RUN**.

**Phase B — PostgreSQL lokal.** Service `postgresql-x64-17` **RUNNING** (PID 6764, akun `NT AUTHORITY\NetworkService`, data dir `C:\Program Files\PostgreSQL\17\data`, listen `*:5432`). `pg_hba.conf` memakai **scram-sha-256** untuk semua koneksi local/host, dan `psql -w` gagal dengan "no password supplied". Tidak ada DSN/kredensial uji resmi di repo maupun secret; tidak ada bukti database uji terpisah. Sesuai instruksi, tidak ada tebakan password, pembuatan database, atau perubahan konfigurasi. **Berhenti dan meminta bantuan owner.**

**Phase C — concurrent HTTP: NOT RUN.** Bergantung pada lingkungan uji terisolasi yang tidak tersedia; fixture produksi tambahan juga tidak disetujui.

**Phase D — dokumentasi.** Matriks acceptance role ditambahkan ke `06_AUTHENTICATION_AND_AUTHORIZATION.md`; status per modul sudah tercatat di `05`, `07`, `08`, dan `FEATURE_REGISTER`.

**Security hygiene vs RBAC.** Security hygiene **PASS** (tidak ada mutasi tak sah, tidak ada sesi uji tersisa, user tidak berubah). RBAC authorization tiga role **BELUM terverifikasi runtime** dan tidak boleh dilaporkan PASS.

**Status akhir.** Admin PASS; timestamp PASS; concurrent HTTP NOT RUN; Head Office/Management/Project BLOCKED. **BELUM READY FOR FINAL ACCEPTANCE**.

---

## DL-2026-11-05-01 — Commit KM V1 (c75d426)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` |
| Tanggal | 5 November 2026 |
| Status | **COMMITTED & PUSHED** — commit `c75d426`; tidak ada perubahan source pada pencatatan ini |
| Commit | `c75d426` "feat:KM core enterprise v.1" |
| Branch | `main` |
| Push | sudah di `origin/main` (verified) |
| Otorisasi | Owner (Hans) |
| Isi | 40 file: KM V1 (migration 0013/0014, API, lib, sidebar, dashboard, test), dokumentasi audit + development, `package.json` |
| File landing | 5 file landing sudah ter-commit di `d342bda`, bukan di commit ini |

### Catatan

Commit ini menutup rangkaian DL-01…DL-16 yang sebelumnya menyatakan "belum di-commit". Penambahan entri ini hanya dokumentasi log; tidak ada perubahan source code, migration, database, config, atau deployment.

---

## DL-2026-11-05-02 — Knowledge Management V2

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` |
| Tanggal | 5 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** — Admin PASS; Head Office/Management/Project BLOCKED (credentials tidak tersedia); migration APPLIED |
| Commit | belum di-commit (instruksi: no commit/push) |
| Branch | `main` |
| Baseline | `c75d426` |
| Migration | `0015_knowledge_management_v2_fresh` APPLIED di `neondb` |
| Data V1 | di-DROP (Owner accepted risk; 1 test record) |

### Perubahan
- Model V1 → V2: multiple records per project/kategori, form-based CRUD (bukan inline editing), evidence exactly-one, version-based concurrency, permanent delete
- Frontend: `KnowledgeTable` rewrite dengan rowspan grouping, `KnowledgeFormDialog` (modal Add/Edit), `KnowledgeDeleteDialog` (konfirmasi), `KnowledgeManagementPage` (shell)
- API: 6 endpoint V2 + 1 pendukung (`project-options`); hapus 4 endpoint V1
- Database: DROP V1 tables, REBUILD V2 fresh via migration 0015 (single statement batch, no partial state)

### Verifikasi
| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint` | PASS |
| `npm test` | 44/44 PASS |
| `git diff --check` | PASS |
| Migration APPLIED | PASS — 8/8 schema verification |
| API test | 71/73 → fix 2 di E+ → final PASS |
| Concurrency test | 4/4 PASS |
| Regression test | 7/7 PASS (MSL, Org, Program Kerja, Master Project, User, Landing CMS, Sidebar) |
| Runtime browser | PASS (gate Owner) |
| 4 role | Admin PASS; HO/Mgmt/Project BLOCKED |
| Cleanup | PASS — 0 record, 0 test project, users identik, modul lain tidak berubah |

### Known limitations
- Head Office, Management, Project: BLOCKED — tidak ada kredensial di `.env.local`/file secret; tidak ada impersonasi atau pembuatan user
- 4 drift `schema.ts` vs DB dari Sub-Fase M: diperbaiki di Sub-Fase F (termasuk snapshot `0015_snapshot.json`)
- `drizzle.config.ts` tidak membaca `.env.local` otomatis — didokumentasikan di `docs/audit/13_DEPLOYMENT_AND_ENVIRONMENT_GUIDE.md`

### Batasan
- Tidak ada commit/push/deploy
- Tidak menyentuh modul MSL/Org
- Migration 0015 fresh menggantikan 0015/0016/0017 (superseded)
- Data V1 (1 test record) hilang per keputusan Owner

---

## DL-2026-11-05-03 — KM V2 Enhancement (View, PDF, Filter, Search)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-KNOW` (enhancement) |
| Tanggal | 5 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** — Admin runtime PASS (Owner confirmed); HO/Mgmt/Project BLOCKED (credentials, Owner accepted); enhancement 4 fitur terimplementasi |
| Commit | belum di-commit (instruksi: no commit/push) |
| Branch | `main` |
| Baseline | `303ca9b` + enhancement A→D (uncommitted) |

### Perubahan
- F-01: Modal View read-only (`KnowledgeViewDialog`)
- F-02a: PDF per-record (A4 portrait) dari modal View
- F-02b: PDF seluruh tabel (A4 landscape) dari page header, filter aktif tercetak
- F-03: Filter tahun (client-side, dari record ter-muat)
- F-04: Search dropdown proyek (single-select, dari record ter-muat)
- D-KM-ENH-04: Kolom Aksi di KnowledgeTable selalu render (Lihat selalu, Edit kondisional)

### File impacted
- Add: `KnowledgeViewDialog.tsx`, `KnowledgeFilterToolbar.tsx`, `KnowledgeProjectCombobox.tsx`, `knowledgeExportPdf.ts`, `knowledgeExportPdf.test.ts`
- Modify: `KnowledgeTable.tsx`, `types.ts`, `types.test.ts`, `KnowledgeFormDialog.tsx`
- Tidak berubah: API, schema, migration, database, MSL/Org

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | PASS | Freebuff |
| `npx eslint` | PASS | Freebuff |
| `npm test` | 60/60 PASS (16 test enhancement baru) | Freebuff |
| `git diff --check` | PASS | Freebuff |
| Runtime Admin 4 fitur enhancement | PASS | **Owner confirmed** |
| Runtime regression Form/Delete/Table | PASS | **Owner confirmed** |
| Runtime PDF View + Download | PASS | **Owner confirmed** |
| 4 role runtime | Admin PASS; HO/Mgmt/Project BLOCKED | **Owner confirmed** |
| Cleanup DB | PASS | **Owner confirmed** |

### Catatan sumber runtime
Runtime test dilakukan oleh Owner di browser sendiri. Freebuff tidak dapat menjalankan runtime karena kredensial Admin tidak tersedia untuk Freebuff. Owner mengonfirmasi hasil runtime PASS untuk Sub-Fase B, C, dan D sebelum dokumentasi ini ditulis. Ini sesuai governance §11.3.

### Known limitations
- 3 role BLOCKED — credentials tidak tersedia (Owner accepted 2026-11-05, follow-up RB-21)
- File naming collision (dua download detik sama) — konsekuensi requirement, risiko sangat rendah
- jsPDF test smoke PASS di Node; wrapper browser hanya manual test (Owner confirmed)

### Batasan
- Tidak ada commit/push/deploy
- Tidak menyentuh modul MSL/Org
- MSL/Program Kerja exporter TIDAK di-refactor
- Tidak menambah dependency

---

## DL-2026-11-08-01 — MKS P4 Finalization (Sidebar KM, Table UI, Sub-Fase E)

| Field | Nilai |
|---|---|
| Feature ID | `ENT-MKS` |
| Tanggal | 8 November 2026 |
| Status | **IMPLEMENTED BUT NOT FULLY VERIFIED** — static checks PASS; runtime visual menunggu Owner |
| Commit | belum di-commit (instruksi: no commit/push/deploy) |
| Branch | `main` |
| Baseline | `ea70ba2` + MKS A–D (uncommitted); migration `0016` APPLIED |

### Perubahan
- Sidebar KM: `knowledgeOpen` menjadi `isKnowledgeManagementPath(pathname)` saja (menyimpang dari DL-2026-11-04-15 atas keputusan Owner 8 November 2026). MKS dan KM kini sama-sama route-driven.
- `getInitialSidebarAccordionState(pathname)` tidak lagi menerima parameter role; parameter dihapus agar tidak menyesatkan pembaca.
- Tabel MKS: padding baris `py-3` → `py-2`, header `py-2.5`, chip PIC `py-0.5`, catatan clamp 2 baris, tombol aksi seragam `h-7` + `shrink-0` (↑/↓ menjadi tombol ikon `w-7`), kontainer aksi `whitespace-nowrap`, sel Aksi `align-middle`, baris sub-kategori `bg-blue-50` dengan teks biru (item tetap putih), kolom Aksi 150px → 240px, `min-w` tabel 1080px → 1180px.
- Dokumentasi: laporan `docs/design/MKS_P4_FINALIZATION.md`, koreksi klaim KM di `docs/audit/06`, penanda resolusi di `SIDEBAR_ACCORDION_AUDIT.md`.

### File impacted
- Modify: `DashboardSidebar.tsx`, `DashboardSidebar.test.ts`, `metodeKerjaSidebar.test.ts`, `MetodeKerjaTable.tsx`
- Add: `docs/design/MKS_P4_FINALIZATION.md`
- Tidak berubah: API, service, repository, schema, migration, database, modul MSL/Org

### Verifikasi
| Pemeriksaan | Hasil | Sumber |
|---|---|---|
| `npx tsc --noEmit` | PASS | Freebuff |
| `npx eslint` (sidebar + folder MKS) | PASS, 0 warning | Freebuff |
| `npm test` | 115/115 PASS (30 suite) | Freebuff |
| `git diff --check` | PASS | Freebuff |
| Migration `0016` | APPLIED sebelum fase ini; tidak dijalankan ulang | Freebuff |
| Runtime visual tabel | NOT RUN | menunggu Owner |

### Batasan
- Tidak ada commit/push/deploy/migration
- Tidak ada dependency baru, tidak ada auto-collapse logic
- Kolom Aksi 200px menyimpang dari P3 H.2 (140px) agar toolbar tidak membungkus
