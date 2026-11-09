# WIBEX DEVELOPMENT GOVERNANCE

**Status:** APPROVED & EFFECTIVE
**Effective date:** 10 November 2026
**Owner:** Pemilik produk / pemilik proyek WIBEX
**Applies to:** Seluruh proyek, modul, fitur, perubahan, dan pemeliharaan WIBEX
**Canonical document:** dokumen ini
**Operational companion:** [`WIBEX_ENGINEERING_WORKFLOW.md`](./WIBEX_ENGINEERING_WORKFLOW.md)
**Prepared by:** Freebuff (implementer)
**Technical review:** ChatGPT — preliminary review completed; Owner review completed 10 November 2026
**Approval:** Owner (Hans) — 10 November 2026
**Version:** 1.0

> **Prinsip utama:** **Freebuff mengerjakan. ChatGPT mengevaluasi. Owner menyetujui.**
>
> Tidak ada phase yang boleh melewati review gate. Tidak ada status PASS tanpa bukti yang benar-benar dijalankan.

---

## 1. Tujuan, Otoritas, dan Precedence

### 1.1 Tujuan

Dokumen ini menyiapkan satu usulan standar resmi untuk seluruh pengembangan WIBEX agar setiap perubahan:

- memiliki requirement dan scope yang jelas;
- diaudit terhadap kondisi repository aktual;
- dirancang sebelum diimplementasikan;
- melewati technical review yang independen;
- diuji dan dilaporkan secara jujur;
- tidak merusak data, modul lain, atau pekerjaan lokal yang belum di-commit;
- meninggalkan dokumentasi yang konsisten dan dapat ditelusuri.

Standar ini **tidak terbatas pada Knowledge Management V1.1**. Knowledge Management V1.1 adalah proyek pertama yang menerapkan standar ini, bukan batas cakupannya.

### 1.2 Otoritas dan urutan precedence

Jika terjadi pertentangan, urutan otoritas adalah:

1. **Keputusan tertulis Owner** untuk scope dan acceptance.
2. **Dokumen governance ini** untuk proses, gate, status, bukti, keamanan perubahan, dan dokumentasi.
3. **`WIBEX_ENGINEERING_WORKFLOW.md`** untuk prosedur operasional dan konteks teknis WIBEX.
4. **Dokumen audit/teknis Existing** (`docs/audit/**`, schema, API, feature register) untuk fakta kondisi aktual.
5. **Dokumen historis** — hanya sebagai konteks, bukan bukti kondisi saat ini.

Aturan yang lebih rendah tidak boleh melemahkan aturan yang lebih tinggi. Jika dua dokumen bertentangan:

- jangan memilih diam-diam;
- catat konflik, lokasi, dan dampaknya;
- ajukan keputusan kepada Owner;
- setelah diputuskan, perbarui dokumen yang bertentangan pada perubahan yang sama.

### 1.3 Batas standar

Standar ini mengatur **cara bekerja**, bukan menggantikan aturan teknis spesifik proyek seperti:

- `Route Handler → Service → Repository → DB`;
- RBAC tiga lapis;
- Zod di batas HTTP;
- aturan migration dan storage;
- modul protected/frozen;
- aturan Next.js versi repository ini.

Aturan teknis tersebut tetap berlaku dan harus dibaca dari dokumen/source yang relevan.

---

## 2. Peran dan Tanggung Jawab

### 2.1 Owner — Decision Maker

Owner:

- menetapkan kebutuhan bisnis dan prioritas;
- menyetujui requirement, scope, dan acceptance criteria;
- menyetujui perubahan berisiko;
- menyetujui operasi database yang memerlukan otorisasi;
- menerima atau menolak hasil technical review;
- memberikan keputusan akhir acceptance.

Owner **tidak** diminta memberikan PASS teknis. Owner menerima rekomendasi reviewer, menimbang risiko, lalu memutuskan.

### 2.2 ChatGPT — Technical Reviewer

ChatGPT:

