# CURRENT PROJECT STATE — BDWIKA / WIBEX

Terakhir diperbarui: 8 November 2026 (setelah finalisasi MKS P4 Sub-Fase E — sidebar KM, UI tabel, regresi & dokumentasi).

## 1. Repository

| Item | Nilai |
|---|---|
| Root | `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika` |
| Branch | `main` (tracking `origin/main`) |
| HEAD | `ea70ba2` (belum ada commit enhancement) |
| Stack | Next.js 16.3.8 · React 19.2.8 · TypeScript 5.9.3 · Tailwind 4 · Drizzle ORM · PostgreSQL (Neon) · MongoDB · Vercel Blob |
| Node / npm | v24 · npm 10 |
| Dev server | tidak dikelola Freebuff pada E; runtime dilakukan Owner (Owner confirmed) |
| Database | `neondb` (PostgreSQL 18.6), migration journal **17 entry** (`0016` MKS APPLIED) |

## 2. Working Tree (belum di-commit)

Tidak ada staged change. Tidak ada commit/push/deploy.

| Kelompok | Path | Keterangan |
|---|---|---|
| Lib KM V2 | `src/lib/knowledge-management/{access,conflict,repository,schema,service}.ts`, `knowledge.test.ts`, `repository.test.ts` (baru) | validation/service/repository V2 + 2 file test |
| API KM V2 | `src/app/api/knowledge-management/{route.ts,_helpers.ts,pic-options/route.ts,[id]/route.ts (baru),project-options/route.ts (baru)}` | 7 endpoint V2; 4 route V1 dihapus |
| Frontend KM V2 | `src/components/dashboard/knowledge-management/{KnowledgeTable,KnowledgeFormDialog (baru),KnowledgeDeleteDialog (baru),KnowledgeManagementPage (baru),types.ts (baru),types.test.ts (baru)}` | rowspan grouping, modal Add/Edit, dialog delete |
| Enhancement KM V2 (P4, A→D) | `src/components/dashboard/knowledge-management/{KnowledgeProjectCombobox (baru),KnowledgeFilterToolbar (baru),KnowledgeViewDialog (baru),knowledgeExportPdf (baru),knowledgeExportPdf.test (baru)}`; modify `KnowledgeTable`, `types.ts`, `types.test.ts`, `KnowledgeFormDialog` | View modal, PDF tabel + per-record, filter tahun/proyek, search proyek; API/schema/migration tidak berubah |
| Page KM | `src/app/dashboard/knowledge-management/{lesson-learn,best-practice,va-ve}/page.tsx` | memakai `KnowledgeManagementPage` |
| Schema DB | `src/lib/pg/schema.ts` | V2 + 4 drift fix (Sub-Fase F) |
| Migration | `drizzle/0015_knowledge_management_v2_fresh.sql` (baru), `drizzle/meta/0015_snapshot.json` (baru), `drizzle/meta/_journal.json` | journal 16 entry; file 0015/0016/0017 lama dihapus |
| Dokumentasi | `docs/development/*`, `docs/audit/05,06,07,08,13`, `docs/design/` | DL-2026-11-05-03 + sinkronisasi status enhancement |
| Landing | `src/components/landing/{Navbar,About,Clients,Footer,SocialMedia}.tsx` | perubahan lama, tidak disentuh F |

Jangan `reset`, `checkout --`, `stash`, atau `clean` — seluruh pekerjaan KM V2 belum di-commit.

## 3. Status Pemeriksaan Terakhir

| Pemeriksaan | Perintah | Exit | Status |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | PASS |
| ESLint (file KM) | `npx eslint src/lib/knowledge-management src/app/api/knowledge-management src/components/dashboard/knowledge-management` | 0 | PASS |
| Test otomatis | `npm test` | 0 | **115/115 PASS** (30 suite; termasuk 4 test sidebar MKS baru) |
| Diff hygiene | `git diff --check` | 0 | PASS |
| Drift Drizzle | `npx drizzle-kit generate` | 0 | **No schema changes** (snapshot 0015 sinkron) |
| Migration | `npx drizzle-kit migrate` | — | **tidak dijalankan di F** (0015 sudah APPLIED) |

## 4. Knowledge Management V2

**Status:** `IMPLEMENTED BUT NOT FULLY VERIFIED` — Admin PASS; Head Office/Management/Project BLOCKED.

**Enhancement 2026-11-05 (P4).** View modal read-only, PDF seluruh tabel (A4 landscape) dan per-record (A4 portrait), filter tahun, serta search proyek single-select — semuanya client-side dari record yang sudah dimuat. Kolom Aksi selalu render (Lihat semua role, Edit hanya Manage). Tidak ada endpoint, schema, atau migration baru. Static checks PASS (60/60 test); runtime Admin dan cleanup PASS (**Owner confirmed**); tiga role tetap BLOCKED. Detail: `DL-2026-11-05-03`.

