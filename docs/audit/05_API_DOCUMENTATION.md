# 05 — API DOCUMENTATION

**55 file** `route.ts` di `src/app/api`, mengekspor **90 method handler** (`GET`/`POST`/`PATCH`/`PUT`/`DELETE`). Semua respons memakai amplop `{ data }` (sukses) atau `{ error: { message, details? } }` (gagal). Aktor **selalu** dari sesi cookie `wibex_session`.

Setiap domain enterprise memakai `src/app/api/<domain>/_helpers.ts` (6 file, termasuk `knowledge-management`) untuk `getActor`, `mapDomainError`, `parseJsonBody`, `isUuid`.

Kode singkat guard: **P** = publik tanpa sesi · **A** = sesi aktif saja · **ADM** = `CMS_MANAGE`/`USER_MANAGE` (efektif Admin) · **PERM(…)** = permission tertentu.

**Catatan penting:** empat endpoint `pic-options` memakai `A` di route (hanya `getActor()`), lalu menegakkan otorisasi **di service** (`assertManageAccess` / `assertEditAccess`). Ini bukan celah — tetap 403 — tetapi lapisannya berbeda dari endpoint lain, jadi jangan menyalin polanya tanpa `assert*`.

## 1. Auth

| Method | Path | Guard | Service | Efek |
|---|---|---|---|---|
| POST | `/api/auth/login` | P + throttle | `authenticate()` di `lib/auth/*` | buat sesi + cookie; 401 generik; 403 suspended; 429 + `Retry-After` |
| POST | `/api/auth/logout` | A (cookie) | `deleteSessionByToken` | hapus baris sesi + cookie |
| GET | `/api/auth/me` | A | `getCurrentUser` | `SafeUser` (tanpa `passwordHash`) |
| PATCH | `/api/auth/me` | A (self) | `updateOwnProfile` | hanya field self-editable (nama, telepon, foto); role/status/nip/email tidak bisa |

## 2. Users (Admin)

| Method | Path | Guard | Efek |
|---|---|---|---|
| GET | `/api/users` | PERM(USER_MANAGE) | daftar user (`SafeUser`) |
| POST | `/api/users` | PERM(USER_MANAGE) | buat user (validasi role, NIP, email unik) |
| GET | `/api/users/[id]` | PERM(USER_MANAGE) | detail |
| PATCH | `/api/users/[id]` | PERM(USER_MANAGE) | ubah data/role/status/`mslAccess`; lindungi admin terakhir & diri sendiri |
| DELETE | `/api/users/[id]` | PERM(USER_MANAGE) | hard delete; ditolak bila masih direferensikan (409) atau admin aktif terakhir |

## 3. Landing CMS (Mongo) — 5 modul, pola identik

| Modul | Endpoint | Method | Guard |
|---|---|---|---|
| `heroes` | `/api/heroes` | GET, POST | A / PERM(CMS_MANAGE) |
| | `/api/heroes/[id]` | GET, PATCH, DELETE | PERM(CMS_MANAGE) |
| | `/api/heroes/public` | GET | **P** |
| `portfolio-projects` | `/api/portfolio-projects` | GET, POST | A / PERM(CMS_MANAGE) |
| | `/api/portfolio-projects/[id]` | GET, PATCH, DELETE | PERM(CMS_MANAGE) |
| | `/api/portfolio-projects/public` | GET | **P** |
| `green-buildings` | `/api/green-buildings` | GET, POST | A / PERM(CMS_MANAGE) |
| | `/api/green-buildings/[id]` | GET, PATCH, DELETE | PERM(CMS_MANAGE) |
| | `/api/green-buildings/public` | GET | **P** |
| `social-posts` | `/api/social-posts` | GET, POST | A / PERM(CMS_MANAGE) |
| | `/api/social-posts/[id]` | GET, PATCH, DELETE | PERM(CMS_MANAGE) |
| | `/api/social-posts/public` | GET | **P** |
| `clients` | `/api/clients` | GET, POST | A / PERM(CMS_MANAGE) |
| | `/api/clients/[id]` | GET, PATCH, DELETE | PERM(CMS_MANAGE) |
| | `/api/clients/public` | GET | **P** |

Kontrak publik (diverifikasi dari respons live):

