# CURRENT PROJECT STATE — BDWIKA / WIBEX

Terakhir diperbarui: 5 November 2026 (setelah Sub-Fase F — Knowledge Management V2 final).

## 1. Repository

| Item | Nilai |
|---|---|
| Root | `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika` |
| Branch | `main` (tracking `origin/main`) |
| HEAD | `c75d426` — "feat:KM core enterprise v.1" (belum ada commit baru) |
| Stack | Next.js 16.3.8 · React 19.2.8 · TypeScript 5.9.3 · Tailwind 4 · Drizzle ORM · PostgreSQL (Neon) · MongoDB · Vercel Blob |
| Node / npm | v24 · npm 10 |
| Dev server | **dimatikan** (port 3000 kosong saat penutupan F) |
| Database | `neondb` (PostgreSQL 18.6), migration journal **16 entry** |

## 2. Working Tree (belum di-commit)

Tidak ada staged change. Tidak ada commit/push/deploy.

| Kelompok | Path | Keterangan |
|---|---|---|
| Lib KM V2 | `src/lib/knowledge-management/{access,conflict,repository,schema,service}.ts`, `knowledge.test.ts`, `repository.test.ts` (baru) | validation/service/repository V2 + 2 file test |
| API KM V2 | `src/app/api/knowledge-management/{route.ts,_helpers.ts,pic-options/route.ts,[id]/route.ts (baru),project-options/route.ts (baru)}` | 7 endpoint V2; 4 route V1 dihapus |
| Frontend KM V2 | `src/components/dashboard/knowledge-management/{KnowledgeTable,KnowledgeFormDialog (baru),KnowledgeDeleteDialog (baru),KnowledgeManagementPage (baru),types.ts (baru),types.test.ts (baru)}` | rowspan grouping, modal Add/Edit, dialog delete |
| Page KM | `src/app/dashboard/knowledge-management/{lesson-learn,best-practice,va-ve}/page.tsx` | memakai `KnowledgeManagementPage` |
| Schema DB | `src/lib/pg/schema.ts` | V2 + 4 drift fix (Sub-Fase F) |
| Migration | `drizzle/0015_knowledge_management_v2_fresh.sql` (baru), `drizzle/meta/0015_snapshot.json` (baru), `drizzle/meta/_journal.json` | journal 16 entry; file 0015/0016/0017 lama dihapus |
| Dokumentasi | `docs/development/*`, `docs/audit/05,06,07,08,13`, `docs/design/` | DL-2026-11-05-02 + sinkronisasi status |
| Landing | `src/components/landing/{Navbar,About,Clients,Footer,SocialMedia}.tsx` | perubahan lama, tidak disentuh F |

Jangan `reset`, `checkout --`, `stash`, atau `clean` — seluruh pekerjaan KM V2 belum di-commit.

## 3. Status Pemeriksaan Terakhir

| Pemeriksaan | Perintah | Exit | Status |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | PASS |
| ESLint (file KM) | `npx eslint src/lib/knowledge-management src/app/api/knowledge-management src/components/dashboard/knowledge-management` | 0 | PASS |
| Test otomatis | `npm test` | 0 | **44/44 PASS** (16 suite) |
| Diff hygiene | `git diff --check` | 0 | PASS |
| Drift Drizzle | `npx drizzle-kit generate` | 0 | **No schema changes** (snapshot 0015 sinkron) |
| Migration | `npx drizzle-kit migrate` | — | **tidak dijalankan di F** (0015 sudah APPLIED) |

## 4. Knowledge Management V2

**Status:** `IMPLEMENTED BUT NOT FULLY VERIFIED` — Admin PASS; Head Office/Management/Project BLOCKED.

- **Model:** multiple records per project/kategori (bukan satu baris per project), form modal Add/Edit, evidence **tepat satu**, PIC **minimal satu** (Head Office), optimistic concurrency integer `version`, permanent delete.
- **Migration:** `0015_knowledge_management_v2_fresh` **APPLIED** di `neondb` (5 November 2026). Tabel V1 di-drop, V2 dibangun ulang. Data V1 = 1 test record, hilang per keputusan Owner (no backup, accepted risk).
- **Verifikasi:** API 71/73 PASS lalu dua temuan diperbaiki (updated_by null saat create; pesan validasi spesifik 20.000) dan diverifikasi runtime; concurrency 4/4 PASS; regresi 7/7 PASS (MSL, Org, Program Kerja, Master Project, User, Landing CMS, Sidebar); runtime browser Admin PASS (gate Owner).
- **Known limitation:** Head Office, Management, Project BLOCKED — tidak ada kredensial di `.env.local`/secret file; tidak ada impersonasi/pembuatan user.
- **Catatan operasional:** `drizzle.config.ts` tidak membaca `.env.local`; export `DIRECT_URL` sebelum `npx drizzle-kit migrate` (lihat `docs/audit/13`).

## 5. Kondisi yang Perlu Diketahui

- Seluruh pekerjaan KM V2 (A–F) belum di-commit; HEAD masih `c75d426`.
- Database KM dalam keadaan bersih: `knowledge_entries/pics/evidence = 0`, tidak ada project `ZZ-KM-TEST-*`.
- Tidak ada user baru, suspend, atau reset password selama pengujian; baseline user 10 akun tidak berubah.
- Modul MSL dan Struktur Organisasi protected — tidak disentuh.
- Feed publik Green Building masih 0 item (empty state).
- `schema.ts` kini identik dengan database (4 drift M selesai) dan snapshot `0015_snapshot.json` tersedia.

## 6. Langkah Berikutnya

1. Final acceptance review Owner/ChatGPT atas DL-2026-11-05-02.
2. Commit + push (menunggu otorisasi Owner); sertakan migration, snapshot, frontend, API, lib, dan dokumentasi.
3. Setelah commit: acceptance role Head Office/Management/Project bila Owner menyediakan kredensial uji.
