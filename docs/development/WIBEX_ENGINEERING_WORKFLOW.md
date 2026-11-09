# WIBEX Engineering Workflow

## Prosedur Kerja Pengembangan, Audit, Implementasi, dan Dokumentasi

**Status:** APPROVED & EFFECTIVE — dokumen operasional turunan resmi
**Proyek:** BDWIKA / WIBEX
**Bahasa dokumentasi:** Indonesia
**Tujuan:** Menjadi acuan kerja operasional yang konsisten untuk setiap
pengembangan fitur dan perubahan kode WIBEX.

> **Kedudukan dokumen.** Usulan standar otoritatif ada di
> [`WIBEX_DEVELOPMENT_GOVERNANCE.md`](./WIBEX_DEVELOPMENT_GOVERNANCE.md).
> Dokumen ini memuat prosedur teknis dan konteks operasional WIBEX; ia
> tidak boleh melemahkan governance. Untuk peran, review gate, status,
> bukti, keamanan perubahan, Git/deploy, dokumentasi, dan acceptance,
> governance yang berlaku setelah disetujui Owner. Jika ada pertentangan,
> ikuti governance dan catat konfliknya — jangan memilih diam-diam.
>
> **Prinsip kerja:** **Freebuff mengerjakan. ChatGPT mengevaluasi. Owner
> menyetujui.** Setiap phase wajib melewati review gate; tidak boleh
> melompati gate atau mengklaim PASS tanpa bukti.

------------------------------------------------------------------------

## 1. Tujuan dan Prinsip Kerja

Setiap pengembangan WIBEX harus dilakukan secara bertahap. Diskusi,
analisis, dan persetujuan dilakukan sebelum perubahan kode dimulai.

Prinsip utama:

1.  **Discussion first.** Ide atau permintaan fitur tidak otomatis
    menjadi instruksi implementasi.
2.  **Repository is the source of truth.** Dokumentasi menjadi konteks
    dan panduan, sedangkan kondisi kode aktual harus diperiksa sebelum
    mengambil keputusan teknis.
3.  **Approval before implementation.** Implementasi baru dimulai
    setelah pemilik proyek menyatakan **"Siap dikembangkan"**.
4.  **Scope control.** Perubahan dibatasi pada ruang lingkup yang
    disetujui. Refactoring atau perubahan lain di luar scope tidak
    dilakukan tanpa persetujuan.
5.  **Regression awareness.** Dampak perubahan terhadap fitur yang sudah
    ada harus dianalisis dan diuji.
6.  **Evidence-based reporting.** Hasil audit, testing, dan implementasi
    hanya boleh dinyatakan berhasil jika benar-benar diperiksa atau
    dijalankan.
7.  **Documentation as project backup.** Keputusan, perubahan, hasil
    verifikasi, dan kondisi akhir dicatat pada dokumen Markdown proyek
    yang relevan.
8.  **Separation of duties.** Freebuff tidak menjadi reviewer atas
    pekerjaannya sendiri; ChatGPT mengevaluasi, Owner memutuskan.
9.  **No phase skipping.** Requirement, audit, desain, implementasi,
    testing, regresi, dokumentasi, dan acceptance tidak boleh dilewati
    tanpa pencatatan phase tailoring yang disetujui.

------------------------------------------------------------------------

## 2. Konteks Teknis WIBEX yang Harus Dipertahankan

Bagian ini merangkum batasan arsitektur yang tercatat dalam dokumentasi
proyek. Kondisi aktual tetap harus diverifikasi pada repository ketika
task dimulai.

### 2.1 Arsitektur aplikasi

-   Pola backend: **Route Handler → Service → Repository**.
-   PostgreSQL digunakan untuk data enterprise relasional.
-   MongoDB digunakan untuk modul Landing CMS.
-   Vercel Blob memiliki pemisahan store publik untuk gambar CMS dan
    store privat untuk dokumen Template & Form.
-   Otorisasi menggunakan permission terpusat dan pemeriksaan pada
    lapisan yang sesuai.
-   Aktor API berasal dari sesi cookie `wibex_session`, bukan identitas
    yang dikirim bebas oleh klien.

### 2.2 Role

WIBEX memiliki empat role utama:

1.  Admin
2.  Head Office
3.  Management
4.  Project

`msl_access` merupakan capability tambahan untuk role Management, bukan
role kelima. Hak akses harus mengikuti matriks permission dan aturan
record-level yang berlaku, bukan sekadar menyembunyikan tombol di UI.