| Endpoint | Field publik |
|---|---|
| `/api/heroes/public` | `imageUrl, imageAlt, projectName, location, title` |
| `/api/portfolio-projects/public` | `title, category, location, progress, imageUrl, imageAlt, description` |
| `/api/green-buildings/public` | `projectName, certificationBody, imageUrl, imageAlt, level, year, score, description` |
| `/api/social-posts/public` | `platform, account, caption, url, type, imageUrl` |
| `/api/clients/public` | `name, shortName, logoUrl, logoAlt, link` |

Tidak ada `_id`, timestamp, `blobPathname`, atau `imageSource` pada payload publik.

## 4. CMS Upload

| Method | Path | Guard | Efek |
|---|---|---|---|
| POST | `/api/cms/upload` | PERM(CMS_MANAGE) | menandatangani token upload Blob **publik**; pathname wajib di namespace `cms/<module>/<uuid>/<file>` |
| POST | `/api/cms/upload/cleanup` | PERM(CMS_MANAGE) | hapus objek orphan setelah verifikasi tidak direferensikan 6 modul |

Modul yang diizinkan: `hero`, `projects`, `green-building`, `clients`, `social`, `organization`.

## 5. Program Kerja (PostgreSQL)

| Method | Path | Guard | Efek |
|---|---|---|---|
| GET | `/api/program-kerja` | PERM(PROGRAM_KERJA_VIEW) | daftar program + 12 baris bulanan + PIC + grup |
| POST | `/api/program-kerja` | PERM(PROGRAM_KERJA_MANAGE) | transaksi: program + 12 bulan + PIC |
| GET | `/api/program-kerja/[id]` | VIEW | detail |
| PATCH | `/api/program-kerja/[id]` | MANAGE | ubah master; `year` immutable; unit terkunci bila sudah ada RI |
| DELETE | `/api/program-kerja/[id]` | MANAGE | hapus (cascade bulanan/PIC) |
| PATCH | `/api/program-kerja/[id]/ri` | `canUpdateProgramRi(role, isPIC)` | isi RI satu bulan; Head Office wajib PIC, Admin selalu boleh |
| PATCH | `/api/program-kerja/[id]/note` | MANAGE | catatan |
| PATCH | `/api/program-kerja/[id]/evidence` | MANAGE | tautan bukti |
| GET | `/api/program-kerja/groups` | VIEW | opsi grup |
| GET | `/api/program-kerja/pic-options` | **A + MANAGE (service)** | user Head Office untuk PIC |
| GET | `/api/program-kerja/summary` | VIEW | agregasi (`year`, `groupId`, `unit`, `picId`) |

## 6. Template & Form

| Method | Path | Guard | Efek |
|---|---|---|---|
| GET | `/api/template-form` | PERM(TEMPLATE_FORM_VIEW) | daftar (tanpa `blobPathname`) |
| POST | `/api/template-form` | PERM(TEMPLATE_FORM_MANAGE) | buat `link` atau `upload`; PIC wajib Head Office |
| GET | `/api/template-form/[id]` | VIEW | detail |
| PATCH | `/api/template-form/[id]` | MANAGE | ubah; ganti sumber menghapus objek lama setelah sukses |
| DELETE | `/api/template-form/[id]` | MANAGE | hapus baris lalu objek (jika tidak direferensikan) |
| GET | `/api/template-form/[id]/file` | VIEW | **download privat** via id record (pathname tidak pernah dikirim ke klien) |
| GET | `/api/template-form/pic-options` | **A + MANAGE (service)** | opsi PIC |
| POST | `/api/template-form/upload` | MANAGE | token upload Blob **privat** (`template-form/...`), maks 50 MB |
| POST | `/api/template-form/upload/cleanup` | MANAGE | bersihkan objek yatim |

## 7. Master Project

| Method | Path | Guard | Efek |
|---|---|---|---|
| GET | `/api/master-project` | PERM(MASTER_PROJECT_VIEW) | daftar + PIC |
| POST | `/api/master-project` | PERM(MASTER_PROJECT_CREATE) | buat; duplikat (name+location, case/spasi) → 409 |
| GET | `/api/master-project/[id]` | VIEW | detail |
| PATCH | `/api/master-project/[id]` | PERM(MASTER_PROJECT_EDIT) | ubah (termasuk `year` kecuali bentrok) |
| DELETE | `/api/master-project/[id]` | PERM(MASTER_PROJECT_DELETE) | ditolak 409 bila direferensikan Engineering DB / MSL |
| GET | `/api/master-project/pic-options` | **A + EDIT (service)** | opsi PIC |

