# P3 — Technical Design: Project Documentation (PDOC)

**Proyek:** WIBEX — Staff Engineering Digitalisasi Building
**Fase:** P3 — Technical Design
**Tanggal:** 2026-11-09
**Baseline:** `main` @ `5636113` — `feat: core enterprise calculation sheet template v-1`
**Input:** P1 Requirement (FINAL) + `docs/design/PDOC_P2_AUDIT.md` (PASS) + keputusan Owner D-PDOC-01…06
**Status:** Desain selesai — menunggu review Owner/ChatGPT
**P4:** Belum dimulai

> Catatan baseline: brief P3 menyebut `c053c48`, tetapi HEAD aktual sudah bergerak ke
> `5636113` karena pekerjaan CST sudah di-commit. Dokumen ini memakai HEAD aktual.
> Migration `0017_calculation_sheet_templates` sudah ada di repo; status apply ke
> database tidak diverifikasi oleh fase desain ini. PDOC memakai migration **0018**.

---

## A. Executive Summary

Project Documentation (PDOC) adalah modul **read-mostly master view** di atas Master
Project. Baris tidak dibuat atau dihapus dari PDOC; setiap baris adalah satu Master
Project, dan user hanya mengisi lima link minggu + catatan secara inline.

Desain final:

| Keputusan | Implementasi |
|---|---|
| D-PDOC-01 | Satu tabel **flat** `project_documentations`, `project_id UNIQUE`, `week_1_url`…`week_5_url`, pasangan `week_n_updated_by`/`week_n_updated_at` |
| D-PDOC-02 | `GET /api/project-documentation` + `PUT /api/project-documentation/[projectId]` (upsert); tanpa POST/DELETE |
| D-PDOC-03 | Satu baris diedit pada satu waktu; draft 5 URL + catatan; Simpan mengirim seluruh baris; server hanya mengubah minggu yang URL-nya berubah |
| D-PDOC-04 | Nama user + tanggal `id-ID` ditampilkan di bawah setiap link |
| D-PDOC-05 | PDF A4 landscape: Nama Proyek, Minggu 1–5, Catatan; metadata updater tidak dicetak |
| D-PDOC-06 | Project role dapat mengedit seluruh project, tanpa pembatasan ownership |

Prinsip arsitektur:

1. **Master Project adalah sumber baris.** Tidak ada endpoint pemilihan project dan
   tidak ada `POST` untuk membuat baris. Project tanpa dokumentasi tetap tampil
   dengan lima sel kosong.
2. **Satu tabel, satu baris per project.** Lima minggu adalah slot tetap, bukan
   relasi child. Ini membuat query daftar, upsert, dan PDF langsung berbentuk baris
   tabel tanpa grouping.
3. **Audit per minggu adalah last-touch.** Setiap link memiliki aktor dan waktu
   sendiri; tidak ada tabel history/versioning. `updated_by` hanya berubah untuk
   minggu yang benar-benar diubah.
4. **Reuse maksimum, refactor minimum.** Pola state MSL, draft/URL/API/PDF CST,
   permission registry, dan guard layout dipakai kembali. Tidak ada perubahan pada
   logika MSL, MKS, atau CST.
5. **Satu halaman.** `/dashboard/project-documentation`; tidak ada halaman detail,
   modal, atau form terpisah.

Estimasi dampak P4: 1 migration aditif, 1 tabel baru, 2 permission, 2 route API,
1 halaman + 1 layout, 1 tabel client, 1 draft helper, 1 exporter PDF, dan test murni.
Tidak ada tabel existing yang diubah.

---

## B. Requirement Traceability Matrix

| ID | Requirement P1 | Keputusan desain | Bagian | Verifikasi |
|---|---|---|---|---|
| R-PDOC-01 | Baris = semua Master Project, read-only dari sisi project | Master Project sebagai driving table + `LEFT JOIN project_documentations` | E, F, I | GET mengembalikan project tanpa dokumentasi |
| R-PDOC-02 | Tidak bisa tambah/hapus project di PDOC | Tidak ada `POST`/`DELETE`; UI tanpa tombol tambah/hapus | F, G, J | Route inventory + UI review |
| R-PDOC-03 | Kolom Nama Proyek | Nama read-only, diambil dari Master Project | H | Manual + DTO test |
| R-PDOC-04 | Kolom Minggu 1–5 berupa link URL | Lima kolom URL nullable, validasi http(s) ≤ 2048 | E, F, H | Schema unit test |
| R-PDOC-05 | Kolom Catatan | `catatan` nullable ≤ 2000, per project | E, H | Schema unit test |
| R-PDOC-06 | Kolom Aksi | `Edit` (manage) / `Simpan` + `Batal` saat edit | G, H | Manual 4 role |
| R-PDOC-07 | 100% inline editing, tanpa modal | Satu state `editing` per baris; input langsung di sel | G, I | Manual + component review |
| R-PDOC-08 | Audit setiap link: siapa dan kapan | `week_n_updated_by` + `week_n_updated_at`; diff server | E, F, H | Audit diff unit test |
| R-PDOC-09 | Link kosong tampil `—` | `EMPTY_VALUE = "—"` untuk URL dan metadata | G, H | Manual |
| R-PDOC-10 | Admin, Head Office, Project manage | `DOCUMENTATION_MANAGE` = HO + Project; Admin super-rule | J | Access unit test + manual |
| R-PDOC-11 | Management read-only | `DOCUMENTATION_VIEW` saja; tanpa input/tombol | J | Manual Management |
| R-PDOC-12 | Project role mengedit semua project | Tidak ada filter ownership/PIC di service | J | Manual Project |
| R-PDOC-13 | Export PDF | A4 landscape, 7 kolom, tanpa metadata updater | E, H, I | PDF body unit test + manual |
| R-PDOC-14 | Tanpa upload file | Hanya kolom URL; tidak ada storage/blob | E | Review schema |
| R-PDOC-15 | Satu baris diedit pada satu waktu | `editing: PdocEditingState \| null` global | G | Manual |
| R-PDOC-16 | Query tanpa N+1 | Satu query project + left join; bulk lookup user | D, F | Query review |

---

## C. Repository Baseline