### 2.3 Core Enterprise

Dokumentasi proyek mengelompokkan tujuh core enterprise:

1.  Program Kerja
2.  Template & Form
3.  Master Project
4.  Engineering Database
5.  MSL Engineering
6.  Struktur Organisasi
7.  User Directory

### 2.4 Modul frozen

Dua modul berikut dicatat sebagai frozen:

-   MSL Engineering
-   Struktur Organisasi

Jangan mengubah, merombak, atau melakukan refactoring pada modul
tersebut tanpa instruksi dan persetujuan eksplisit pemilik proyek. Jika
task berpotensi menyentuh modul frozen, jelaskan dampak dan ajukan
keputusan terlebih dahulu.

### 2.5 Batasan operasi

Tanpa persetujuan eksplisit, jangan menjalankan operasi yang mengubah
keadaan eksternal atau berisiko menghilangkan data, termasuk:

-   Database migration atau seed.
-   Perubahan atau penghapusan data database.
-   Deploy atau promote deployment.
-   Git push.
-   Operasi Git destruktif seperti `reset --hard`, checkout yang menimpa
    perubahan, atau penghapusan perubahan lokal.
-   Overwrite atau penghapusan file yang sudah ada.

Selalu periksa perubahan lokal yang belum di-commit sebelum bekerja.

------------------------------------------------------------------------

## 3. Alur Kerja Pengembangan

Tahapan di bawah adalah rincian operasional. Setiap tahap tetap tunduk
pada **Mandatory Review Gate** di governance §5: Freebuff menyerahkan
bukti, ChatGPT memberikan **PASS / CONDITIONAL / FAIL**, lalu Owner
memutuskan kelanjutan. Status review bukan status fitur dan bukan final
acceptance.

### Tahap 1 --- Diskusi & Requirement Analysis

**Tujuan:** Memastikan masalah, kebutuhan, dan hasil yang diharapkan
dipahami sebelum solusi dirancang.

Aktivitas:

-   Memahami kebutuhan dan tujuan fitur.
-   Mengidentifikasi masalah yang ingin diselesaikan.
-   Menentukan pengguna dan role yang terlibat.
-   Mendefinisikan ruang lingkup serta batasan.
-   Menentukan kebutuhan fungsional dan nonfungsional.
-   Mengidentifikasi kondisi sukses dan acceptance criteria awal.
-   Mencatat asumsi dan pertanyaan yang belum terjawab.

**Output:**

-   Ringkasan kebutuhan.
-   Problem statement.
-   Scope dan out-of-scope.
-   Daftar kebutuhan fungsional dan nonfungsional.
-   Daftar asumsi atau hal yang perlu dikonfirmasi.

Tidak ada perubahan kode pada tahap ini.

### Tahap 2 --- Audit & Analisis Dampak

**Tujuan:** Memahami implementasi existing dan memperkirakan dampak
perubahan.

Aktivitas:

-   Audit implementasi existing yang relevan.
-   Periksa repository, struktur file, database schema/migration, API,
    service, repository, komponen UI, dan konfigurasi terkait.
-   Telusuri alur data dan dependensi lintas modul.
-   Identifikasi potensi konflik, regresi, duplikasi, dan risiko
    keamanan.
-   Periksa dampak terhadap tujuh Core Enterprise.
-   Pastikan modul frozen tidak terganggu.
-   Bedakan fakta yang terverifikasi, temuan dokumentasi historis, dan
    hal yang belum diketahui.
-   Jangan menganggap kondisi database produksi sama dengan schema
    repository jika belum diverifikasi.

**Output:**

-   Temuan audit beserta lokasi/bukti.
-   Daftar komponen dan modul terdampak.
-   Dampak terhadap data, API, permission, UI, dan integrasi.
-   Risiko regresi dan mitigasi.
-   Daftar hal yang belum dapat dipastikan.

### Tahap 3 --- Visualisasi & Mekanisme Fitur

**Tujuan:** Membuat rancangan fitur dapat dipahami dan ditinjau sebelum
implementasi.

Aktivitas:

-   Gambaran tampilan UI/UX.
-   Struktur halaman dan komponen.
-   User journey berdasarkan role.
-   Flowchart mekanisme fitur.
-   Alur frontend, API, service, repository, dan database.
-   Matriks permission untuk setiap role yang terlibat.
-   State, validasi, loading, empty state, error state, dan success
    state.