- **Model:** multiple records per project/kategori (bukan satu baris per project), form modal Add/Edit, evidence **tepat satu**, PIC **minimal satu** (Head Office), optimistic concurrency integer `version`, permanent delete.
- **Migration:** `0015_knowledge_management_v2_fresh` **APPLIED** di `neondb` (5 November 2026). Tabel V1 di-drop, V2 dibangun ulang. Data V1 = 1 test record, hilang per keputusan Owner (no backup, accepted risk).
- **Verifikasi:** API 71/73 PASS lalu dua temuan diperbaiki (updated_by null saat create; pesan validasi spesifik 20.000) dan diverifikasi runtime; concurrency 4/4 PASS; regresi 7/7 PASS (MSL, Org, Program Kerja, Master Project, User, Landing CMS, Sidebar); runtime browser Admin PASS (gate Owner).
- **Known limitation:** Head Office, Management, Project BLOCKED — tidak ada kredensial di `.env.local`/secret file; tidak ada impersonasi/pembuatan user.
- **Catatan operasional:** `drizzle.config.ts` tidak membaca `.env.local`; export `DIRECT_URL` sebelum `npx drizzle-kit migrate` (lihat `docs/audit/13`).

## 5. Kondisi yang Perlu Diketahui

- Seluruh pekerjaan enhancement KM V2 (A–D) dan dokumentasi E belum di-commit; HEAD `303ca9b`.
- Database KM dalam keadaan bersih: `knowledge_entries/pics/evidence = 0`, tidak ada project `ZZ-KM-TEST-*` (cleanup runtime **Owner confirmed**).
- Tidak ada user baru, suspend, atau reset password selama pengujian; baseline user 10 akun tidak berubah.
- Modul MSL dan Struktur Organisasi protected — tidak disentuh.
- Feed publik Green Building masih 0 item (empty state).
- `schema.ts` kini identik dengan database (4 drift M selesai) dan snapshot `0015_snapshot.json` tersedia.

## 6. Metode Kerja Standar (P4)

**Status:** `IMPLEMENTED BUT NOT FULLY VERIFIED` — static checks PASS, migration APPLIED, runtime Owner confirmed untuk fitur; penyesuaian UI tabel (8 November) belum diverifikasi visual.

- **Cakupan:** 3 tabel domain (sub-kategori, item, PIC), 10 route API, 7 komponen frontend + exporter PDF, route `/dashboard/metode-kerja-standar/{summary,[disiplin]}`.
- **Migration:** `0016_metode_kerja_standar` **APPLIED**; journal 17 entry; object terverifikasi (3 tabel, 16 index, 2 constraint trigger, CHECK disiplin A–F, unique kode per disiplin).
- **Sidebar:** sejak 8 November 2026, KM dan MKS sama-sama route-driven (default collapsed). Keputusan ini menggantikan perilaku awal DL-2026-11-04-15; visibilitas per role tidak berubah.
- **Tabel:** 7 kolom `Sub-Kategori | Item | PIC | Evidence | Catatan | Jumlah | Aksi`; sel Sub-Kategori di-merge `rowSpan={items.length + 1}` (rel `bg-blue-50`, border bawah tunggal), baris ringkas (`py-2`), tombol aksi seragam `h-7` tanpa pembungkusan, kolom Aksi 240px, `min-w` 1290px. **Summary Report** memakai pengelompokan ala Program Kerja: Disiplin menjadi baris header `colSpan` penuh (navy, teks putih), Sub-Kategori di-merge `rowSpan` sesuai jumlah item yang lolos filter, 5 kolom (Sub-Kategori, Item, PIC, Evidence, Status) di UI dan PDF (PDF mencetak label sub-kategori sekali karena `rowSpan` bisa terpotong page break).
- **Detail:** `docs/design/MKS_P4_FINALIZATION.md`; keputusan `DL-2026-11-08-01`.
- **Known limitation:** tidak ada auto-collapse antar-route dalam satu sesi; role Head Office/Management/Project belum diuji runtime karena kredensial tidak tersedia.

## 7. Langkah Berikutnya

1. Commit enhancement + dokumentasi MKS P4 (menunggu otorisasi Owner; tanpa push/deploy pada instruksi ini).
2. Verifikasi visual tabel MKS di satu halaman disiplin (desktop + mobile) lalu final acceptance Owner/ChatGPT atas `DL-2026-11-08-01`.
3. Setelah commit: acceptance role Head Office/Management/Project bila Owner menyediakan kredensial uji (tetap BLOCKED sampai saat itu).
