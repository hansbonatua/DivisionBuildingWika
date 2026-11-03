# 10 — SECURITY AND CODE QUALITY

## 1. Validasi (Zod)

| Lokasi | Ciri | Catatan |
|---|---|---|
| `lib/*/schema.ts` | satu skema create + satu update | dipakai route, bukan komponen |
| CMS (5 modul) | `.default("")` pada create; update **tanpa default** | pelajaran "Hero Phase 2C": `.partial()` di atas `.default()` menimpa nilai tersimpan |
| MSL create | `.strict()` | menolak `year`, `score`, `category` dari klien |
| Program Kerja | field master dibedakan dari bulanan | `year` immutable, unit dikunci setelah RI |
| Query string MSL | `/^\d+$/` eksplisit | menolak `2026.5`, `abc`, `""` sebelum coercion |

**Celah validasi yang terbukti (F-02):** `link` pada `createClientSchema`/`updateClientSchema` hanya `z.string().trim().max(500)` — menerima `javascript:`, `data:`, `//evil`, backslash, whitespace. Sanitasi hanya di `Clients.tsx` (render) dan masih uncommitted.

## 2. Error Handling

| Lapis | Mekanisme | Konsistensi |
|---|---|---|
| Domain | kelas error per modul (`MslForbiddenError`, `CannotDeleteLastAdminError`, `CmsForbiddenError`, …) | konsisten |
| Route | `mapDomainError` → 400/403/404/409; storage → 502/503 | konsisten |
| Klien | state `error` + pesan Indonesia; landing memakai empty state netral | konsisten |
| Logging | `console.warn` untuk cleanup storage gagal | minimal |
| Error boundary | tidak ada `error.tsx`/`global-error.tsx`/`loading.tsx`/`not-found.tsx` di `src/app` (diverifikasi `find`) | Next memakai tampilan default |

Tidak ditemukan `catch` kosong yang menelan error bisnis. Pengecualian yang disengaja: kegagalan hapus objek storage setelah DB sukses (tidak boleh membatalkan respons).

## 3. Keamanan

### Yang sudah baik (VERIFIED)
- Password bcrypt cost 12; `toSafeUser` membuang hash; hash tidak pernah keluar API.
- Token sesi 32 byte; DB hanya SHA-256; cookie httpOnly + `sameSite=lax` + `secure` (prod).
- Lockout 5/15 menit per hash NIP; 429 sebelum verifikasi; pesan seragam.
- Timing/enumerasi dimitigasi dengan `DUMMY_PASSWORD_HASH`.
- Setiap route non-publik memeriksa sesi; permission dicek di route **dan** service.
- Upload: allowlist MIME + ekstensi (tanpa SVG), 5 MB / 50 MB, pathname server-generated, `allowOverwrite:false`, verifikasi objek, token store terpisah.
- Dokumen privat: download by id, bukan pathname; probe memastikan tidak publik.
- Header keamanan dasar aktif; framing dilarang (`DENY`).
- Tidak ada secret di repository (`.env*` di-ignore); tidak ada key yang dicetak.

### Temuan
| ID | Temuan | Tingkat | Bukti |
|---|---|---|---|
| F-01 | CSP tidak dipasang | **HIGH** | `next.config.ts` komentar eksplisit |
| F-02 | URL CMS tidak divalidasi di server | **HIGH** | `client.schema.ts` |
| F-10 | Tidak ada cek `Origin`/`Sec-Fetch-Site` atau CSRF token pada mutasi | LOW | seluruh route POST/PATCH/PUT/DELETE |
| SEC-04 | `console.warn` menyertakan pathname storage | INFORMATIONAL | bukan data sensitif |
| SEC-05 | Tidak ada rate limit selain login | LOW | endpoint lain tanpa throttle |
| SEC-06 | CSP/CORS sengaja absen; tidak ada konsumen lintas origin | INFORMATIONAL | komentar config |
| SEC-07 | Sesi tidak dirotasi setelah perubahan role | LOW | `session.ts` |
| F-16 | Footer: 8 tautan `href="#"` + `mailto:corporate@wibex.co.id` menampilkan `wibexwika@gmail.com` | MEDIUM (kualitas) | `Footer.tsx` baris 4–10, 148–206 |
| F-17 | `apiAuthGuard()` tidak dipakai route mana pun | LOW | `current-user.ts` baris 47–60 |
| F-18 | Opsi PIC tidak memfilter status akun (V1) | MEDIUM | `engineering-database/repository.ts:158` |