- mengevaluasi hasil pekerjaan implementer;
- memeriksa kesesuaian dengan requirement dan scope;
- menilai arsitektur, kualitas kode, kontrak API, database, keamanan, RBAC, testing, performa, risiko regresi, dan konsistensi dokumentasi;
- mengidentifikasi bug, risiko, technical debt, dan bukti yang hilang;
- memberikan rekomendasi perbaikan;
- menentukan hasil review setiap phase: **PASS**, **CONDITIONAL**, atau **FAIL**.

Reviewer tidak boleh menyatakan PASS untuk hal yang belum dijalankan atau tidak memiliki bukti. Reviewer juga tidak boleh menggantikan keputusan bisnis Owner.

### 2.3 Freebuff — Implementer

Freebuff:

- melakukan audit repository;
- menganalisis requirement;
- menyusun desain teknis;
- mengimplementasikan perubahan yang disetujui;
- menjalankan testing dan verifikasi;
- memperbaiki bug dalam scope;
- memperbarui dokumentasi;
- menyerahkan laporan, diff, output test, dan bukti lain setiap phase.

Freebuff **tidak** boleh menjadi reviewer atas pekerjaannya sendiri. Freebuff tidak boleh menandai final acceptance.

### 2.4 Pemisahan tugas

| Aktivitas | Owner | ChatGPT | Freebuff |
|---|---|---|---|
| Menetapkan kebutuhan bisnis | **A/R** | C | C |
| Menyusun requirement dan scope | C | C | **R** |
| Menyetujui requirement dan scope | **A** | C | C |
| Audit repository | I | C | **R** |
| Desain teknis | C | C | **R** |
| Review desain | I | **R/A** | C |
| Implementasi | I | I | **R** |
| Review implementasi | I | **R/A** | C |
| QA dan regression | I | C | **R** |
| Verifikasi bukti | I | **R/A** | C |
| Final acceptance | **A** | C | I |

Keterangan: **R** = responsible, **A** = accountable/decision, **C** = consulted, **I** = informed.

---

## 3. Cakupan Penerapan

Standar ini wajib untuk seluruh pekerjaan WIBEX, termasuk:

1. New Module Development.
2. Feature Enhancement.
3. Bug Fixing.
4. Database Architecture & Migration.
5. Backend & API Development.
6. Frontend & UI/UX Development.
7. Authentication & Authorization.
8. System Integration.
9. Infrastructure & Deployment.
10. Regression Testing.
11. Maintenance & Technical Debt.
12. Documentation.

Tidak ada modul yang dikecualikan dari governance. Modul protected/frozen tetap tunduk pada governance, dengan tambahan syarat persetujuan eksplisit sebelum disentuh.

---

## 4. Development Lifecycle

Setiap pekerjaan dibagi menjadi phase yang sesuai dengan kompleksitas dan risikonya. Pembagian phase tidak boleh menghilangkan kontrol penting.

### 4.1 Phase standar

| Phase | Nama | Tujuan minimum | Output minimum |
|---|---|---|---|
| P1 | Requirement & Scope Validation | memastikan masalah, kebutuhan, batas, dan acceptance criteria | problem statement, scope/out-of-scope, acceptance criteria, asumsi |
| P2 | Existing System Audit | memahami kondisi repository dan dampak | temuan `file:line`, dependensi, risiko, hal yang belum diketahui |
| P3 | Architecture & Technical Design | merancang solusi sebelum coding | desain DB/API/UI/RBAC/security, rencana test, rollback |
| P4 | Implementation | menerapkan scope yang disetujui | diff terbatas, kode, test, catatan perubahan |
| P5 | Integration | membuktikan komponen terhubung benar | bukti integrasi API/DB/UI/storage |
| P6 | Testing & Quality Assurance | membuktikan perilaku dan kualitas | hasil test, build, security/RBAC, performance jika relevan |
| P7 | Regression | memastikan fitur lain tidak rusak | regression matrix dan hasilnya |
| P8 | Documentation | menyelaraskan dokumentasi dengan kondisi aktual | dokumen yang diperbarui dan daftar konflik |
| P9 | Final Acceptance | keputusan akhir Owner | rekomendasi reviewer, keputusan, known issues, next steps |

### 4.2 Phase tailoring

