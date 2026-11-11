# P3 — Technical Design: Dashboard Welcoming

**Proyek:** WIBEX — Staff Engineering Digitalisasi Building
**Fase:** P3 — Technical Design
**Tanggal:** 2026-11-11
**Input:** Audit P2 Dashboard Welcoming
**Status:** Desain selesai — menunggu review Owner/ChatGPT
**P4:** Belum dimulai

> Dokumen ini hanya desain. Tidak ada source code, migration, database, atau
> dependency yang diubah. DDL adalah rancangan konseptual untuk migration
> `0025_activity_logs`, bukan migration yang sudah dijalankan.

---

## A. Keputusan dan Scope

| ID | Keputusan |
|---|---|
| D-DASH-01 | `activity_logs` baru; `logActivity()` hanya dipakai Berkas, Master Project, dan PDOC |
| D-DASH-02 | Skor MSL = rata-rata assessment tahun berjalan |
| D-DASH-03 | Admin/HO/Mgmt global; Project hanya data miliknya |
| D-DASH-04 | Total User hanya `users.status = 'active'` |
| D-DASH-05 | Server Component `getDashboardData()`, tanpa endpoint API baru |

**Scope Project.** Proyek dengan `pic_user_id = actor.id`, Berkas dengan
`pemohon_id = actor.id`, rejected Berkas miliknya, dan activity dengan
`actor_user_id = actor.id`. Project tidak memiliki akses MSL, sehingga kartu MSL
menampilkan “Tidak tersedia” tanpa query. Total User juga tidak bermakna untuk
Project dan ditampilkan “Tidak tersedia”, bukan angka palsu.

**Di luar scope.** Edit/hapus activity, deep-link record, audit field-level,
activity modul lain, dan endpoint API dashboard terpisah.

---

## B. Database Schema — `activity_logs`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | `uuid` | Primary key, `default gen_random_uuid()` |
| `actor_user_id` | `uuid` | FK `users.id`, `ON DELETE SET NULL`, nullable |
| `action` | `text` | NOT NULL, CHECK nilai terbatas |
| `entity_type` | `text` | NOT NULL, CHECK nilai terbatas |
| `title` | `text` | NOT NULL, snapshot aman 1–200 karakter |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

`action`: `CREATE`, `UPDATE`, `DELETE`, `SIGN`, `REJECT`, `REVISE`.
`entity_type`: `BERKAS`, `MASTER_PROJECT`, `PDOC`.

`title` adalah snapshot yang aman ditampilkan; bukan pathname, isi PDF, alasan
penolakan, NIP, atau metadata sensitif. Activity append-only: tidak ada
`updated_at` dan tidak ada service update/delete activity.

```sql
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_logs_action_check
    CHECK (action IN ('CREATE','UPDATE','DELETE','SIGN','REJECT','REVISE')),
  CONSTRAINT activity_logs_entity_type_check
    CHECK (entity_type IN ('BERKAS','MASTER_PROJECT','PDOC')),
  CONSTRAINT activity_logs_title_check
    CHECK (length(btrim(title)) BETWEEN 1 AND 200)
);
```

```sql
CREATE INDEX activity_logs_created_at_idx
  ON activity_logs (created_at DESC);
CREATE INDEX activity_logs_actor_created_at_idx
  ON activity_logs (actor_user_id, created_at DESC);
CREATE INDEX activity_logs_entity_created_at_idx
  ON activity_logs (entity_type, created_at DESC);
```

**Migration `0025_activity_logs`:**

- Tambahkan `activityLogs` pada `src/lib/pg/schema.ts`.
- Isi migration: tabel, tiga index, dan CHECK di atas.
- Journal menjadi **26 entry**; snapshot `0025` ikut tercatat.
- Tidak ada backfill, seed, atau perubahan tabel existing.

---

## C. Helper `logActivity()`

**Lokasi desain:** `src/lib/activity-log/service.ts` (server-only).

```ts
type ActivityAction = "CREATE" | "UPDATE" | "DELETE" | "SIGN" | "REJECT" | "REVISE";
type ActivityEntity = "BERKAS" | "MASTER_PROJECT" | "PDOC";

type LogActivityInput = { actorUserId: string; action: ActivityAction; entityType: ActivityEntity; title: string };
```

`logActivity(input, tx?)` melakukan trim/limit judul dan menulis satu baris.
Helper tidak dipanggil dari middleware/route generik; hanya dari service tiga
modul. Log ditulis setelah mutasi valid, memakai transaksi yang sama bila ada.
Jika insert log gagal, mutasi rollback. Untuk delete, judul diambil sebelum row
dihapus. Read/download tidak menghasilkan activity.

### C.1 Berkas