| Item | Nilai |
|---|---|
| Branch | `main` |
| HEAD | `5636113` — `feat: core enterprise calculation sheet template v-1` |
| Commit sebelumnya | `c053c48` — MKS/KM RBAC verified |
| Migration journal | 18 entry (`idx` 0–17); terakhir `0017_calculation_sheet_templates` |
| Migration berikutnya | **`0018_project_documentations`** |
| Status migration 0017 | Ada di repo; apply DB tidak diverifikasi |
| Stack | Next.js 16.3.8 · React 19.2.8 · TypeScript 5.9 · Tailwind 4 · Drizzle ORM 0.45 · PostgreSQL (Neon) |
| Test runner | `node --import tsx --test "src/**/*.test.ts"` (tanpa jsdom) |
| PDF | `jspdf` 4.2.1 + `jspdf-autotable` 5.0.9 (sudah terpasang) |
| Pola UI | `--primary #001f3f`, `--secondary #0061a5`; header tabel `bg-background`, border `border-outline/50` |
| Working tree P3 | Hanya dokumen P2 (untracked) dan dokumen P3 ini; tidak ada source code berubah |
| Kode PDOC existing | Tidak ada — pencarian `project_documentation`, `projectDocumentation`, `DOCUMENTATION_` = 0 match |

Dokumen P2 menjadi acuan pola dan risiko; P3 ini mengubah rekomendasi P2 menjadi
kontrak implementasi yang final. Tidak ada kode yang dijalankan atau diubah pada
fase ini.

---

## D. Existing vs Proposed Architecture

### D.1 Perbandingan lapisan

| Lapisan | MSL | CST | PDOC (usulan) |
|---|---|---|---|
| Sumber baris | Master Project per tahun | Record CST buatan user | **Semua Master Project** |
| Create/delete baris | Create assessment per project; delete assessment | Create/delete template | **Tidak ada** |
| State edit | 1 `editing` global + `createDrafts` | 1 `editing` + 1 `creating` | **1 `editing` global saja** |
| Field per baris | 3 skor + remarks | 5 field master | **5 URL + catatan** |
| Audit | 1 `updated_by/at` per assessment | 1 `updated_by/at` per baris | **5 pasang `updated_by/at` per minggu + audit catatan** |
| API | POST + PATCH + DELETE | POST + PUT + DELETE | **GET + PUT upsert** |
| Error | Domain error + Zod | Domain error + Zod + SQLSTATE | **Domain error + Zod (reuse CST helper)** |
| PDF | A4 landscape per periode | A4 landscape summary | **A4 landscape seluruh baris** |
| Modal | Tidak | Tidak | **Tidak** |

### D.2 Pola yang dipakai ulang

| Pola | Sumber | Pemakaian PDOC |
|---|---|---|
| Master Project + join PIC | `src/lib/master-project/repository.ts:31-78` | Sumber nama/lokasi/tahun project |
| Master Project sebagai driving table | `src/lib/msl/service.ts:184-210` | Semua project tetap tampil walau dokumentasi kosong |
| Satu state edit global | `MslEngineeringPage.tsx:68-69, 253-410` | Satu baris diedit pada satu waktu |
| Draft murni + `initial` | `msl-draft.ts`, `cst-draft.ts` | `PdocDraft`, `draftEquals`, validasi |
| Inline input/textarea di sel | `CstTable.tsx:96-190` | Lima input URL + textarea catatan |
| URL evidence + `—` | `CstTable.tsx:54-68` | Link dan empty state |
| API helper CST | `src/app/api/calculation-sheet-template/_helpers.ts` | Actor, parse body, error mapping, `no-store` |
| Permission registry | `src/lib/auth/permissions.ts:24-127` | 2 permission baru |
| Guard layout | `src/app/dashboard/calculation-sheet-template/layout.tsx:8-19` | Guard PDOC |
| PDF CST | `cstSummaryExportPdf.ts:41-167` | Builder PDF PDOC |
| Sidebar item | `DashboardSidebar.tsx:271-289` | Menu Project Documentation |

### D.3 Yang baru dan tidak boleh dipaksakan dari existing

| Kebutuhan | Alasan tidak bisa reuse langsung |
|---|---|
| Lima URL dalam satu draft | MSL/CST tidak punya field array URL |
| Audit per minggu | CST/MSL hanya satu `updated_by/at` per baris |
| Upsert `project_id` | CST selalu insert; MSL insert assessment per periode |
| PDF 7 kolom tanpa metadata | CST 6 kolom; MKS punya grouping yang tidak relevan |
| Tanpa create/delete | MSL/CST memiliki tombol create/delete yang harus sengaja tidak dibuat |

**Prinsip:** jangan mengekstrak komponen dari CST/MSL hanya untuk “reuse”. Salin pola
dan kelas Tailwind ke komponen PDOC agar modul existing tidak berisiko regresi.

---

## E. Database Design

### E.1 Tabel `project_documentations`

```ts
export const projectDocumentations = pgTable(
  "project_documentations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => masterProjects.id, { onDelete: "restrict" }),

    week1Url: text("week_1_url"),
    week1UpdatedBy: uuid("week_1_updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    week1UpdatedAt: timestamp("week_1_updated_at", { withTimezone: true }),

    week2Url: text("week_2_url"),
    week2UpdatedBy: uuid("week_2_updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    week2UpdatedAt: timestamp("week_2_updated_at", { withTimezone: true }),

    week3Url: text("week_3_url"),
    week3UpdatedBy: uuid("week_3_updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    week3UpdatedAt: timestamp("week_3_updated_at", { withTimezone: true }),

    week4Url: text("week_4_url"),
    week4UpdatedBy: uuid("week_4_updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    week4UpdatedAt: timestamp("week_4_updated_at", { withTimezone: true }),

    week5Url: text("week_5_url"),
    week5UpdatedBy: uuid("week_5_updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    week5UpdatedAt: timestamp("week_5_updated_at", { withTimezone: true }),

    catatan: text("catatan"),

    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_documentations_project_id_unique").on(table.projectId),
    check(
      "project_documentations_week_1_url_check",
      sql`${table.week1Url} is null or (${table.week1Url} ~ '^https?://' and length(${table.week1Url}) <= 2048)`,
    ),
    // week_2 … week_5 mengikuti pola yang sama
    check(
      "project_documentations_catatan_check",
      sql`${table.catatan} is null or length(${table.catatan}) <= 2000`,
    ),
  ],
);
```

### E.2 Kolom dan invariant