Jumlah phase boleh disesuaikan, terutama untuk pekerjaan dokumentasi atau perubahan sangat kecil. Tailoring wajib:

- direncanakan dan dicatat sebelum eksekusi;
- mempertahankan requirement, audit, review, verifikasi, dokumentasi, dan acceptance;
- menandai phase yang **NOT APPLICABLE** dengan alasan;
- tidak menghapus review gate atau final acceptance.

Contoh untuk pekerjaan dokumentasi murni: P1, P2, P3, P8, P9 dapat digabung/diringkas, sedangkan P4–P7 dinyatakan **NOT APPLICABLE** karena tidak ada perubahan runtime. Review tetap dilakukan atas diff dokumentasi dan konsistensinya.

### 4.3 Entry dan exit criteria

Setiap phase memiliki:

- **entry criteria:** output phase sebelumnya tersedia dan disetujui;
- **exit criteria:** output phase selesai, bukti tersedia, dan review gate terlewati;
- **stop condition:** kondisi yang mewajibkan pekerjaan berhenti dan menunggu keputusan.

Freebuff tidak boleh memulai phase berikutnya hanya karena “pekerjaan terasa selesai”. Harus ada hasil review dan keputusan Owner.

---

## 5. Mandatory Review Gate

### 5.1 Alur gate

```text
Owner menetapkan phase/scope
          │
          ▼
ChatGPT menyiapkan prompt khusus phase
          │
          ▼
Freebuff mengerjakan scope phase
          │
          ▼
Freebuff menyerahkan laporan + bukti
          │
          ▼
ChatGPT melakukan technical review
          │
     ┌────┴────┬─────────┐
     ▼         ▼         ▼
   PASS   CONDITIONAL   FAIL
     │         │         │
     ▼         ▼         ▼
Owner      perbaikan   hentikan,
memutuskan  lalu       investigasi,
            review ulang perbaiki,
                         ulang gate
```

### 5.2 Status review

| Status | Arti | Tindakan |
|---|---|---|
| **PASS** | Acceptance criteria phase terpenuhi dan bukti memadai | Owner dapat menyetujui kelanjutan |
| **CONDITIONAL** | Ada kekurangan yang harus diperbaiki; risiko belum diterima | Tidak boleh melanjutkan sebelum perbaikan dan review ulang |
| **FAIL** | Ada masalah fundamental pada requirement, desain, implementasi, atau bukti | Pekerjaan dihentikan untuk investigasi dan perbaikan |

Status review **bukan** status fitur dan **bukan** status final acceptance. Ketiganya harus dicatat terpisah.

### 5.3 Aturan gate

- Tidak boleh melompati review gate.
- Reviewer harus independen dari implementer.
- Review tanpa bukti yang dapat diperiksa tidak boleh PASS.
- Temuan **CRITICAL** atau **HIGH** yang belum dimitigasi tidak boleh menghasilkan PASS.
- `CONDITIONAL` wajib memiliki daftar perbaikan, penanggung jawab, dan bukti review ulang.
- `FAIL` wajib memiliki analisis akar masalah dan rencana pemulihan.
- Owner dapat menerima risiko residual secara tertulis, tetapi tidak dapat mengubah FAIL menjadi PASS tanpa review ulang.
- Setiap keputusan gate dicatat di laporan phase dan, bila relevan, di `DEVELOPMENT_MASTER_LOG.md`.

### 5.4 Fokus review per phase

| Phase | Fokus utama reviewer |
|---|---|
| P1 | kelengkapan requirement, acceptance criteria, out-of-scope, asumsi |
| P2 | kebenaran bukti audit, dampak, dependensi, risiko, hal yang belum diketahui |
| P3 | kelayakan arsitektur, kontrak API/DB, RBAC, keamanan, test plan, rollback |
| P4 | kesesuaian scope, kualitas kode, error handling, tidak ada perubahan liar |
| P5 | bukti integrasi nyata, bukan hanya kompilasi |
| P6 | cakupan test, hasil nyata, negative case, security/RBAC, performa bila relevan |
| P7 | regression matrix, modul protected, dampak lintas modul |
| P8 | konsistensi dokumentasi, tidak ada klaim palsu, tidak ada duplikasi |
| P9 | kelengkapan bukti, known issues, risiko residual, rekomendasi |