| File / fungsi | Action | Title snapshot |
|---|---|---|
| `src/lib/berkas/service.ts` — `createBerkas` | `CREATE` | `judul` Berkas |
| `src/lib/berkas/service.ts` — `submitTtd` | `SIGN` | `judul` Berkas |
| `src/lib/berkas/service.ts` — `rejectBerkas` | `REJECT` | `judul` Berkas |
| `src/lib/berkas/service.ts` — `revisiBerkas` | `REVISE` | `judul` Berkas |
| `src/lib/berkas/service.ts` — `deleteBerkas` | `DELETE` | `judul` sebelum delete |

`submitTtd` menghasilkan satu activity per tanda tangan validator. Activity
tidak mencatat alasan penolakan atau isi PDF.

### C.2 Master Project

| File / fungsi | Action | Title snapshot |
|---|---|---|
| `src/lib/master-project/service.ts` — `createMasterProject` | `CREATE` | `name` proyek |
| `src/lib/master-project/service.ts` — `updateMasterProject` | `UPDATE` | `name` setelah update |
| `src/lib/master-project/service.ts` — `deleteMasterProject` | `DELETE` | `name` sebelum delete |

### C.3 PDOC

| File / fungsi | Action | Title snapshot |
|---|---|---|
| `src/lib/project-documentation/service.ts` — `updateDocumentation` | `UPDATE` | `“<nama proyek> — <YYYY-MM>”` |

PDOC memakai `UPDATE` karena service berupa upsert; activity menjelaskan
dokumentasi periode diperbarui tanpa mengklaim create/delete.

---

## D. Server Component Data Fetching

`src/app/dashboard/page.tsx` tetap Server Component. Setelah `getCurrentUser()`
dan redirect ke `/login`, halaman memanggil `getDashboardData(user)`. Tidak ada
endpoint `/api/dashboard` dan tidak ada fetch Client Component pada initial load.

**Lokasi desain:** `src/lib/dashboard/service.ts`; query di
`src/lib/dashboard/repository.ts`.

```ts
type DashboardData = {
  stats: { totalProjects: number; completedBerkas: number; mslAverage: number | null; activeUsers: number | null };
  actions: { pendingTtd: DashboardAction[]; rejectedBerkas: DashboardAction[]; missingRi: DashboardAction[] };
  activities: ActivityFeedItem[];
};
```

`DashboardAction` minimal berisi `id`, `title`, `meta`, `href`, `kind`.
`ActivityFeedItem` berisi `id`, `actorName`, `action`, `entityType`, `title`,
`createdAt`. Actor yang sudah dihapus ditampilkan “Pengguna dihapus”.

```ts
const [stats, actions, activities] = await Promise.all([
  getStats(actor),
  getActions(actor),
  getActivities(actor, 5),
]);
```

`getStats` menjalankan count secara paralel; Project hanya dua query. `getActions`
menjalankan query TTD, rejected, dan missing RI secara paralel dengan guard
permission. Activity join ke `users` satu kali; tidak ada N+1.

| Data | Admin | HO | Mgmt | Project |
|---|---|---|---|---|
| Total Proyek | Global | Global | Global | `pic_user_id = actor.id` |
| Berkas Selesai | Global | Global | Global | `pemohon_id = actor.id` |
| Skor MSL tahun berjalan | Global | Global | Global | `null` |
| Total User aktif | Global | Global | Global | `null` |
| TTD saya | Assignment | Assignment | Assignment | Kosong |
| Ditolak milik saya | Sendiri | Sendiri | Sendiri | Sendiri |
| RI belum diisi | Semua | Program PIC | Kosong | Kosong |
| Activities | Global | Global | Global | `actor_user_id = actor.id` |

**Statistik global:**

```sql
SELECT COUNT(*) FROM master_projects;
SELECT COUNT(*) FROM berkas_pengajuan
WHERE status = 'SELESAI';
SELECT ROUND(AVG(ROUND(
  (a.engineering_value + a.metode_kerja + a.engineering_execution) / 3.0, 2
)), 2)
FROM msl_assessments a
JOIN master_projects p ON p.id = a.project_id
WHERE p.year = $current_year;
SELECT COUNT(*) FROM users WHERE status = 'active';
```

Action TTD memakai `berkas_validasi.validator_user_id = actor.id`,
`ttd_pathname IS NULL`, dan status parent sesuai urutan 1/2. Rejected memakai
`pemohon_id = actor.id AND status = 'DITOLAK'`. RI memakai `ri_value IS NULL`,
bulan berjalan, dan `month BETWEEN start_month AND end_month`; HO dibatasi PIC,
Admin tidak.

```sql
SELECT a.id, a.actor_user_id, u.name AS actor_name,
       a.action, a.entity_type, a.title, a.created_at
FROM activity_logs a
LEFT JOIN users u ON u.id = a.actor_user_id
WHERE ($1::boolean OR a.actor_user_id = $2)
ORDER BY a.created_at DESC, a.id DESC
LIMIT 5;
```

