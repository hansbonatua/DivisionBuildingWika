# 13 — DEPLOYMENT AND ENVIRONMENT GUIDE

## 1. Prasyarat

| Item | Nilai | Sumber |
|---|---|---|
| Node.js | v24.18.0 terpasang; **tidak ada `engines`** di package.json | `node -v` |
| npm | 10.5.0 | `npm -v` |
| Package manager | npm (`package-lock.json`) | file |
| Database | PostgreSQL (fitur enterprise) + MongoDB (landing CMS) | kode |
| Storage | Vercel Blob — dua store: publik (gambar) & privat (dokumen) | kode |
| OS pengembangan | Windows (Git Bash) | lingkungan audit |

## 2. Environment Variables

Lihat dokumen 02 §5 untuk tabel lengkap. Ringkas:

| Wajib untuk | Variabel |
|---|---|
| Boot aplikasi (enterprise) | `DATABASE_URL` |
| Landing CMS | `MONGODB_URI`, `MONGODB_DB_NAME` |
| Upload gambar CMS | `CMS_BLOB_READ_WRITE_TOKEN` |
| Dokumen Template & Form | `BLOB_READ_WRITE_TOKEN` (atau `VERCEL_OIDC_TOKEN`+`BLOB_STORE_ID`) |
| Migrasi | `DIRECT_URL` (disarankan) |
| Seed admin pertama | `ADMIN_NIP`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_POSITION` |

**Status `.env.example`:** ada di disk tetapi **gitignored** (`/.env*/`) dan hanya memuat 4 nama (`DATABASE_URL`, `DIRECT_URL`, `MONGODB_URI`, `MONGODB_DB_NAME`). Clone baru tidak mendapat template (F-04).

Prosedur yang **direkomendasikan** (belum dilakukan): tambahkan `!.env.example` pada `.gitignore`, lengkapi 13 nama variabel tanpa nilai, dan dokumentasikan di README.

## 3. Instalasi & Menjalankan (lokal)

```bash
npm ci                 # gunakan lockfile; jangan npm install sembarangan
# siapkan .env.local (jangan commit)
npx drizzle-kit migrate     # hanya jika DB sudah disiapkan — TIDAK dijalankan saat audit
npm run dev                 # http://localhost:3000
```

Perintah lain:

| Perintah | Fungsi | Menyentuh DB |
|---|---|---|
| `npm run build` | build produksi | tidak (kecuali halaman butuh env saat build) |
| `npm start` | jalankan hasil build | ya (runtime) |
| `npm run lint` | ESLint seluruh proyek | tidak |
| `npx tsc --noEmit` | typecheck | tidak |
| `npx drizzle-kit generate` | buat migration dari schema (offline) | tidak |
| `npx drizzle-kit migrate` | terapkan migration | **ya** |
| `npx tsx scripts/seed-admin.ts` | buat admin | **ya** |
| `npx tsx scripts/seed-program-kerja-groups.ts` | seed grup | **ya** |
| `npx tsx scripts/migrate-portfolio-categories.ts` | migrasi kategori Mongo | **ya** |

**Jangan** menjalankan perintah bertanda "ya" tanpa persetujuan pemilik proyek.

## 4. Deployment

| Aspek | Status |
|---|---|
| Platform yang terlihat | Vercel (folder `.vercel/` ada, ignored; `@vercel/blob` dipakai) |
| `vercel.json` | tidak ada |
| Build command | default Next (`npm run build`) |
| Output | `.next/` |
| Runtime | Node (bukan edge) — dipakai `node:crypto`, `bcryptjs`, driver `postgres` |
| Status deployment produksi | **PERLU VERIFIKASI** (tidak ada akses) |
| Domain | **BELUM DIKETAHUI** |

Catatan penting untuk deploy:
1. **Migration tidak otomatis** — tidak ada `postinstall`/build hook yang menjalankan `drizzle-kit migrate`. Harus disengaja.
2. **Dua store Blob** harus dikonfigurasi terpisah; menggunakan token privat untuk upload CMS akan ditolak oleh desain.
3. `secure` cookie hanya aktif bila `NODE_ENV=production` → wajib HTTPS.
4. Gambar CMS remote memakai `<img>`; tidak perlu `remotePatterns`.

## 5. Troubleshooting

| Gejala | Penyebab paling mungkin | Tindakan |
|---|---|---|
| `Missing database URL for Drizzle migrations` | `DIRECT_URL`/`DATABASE_URL` tidak diset saat perintah live | set env, bukan mengedit config |
| Landing kosong semua section | Mongo tidak terhubung / `status` dokumen bukan nilai publik | cek `MONGODB_*`; cek `status`/`publishStatus` |
| Upload gambar 503 | `CMS_BLOB_READ_WRITE_TOKEN` kosong | set token store publik |
| Upload dokumen 503 | `BLOB_READ_WRITE_TOKEN`/OIDC kosong | set token store privat |
| "URL gambar tidak cocok dengan objek yang tersimpan" | record menyimpan URL berbeda dari objek | unggah ulang lewat form |
| Login 429 | 5 kegagalan dalam 15 menit | tunggu window; jangan hapus baris audit |
| Hapus Master Project 409 | masih dipakai Engineering DB/MSL | hapus referensi lebih dulu |
| Hapus user 409 | masih `created_by`/PIC di record lain | pindahkan referensi lebih dulu |
| Data MSL tidak muncul | tahun proyek berbeda dari tahun tampilan | tahun MSL berasal dari `master_projects.year` |

## 6. Checklist Go-Live (belum dijalankan)

- [ ] `.env.example` lengkap & ter-track
- [ ] migration diterapkan ke DB target
- [ ] admin pertama dibuat lewat seed
- [ ] minimal satu sertifikat Green Building `Published`
- [ ] `tsc` + `eslint` + build hijau
- [ ] uji login/logout/suspend di environment target
- [ ] uji upload gambar & dokumen (dua store)
- [ ] verifikasi header keamanan aktif
- [ ] backup DB & Blob terdokumentasi