-   Penjelasan dampak terhadap fitur existing.

**Output:**

-   Rancangan UI/UX atau wireframe konseptual.
-   Struktur komponen/halaman.
-   User journey.
-   Diagram alur fitur.
-   Kontrak API dan data yang dibutuhkan, jika relevan.
-   Matriks akses.
-   Acceptance criteria yang dapat diuji.

Rancangan harus mengikuti pola dan design system existing sejauh dapat
dibuktikan dari repository.

### Tahap 4 --- Persetujuan Pengembangan

**Tujuan:** Memastikan pemilik proyek menyetujui solusi dan batas
implementasinya.

Sebelum meminta persetujuan, sampaikan:

-   Kesimpulan analisis.
-   Rekomendasi implementasi.
-   Alternatif solusi jika memang relevan.
-   Risiko dan mitigasi.
-   Daftar file, modul, API, dan tabel yang diperkirakan terdampak.
-   Dampak terhadap fitur existing.
-   Acceptance criteria.
-   Hal yang membutuhkan keputusan pemilik proyek.

**Implementation Gate:**

Implementasi **belum boleh dimulai** sampai pemilik proyek menyatakan:

> **Siap dikembangkan**

Persetujuan hanya berlaku untuk scope yang sudah dibahas. Perubahan
scope yang material harus didiskusikan dan disetujui kembali.

### Tahap 5 --- Penyusunan Prompt untuk Freebuff

Setelah persetujuan pengembangan diberikan, siapkan prompt teknis yang
lengkap dan siap diberikan kepada Freebuff.

Prompt sekurang-kurangnya memuat:

1.  Konteks proyek WIBEX.
2.  Ringkasan kebutuhan dan problem statement.
3.  Spesifikasi fungsional dan nonfungsional.
4.  Arsitektur dan pola implementasi yang wajib diikuti.
5.  Daftar pekerjaan dan scope perubahan.
6.  File/modul yang boleh dan berpotensi perlu diubah berdasarkan audit.
7.  Batasan perubahan dan larangan menyentuh area di luar scope.
8.  Persyaratan keamanan dan otorisasi.
9.  Kontrak API/database jika relevan.
10. Acceptance criteria.
11. Testing dan langkah verifikasi.
12. Dokumen Markdown yang wajib diperbarui.
13. Format laporan hasil implementasi dan temuan.

Prompt harus spesifik terhadap hasil audit. Jangan mengarang path file,
API, nama fungsi, schema, atau dependency yang belum diverifikasi.

### Tahap 6 --- Implementation Readiness Audit

**Tujuan:** Memastikan repository dan lingkungan siap sebelum perubahan
kode dilakukan.

Pemeriksaan wajib:

-   Periksa `git status`.
-   Identifikasi branch dan commit aktif.
-   Identifikasi staged, unstaged, dan untracked files.
-   Lindungi seluruh perubahan lokal yang belum di-commit.
-   Periksa source code aktual dan file yang relevan.
-   Periksa dependency, script, konfigurasi, dan environment yang
    dibutuhkan.
-   Periksa kompatibilitas dengan implementasi existing.
-   Periksa apakah perubahan membutuhkan migration atau perubahan data.
-   Tentukan strategi rollback/recovery.
-   Pastikan scope implementasi sama dengan scope yang disetujui.

**Aturan perlindungan Git:**

-   Jangan mengasumsikan working tree bersih berdasarkan audit lama.
-   Jangan menjalankan `git reset --hard`, `git clean`, atau operasi
    lain yang dapat menghapus pekerjaan lokal.
-   Jangan menimpa perubahan yang tidak terkait.
-   Jangan melakukan stage, commit, push, atau perubahan branch tanpa
    instruksi yang sesuai.

**Output:**

-   Readiness report.
-   Baseline Git aktual.
-   Daftar file yang akan diubah.
-   Risiko implementasi.
-   Strategi recovery.

Jika ditemukan kondisi yang membuat implementasi tidak aman, hentikan
perubahan dan laporkan terlebih dahulu.

### Tahap 7 --- Implementasi & Quality Assurance

**Tujuan:** Menerapkan solusi yang disetujui dan membuktikan hasilnya.

Aturan implementasi:

-   Implementasikan sesuai scope dan acceptance criteria.
-   Pertahankan arsitektur Route Handler → Service → Repository.
-   Gunakan schema/validasi server-side yang sesuai.
-   Terapkan permission di server; UI visibility bukan pengganti
    otorisasi.
-   Pertahankan integritas database dan urutan operasi storage yang
    sudah digunakan.
-   Hindari perubahan tidak terkait dan refactoring oportunistik.
-   Jangan mengubah modul frozen tanpa persetujuan khusus.
-   Jangan menjalankan migration, seed, deploy, push, atau operasi
    destruktif tanpa persetujuan eksplisit.

Quality assurance sesuai dampak perubahan:

-   TypeScript check (`npx tsc --noEmit`).
-   ESLint pada file berubah atau seluruh proyek sesuai scope.
-   Automated test jika tersedia atau test baru yang disetujui.
-   Build (`npm run build`) bila relevan.
-   Regression test pada alur yang terdampak.
-   Pemeriksaan keamanan dan permission.
-   Pemeriksaan `git diff` dan `git diff --check`.

**Pelaporan wajib membedakan:**

-   PASS: benar-benar dijalankan dan berhasil.
-   FAIL: dijalankan dan gagal.
-   NOT RUN: tidak dijalankan.
-   NOT APPLICABLE: tidak relevan untuk perubahan tersebut.
-   HISTORICAL: hasil lama yang bukan bukti kondisi saat ini.

Jangan mengklaim test, build, browser QA, atau integrasi berhasil jika
belum dijalankan.

### Tahap 8 --- Dokumentasi & Backup

**Tujuan:** Menjaga dokumentasi sebagai rekam jejak teknis dan sumber
pengetahuan untuk pengembangan berikutnya.

Perbarui dokumen Markdown existing yang relevan. Hindari membuat dokumen
baru jika informasi dapat ditempatkan secara wajar pada dokumen yang
sudah tersedia.

Catat sesuai kebutuhan:

-   Requirement dan scope yang disetujui.
-   Hasil audit dan keputusan teknis.
-   Perubahan arsitektur atau alur data.
-   File yang diubah.
-   Perubahan API dan database.
-   Perubahan permission/security.
-   Hasil testing dan QA.
-   Known issues dan pekerjaan tertunda.
-   Riwayat implementasi.
-   Recovery dan rollback notes.

Dokumen existing yang menjadi rujukan, sesuai inventaris proyek:

-   Project Context.
-   Dokumentasi audit 01--14, termasuk Database Schema, API
    Documentation, Authentication and Authorization, Module and Feature
    Inventory, Business Process and Data Flow, Integration and Storage,
    Security and Code Quality, Testing and Quality Report, Git and
    Change History, Deployment and Environment Guide, serta Architecture
    Decisions and Technical Debt.
-   `docs/development/DEVELOPMENT_MASTER_LOG.md`.
-   `docs/development/FEATURE_REGISTER.md`.
-   `docs/development/CURRENT_PROJECT_STATE.md`.

Nama dan lokasi aktual dokumen harus diperiksa di repository sebelum
diedit. Jangan menganggap nama file atau isi dokumentasi lama selalu
mencerminkan kondisi terbaru.

**Prinsip pencatatan:**

-   Tambahkan catatan baru secara kronologis pada log.
-   Perbarui status fitur pada feature register.
-   Perbarui current state setelah verifikasi.
-   Perbarui dokumentasi teknis domain jika kontrak atau arsitektur
    berubah.
-   Pertahankan riwayat lama; jangan mengubah hasil audit historis agar
    tampak seolah-olah dibuat pada kondisi terbaru.
-   Catat bagian yang belum diverifikasi sebagai belum diketahui.

**Output:**

-   Markdown dokumentasi yang diperbarui.
-   Ringkasan file dokumentasi yang berubah.
-   Ringkasan implementasi dan QA.
-   Catatan recovery/rollback yang relevan.

------------------------------------------------------------------------