| Kolom | Null | Aturan |
|---|---|---|
| `id` | no | PK UUID |
| `project_id` | no | FK `master_projects.id`, `ON DELETE RESTRICT`, **UNIQUE** |
| `week_n_url` | yes | absolute `http(s)`, ≤ 2048; kosong = `NULL` |
| `week_n_updated_by` | yes | FK `users.id`, `ON DELETE SET NULL` |
| `week_n_updated_at` | yes | `timestamptz`; diisi bersama `updated_by` saat minggu berubah |
| `catatan` | yes | ≤ 2000; kosong = `NULL` |
| `created_by` | no | aktor yang pertama membuat baris dokumentasi |
| `updated_by` | yes | aktor perubahan baris terakhir (catatan/link) |
| `created_at` | no | default `now()` |
| `updated_at` | no | default `now()`; di-set saat ada perubahan |

**Invariant aplikasi (bukan CHECK):**

1. `week_n_updated_by` dan `week_n_updated_at` selalu diisi/dipertahankan bersama.
2. Saat link dikosongkan, URL menjadi `NULL`, tetapi metadata tetap menyimpan aktor
   dan waktu pengosongan.
3. Menyimpan ulang nilai yang sama tidak mengubah timestamp minggu mana pun.
4. `project_id` tidak boleh berubah; tidak ada field ini di body PUT.
5. Tidak ada `version`, `sort_order`, `deleted_at`, atau `blob_pathname`.

Tidak dibuat CHECK pasangan `updated_by`/`updated_at` karena `ON DELETE SET NULL`
dapat membuat `updated_by` menjadi `NULL` sementara `updated_at` tetap terisi. Itu
adalah perilaku yang benar untuk audit historis.

### E.3 Constraint dan index

| Nama | Definisi | Alasan |
|---|---|---|
| `project_documentations_project_id_unique` | unique index pada `project_id` | Satu baris per project; target upsert |
| `project_documentations_week_n_url_check` | `NULL` atau regex + panjang | Validasi database, bukan hanya Zod |
| `project_documentations_catatan_check` | `NULL` atau ≤ 2000 | Konsisten CST/MKS |
| FK `project_id` | `ON DELETE RESTRICT` | Dokumentasi/audit tidak hilang diam-diam |
| FK `week_n_updated_by` | `ON DELETE SET NULL` | User yang dihapus tidak memblokir baris |
| FK `created_by` | `ON DELETE no action` | Authorship dipertahankan |

Tidak ada index terpisah untuk `project_id` karena unique index sudah menjadi index.
Tidak ada index per `week_n_updated_by`; tidak ada query “cari berdasarkan updater”.
Jika profiling menunjukkan kebutuhan, tambahkan index tanpa mengubah kontrak.

**Konsekuensi FK RESTRICT:** Master Project yang sudah punya dokumentasi tidak dapat
dihapus. Pesan 409 Master Project saat ini menyebut Engineering Database, MSL, dan
Knowledge Management; teks itu perlu ditambah “Project Documentation” agar akurat
(perubahan **teks** saja, bukan logika delete). Lihat §L dan §O.

### E.4 Migration 0018

- Nama: `0018_project_documentations`.
- Dibuat dengan `npx drizzle-kit generate` setelah `schema.ts` diubah; jangan menulis
  `_journal.json` atau snapshot manual.
- Sifat: aditif (`CREATE TABLE` + constraint/index); tidak mengubah tabel existing.
- Rollback: `DROP TABLE project_documentations;`.
- Urutan: pastikan migration 0017 sudah applied sebelum 0018.
- Apply hanya dengan otorisasi Owner dan `DIRECT_URL`; P4 tidak menjalankan migration
  tanpa instruksi eksplisit.

### E.5 Mengapa flat (ringkas)

P2 sudah membandingkan flat vs child. Keputusan D-PDOC-01 mengunci flat karena lima
minggu adalah slot tetap, catatan milik project, satu baris per project membuat query
dan PDF langsung, dan upsert cukup satu statement. Child table baru relevan jika
minggu menjadi dinamis atau perlu history penuh per minggu.

---

## F. API Contract

Namespace: `src/app/api/project-documentation/**`.
Semua response sukses `{ data: ... }`, error `{ error: { message, details? } }`, dan
`Cache-Control: no-store`.

### F.1 `GET /api/project-documentation`

- Auth: `DOCUMENTATION_VIEW` + akun aktif.
- Mengembalikan semua Master Project, termasuk yang belum punya dokumentasi.
- Query:
  1. `master_projects` left join `project_documentations` on `project_id`;
  2. bulk lookup nama user untuk maksimal 10 kolom audit + `updated_by`;
  3. map ke DTO.
- Tidak ada query per project.

Response 200:

```json
{
  "data": {
    "rows": [
      {
        "project_id": "uuid",
        "project_name": "Gedung A",
        "project_location": "Jakarta",
        "project_year": 2026,
        "weeks": [
          {
            "week": 1,
            "url": "https://example.com/week-1",
            "updated_by": { "user_id": "uuid", "name": "Budi" },
            "updated_at": "2026-11-09T07:30:00.000Z"
          },
          {
            "week": 2,
            "url": null,
            "updated_by": null,
            "updated_at": null
          }
        ],
        "catatan": "Catatan opsional",
        "updated_by": { "user_id": "uuid", "name": "Budi" },
        "updated_at": "2026-11-09T07:30:00.000Z"
      }
    ]
  }
}
```

- `weeks` **selalu lima elemen**, urut 1–5; elemen kosong tetap dikirim.
- `updated_by`/`updated_at` boleh `null`.
- Urutan baris: `project_name`, `project_location`, `project_id` (deterministik).
- Project tanpa dokumentasi: `weeks` berisi lima objek kosong, `catatan: null`.

### F.2 `PUT /api/project-documentation/[projectId]`

- Auth: `DOCUMENTATION_MANAGE`.
- `projectId` wajib UUID; invalid → 400, tidak ditemukan → 404.
- Body strict; semua field wajib ada (boleh `null`/string kosong):

```json
{
  "week_1_url": "https://example.com/week-1",
  "week_2_url": null,
  "week_3_url": null,
  "week_4_url": null,
  "week_5_url": null,
  "catatan": "Opsional"
}
```

Aturan validasi:

| Field | Aturan |
|---|---|
| `week_n_url` | string/null; trim; kosong → `NULL`; jika diisi wajib absolute `http(s)` dan ≤ 2048 |
| `catatan` | string/null; trim; kosong → `NULL`; ≤ 2000 |
| Field lain | Ditolak `.strict()`; actor/timestamp/project_id tidak boleh dari body |

Response 200 `{ data: row }` dengan DTO yang sama seperti GET (satu baris).

### F.3 Upsert dan audit diff

Service melakukan:

1. `assertManageAccess(actor)`.
2. Cari project; 404 jika tidak ada.
3. Ambil dokumentasi existing (boleh `null`).
4. Normalisasi lima URL + catatan.
5. Bandingkan URL lama vs baru per minggu:
   - berubah → set `week_n_url`, `week_n_updated_by = actor.id`,
     `week_n_updated_at = now()`;
   - tidak berubah → pertahankan URL dan metadata lama.
6. Jika tidak ada perubahan sama sekali → **tidak menulis**, kembalikan DTO existing
   (PUT idempoten).
7. Jika ada perubahan:
   - baris baru → `created_by = actor.id`, `created_at = now()`;
   - `updated_by = actor.id`, `updated_at = now()`;
   - upsert `ON CONFLICT (project_id) DO UPDATE`.
8. Baca ulang baris lengkap dan kembalikan DTO.

Catatan: menghapus link (string kosong/`null`) dihitung sebagai perubahan; URL menjadi
`NULL` dan metadata minggu tetap mencatat aktor/waktu pengosongan.

### F.4 Error mapping

| Kondisi | Status | Pesan |
|---|---|---|
| Tanpa sesi | 401 | `Unauthenticated` |
| Role tidak berhak / suspended | 403 | `Akses Project Documentation ditolak` |
| `projectId` bukan UUID | 400 | `ID project tidak valid` |
| Project tidak ditemukan | 404 | `Master Project tidak ditemukan` |
| URL invalid / > 2048 / catatan > 2000 | 400 | pesan field |
| Body bukan JSON / field ekstra | 400 | `Body harus berupa JSON yang valid` / pesan Zod |
| Unique/FK violation | 409 | `Dokumentasi project tidak dapat disimpan` |
| Lainnya | 500 | `Terjadi kesalahan server` + log label route |

Reuse `mapDomainError`, `parseJsonBody`, `isUuid`, `getActor` dari pola
`src/app/api/calculation-sheet-template/_helpers.ts`.

### F.5 Tidak ada POST/DELETE

- **POST tidak ada** karena identitas resource adalah `master_projects.id`; POST akan
  memungkinkan duplikasi atau dokumentasi untuk project yang tidak ada.
- **DELETE tidak ada** karena P1 tidak mengizinkan menghapus project dari PDOC dan
  menghapus link cukup mengosongkan URL.
- “Full CRUD/Manage” pada P1 berarti user dapat mengubah lima link + catatan, bukan
  membuat/menghapus baris project.

### F.6 Kontrak repository

```ts
listProjectDocumentationRows(): Promise<ProjectDocumentationRawRow[]>
findProjectDocumentation(projectId): Promise<ProjectDocumentationRawRow | null>
upsertProjectDocumentation(data): Promise<void>
findProjectById(projectId): Promise<{ id: string; name: string } | null>
findUsersByIds(ids: string[]): Promise<Map<string, string>>
```

Repository hanya query dan write; permission, validasi, dan audit diff berada di
service. Nama user di-resolve dengan satu query `inArray(users.id, ids)`, bukan satu
query per minggu.

---

## G. UI/UX Design

### G.1 Struktur halaman

Route: `/dashboard/project-documentation`.

```
DashboardShell
└── ProjectDocumentationLayout (guard VIEW)
    └── page.tsx (server: getCurrentUser → canManage)
        └── ProjectDocumentationPage (client)
            ├── Header: badge Core Enterprise, judul, deskripsi, jumlah project, PDF
            ├── Feedback banner (sukses/error)
            ├── Error banner + Coba Lagi (jika load gagal)
            └── ProjectDocumentationTable
                ├── <thead> Nama Proyek | Minggu 1..5 | Catatan | Aksi
                └── <tbody> satu baris per Master Project
```

Tidak ada filter, search, pagination, modal, atau halaman detail pada P1. Jika jumlah
project sangat besar, itu open decision §O, bukan scope default.

### G.2 State

```ts
type PdocDraft = {
  weeks: [string, string, string, string, string];
  catatan: string;
};

type PdocEditingState = {
  projectId: string;
  draft: PdocDraft;
  initial: PdocDraft;
  error: string | null;
};

const [rows, setRows] = useState<PdocRowDto[] | null>(null);
const [editing, setEditing] = useState<PdocEditingState | null>(null);
const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
const [feedback, setFeedback] = useState<Feedback | null>(null);
```

- Tidak ada `creating`, `deleting`, atau `createDrafts`.
- Hanya satu baris dapat diedit; baris lain tetap read-only dan tombolnya disabled
  selama `editing !== null` atau `busyProjectId !== null`.
- `initial` dipakai untuk dirty check dan konfirmasi batal/pindah baris.
- `busyProjectId` memblokir seluruh mutasi lain selama request.

### G.3 Interaksi

| Aksi | Perilaku |
|---|---|
| `Edit` | Hanya manage role. Jika ada draft kotor, konfirmasi; lalu isi `editing` dari row |
| Ubah input | Patch `draft.weeks[i]` atau `draft.catatan`; reset error |
| `Simpan` | Validasi klien → `PUT` seluruh baris → ganti row dari response |
| `Batal` | Konfirmasi jika dirty → `editing = null` |
| `Edit` baris lain | Konfirmasi jika dirty; jika bersih, pindah tanpa request |
| `beforeunload` | Aktif selama draft kotor (pola CST) |
| Read-only role | Tidak ada input, `Edit`, `Simpan`, atau `Batal` |

Tidak ada tombol tambah/hapus project dan tidak ada tombol simpan per sel.

### G.4 Mode render

**Read mode**

- Nama project bold; lokasi/tahun sebagai subteks kecil (opsional, dari Master Project).
- Lima sel minggu: link truncate + metadata di bawahnya; kosong → `—`.
- Catatan clamp 2 baris + `title`; kosong → `—`.
- Aksi: `Edit` jika `canManage`, selain itu `—`.

**Edit mode**

- Nama project tetap teks read-only.
- Lima `<input type="url" maxLength={2048}>`, placeholder `https://...`.
- `<textarea rows={2} maxLength={2000}>` untuk catatan.
- `Simpan` (primary) + `Batal` (ghost); disabled saat `busy`.
- Error baris dirender di bawah input/textarea dengan `role="alert"`.

Semua input memiliki `aria-label` yang menyebut nomor minggu dan nama project.

### G.5 Empty, loading, error

