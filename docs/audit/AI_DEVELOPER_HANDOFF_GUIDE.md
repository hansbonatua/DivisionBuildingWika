# AI_DEVELOPER_HANDOFF_GUIDE.md

Panduan kerja untuk AI coding agent / engineer berikutnya. Spesifik untuk repository ini, bukan panduan umum.

> **Baca lebih dulu:** [`docs/development/WIBEX_DEVELOPMENT_GOVERNANCE.md`](../development/WIBEX_DEVELOPMENT_GOVERNANCE.md). Dokumen tersebut adalah usulan standar organization-wide untuk peran, review gate, bukti, change safety, Git/deploy, dokumentasi, dan final acceptance, berstatus **READY FOR OWNER REVIEW**. Setelah disetujui Owner, panduan teknis proyek ini tunduk pada governance tersebut; sebelum approval, jangan menganggapnya efektif.

## 1. Identitas & Kondisi Awal

| Item | Nilai |
|---|---|
| Proyek | BDWIKA / WIBEX (Next.js 16 App Router) |
| Root | `D:\MagangHub-Wika-StaffEngDigitalisasiBuilding\progress\bdwika` |
| HEAD | `84e0a90` = `origin/main` (terverifikasi via `git ls-remote`) |
| Working tree | **TIDAK BERSIH** — 4 file landing modified, `screenshots/`, dokumen audit untracked |
| Node | v24.18.0 · npm 10.5.0 |
| Server dev | `http://localhost:3000` (mungkin sedang berjalan) |

## 2. Sebelum Menyentuh Apa Pun

1. `git status` — pastikan Anda tahu file mana yang sudah dimodifikasi orang lain.
2. Baca dokumen audit yang relevan (`docs/audit/`).
3. Baca file yang akan diubah **beserta** service/repository/schema-nya.
4. Baca `AGENTS.md` + `node_modules/next/dist/docs/` bila menyentuh API Next.js versi ini (versi ini berbeda dari dokumen umum).
4a. Untuk audit/verifikasi, mulai dari `MASTER_PROJECT_INDEX.md`, lalu `23-SECOND-PASS-GAP-REGISTER.md` untuk gap yang masih terbuka.
5. Jangan `git add .`, jangan `reset`, jangan `stash`, jangan `checkout --` pada file yang bukan milik Anda.

## 3. Peta Cepat Kode

| Kebutuhan | File |
|---|---|
| Tambah halaman | `src/app/<path>/page.tsx` (+ `layout.tsx` bila butuh guard) |
| Tambah endpoint | `src/app/api/<domain>/route.ts` + `src/app/api/<domain>/_helpers.ts` (5 domain sudah punya; lihat §4a) |
| Aturan bisnis | `src/lib/<domain>/service.ts` |
| Query DB | `src/lib/<domain>/repository.ts` |
| Validasi | `src/lib/<domain>/schema.ts` (Zod) |
| Permission | `src/lib/auth/permissions.ts` + `src/lib/<domain>/access.ts` |
| Guard halaman | `src/app/dashboard/<modul>/layout.tsx` (19 layout modul + 1 shell) |
| Navigasi | `src/components/dashboard/DashboardSidebar.tsx` |
| Upload gambar | `src/lib/cms/*` + `POST /api/cms/upload` |
| Upload dokumen | `src/lib/template-form/*` + `src/lib/storage/blob.ts` |
| Sesi | `src/lib/auth/session.ts`, `current-user.ts` |

## 4. Aturan Wajib

### Backend
1. `route.ts → service.ts → repository.ts`. Jangan query DB dari route/komponen.
1a. Endpoint baru wajib punya `_helpers.ts` sendiri (`getActor`, `mapDomainError`, `parseJsonBody`, `isUuid`). Total saat ini: 49 file route, **83 method handler**, 5 file `_helpers.ts`.
2. Aktor dari sesi: `requireUser()` / `getPermittedActor(permission)`. **Jangan** percaya `userId`/`role` dari body.
3. Otorisasi dua kali: route **dan** `assert*` di service.
4. Error domain punya kelas sendiri; map ke 400/403/404/409/502/503 di `_helpers`. Jangan biarkan jadi 500.
5. `numeric` PostgreSQL hanya dikonversi di repository. Di atas repository selalu `number`.
6. Transaksi untuk operasi multi-tabel (`db.transaction`).
7. Jangan menambah permission ad-hoc; tambahkan di `PERMISSIONS` + `NON_ADMIN_PERMISSION_ROLES`.

### Validasi
8. Zod di batas HTTP; skema update **tanpa** `.default()` (kalau perlu `.partial()`, jangan pada field ber-default).
9. Gunakan `.strict()` untuk kontrak yang punya field immutable (contoh MSL: `year`, `score`, `category` ditolak dari klien).
10. Query string diparse eksplisit (regex digit), jangan `Number()` langsung.

### Data & payload
11. Payload publik hanya lewat projection `*Public`. Jangan pernah kirim `blobPathname`, `imageSource`, `passwordHash`, atau `_id` internal.
12. Landing tidak boleh menampilkan konten karangan; kosong = empty state.
13. Tahun MSL **selalu** dari `master_projects.year`; jangan menambah kolom tahun di assessment.