## 4. Gate dan Kondisi Berhenti

  -----------------------------------------------------------------------
  Gate                                Syarat untuk melanjutkan
  ----------------------------------- -----------------------------------
  Requirement Gate                    Kebutuhan dan scope cukup jelas

  Audit Gate                          Dampak, dependensi, dan risiko
                                      telah dianalisis

  Design Gate                         Visualisasi, mekanisme, dan
                                      acceptance criteria tersedia

  Technical Review Gate               ChatGPT menyatakan **PASS** atas
                                      output phase; **CONDITIONAL** wajib
                                      diperbaiki dan direview ulang;
                                      **FAIL** menghentikan pekerjaan

  Approval Gate                       Pemilik proyek menyatakan **"Siap
                                      dikembangkan"** setelah menerima
                                      hasil review

  Readiness Gate                      Git dan source code aktual telah
                                      diperiksa; perubahan lokal
                                      terlindungi

  QA Gate                             Hasil verifikasi dilaporkan secara
                                      jujur; status PASS/FAIL/NOT RUN/
                                      NOT APPLICABLE/HISTORICAL benar

  Documentation Gate                  Dokumen relevan telah diperbarui
                                      atau alasan belum diperbarui
                                      dicatat; tidak ada kontradiksi

  Acceptance Gate                     Owner memberikan keputusan akhir:
                                      IMPLEMENTED & VERIFIED,
                                      IMPLEMENTED BUT NOT FULLY VERIFIED,
                                      BLOCKED, atau NOT ACCEPTED
  -----------------------------------------------------------------------

Hentikan dan minta keputusan pemilik proyek jika:

-   Scope berubah secara material.
-   Ditemukan kebutuhan menyentuh modul frozen.
-   Diperlukan migration, seed, atau operasi database yang mengubah
    data.
-   Diperlukan deploy, push, atau tindakan destruktif.
-   Ada perubahan lokal yang berisiko tertimpa.
-   Audit menemukan risiko keamanan atau integritas data yang belum
    memiliki mitigasi.
-   Kebutuhan penting belum cukup jelas untuk diimplementasikan dengan
    aman.

------------------------------------------------------------------------

## 5. Format Laporan Standar per Pengembangan

Setiap task pengembangan menggunakan struktur laporan berikut:

1.  **Ringkasan Task** --- tujuan dan masalah.
2.  **Requirement** --- kebutuhan, scope, dan acceptance criteria.
3.  **Hasil Audit** --- fakta, bukti, dependensi, dan kondisi yang belum
    diketahui.
4.  **Analisis Dampak** --- UI, API, service, repository, database,
    permission, storage, dan modul terkait.
5.  **Rancangan Fitur** --- visualisasi, user journey, dan mekanisme.
6.  **Keputusan & Persetujuan** --- solusi yang disetujui dan
    batasannya.
7.  **Prompt Freebuff** --- instruksi implementasi yang siap digunakan.
8.  **Readiness Audit** --- baseline Git dan kesiapan repository.
9.  **Implementasi** --- ringkasan perubahan aktual.
10. **Quality Assurance** --- PASS, FAIL, NOT RUN, NOT APPLICABLE, atau
    HISTORICAL; sertakan perintah dan exit code.
11. **Technical Review** --- status ChatGPT (PASS/CONDITIONAL/FAIL),
    temuan, dan perbaikan yang diminta.
12. **Dokumentasi** --- daftar Markdown yang diperbarui dan hasil
    pemeriksaan konsistensi.
13. **Known Issues & Next Steps** --- keterbatasan, risiko residual, dan
    pekerjaan lanjutan.
14. **Acceptance** --- keputusan Owner dan status akhir yang dipakai.

------------------------------------------------------------------------

## 6. Ringkasan Siklus Kerja

``` text
Diskusi & Requirement Analysis
             |
             v
      Audit & Analisis Dampak
             |
             v
   Visualisasi & Mekanisme Fitur
             |
             v
   Technical Review Gate (ChatGPT)
             |
             v
       Persetujuan Pemilik
             |
     "Siap dikembangkan"
             |
             v
       Prompt untuk Freebuff
             |
             v
   Implementation Readiness Audit
             |
             v
       Implementasi & QA
             |
             v
   Technical Review Gate (ChatGPT)
             |
             v
    Dokumentasi & Backup
             |
             v
   Final Acceptance (Owner)
             |
             v
       Laporan Hasil Task
```

**Kesepakatan utama:** WIBEX dikembangkan melalui siklus **Discussion
First → Audit → Design → Technical Review → Owner Approval → Readiness
Audit → Implementation → Verification → Technical Review →
Documentation → Final Acceptance**. Tidak ada implementasi sebelum
persetujuan eksplisit, tidak ada phase tanpa review, dan setiap
perubahan harus menjaga fitur existing serta meninggalkan rekam jejak
dokumentasi yang dapat ditelusuri.