| State | Tampilan |
|---|---|
| Initial load | Skeleton 3–4 baris + teks “Memuat Project Documentation...” |
| Load gagal | Kartu error + `Coba Lagi` |
| Tidak ada Master Project | Baris kosong `colSpan={8}`: “Belum ada Master Project.” |
| Dokumentasi kosong | Baris tetap tampil; lima minggu dan catatan `—` |
| Simpan sukses | Banner hijau `role="status"`, auto-dismiss 5 detik |
| Simpan gagal | Error di baris yang diedit; data server tidak berubah |
| Refresh | Tidak ada refresh otomatis setelah save; response menggantikan row |

### G.6 Dirty guard dan navigasi

- `beforeunload` aktif saat `draft !== initial`.
- Pindah baris/edit lain memakai `window.confirm`.
- Navigasi client-side antar-route belum dicegat (batasan yang sama dengan CST);
  didokumentasikan sebagai risiko UX, bukan blocker P4.

### G.7 Aksesibilitas dan responsif

- Header kolom `scope="col"`; nama project `<th scope="row">` jika memungkinkan.
- Fokus terlihat `focus:ring-2 focus:ring-secondary/20`.
- Tabel dibungkus `overflow-x-auto`, `min-w-[1400px]` karena lima kolom URL.
- Mobile mengandalkan scroll horizontal; tidak ada card layout terpisah di P1.
- Metadata memakai teks kecil yang tetap kontras (`text-primary/50`).

---

## H. Table Design

### H.1 Kolom

| # | Header | Lebar | Read mode | Edit mode |
|---|---|---|---|---|
| 1 | Nama Proyek | 220 px | nama + lokasi/tahun | teks read-only |
| 2 | Minggu 1 | 160 px | link + metadata | input URL |
| 3 | Minggu 2 | 160 px | link + metadata | input URL |
| 4 | Minggu 3 | 160 px | link + metadata | input URL |
| 5 | Minggu 4 | 160 px | link + metadata | input URL |
| 6 | Minggu 5 | 160 px | link + metadata | input URL |
| 7 | Catatan | 220 px | clamp 2 baris | textarea |
| 8 | Aksi | 120 px | Edit / `—` | Simpan + Batal |

`PDOC_COLUMN_COUNT = 8` diekspor dan dipakai empty state/error row, seperti
`CST_COLUMN_COUNT` di CST.

### H.2 Nama proyek read-only

Nama tidak pernah menjadi input. Sumbernya `master_projects.name`; lokasi dan tahun
hanya subteks. User tidak dapat mengganti nama, memindahkan project, atau mengubah
PIC dari PDOC.

### H.3 Format tanggal

Gunakan helper murni:

```ts
export function formatPdocTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}
```

Contoh: `09 Nov 2026, 14.30`. Zona waktu dan format ini adalah keputusan UI; `title`
pada metadata dapat memuat timestamp lengkap. Jika Owner hanya ingin tanggal, hapus
`hour`/`minute` tanpa mengubah data.

### H.4 Empty value

- URL kosong: `—`.
- Metadata tidak dirender jika URL kosong (metadata tetap tersimpan di DB).
- Catatan kosong: `—`.
- Nama project tidak boleh kosong (NOT NULL di Master Project).

### H.5 Metadata

Di bawah link:

```
Diperbarui Budi · 09 Nov 2026, 14.30
```

- Nama diambil dari `week_n_updated_by.name`; fallback `—` bila user sudah dihapus.
- Metadata wrap/truncate; `title` memuat nama + timestamp lengkap.
- Read-only role melihat metadata yang sama.
- Metadata tidak dicetak di PDF (D-PDOC-05).

---

## I. Data Flow

### I.1 Initial load

```
Server page → getCurrentUser() → canManage
Client page → GET /api/project-documentation
           → rows[] (semua Master Project + 5 minggu)
           → render tabel
```

Tidak ada fetch per project; satu request. Tidak ada endpoint opsi project.

### I.2 Inline edit → upsert

```
Klik Edit
  → confirm jika draft kotor
  → editing = { projectId, draft: fromRow(row), initial, error: null }

User mengubah 5 URL / catatan
  → patch draft

Klik Simpan
  → validasi klien (URL http(s), ≤ 2048, catatan ≤ 2000)
  → PUT /api/project-documentation/{projectId}
      body: { week_1_url … week_5_url, catatan }
  → 200 row DTO
  → setRows(rows.map(r => r.project_id === dto.project_id ? dto : r))
  → editing = null, feedback sukses
```

Tidak ada optimistic update; response server adalah sumber kebenaran. Jika gagal,
draft dan error tetap terbuka.

### I.3 Audit update

```
Service membandingkan URL lama vs baru per minggu:
  week 1 berubah → set week_1_url + updated_by/at
  week 2 sama    → tidak sentuh URL/metadata
  week 3 dikosongkan → NULL + updated_by/at
  catatan berubah → row updated_by/at
```

### I.4 PDF

```
Klik Export PDF
  → dynamic import projectDocumentationExportPdf
  → build body dari rows yang sudah dimuat
  → jsPDF A4 landscape → save
```

Tidak ada request tambahan; PDF tidak mungkin berbeda dengan tabel pada saat klik.

---

## J. Authentication & RBAC

### J.1 Permission

`src/lib/auth/permissions.ts`:

```ts
DOCUMENTATION_VIEW: "DOCUMENTATION_VIEW",
DOCUMENTATION_MANAGE: "DOCUMENTATION_MANAGE",
```

Mapping non-Admin:

```ts
DOCUMENTATION_VIEW: [HEAD_OFFICE_ROLE, PROJECT_ROLE, MANAGEMENT_ROLE],
DOCUMENTATION_MANAGE: [HEAD_OFFICE_ROLE, PROJECT_ROLE],
```

| Aksi | Admin | Head Office | Project | Management |
|---|---|---|---|---|
| Lihat halaman/list | ✅ | ✅ | ✅ | ✅ |
| Edit 5 link + catatan | ✅ | ✅ | ✅ | — |
| Lihat metadata audit | ✅ | ✅ | ✅ | ✅ |
| Export PDF | ✅ | ✅ | ✅ | ✅ |
| Tambah/hapus project | — | — | — | — |

Admin lolos melalui super-rule `hasPermission()` (`permissions.ts:132-138`).
Tidak ada permission DELETE dan tidak ada ownership check: Project role mengedit
**semua** project (D-PDOC-06).

### J.2 Helper akses

`src/lib/project-documentation/access.ts`:

```ts
canViewDocumentation(role): boolean
canManageDocumentation(role): boolean
assertViewAccess(actor): void   // aktif + VIEW
assertManageAccess(actor): void // aktif + MANAGE
```