---

## 6. Standard Technical Evaluation

Setiap hasil pekerjaan dievaluasi pada aspek yang relevan:

| Aspek | Yang diperiksa | Bukti minimum |
|---|---|---|
| Requirement Compliance | semua acceptance criteria terpenuhi; scope tidak melebar | mapping requirement → bukti |
| Code Quality | keterbacaan, error handling, tidak ada dead code, tidak ada suppression tanpa alasan | diff dan hasil lint/typecheck |
| Architecture | Route → Service → Repository, boundary, transaksi, dependensi | penjelasan desain + file:line |
| Database Integrity | constraint, FK, index, migration, rollback, data existing | schema/migration + verifikasi DB bila relevan |
| API Contract | request/response, status code, validasi, kompatibilitas | test route/kontrak |
| Security | validasi input, otorisasi, secret, XSS/URL, least privilege | test negative + review kode |
| RBAC | enforcement server, role matrix, row-level bila ada | test per role atau status BLOCKED |
| Testing Coverage | unit/integration/regression sesuai risiko | output test dan daftar yang tidak diuji |
| Performance | query, payload, render, beban bila relevan | pengukuran, bukan asumsi |
| Regression Risk | modul terdampak, frozen modules, perubahan bersama | regression matrix |
| Documentation Consistency | dokumen sesuai kondisi aktual; tidak ada kontradiksi | diff dokumen + cross-check |

### 6.1 Status hasil verifikasi

Gunakan hanya status berikut:

- **PASS** — benar-benar dijalankan dan berhasil.
- **FAIL** — dijalankan dan gagal.
- **NOT RUN** — belum dijalankan.
- **NOT APPLICABLE** — tidak relevan untuk perubahan tersebut.
- **HISTORICAL** — hasil lama; bukan bukti kondisi saat ini.

Jangan menyatakan PASS untuk pengujian yang belum dijalankan. Jangan menyamakan “build berhasil” dengan “fitur terverifikasi”.

### 6.2 Severity temuan

| Severity | Arti | Dampak gate |
|---|---|---|
| **CRITICAL** | kehilangan data, bypass keamanan, korupsi integritas, atau sistem tidak dapat digunakan | FAIL; hentikan |
| **HIGH** | fungsi utama salah, risiko data/keamanan signifikan, atau acceptance tidak terpenuhi | FAIL atau CONDITIONAL dengan mitigasi wajib |
| **MEDIUM** | keterbatasan fungsi/UX/operasional yang perlu diperbaiki | CONDITIONAL bila belum dimitigasi |
| **LOW** | maintainability, konsistensi, atau perbaikan kecil | boleh PASS dengan catatan |
| **INFO** | observasi tanpa dampak langsung | tidak menghalangi |

---

## 7. Standard Evidence & Reporting

### 7.1 Prinsip bukti

- Bukti harus dapat diperiksa ulang: perintah, exit code, output, environment, dan waktu.
- Bedakan **fakta terverifikasi**, **asumsi**, dan **belum diuji**.
- Jangan menyalin hasil lama sebagai hasil saat ini tanpa label **HISTORICAL**.
- Jangan menampilkan secret, token, password, cookie, atau data pribadi.
- Screenshot/browser evidence hanya diklaim bila benar-benar diambil.
- Database evidence harus menyebut target dan apakah read-only/rollback.
- Diff harus menunjukkan file yang berubah dan tidak menyentuh area di luar scope.

### 7.2 Laporan wajib per phase

Setiap phase minimal memuat:

1. **Phase dan scope** — apa yang dikerjakan dan apa yang tidak.
2. **Baseline** — branch, HEAD, git status, kondisi working tree.
3. **File yang berubah** — path dan ringkasan.
4. **Ringkasan implementasi/analisis** — keputusan dan alasan.
5. **Git diff** — ringkasan dan pemeriksaan scope.
6. **Test output** — perintah, exit code, hasil.
7. **Build output** — bila relevan.
8. **Database verification** — bila relevan; target, query/verifikasi, rollback.
9. **Browser/screenshot evidence** — bila relevan.
10. **Security/RBAC evidence** — bila relevan.
11. **Known issues** — yang belum selesai atau belum diuji.
12. **Risiko residual** — dampak dan mitigasi.
13. **Rekomendasi phase berikutnya**.
14. **Permintaan review** — fokus yang perlu dievaluasi ChatGPT.