## 8. Engineering Database

| Method | Path | Guard | Efek |
|---|---|---|---|
| GET | `/api/engineering-database` | PERM(ENGINEERING_DATABASE_VIEW) | daftar (filter kategori/proyek) |
| POST | `/api/engineering-database` | PERM(ENGINEERING_DATABASE_MANAGE) | buat entri (project harus ada) |
| GET | `/api/engineering-database/[id]` | VIEW | detail |
| PATCH | `/api/engineering-database/[id]` | MANAGE | ubah |
| DELETE | `/api/engineering-database/[id]` | MANAGE | hapus |
| GET | `/api/engineering-database/summary` | VIEW | ringkasan per kategori/proyek |
| GET | `/api/engineering-database/pic-options` | **A + MANAGE (service)** | PIC valid (Admin/Head Office/Project) |
| GET | `/api/engineering-database/project-options` | VIEW | proyek dari Master Project |

## 9. MSL Engineering

| Method | Path | Guard | Efek |
|---|---|---|---|
| GET | `/api/msl?year&month` | `canViewMsl` | data bulan: proyek + assessment + catatan tahun |
| POST | `/api/msl/assessments` | `canManageMsl` | buat penilaian; 409 bila (proyek, bulan) sudah ada |
| PATCH | `/api/msl/assessments/[id]` | `canManageMsl` | ubah komponen/remarks |
| DELETE | `/api/msl/assessments/[id]` | `canManageMsl` | hapus penilaian |
| PUT | `/api/msl/note` | `canManageMsl` | upsert catatan tahun |

Parsing query eksplisit (`/^\d+$/`) — `2026.5`, `abc`, string kosong ditolak 400. Skema create `strict` sehingga `year`/`score`/`category` dari klien ditolak.

## 10. Struktur Organisasi

| Method | Path | Guard | Efek |
|---|---|---|---|
| GET | `/api/organization-structure` | PERM(ORGANIZATION_STRUCTURE_VIEW) | satu baris atau `null` |
| PUT | `/api/organization-structure` | PERM(ORGANIZATION_STRUCTURE_MANAGE) (Admin) | ganti chart (upsert singleton), hapus objek lama setelah sukses |
| DELETE | `/api/organization-structure` | PERM(ORGANIZATION_STRUCTURE_MANAGE) | hapus baris + objek |

## 11. Ringkasan Kontrak Error

| Status | Kapan |
|---|---|
| 400 | body bukan JSON, Zod gagal, id bukan uuid, query tidak valid |
| 401 | tidak ada/expired sesi, akun suspended |
| 403 | permission kurang (route **atau** service `assert*`) |
| 404 | record tidak ada / PIC tidak ditemukan |
| 409 | UNIQUE (email, NIP, proyek name+location, MSL proyek+bulan), FK RESTRICT, admin terakhir |
| 429 | login terkunci (dengan `Retry-After`) |
| 502/503 | Blob gagal / tidak dikonfigurasi |
| 500 | hanya untuk error tak terduga; error domain selalu dipetakan |

## 12. Catatan Validitas

- Semua endpoint di atas **ada** di repository (diverifikasi dari daftar `git ls-files 'src/app/api/*route.ts'` + `export function`): 55 file, 90 method — seluruhnya tercantum di dokumen ini.

## 13. Knowledge Management (baru, 4 November 2026)

| Method | Path | Guard | Service | Efek |
|---|---|---|---|---|
| GET | `/api/knowledge-management?type=…` | `getActor` + `KNOWLEDGE_MANAGEMENT_VIEW` (service) | `listKnowledgeProjectRows` | semua Master Project (LEFT JOIN), plus content/evidence/PIC/`updatedAt` bila ada |
| PUT | `/api/knowledge-management/[projectId]/[type]` | `getActor` + `KNOWLEDGE_MANAGEMENT_MANAGE` (service) | `upsertKnowledgeEntry` | **inline save**: content + PIC; evidence tidak disentuh |
| POST | `/api/knowledge-management/[projectId]/[type]/evidence` | idem | `addKnowledgeEvidence` | tambah **satu** evidence (**201**) |
| PATCH | `/api/knowledge-management/evidence/[id]` | idem | `updateKnowledgeEvidenceById` | ubah **satu** evidence |
| DELETE | `/api/knowledge-management/evidence/[id]` | idem | `deleteKnowledgeEvidenceById` | hapus **satu** evidence |
| DELETE | `/api/knowledge-management/entry/[id]` | — | — | **405 — dinonaktifkan (KM-02)**: penghapusan seluruh record belum disetujui |
| GET | `/api/knowledge-management/pic-options` | `getActor` + `KNOWLEDGE_MANAGEMENT_MANAGE` | `listKnowledgePicOptions` | Head Office **tanpa filter status** (`{ id, name, status, position }`) |

