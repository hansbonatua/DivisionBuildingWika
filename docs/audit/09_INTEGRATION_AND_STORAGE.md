# 09 — INTEGRATION AND STORAGE

## 1. Daftar Integrasi

| Integrasi | Library | Konfigurasi | File | Auth | Kegagalan |
|---|---|---|---|---|---|
| MongoDB (CMS) | `mongodb` 7.7.0 | `MONGODB_URI`, `MONGODB_DB_NAME` | `lib/db/mongodb.ts` | connection string | error dilempar; feed publik → empty state |
| PostgreSQL | `postgres` 3.4.9 + `drizzle-orm` | `DATABASE_URL` (`prepare:false`) | `lib/pg/client.ts` | connection string | error 500 terkontrol |
| Vercel Blob **publik** | `@vercel/blob` | `CMS_BLOB_READ_WRITE_TOKEN` (tanpa fallback ke token privat) | `lib/storage/public-image.ts` | token / OIDC | 503 (tidak dikonfigurasi) / 502 (gagal) |
| Vercel Blob **privat** | `@vercel/blob` | `BLOB_READ_WRITE_TOKEN` atau `VERCEL_OIDC_TOKEN`+`BLOB_STORE_ID` | `lib/storage/blob.ts` | token / OIDC | `BlobStorageNotConfiguredError` / `BlobStorageUnavailableError` |
| jsPDF + autotable | `jspdf`, `jspdf-autotable` | tidak ada | `mslExportPdf.ts`, `programKerjaSummaryExportPdf.ts` | — | error di klien saat generate |
| Recharts | `recharts` | tidak ada | dashboard summary | — | chart tidak render |
| Google Fonts (via `next/font`) | bawaan Next | build-time | `app/layout.tsx` | — | fallback font |

Tidak ada integrasi email, SMS, payment, analytics, monitoring, atau OAuth pihak ketiga.

## 2. Store Publik (Gambar CMS)

| Aspek | Nilai |
|---|---|
| Namespace | `cms/hero/`, `cms/projects/`, `cms/green-building/`, `cms/clients/`, `cms/social/`, `cms/organization/` |
| Bentuk pathname | `cms/<module>/<uuid>/<nama-aman>.<ext>` |
| Format diizinkan | `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif` — **SVG ditolak** |
| Batas ukuran | 5 MB (`CMS_IMAGE_MAX_BYTES`) |
| Nama file | diturunkan server; segmen terakhir, karakter `[A-Za-z0-9._-]`, stem ≤80 char |
| Token upload | hanya untuk pathname yang lolos `isCmsUploadPathname` |
| Verifikasi tulis | `head()` → harus ada, ukuran ≤5 MB, content-type gambar, `pathname` cocok, `url` cocok |
| Cache-control | `max-age` 365 hari untuk objek immutable |

**Mengapa token CMS terpisah:** `CMS_BLOB_READ_WRITE_TOKEN` tidak memakai fallback ke `BLOB_READ_WRITE_TOKEN`, sehingga gambar publik tidak bisa masuk ke store dokumen privat (dan sebaliknya).

## 3. Store Privat (Dokumen Template & Form)

| Aspek | Nilai |
|---|---|
| Namespace | `template-form/...` |
| Batas ukuran | 50 MB (`TEMPLATE_FORM_MAX_FILE_SIZE_BYTES`) |
| Format | allowlist MIME (PDF dan tipe dokumen lain di `lib/template-form/source.ts`) |
| Identitas | `blob_pathname` di DB; **tidak pernah** dikirim ke klien |
| Akses baca | `GET /api/template-form/[id]/file` dengan sesi + `TEMPLATE_FORM_VIEW` |
| Pemeriksaan tambahan | `head()` ukuran harus sama dengan ukuran yang dikirim klien; probe `isBlobPubliclyReachable` — objek privat tidak boleh dapat diunduh tanpa kredensial |

## 4. Urutan Operasi (wajib dipertahankan)

### Upload baru
```
1. Validasi tipe & ukuran (klien + server).
2. Server membangun pathname (klien tidak memilih path).
3. Token upload diterbitkan (modul harus berhak).
4. Klien mengunggah langsung ke Blob.
5. Server memverifikasi objek (head) SEBELUM menulis DB.
6. Tulis DB.
7. (Opsional) hapus objek lama bila record ini pemiliknya dan tidak lagi dipakai.
```

### Ganti / hapus
```
1. Tulis/perbarui DB lebih dulu (sumber kebenaran = DB).
2. Setelah sukses → periksa kepemilikan objek lama (imageSource === "upload",
   blobPathname di namespace CMS, URL menunjuk pathname yang sama).
3. Periksa referensi: 6 repository (hero, portfolio, green building, clients,
   social, organization). Error saat memeriksa = ANGGAP MASIH DIRUJUK (fail closed).
4. Baru hapus objek.
5. Kegagalan storage setelah DB sukses tidak menggagalkan respons (dicatat).
```

## 5. Kepemilikan Objek

| Kondisi record | Boleh dihapus otomatis? |
|---|---|
| `imageSource: "upload"` + `blobPathname` valid + URL cocok | ya, bila tak direferensikan |
| Legacy tanpa `imageSource` | **tidak** (dianggap milik pihak lain) |
| `imageSource: "external"` / URL eksternal | **tidak** |
| Path lokal `/asset/...` | **tidak** |

Kasus halus yang sudah ditangani: beralih `upload → external` dengan URL yang sama. Perbandingan hanya-URL akan menganggap "tidak berubah" dan meninggalkan objek yang sudah dilepas; helper `deleteReplacedCmsImage` membandingkan juga `imageSource` (`stillOwnsSameObject`).

## 6. Pencegahan Objek Yatim

| Mekanisme | Bukti |
|---|---|
| Pathname dibangun server + UUID per upload | `buildCmsBlobPathname` |
| Verifikasi objek sebelum simpan | `verifyCmsUploadedImage` |
| Registry referensi terpusat 6 modul | `REFERENCE_CHECKS` di `image-references.ts` |
| Route cleanup eksplisit | `POST /api/cms/upload/cleanup` |
| UNIQUE parsial `blob_pathname` (dokumen) | `template_forms_blob_pathname_unique` |
| Fail-closed saat cek referensi gagal | `deleteCmsImageIfUnreferenced` → `referenced`/`failed` |

## 7. Risiko Integrasi

| ID | Risiko | Tingkat | Catatan |
|---|---|---|---|
| S-01 | Cleanup bergantung pada 6 query Mongo/PG; menambah uploader baru tanpa mendaftarkan cek referensi dapat menghapus objek terpakai | **HIGH (proses)** | komentar file sudah memperingatkan |
| S-02 | Objek yatim dari upload yang tidak pernah disimpan tetap ada sampai cleanup dijalankan | LOW | cleanup manual |
| S-03 | Tidak ada retry/timeout khusus pada panggilan Blob selain probe 5 detik | LOW | error dipetakan 502/503 |
| S-04 | Tidak ada backup/retensi yang terdokumentasi untuk Blob maupun DB | MEDIUM | BELUM DIKETAHUI |
| S-05 | MongoDB tanpa validator skema | LOW | bentuk data dijaga Zod |