`$1` = `true` untuk Admin/HO/Mgmt, `false` untuk Project. Karena tabel tidak
memiliki `entity_id`, activity Project hanya berdasarkan aktor; activity orang
lain terhadap proyek miliknya tidak terlihat.

---

## E. UI Component Design

| Komponen | Tanggung jawab |
|---|---|
| `WelcomeCard` | Sapaan Asia/Jakarta, nama, role, tanggal lengkap |
| `StatGrid` / `StatCard` | Grid 1/2/4 kolom; nilai dan hint, mendukung `null` |
| `ActionCenter` / `ActionList` | Tiga kelompok tugas, CTA, batas jumlah |
| `QuickLinks` | Shortcut berbasis permission, bukan hardcode role |
| `ActivityFeed` / `ActivityItem` | Lima activity terbaru dan empty state |
| `EmptyState` | Ikon, judul, deskripsi, CTA opsional |
| `DashboardSkeleton` | Loading state route |

```text
┌────────────────────────────────────────────────────────────┐
│ WelcomeCard                                                │
│ Selamat pagi, Budi                    Rabu, 12 Nov 2026    │
│ Admin · WIBEX CMS Studio                                   │
└────────────────────────────────────────────────────────────┘
┌────────────┐ ┌────────────────┐ ┌──────────┐ ┌───────────┐
│Total Proyek│ │Berkas Selesai  │ │Skor MSL  │ │Total User │
│     12     │ │      34        │ │  3,75    │ │    18     │
└────────────┘ └────────────────┘ └──────────┘ └───────────┘
┌─────────────────────────────────────┐ ┌────────────────────┐
│ Action Center                       │ │ Quick Links        │
│ • 2 Berkas menunggu TTD saya   [→] │ │ [Berkas]           │
│ • 1 Berkas ditolak             [→] │ │ [Master Project]   │
│ • 3 Program belum isi RI       [→] │ │ [PDOC] [MSL]       │
└─────────────────────────────────────┘ └────────────────────┘
┌────────────────────────────────────────────────────────────┐
│ Recent Activities                                          │
│ Budi menambahkan Berkas — “Laporan Struktur”   2 menit lalu│
│ Ani memperbarui Master Project — “Gedung A”    1 jam lalu  │
└────────────────────────────────────────────────────────────┘
```

Tablet: stat 2 kolom; Action Center dan Quick Links bertumpuk. Mobile: satu
kolom, action tetap dapat diklik tanpa horizontal scroll. Gunakan token existing
`bg-surface`, `border-outline`, `text-primary`, dan `secondary`.

### E.1 Empty state per widget

- **Stat angka:** nilai `0` tetap ditampilkan `0`, bukan empty state.
- **MSL kosong:** `—` + “Belum ada assessment tahun ini”.
- **MSL/User tidak berhak:** `—` + “Tidak tersedia untuk peran ini”; tanpa query data terlarang.
- **Action kosong:** “Tidak ada tugas yang perlu ditindaklanjuti” + ikon centang.
- **Activity kosong:** “Belum ada aktivitas” + penjelasan modul sumber.
- **Quick Links kosong:** “Tidak ada modul yang tersedia untuk peran Anda.”
- **Error section:** empty/error state jujur; jangan tampilkan data palsu.

---

## F. Fallback Activity Log Kosong

`activity_logs` kosong tepat setelah migration. UI tidak boleh mengarang activity
dari `created_at`/`updated_at` tabel lain karena itu bukan audit log.

Fallback V1:

1. Tampilkan `EmptyState` pada `ActivityFeed`.
2. Judul: “Belum ada aktivitas tercatat”.
3. Deskripsi: “Aktivitas akan muncul setelah ada perubahan pada Berkas,
   Master Project, atau PDOC.”
4. CTA opsional ke modul sesuai permission actor.
5. Skeleton hanya untuk loading, bukan empty state permanen.
6. Setelah activity pertama tercatat, query normal dipakai tanpa perubahan DTO.

Backfill historis tidak termasuk V1. Jika dibutuhkan, backfill adalah keputusan
terpisah dan tidak boleh diberi label activity real-time.

---

## G. Acceptance Criteria P4

- `0025_activity_logs` membuat tabel dan tiga index; journal 26 entry.
- `logActivity()` hanya dipanggil dari service Berkas, Master Project, dan PDOC.
- Activity hanya tercatat setelah mutasi berhasil; read tidak menghasilkan log.
- Project hanya melihat statistik, action, dan activity miliknya.
- Admin/HO/Mgmt global; Total User hanya `active`; MSL tahun berjalan dua desimal.
- `getDashboardData()` dipanggil dari `src/app/dashboard/page.tsx`; tanpa endpoint baru.
- Activity kosong menampilkan empty state, bukan data rekaan.
- `tsc`, ESLint, dan test terkait PASS pada implementasi P4.