### J.3 Guard berlapis

| Lapisan | Perilaku |
|---|---|
| Sidebar | Tampil jika VIEW; item Project Documentation di Core Enterprise |
| Layout | Tanpa sesi → `/login`; tanpa VIEW → `/dashboard` |
| Server page | `canManage` dihitung dari permission, dikirim ke client |
| Client UI | Input/tombol hanya jika `canManage` |
| Service | Assert pada GET/PUT; actor dari sesi |
| API | `requireUser`; 401/403 dari helper |

Tidak ada pengecekan “project milik user”. Project role dapat mengelola semua baris
sesuai keputusan Owner.

---

## K. Concurrency

**V1 sengaja tanpa versioning.** Tidak ada kolom `version`, ETag, atau token
optimistic concurrency. Strategi: **last-write-wins per baris**.

| Skenario | Perilaku |
|---|---|
| Dua tab mengedit baris berbeda | Aman; baris berbeda |
| Dua user mengedit project yang sama | Simpan terakhir menang untuk seluruh baris |
| Dua user mengedit minggu berbeda pada project yang sama | Berpotensi saling menimpa karena PUT mengirim seluruh baris; lihat risiko |
| Dua request pertama bersamaan | `ON CONFLICT (project_id)` mencegah duplikasi |
| Simpan tanpa perubahan | Tidak menulis; timestamp tidak berubah |
| User dihapus | `week_n_updated_by`/`updated_by` menjadi `NULL`; `updated_at` tetap |

**Risiko cross-week clobber:** User A mengubah Minggu 1, User B mengubah Minggu 5.
Keduanya memuat data awal. A menyimpan lebih dulu. B menyimpan seluruh draft lama +
Minggu 5 baru, sehingga Minggu 1 kembali ke nilai lama. Ini konsekuensi dari D-PDOC-03
(simpan seluruh baris) dan tidak adanya versioning.

Mitigasi V1:

- Satu baris edit pada satu waktu per tab; `busyProjectId` memblokir simpan ganda.
- Edit singkat; metadata mencatat aktor terakhir.
- Tidak ada auto-save yang tidak terlihat.
- Jika Owner menganggap risiko ini tidak acceptable, P4 dapat menambahkan
  `updated_at` token/versioning atau PATCH per minggu. Itu perubahan desain, bukan
  default P3.

Tidak ada 409 optimistic; satu-satunya 409 adalah pelanggaran constraint database
(unique/FK).

---

## L. Regression Impact

| Area | Dampak | Mitigasi |
|---|---|---|
| Master Project — tabel/data | Tidak ada perubahan kolom; FK baru mengarah ke Master Project | Migration aditif |
| Master Project — delete | Project dengan dokumentasi tidak dapat dihapus (409) | FK `RESTRICT`; uji manual |
| Master Project — pesan 409 | Perlu menambah “Project Documentation” pada teks pesan | **Satu-satunya perubahan teks** di `master-project/service.ts`; logika tidak berubah |
| MSL | Tidak ada perubahan | Tidak menyentuh `src/lib/msl/**`, `src/components/dashboard/msl/**` |
| MKS | Tidak ada perubahan | Tidak menyentuh `metode-kerja-standar/**` |
| CST | Tidak ada perubahan | Tidak menyentuh `calculation-sheet-template/**` |
| KM | Tidak ada perubahan | Tidak menyentuh `knowledge-management/**` |
| Sidebar | File bersama berubah: visibility + menu + accordion | Additive; jalankan seluruh test sidebar |
| Permission map | 2 entry baru | Additive; role existing tidak berubah |
| Database | 1 tabel baru | Tidak ada ALTER tabel existing |
| Bundle | Halaman + PDF baru | `jspdf` di-dynamic import; tidak masuk initial bundle halaman lain |
| Tests | Test sidebar/permission existing harus tetap PASS | Jalankan suite penuh |

**Catatan:** heading L meminta “tidak menyentuh Master Project”. Secara logika dan
data, Master Project tidak berubah. Satu-satunya sentuhan yang disarankan adalah
**string pesan 409** agar user tahu dokumentasi juga menahan delete. Jika Owner
melarang semua sentuhan, pesan lama tetap berfungsi tetapi tidak menyebut PDOC;
catat sebagai keterbatasan UX.

---

## M. Testing Strategy

### M.1 Unit test murni (tanpa DOM/database)

| File | Cakupan |
|---|---|
| `schema.test.ts` | URL valid/invalid, http vs https, 2048/2049, kosong→null, catatan 2000/2001, strict menolak field ekstra |
| `access.test.ts` | VIEW/MANAGE untuk 4 role + Admin + suspended + role tak dikenal |
| `draft.test.ts` | `EMPTY_PDOC_DRAFT`, `toPdocDraft`, `draftEquals`, validasi URL/catatan, payload |
| `audit.test.ts` | Hanya minggu berubah yang dapat metadata baru; minggu sama tetap; clear link dihitung berubah; row baru; tanpa perubahan→null |
| `projectDocumentationExportPdf.test.ts` | Body 7 kolom, `—` untuk kosong, URL panjang, urutan baris |
| `_helpers.test.ts` | Error mapping 401/403/404/400/409, invalid UUID, Zod details |

**Audit diff sebaiknya berupa fungsi murni** yang diekspor dari service/helper:

```ts
computeDocumentationChanges(
  previous: PdocStored | null,
  next: PdocInput,
  actorId: string,
  now: Date,
): PdocWritePlan | null; // null = tidak ada perubahan
```

Dengan fungsi ini, aturan audit dapat diuji tanpa database.

### M.2 API/route test

- Route test level helper/validation tanpa database:
  - body invalid → 400;
  - `projectId` invalid → 400;
  - field ekstra → 400;
  - mapping domain error.
- Tidak ada database test otomatis karena repo tidak menyediakan DB uji terisolasi;
  verifikasi GET/PUT nyata dilakukan manual dan dilaporkan sebagai runtime test.
- Jangan menguji komponen React dengan jsdom (runner tidak menyediakannya).

### M.3 Quality gates