### 7.3 Format tabel bukti

| Pemeriksaan | Perintah/metode | Exit/status | Hasil | Catatan |
|---|---|---|---|---|
| ... | ... | ... | PASS/FAIL/NOT RUN | ... |

Baris tanpa bukti tidak boleh diisi PASS.

---

## 8. Change Safety & Data Protection

Wajib:

- melindungi perubahan pengguna yang belum di-commit;
- memeriksa `git status` sebelum dan sesudah pekerjaan;
- tidak melakukan `reset`, `stash`, `discard`, `checkout --`, `clean`, atau overwrite tanpa otorisasi;
- tidak menghapus data existing tanpa persetujuan;
- memverifikasi target database sebelum operasi: host, nama database, environment, dan status migration;
- memastikan migration memiliki strategi keamanan data dan rollback;
- tidak mengubah modul frozen tanpa persetujuan eksplisit;
- tidak mengubah permission di luar scope;
- tidak memakai kredensial atau sesi pengguna lain tanpa otorisasi;
- tidak mengklaim pengujian produksi jika hanya menjalankan unit test atau database sementara;
- tidak menjalankan operasi destruktif untuk “membersihkan” hasil uji tanpa persetujuan.

Jika keamanan target database tidak dapat dibuktikan, atau backup/restore tidak dapat diverifikasi, pekerjaan database harus **BERHENTI** dan dilaporkan sebagai **BLOCKED**.

---

## 9. Git & Deployment Governance

Tanpa instruksi terpisah dari Owner:

- **tidak boleh commit**;
- **tidak boleh push**;
- **tidak boleh deploy**;
- **tidak boleh production release**;
- **tidak boleh mengubah konfigurasi production yang berisiko**.

Semua perubahan harus dapat ditinjau sebelum tindakan tersebut.

Jika Owner memberikan otorisasi:

- otorisasi harus spesifik pada aksi dan environment;
- commit harus terpisah per topik dan tidak menggunakan `git add .` secara buta;
- deployment harus memiliki rollback plan, verifikasi health check, dan monitoring;
- migration produksi harus memiliki backup yang terverifikasi dan rencana rollback;
- perubahan konfigurasi production harus dicatat dan dapat diaudit.

---

## 10. Documentation Governance

### 10.1 Prinsip

- Dokumentasi existing adalah sumber konteks proyek, tetapi **source code dan bukti runtime** adalah sumber kebenaran kondisi aktual.
- Perbarui dokumen existing; jangan membuat dokumen duplikat untuk topik yang sudah punya rumah.
- Jangan menghapus dokumentasi fitur lain.
- Jangan menandai fitur selesai sebelum implementasi dan bukti pengujian tersedia.
- Bedakan jelas: **V1 aktual**, **V1.1 target**, **rencana**, dan **implementasi**.
- Jika dokumentasi existing salah, koreksi dengan bukti; jangan mengarang agar terlihat konsisten.

### 10.2 Dokumen yang harus diselaraskan

| Perubahan | Dokumen minimal |
|---|---|
| Arsitektur/sistem | `docs/audit/03_SYSTEM_ARCHITECTURE.md`, `14_ARCHITECTURE_DECISIONS_AND_TECHNICAL_DEBT.md` |
| Schema/migration | `docs/audit/04_DATABASE_SCHEMA.md`, schema source, migration |
| API/kontrak | `docs/audit/05_API_DOCUMENTATION.md` |
| Auth/RBAC | `docs/audit/06_AUTHENTICATION_AND_AUTHORIZATION.md` |
| Modul/fitur | `docs/audit/07_MODULE_AND_FEATURE_INVENTORY.md`, `FEATURE_REGISTER.md` |
| Proses bisnis/alur data | `docs/audit/08_BUSINESS_PROCESS_AND_DATA_FLOW.md` |
| Integrasi/storage | `docs/audit/09_INTEGRATION_AND_STORAGE.md` |
| Keamanan/debt | `docs/audit/10_SECURITY_AND_CODE_QUALITY.md`, `14_...` |
| Testing | `docs/audit/11_TESTING_AND_QUALITY_REPORT.md` |
| Deployment | `docs/audit/13_DEPLOYMENT_AND_ENVIRONMENT_GUIDE.md` |
| Riwayat perubahan | `docs/development/DEVELOPMENT_MASTER_LOG.md` |
| Status fitur | `docs/development/FEATURE_REGISTER.md` |
| Backlog | `docs/audit/26-PRIORITIZED-DEVELOPMENT-BACKLOG.md` |