Tidak ditemukan: SQL injection (Drizzle parameterized), NoSQL injection (query memakai nilai tervalidasi, bukan objek mentah), IDOR pada dokumen (download by id + sesi), path traversal (pathname divalidasi regex + `..` ditolak), atau kebocoran secret.

## 4. Performa

| Aspek | Kondisi | Bukti |
|---|---|---|
| Query N+1 | Program Kerja summary memakai batched fetch (komentar "constant query count") | `summaryService.ts` |
| Index | FK + kolom filter ter-index; trigram pada Master Project | `schema.ts` |
| Payload publik | projection minimal, tanpa field storage | 5 endpoint |
| Client components | seluruh section landing yang berfetch adalah client | wajar untuk CMS dinamis |
| Bundler | tidak ada pengukuran bundle | **BELUM DIKETAHUI** |
| Caching | data dashboard `no-store`; gambar Blob immutable 1 tahun | route + upload |
| Chart/PDF | Recharts & jsPDF diimpor di komponen klien besar | potensi bundle besar, **belum diukur** |
| Mongo index | dibuat lazy pada request pertama | `indexesEnsured` |

Tidak ada klaim speedup/regresi performa karena **tidak ada pengukuran**.

## 5. Maintainability

| Temuan | Ukuran | Dampak |
|---|---|---|
| `TemplateFormEditor.tsx` | 1.019 baris | sulit diuji |
| `mslExportPdf.ts` | 764 | padat, perlu hati-hati |
| `MslEngineeringPage.tsx` | 730 | state + PDF + tabel |
| `ProgramKerjaSummaryDashboard.tsx` | 719 | chart + filter |
| `lib/program-kerja/summary.ts` | 701 | logika agregasi murni (kandidat test) |
| `DashboardSidebar.tsx` | 649 | 8 flag visibilitas |
| Duplikasi CMS | 5 modul | perubahan lintas modul 5× |
| Helper API per domain | 5 file `_helpers.ts` | `getActor`/`mapDomainError` diulang per domain (sengaja) |
| `lib/demo/*` | 4 file | dipakai form nyata; nama menyesatkan |
| SVG default | 5 file | dead asset |
| README | boilerplate | tidak ada dokumentasi onboarding |

Tidak ditemukan circular dependency yang jelas, `any` tersebar, atau cast `as unknown as` yang tidak perlu pada jalur kritis (tipe `unknown` dipakai justru untuk memvalidasi payload eksternal sebelum dipersempit).

## 6. Ringkasan Prioritas Perbaikan (belum dikerjakan)

| Prioritas | Item | Kompleksitas | Risiko regresi |
|---|---|---|---|
| 1 | Commit pekerjaan landing (F-12) | rendah | rendah |
| 2 | Validasi `link` di Zod (F-02) | rendah | rendah |
| 3 | `.env.example` lengkap + di-track (F-04) | rendah | nihil |
| 4 | Test murni + CI (F-05) | sedang | nihil |
| 5 | Kontrak `imageAlt`/`description` (F-03) | sedang | sedang (kontrak API) |
| 6 | CSP Report-Only → enforce (F-01) | sedang | sedang (gambar Blob/inline) |
| 7 | `assertSameOrigin` untuk mutasi (F-10) | rendah | rendah |
| 8 | Pecah komponen > 700 baris (F-06) | tinggi | sedang |