| Perintah | Target |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint <file berubah>` | exit 0 |
| `npm test` | seluruh suite PASS, termasuk test PDOC baru |
| `git diff --check` | exit 0 |
| `npx drizzle-kit check` | schema/snapshot konsisten |

### M.4 Manual acceptance

| Skenario | Admin | Head Office | Project | Management |
|---|---|---|---|---|
| Lihat semua project | ✅ | ✅ | ✅ | ✅ |
| Edit Minggu 1–5 + catatan | ✅ | ✅ | ✅ | tidak ada tombol |
| Link kosong tampil `—` | ✅ | ✅ | ✅ | ✅ |
| Metadata muncul setelah simpan | ✅ | ✅ | ✅ | ✅ |
| Simpan tanpa perubahan tidak mengubah timestamp | ✅ | ✅ | ✅ | — |
| PDF A4 landscape 7 kolom | ✅ | ✅ | ✅ | ✅ |
| Tambah/hapus project | tidak ada | tidak ada | tidak ada | tidak ada |
| Project tanpa dokumentasi tetap tampil | ✅ | ✅ | ✅ | ✅ |

Skenario tambahan: URL invalid, catatan > 2000, dua tab, project dihapus saat punya
dokumentasi (409), dan read-only tidak menerima input.

---

## N. File Impact Inventory

### N.1 File baru

| Path | Isi |
|---|---|
| `src/lib/project-documentation/constants.ts` | `PDOC_WEEKS`, batas URL/catatan, label |
| `src/lib/project-documentation/access.ts` | VIEW/MANAGE + assert |
| `src/lib/project-documentation/schema.ts` | Zod PUT + validasi URL |
| `src/lib/project-documentation/audit.ts` | `computeDocumentationChanges` murni |
| `src/lib/project-documentation/repository.ts` | Query list/find, bulk user, upsert |
| `src/lib/project-documentation/service.ts` | DTO, assert, audit diff, error |
| `src/lib/project-documentation/*.test.ts` | Unit test murni |
| `src/app/api/project-documentation/_helpers.ts` | Actor, parse body, error mapping |
| `src/app/api/project-documentation/route.ts` | `GET` |
| `src/app/api/project-documentation/[projectId]/route.ts` | `PUT` |
| `src/app/dashboard/project-documentation/layout.tsx` | Guard VIEW |
| `src/app/dashboard/project-documentation/page.tsx` | Server page + `canManage` |
| `src/components/dashboard/project-documentation/ProjectDocumentationPage.tsx` | Fetch, state, simpan, PDF |
| `src/components/dashboard/project-documentation/ProjectDocumentationTable.tsx` | Tabel 8 kolom |
| `src/components/dashboard/project-documentation/projectDocumentationDraft.ts` | Draft/validasi/payload |
| `src/components/dashboard/project-documentation/projectDocumentationExportPdf.ts` | PDF A4 landscape |
| `src/components/dashboard/project-documentation/*.test.ts` | Draft/PDF test |
| `drizzle/0018_project_documentations.sql` | Migration (dibuat tool) |
| `drizzle/meta/0018_snapshot.json` | Snapshot (dibuat tool) |

### N.2 File yang diubah

| Path | Perubahan |
|---|---|
| `src/lib/auth/permissions.ts` | 2 permission + mapping |
| `src/lib/pg/schema.ts` | `projectDocumentations` + tipe |
| `src/components/dashboard/DashboardSidebar.tsx` | Menu + visibility Project Documentation |
| `src/components/dashboard/DashboardSidebar.test.ts` (atau test sidebar baru) | Ekspektasi menu PDOC |
| `src/lib/master-project/service.ts` | Teks pesan 409 menyebut Project Documentation |
| `drizzle/meta/_journal.json` | Entry 0018 (oleh tool) |

### N.3 Tidak boleh berubah

`src/lib/msl/**`, `src/components/dashboard/msl/**`,
`src/lib/metode-kerja-standar/**`, `src/components/dashboard/metode-kerja-standar/**`,
`src/lib/calculation-sheet-template/**`,
`src/components/dashboard/calculation-sheet-template/**`,
`src/lib/knowledge-management/**`, dan seluruh tabel/migration existing.

---

## O. Technical Risks & Open Decisions

### O.1 Risiko

| # | Risiko | Prob. | Dampak | Mitigasi |
|---|---|---|---|---|
| R-01 | Cross-week clobber pada edit bersamaan | Sedang | Link minggu lain kembali | Terima V1; busy lock; opsi versioning/PATCH di masa depan |
| R-02 | 15 kolom audit membuat schema lebar | Tinggi | Maintenance | Lima minggu tetap; dokumentasi kolom eksplisit |
| R-03 | Metadata berubah saat URL sama | Rendah | Audit menyesatkan | Diff murni + test; tidak menulis jika tidak berubah |
| R-04 | URL panjang merusak tabel/PDF | Sedang | Sulit dibaca | Truncate + title; PDF linebreak + font 6.5 |
| R-05 | PDF 7 kolom sempit | Sedang | Link terpotong | A4 landscape, lebar eksplisit; A3 opsional jika perlu |
| R-06 | Semua project semua tahun terlalu besar | Sedang | Halaman panjang | Sesuai P1; filter/pagination menjadi OQ |
| R-07 | Project delete terblokir tanpa pesan jelas | Sedang | User bingung | Update teks 409 Master Project |
| R-08 | Migration 0017 belum applied | Sedang | 0018 gagal | Konfirmasi status sebelum generate/apply |
| R-09 | Permission `DOCUMENTATION_*` terlalu generik | Rendah | Tabrakan namespace | Ikuti requirement; dokumentasikan |
| R-10 | Project role mengedit semua project | Rendah | Akses luas | Keputusan Owner D-PDOC-06; audit mencatat aktor |
| R-11 | Timestamp zona waktu berbeda | Sedang | „Kapan” tidak konsisten | Format `Asia/Jakarta`; helper terpusat |
| R-12 | Client-side navigation tidak dicegat | Rendah | Draft hilang | `beforeunload`; batasan sama dengan CST |

### O.2 Keputusan yang sudah final

| ID | Keputusan |
|---|---|
| D-PDOC-01 | Flat table, `project_id UNIQUE`, 5 URL + audit per minggu |
| D-PDOC-02 | GET + PUT upsert; tanpa POST/DELETE |
| D-PDOC-03 | Satu baris edit, draft 5 URL + catatan, simpan seluruh baris |
| D-PDOC-04 | Nama + tanggal `id-ID` di bawah link |
| D-PDOC-05 | PDF A4 landscape, tanpa metadata updater |
| D-PDOC-06 | Project role mengedit semua project |

### O.3 Open decisions untuk Owner

| ID | Pertanyaan | Rekomendasi |
|---|---|---|
| OQ-PDOC-01 | Tampilkan tanggal saja atau tanggal + jam? | Tanggal + jam `Asia/Jakarta`; mudah diubah |
| OQ-PDOC-02 | Setujui perubahan **teks** pesan 409 Master Project? | Ya, agar menyebut Project Documentation |
| OQ-PDOC-03 | Perlu filter tahun/pagination jika project banyak? | Tidak di P1; ukur dulu jumlah project |
| OQ-PDOC-04 | PDF mencetak URL penuh atau label “Buka” yang clickable? | URL penuh agar bukti dokumen terlihat |
| OQ-PDOC-05 | Metadata link yang dikosongkan disembunyikan atau ditampilkan? | Disembunyikan di UI, tetap disimpan di DB |

### O.4 Non-goals

- Tambah/hapus/rename project dari PDOC.
- Upload file/blob; hanya URL.
- Modal form, halaman detail, atau form terpisah.
- Search/filter/pagination di P1.
- Versioning/optimistic concurrency.
- Riwayat lengkap setiap perubahan link.
- Reorder project.
- Edit nama/lokasi/tahun/PIC project.

---

## P. Implementation Plan

### Sub-fase A — Database & permission foundation

**Deliverable**

- `projectDocumentations` di `src/lib/pg/schema.ts`.
- Migration `0018_project_documentations` + snapshot/journal via drizzle-kit.
- `DOCUMENTATION_VIEW`/`DOCUMENTATION_MANAGE` di permission registry.
- `src/lib/project-documentation/access.ts`.
- Test access + schema dasar.

**Exit criteria:** `tsc`/eslint PASS; `drizzle-kit check` PASS; migration belum
di-apply tanpa otorisasi.

### Sub-fase B — Backend domain

**Deliverable**

- `constants.ts`, `schema.ts`, `audit.ts`, `repository.ts`, `service.ts`.
- Query list tanpa N+1, bulk user lookup, upsert, DTO.
- Unit test validasi URL, draft, audit diff, service mapping.

**Exit criteria:** test audit diff membuktikan hanya minggu berubah yang mendapat
metadata; `npm test` PASS.

### Sub-fase C — API

**Deliverable**

- `_helpers.ts`, `GET /api/project-documentation`,
  `PUT /api/project-documentation/[projectId]`.
- Error mapping 400/401/403/404/409/500, `no-store`.
- Route/helper test.

**Exit criteria:** request invalid tidak menyentuh DB; GET mengembalikan project
tanpa dokumentasi; PUT idempoten.

### Sub-fase D — UI, sidebar, PDF

**Deliverable**

- Layout guard, server page, client page, table, draft helper, PDF exporter.
- Sidebar menu Project Documentation.
- Loading/error/empty/feedback, dirty guard, 4-role render.
- PDF A4 landscape 7 kolom.

**Exit criteria:** empat role manual check; inline edit satu baris; metadata tampil;
PDF dapat diunduh; tidak ada tombol tambah/hapus project.

### Sub-fase E — Verification & handoff

**Deliverable**

- `npx tsc --noEmit`.
- `npx eslint` file berubah.
- `npm test` seluruh suite.
- `git diff --check`.
- Manual GET/PUT dengan database (setelah migration disetujui).
- Regression check MSL/MKS/CST/sidebar.
- Update dokumentasi status proyek.
- Handoff ke Owner; tidak commit/push/deploy tanpa instruksi.

**Exit criteria:** seluruh acceptance criteria §Q terpenuhi; risiko residual
didokumentasikan.

---

## Q. Acceptance Criteria

### Q.1 Fungsional

- [ ] Halaman menampilkan **semua** Master Project, termasuk yang belum punya dokumentasi.
- [ ] Kolom: Nama Proyek, Minggu 1–5, Catatan, Aksi.
- [ ] Nama project read-only; tidak ada tombol tambah/hapus project.
- [ ] Lima link dapat diedit inline; satu baris pada satu waktu.
- [ ] Simpan mengirim seluruh baris; server hanya mengubah minggu yang URL-nya berubah.
- [ ] Link kosong tampil `—`.
- [ ] Metadata nama + tanggal tampil di bawah link; kosong jika link kosong.
- [ ] Menyimpan tanpa perubahan tidak mengubah timestamp.
- [ ] Mengosongkan link menyimpan URL `NULL` + metadata pengosongan.
- [ ] PDF A4 landscape berisi Nama Proyek, Minggu 1–5, Catatan; tanpa metadata updater.

### Q.2 Keamanan & RBAC

- [ ] Admin, Head Office, Project dapat melihat dan mengedit semua project.
- [ ] Management hanya melihat; tidak ada input/tombol mutasi.
- [ ] Tanpa sesi → 401; role salah/suspended → 403.
- [ ] `projectId` invalid → 400; project tidak ada → 404.
- [ ] Actor dan timestamp tidak dapat dikirim dari body.
- [ ] Layout dan API sama-sama menegakkan permission.

### Q.3 Data & query

- [ ] Satu baris per project (`project_id UNIQUE`).
- [ ] Tidak ada N+1; list memakai satu query project + left join + bulk user lookup.
- [ ] URL divalidasi di klien, Zod, dan CHECK database.
- [ ] `catatan` ≤ 2000; URL ≤ 2048; hanya http(s).
- [ ] Migration aditif; tidak mengubah tabel existing.
- [ ] Project dengan dokumentasi tidak dapat dihapus (409) dan pesan menyebut PDOC.

### Q.4 UI & PDF

- [ ] Loading, error + retry, empty project, empty cell, dan feedback sukses.
- [ ] Dirty guard + konfirmasi batal/pindah baris.
- [ ] Tabel responsif dengan horizontal scroll.
- [ ] PDF dapat diunduh/dibuka dan konsisten dengan data yang dimuat.
- [ ] Tidak ada modal, upload, search, atau pagination di P1.

### Q.5 Quality gates

- [ ] `npx tsc --noEmit` exit 0.
- [ ] `npx eslint` file berubah exit 0.
- [ ] `npm test` seluruh suite PASS.
- [ ] `git diff --check` exit 0.
- [ ] `npx drizzle-kit check` PASS.
- [ ] Tidak ada perubahan pada MSL/MKS/CST/KM selain yang tercantum di §L.

### Q.6 Handoff

- [ ] Dokumen P3 A–Q lengkap dan direview Owner.
- [ ] Open decisions §O.3 dijawab.
- [ ] Migration 0017/0018 status jelas.
- [ ] Tidak ada commit/push/deploy tanpa instruksi.
- [ ] Owner memberi **“Siap dikembangkan”** sebelum P4.

**Status: READY FOR OWNER REVIEW — P4 belum dimulai.**