Sesuaikan path dengan struktur repository aktual. Jangan menganggap nama dokumen lama selalu benar.

### 10.3 Status dokumentasi

- **APPROVED SPECIFICATION / READY FOR IMPLEMENTATION** — keputusan/desain disetujui, belum ada implementasi.
- **IMPLEMENTED** — perubahan sudah ada di working tree/build, belum tentu terverifikasi.
- **IMPLEMENTED & VERIFIED** — implementasi dan bukti acceptance lengkap.
- **IMPLEMENTED BUT NOT FULLY VERIFIED** — sebagian bukti ada, sebagian belum.
- **BLOCKED** — tidak dapat dilanjutkan karena dependency/akses/izin.
- **NOT ACCEPTED** — ditolak Owner setelah review.

Status ini tidak otomatis sama dengan status review phase atau status fitur di feature register. Lihat §11.4.

---

## 11. Final Acceptance

### 11.1 Kewenangan

Final acceptance hanya dapat diberikan Owner setelah menerima technical review. Reviewer memberikan rekomendasi; implementer menyerahkan bukti; Owner memutuskan.

### 11.2 Status akhir

| Status | Definisi | Syarat |
|---|---|---|
| **IMPLEMENTED & VERIFIED** | seluruh acceptance criteria terpenuhi dan bukti lengkap | review PASS, test/regression PASS, dokumentasi konsisten, tidak ada blocker |
| **IMPLEMENTED BUT NOT FULLY VERIFIED** | implementasi ada, tetapi sebagian verifikasi belum | review PASS/CONDITIONAL, daftar bukti yang belum ada eksplisit |
| **BLOCKED** | pekerjaan tidak dapat dilanjutkan | dependency, akses, izin, environment, atau keputusan belum tersedia |
| **NOT ACCEPTED** | hasil ditolak | review FAIL atau acceptance criteria tidak terpenuhi |

### 11.3 Aturan acceptance

- Jangan memakai “selesai” tanpa status di atas.
- Jangan menandai `IMPLEMENTED & VERIFIED` bila ada test `NOT RUN` yang relevan.
- Jangan menandai `IMPLEMENTED & VERIFIED` bila role/RBAC belum diuji dan itu bagian acceptance.
- Known issues harus dicantumkan, bukan disembunyikan.
- Owner dapat menerima `IMPLEMENTED BUT NOT FULLY VERIFIED` dengan risiko residual tertulis.
- Final acceptance dicatat di `DEVELOPMENT_MASTER_LOG.md` dan `FEATURE_REGISTER.md`.

### 11.4 Pemetaan status

| Konteks | Status yang digunakan |
|---|---|
| Review gate ChatGPT | PASS / CONDITIONAL / FAIL |
| Hasil test/verifikasi | PASS / FAIL / NOT RUN / NOT APPLICABLE / HISTORICAL |
| Final acceptance Owner | IMPLEMENTED & VERIFIED / IMPLEMENTED BUT NOT FULLY VERIFIED / BLOCKED / NOT ACCEPTED |
| Feature register | COMPLETE AND VERIFIED / IMPLEMENTED BUT NOT FULLY VERIFIED / PARTIALLY IMPLEMENTED / NOT STARTED / PLACEHOLDER / UNKNOWN |
| Spesifikasi yang disetujui | APPROVED SPECIFICATION / READY FOR IMPLEMENTATION |

Pemetaan feature register:

- `COMPLETE AND VERIFIED` hanya bila final acceptance `IMPLEMENTED & VERIFIED`.
- `IMPLEMENTED BUT NOT FULLY VERIFIED` selaras dengan final acceptance bernama sama.
- `PARTIALLY IMPLEMENTED` biasanya berasal dari review `CONDITIONAL`.
- `NOT STARTED`/`PLACEHOLDER` belum boleh disebut implemented.
- `APPROVED SPECIFICATION / READY FOR IMPLEMENTATION` bukan status fitur aktual; gunakan sebagai status perencanaan.

---

## 12. Repository Adoption dan Audit Konsistensi

### 12.1 Audit dokumen existing

Sebelum membuat/memperbarui dokumen governance:

1. audit struktur `docs/`;
2. identifikasi dokumen governance/workflow existing;
3. identifikasi aturan yang berpotensi bertentangan;
4. pertahankan dokumentasi valid;
5. hindari duplikasi;
6. gunakan istilah konsisten;
7. pastikan cakupan seluruh WIBEX, bukan satu modul.

### 12.2 Kedudukan `WIBEX_ENGINEERING_WORKFLOW.md`

`WIBEX_ENGINEERING_WORKFLOW.md` tetap dipertahankan sebagai **panduan operasional** yang memuat:

- konteks teknis WIBEX;
- langkah kerja rinci;
- format prompt Freebuff;
- format laporan;
- daftar modul protected/frozen;
- batasan operasi.

Dokumen tersebut **tunduk pada governance ini**. Jika terjadi pertentangan tentang peran, gate, status, bukti, keamanan perubahan, Git/deploy, dokumentasi, atau acceptance, dokumen ini yang berlaku.

### 12.3 Konflik yang ditemukan dan penyelesaiannya

| ID | Konflik | Lokasi | Penyelesaian |
|---|---|---|---|
| G-01 | Workflow lama hanya memiliki Owner → Freebuff, belum memiliki peran reviewer independen | `WIBEX_ENGINEERING_WORKFLOW.md` | Governance menambahkan ChatGPT sebagai technical reviewer; workflow diperbarui untuk merujuk gate ini |
| G-02 | Workflow lama menyebut “Approval before implementation” tanpa review per phase | `WIBEX_ENGINEERING_WORKFLOW.md` §1, §4 | Otorisasi Owner tetap ada, tetapi setiap phase wajib melewati review gate |
| G-03 | `DEVELOPMENT_MASTER_LOG` menyebut hanya “perubahan kode” | `DEVELOPMENT_MASTER_LOG.md` pembuka | Diperluas menjadi perubahan kode dan/atau dokumentasi/governance |
| G-04 | `FEATURE_REGISTER` memakai status fitur yang berbeda dari status review/acceptance | `FEATURE_REGISTER.md` | Governance menetapkan pemetaan eksplisit; status tidak dicampur |
| G-05 | `AI_DEVELOPER_HANDOFF_GUIDE` menyebut PASS/FAIL/NOT RUN, tetapi belum merujuk governance | `AI_DEVELOPER_HANDOFF_GUIDE.md` §8 | Ditambahkan rujukan wajib ke governance |
| G-06 | Beberapa dokumen menyebut modul “frozen” dengan status klaim yang belum diverifikasi | `MASTER_PROJECT_INDEX.md`, workflow | Governance mempertahankan larangan perubahan dan mewajibkan persetujuan eksplisit; klaim frozen tetap `PERLU VERIFIKASI` |
| G-07 | Workflow lama menyebut berhenti bila migration diperlukan, sedangkan Owner dapat mengotorisasi | Workflow §4 | Default tetap berhenti; eksekusi hanya dengan otorisasi tertulis dan syarat keamanan §8 |
| G-08 | Beberapa dokumen historis menyebut “selesai” tanpa membedakan implementasi dan verifikasi | `docs/audit/**` | Governance mewajibkan status terpisah dan bukti; dokumen historis tidak ditulis ulang tanpa bukti |

### 12.4 Checklist adopsi