### Storage
14. Verifikasi objek (`head`) sebelum simpan; URL harus cocok dengan objek.
15. Tulis DB dulu, hapus objek lama setelah sukses.
16. Hapus hanya jika `imageSource === "upload"`, pathname di namespace CMS, dan tidak direferensikan 6 repository.
17. Uploader baru wajib mendaftarkan cek referensi di `lib/cms/image-references.ts` pada perubahan yang sama.

### Frontend
18. Jangan menaruh keputusan otorisasi di browser; kirim flag dari server.
19. Modal: `role="dialog"`, `aria-modal`, Escape, focus return, body scroll lock (ikuti `ProjectDetailModal.tsx`).
20. Kontrol ikon wajib `aria-label`; progress wajib `role="progressbar"` + `aria-valuenow`.
21. Gambar lokal `next/image`; gambar CMS remote `<img>` + `eslint-disable` beralasan.

### Database
22. Migration baru di `drizzle/`, jangan mengedit yang lama; perbarui `schema.ts` bersamaan.
23. Jangan jalankan `drizzle-kit migrate`/seed tanpa izin.
24. Hapus data harus lewat service dengan pemeriksaan referensi; jangan `DELETE` langsung.

## 5. Pola Kode yang Harus Ditiru

```ts
// route
const actor = await getPermittedActor(PERMISSIONS.X);
const parsed = schema.safeParse(body);
if (!parsed.success) return badRequest(parsed.error);
try {
  const data = await doSomething(actor, parsed.data);
  return NextResponse.json({ data }, { status: 201 });
} catch (error) {
  return mapDomainError(error) ?? internalError();
}
```

```ts
// service
function assertManageAccess(actor: Actor) {
  if (actor.status !== "active") throw new ForbiddenError();
  if (!canManage(actor.role)) throw new ForbiddenError();
}
```

## 6. Protected Modules

| Modul | Aturan |
|---|---|
| MSL Engineering (`lib/msl/*`, `components/dashboard/msl/*`, `api/msl/*`) | JANGAN ubah/refactor tanpa persetujuan; hanya usulkan |
| Struktur Organisasi (`lib/organization-structure/*`, `dashboard/struktur-organisasi/*`, `api/organization-structure/*`) | idem |

Klaim "frozen" berstatus **PERLU VERIFIKASI** — konfirmasi ke pemilik sebelum menyimpulkan.

## 7. Bug & Keterbatasan yang Sudah Diketahui

| ID | Ringkasan | Jangan "perbaiki diam-diam" |
|---|---|---|
| F-01 | CSP belum ada | butuh keputusan + uji gambar Blob |
| F-02 | `link` klien tidak divalidasi server | perbaikan disarankan, kecil |
| F-03 | alt/description tak bisa diedit | butuh keputusan produk |
| F-07 | nama fallback fiktif di header | perbaikan kecil |
| F-11 | feed green building 0 item | kemungkinan data, bukan kode |
| F-12 | perubahan landing belum di-commit | jangan reset |
| F-16 | footer: 8 tautan `href="#"` + email `mailto:` tidak cocok dengan teks | butuh URL resmi dari pemilik |
| F-17 | `apiAuthGuard()` tidak dipakai | jangan pakai; ikuti pola `getActor` di `_helpers.ts` |
| F-18 | opsi PIC tidak memfilter akun suspended | keputusan produk V1 |

## 8. Perintah Verifikasi

```bash
npx tsc --noEmit                       # wajib setelah perubahan TS
npx eslint <file yang diubah>          # wajib
npm run build                          # bila menyentuh routing/config
git diff --check                       # sebelum commit
```

Laporkan status sebenarnya (PASS/FAIL/NOT RUN/NOT APPLICABLE/HISTORICAL). Jangan mengklaim PASS tanpa menjalankan. Status review ChatGPT (PASS/CONDITIONAL/FAIL) dan final acceptance Owner dicatat terpisah sesuai governance §5 dan §11.

## 9. Operasi Berbahaya (butuh izin eksplisit)

- `git commit`, `git push`, `git reset`, `git checkout --`, `git stash`, `git clean`.
- `drizzle-kit migrate`, `drizzle-kit push`, semua `scripts/*.ts` yang menulis DB.
- Deploy ke Vercel / mengubah konfigurasi Vercel.
- Menghapus objek Blob produksi (termasuk lewat route cleanup).
- Menambah/menghapus dependency atau mengubah lockfile.
- Menyentuh `.env*` (termasuk membuat/menimpa `.env.example`).
- Menghapus `screenshots/`, dokumen audit, atau direktori `DivisionBuildingWika/`.

## 10. Gaya Penulisan

- Kode & komentar: **Inggris**, menjelaskan *mengapa* (bukan mengulang *apa*).
- Teks UI/error/PDF: **Bahasa Indonesia**.
- Format angka: 2 desimal untuk skor MSL; persen untuk progress.
- Zona waktu tampilan: Asia/Jakarta.
- Nama file komponen: PascalCase; modul lib: kebab-case.

## 11. Definition of Done

1. Perubahan kecil & terfokus pada permintaan.
2. `tsc` + `eslint` hijau; build bila perlu.
3. Tidak ada secret, tidak ada data produksi di kode/log.
4. Payload publik tidak membocorkan field internal.
5. Perubahan dokumentasi (bila mengubah kontrak/arsitektur) diperbarui di `docs/audit/`.
6. Status pekerjaan dilaporkan apa adanya, termasuk yang belum diverifikasi.
