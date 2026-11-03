# 05 — API DOCUMENTATION

**49 file** `route.ts` di `src/app/api`, mengekspor **83 method handler** (`GET`/`POST`/`PATCH`/`PUT`/`DELETE`). Semua respons memakai amplop `{ data }` (sukses) atau `{ error: { message, details? } }` (gagal). Aktor **selalu** dari sesi cookie `wibex_session`.

Setiap domain enterprise memakai `src/app/api/<domain>/_helpers.ts` (5 file) untuk `getActor`, `mapDomainError`, `parseJsonBody`, `isUuid`.

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

- Semua endpoint di atas **ada** di repository (diverifikasi dari daftar `git ls-files 'src/app/api/*route.ts'` + `export function`): 49 file, 83 method — seluruhnya tercantum di dokumen ini.
- Contoh body/response rinci per field sengaja tidak dikarang: bentuk otoritatif ada di `src/lib/<domain>/schema.ts`.
- Efek samping (Blob delete, cascade) hanya ditulis bila terlihat di service.