- [x] Dokumen governance kanonik tersedia.
- [x] Peran dan pemisahan tugas didefinisikan.
- [x] 12 area cakupan tercantum.
- [x] Lifecycle dan review gate didefinisikan.
- [x] Status review, test, acceptance, dan feature register dipetakan.
- [x] Standard evidence dan report template tersedia.
- [x] Change safety dan Git/deploy governance tersedia.
- [x] Documentation governance tersedia.
- [x] Workflow lama dirujuk sebagai dokumen operasional turunan.
- [x] Konflik existing dicatat.
- [x] Master log, feature register, dan indeks diperbarui.
- [x] Tidak ada perubahan source code/database dalam adopsi governance ini.

---

## 13. Knowledge Management V1.1 — Proyek Pertama

Knowledge Management V1.1 adalah **penerapan pertama** standar ini, bukan batas cakupan governance.

### 13.1 Status

- **V1** adalah kondisi runtime aktual yang terdokumentasi di `docs/audit/**` dan `FEATURE_REGISTER.md`.
- **V1.1** berstatus **APPROVED SPECIFICATION / READY FOR IMPLEMENTATION** sebagai target yang disetujui Owner.
- **V1.1 belum diimplementasikan** pada saat dokumen governance ini dibuat.
- Detail keputusan V1.1 harus dibaca dari spesifikasi yang disetujui, bukan disimpulkan dari dokumen V1.
- Jangan mencampur status V1 dan V1.1 dalam satu klaim “selesai”.

### 13.2 Konsekuensi

Setiap phase V1.1 wajib:

1. memiliki scope dan acceptance criteria;
2. diaudit terhadap V1 dan repository aktual;
3. memiliki desain DB/API/UI/RBAC/security;
4. direview ChatGPT sebelum implementation gate;
5. memiliki test dan regression yang sesuai;
6. memperbarui dokumen existing, bukan menyalin dokumen baru;
7. diakhiri dengan keputusan Owner.

### 13.3 Larangan

- Jangan menganggap V1.1 sudah selesai karena V1 sudah berjalan.
- Jangan mengubah V1 menjadi V1.1 tanpa migration/API/UI/test yang disetujui.
- Jangan menyalin requirement V1.1 ke source code pada task dokumentasi ini.
- Jangan mengklaim multi-record, delete record, atau perubahan lain sebagai implemented sebelum ada bukti.

---

## 14. Governance Change Control

Dokumen ini dapat diubah jika:

- Owner menetapkan kebijakan baru;
- ditemukan konflik material;
- ada insiden yang menunjukkan kontrol kurang;
- ada perubahan organisasi/tooling yang mempengaruhi peran atau gate.

Perubahan wajib:

- dicatat di `DEVELOPMENT_MASTER_LOG.md`;
- memiliki alasan dan dampak;
- tidak menghapus aturan lama tanpa jejak;
- direview ChatGPT bila menyangkut gate, keamanan, atau acceptance;
- disetujui Owner.

### 14.1 Riwayat versi

| Versi | Tanggal | Perubahan | Status |
|---|---|---|---|
| 1.0 | 4 November 2026 | Standar awal organization-wide; KM V1.1 sebagai pilot; disetujui Owner 10 November 2026 | **APPROVED & EFFECTIVE** |

---

## 15. Meta Acceptance Criteria

Dokumen governance ini dinyatakan lengkap bila:

- [x] memiliki status, owner, tanggal efektif yang diusulkan, dan cakupan;
- [x] mendefinisikan tiga peran dan pemisahan tugas;
- [x] mencakup 12 area pekerjaan WIBEX;
- [x] mendefinisikan lifecycle dan minimal review gate;
- [x] mendefinisikan PASS/CONDITIONAL/FAIL dan status verifikasi;
- [x] mewajibkan bukti dan laporan yang jujur;
- [x] mengatur change safety, data protection, dan Git/deploy;
- [x] mengatur dokumentasi dan acceptance;
- [x] mencatat konflik dengan aturan existing;
- [x] menetapkan KM V1.1 sebagai penerapan pertama, bukan batas;
- [x] tidak mengubah source code, database, atau migration.

**Status dokumen:** **APPROVED & EFFECTIVE** — Owner (Hans), 10 November 2026.