- `type` wajib ∈ `lesson_learn` | `best_practice` | `va_ve`; nilai lain → 400.
- Body `PUT` divalidasi `upsertKnowledgeEntrySchema` (strict): `content` 1–20.000 karakter (**wajib, tidak boleh kosong**), `picIds` **minimal 1** dan maksimal 50 UUID, `expectedUpdatedAt` opsional. Tidak ada field `evidence` — mengirimkannya ditolak **400** karena evidence punya kontrak sendiri.
- Body `POST`/`PATCH` evidence divalidasi `evidencePayloadSchema` (strict): `{ name, url }`, keduanya wajib. URL hanya `http`/`https` absolut; `javascript:`, `data:`, `file:`, `//host`, dan hostname telanjang ditolak **400**.
- **Evidence opsional:** record boleh belum punya evidence dan evidence boleh ditambah kapan pun setelah record ada. Menambah evidence tanpa record → **404** "Simpan konten dan PIC terlebih dahulu...".
- **PIC minimal satu** divalidasi tiga lapis: Zod (`min(1)`), service (user ada & role `Head Office`), dan database (constraint trigger `0014` → `23514` dipetakan **400** "Minimal 1 PIC"). Status akun **tidak** difilter.
- `projectId`/`id` non-UUID → 400 sebelum menyentuh database.
- **KM-03:** `expectedUpdatedAt` adalah **string timestamp UTC presisi mikrodetik** (`YYYY-MM-DDTHH:MM:SS.ffffffZ`) atau `null`, dan hanya melindungi **content + PIC**. Token berasal langsung dari PostgreSQL (bukan `Date` JavaScript) lalu dibandingkan eksak di `UPDATE … WHERE updated_at = $token::timestamptz`; perbedaan 1 mikrodetik dalam milidetik yang sama tetap **409**, sehingga dua penulis tidak dapat lolos bersamaan. Bila berbeda → **409** "Data sudah diubah oleh pengguna lain. Muat ulang data lalu coba lagi." Perubahan evidence **tidak** mengubah `updated_at`, sehingga tidak memicu 409 palsu pada editor konten. Nilai `updated_at` baru selalu **naik ketat** melalui `GREATEST(clock_timestamp(), updated_at + INTERVAL '1 microsecond')`, sehingga token lama tidak dapat cocok kembali meskipun jam sistem berhenti atau mundur.
- FK `23503`/`23001` (mis. PIC dihapus bersamaan) dipetakan ke **409**, bukan 500; check violation `23514` dari trigger PIC dipetakan ke **400**.
- `GET` mengembalikan `updatedAt` per baris (null bila record belum ada) sebagai token eksak 6 digit mikrodetik untuk penyimpanan berikutnya. Klien wajib mengembalikan string itu apa adanya, tanpa parsing/perhitungan tanggal.

**Status acceptance (4 November 2026):** Admin **PASS** (API + browser + cleanup). Uji HTTP dua penulis simultan **NOT RUN** (tidak ada DB uji terisolasi; fixture produksi tambahan tidak disetujui). Head Office, Management, Project **BLOCKED** (tidak ada kredensial/handoff browser).

**Verifikasi runtime (4 November 2026, dev server `localhost:3000`).** Tanpa sesi: seluruh endpoint KM **401**, `DELETE /entry/[id]` **405**, dashboard **307**. Terautentikasi **Admin**: 40 cek API (36 PASS; 4 FAIL karena bug presisi token yang kemudian diperbaiki), verifikasi ulang **10/10 PASS**, tiga submenu dan inline editing di browser **PASS**, fixture dibersihkan. Head Office, Management, dan Project: **BLOCKED** karena kredensial tidak tersedia; 403 role lain belum diuji.
- Contoh body/response rinci per field sengaja tidak dikarang: bentuk otoritatif ada di `src/lib/<domain>/schema.ts`.
- Efek samping (Blob delete, cascade) hanya ditulis bila terlihat di service.
