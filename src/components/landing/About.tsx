import Image from "next/image";
import Link from "next/link";

type Stat = {
  value: string;
  label: string;
  description: string;
  highlight?: boolean;
};

const missions: string[] = [
  "Memberikan layanan dan produk EPC yang terintegrasi dan berkelanjutan berdasarkan prinsip kualitas, keselamatan, kesehatan, dan lingkungan yang berstandar global",
  "Mengimplementasikan budaya belajar dan inovasi untuk menyediakan solusi terbaik bagi stakeholder, serta memastikan tingkat kepuasan yang tinggi",
  "Berkomitmen untuk menjalankan proses bisnis dengan standar kualitas tertinggi dan penggunaan teknologi terbaik",
  "Memperkuat ketahanan dan pertumbuhan finasial dengan mengoptimalkan pemanfaatan sumber daya untuk mencapai profitabilitas yang berkelanjutan.",
  "Mengimplementasikan pengelolaan lingkungan, tanggung jawab sosial, praktek etis, transparansi, akuntabilitas, dan inovsi berkelanjutan dalam semua aspek operasi perusahaan.",
  "Membangun sumber daya manusia yang berintegritas dan profesional berbasis budaya perusahaan",
];

export default function About() {
  return (
    <section
      id="about"
      className="relative w-full max-w-full overflow-hidden bg-gradient-to-b from-[#F2F9FF] via-surface to-[#DCEBFA] py-20 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:items-start lg:gap-16 xl:gap-x-20 xl:gap-y-12">
          {/* lg:mt-9 (36px) = tinggi label ABOUT US (text-xs, 16px) + mb-5 (20px),
              sehingga tepi atas gambar sejajar dengan tepi atas heading. */}
          <div className="relative w-full lg:mt-9">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-xl border border-outline/40 bg-surface shadow-lg sm:max-w-[560px] lg:max-w-none">
              <Image
                src="/asset/about.jpg"
                alt="Professional civil engineers and structural directors inspecting a massive architectural construction site in clean daylight, reviewing tablet blueprints with concrete superstructure beams visible in the background."
                fill
                sizes="(max-width: 640px) 300px, (max-width: 1024px) 560px, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
            </div>
          </div>

          {/* Kolom kanan: di bawah xl tetap satu kolom flex (layout lama), di xl memakai
              `contents` supaya anak-anaknya menjadi sel grid dan kartu Visi bisa pindah
              ke bawah gambar tanpa menduplikasi markup. */}
          <div className="flex w-full max-w-full flex-col justify-center xl:contents">
            <div className="flex flex-col xl:col-start-2 xl:row-start-1">
              <div className="mb-5 inline-flex items-center gap-3">
                <span className="h-0.5 w-8 bg-secondary" />
                <span className="text-xs font-bold uppercase tracking-widest text-secondary">ABOUT US</span>
              </div>
              <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-primary md:text-4xl">
                Building a sustainable future
                <br />
                through Innovation
              </h2>
              <p className="mb-6 leading-relaxed text-primary/70 max-md:text-justify max-md:text-[0.95rem]">
                WIKA merupakan Badan Usaha Milik Negara yang senantiasa mencerminkan komitmen, integritas, dan kerja
                keras seluruh insan perusahaan dalam memberikan kontribusi nyata bagi pembangunan Indonesia. Dengan
                pengalaman dan kapabilitas yang terus berkembang, WIKA berkomitmen untuk mewujudkan pertumbuhan
                berkelanjutan melalui bidang Rekayasa, Pengadaan, dan Konstruksi (Engineering, Procurement, and
                Construction). Melalui Building Division, WIKA menghadirkan solusi konstruksi bangunan yang terintegrasi
                dengan mengedepankan kualitas, keselamatan, ketepatan waktu, serta inovasi dalam setiap pelaksanaan
                proyek. Building Division memiliki pengalaman dan kompetensi dalam mengembangkan berbagai proyek
                bangunan, mulai dari gedung perkantoran, hunian, fasilitas komersial, hingga bangunan publik dan
                infrastruktur pendukung lainnya.
              </p>
              <p className="mb-6 leading-relaxed text-primary/70 max-md:text-justify max-md:text-[0.95rem]">
                Dengan dukungan sumber daya manusia yang profesional, teknologi, serta tata kelola proyek yang
                terintegrasi, Building Division terus berupaya memberikan hasil konstruksi yang berkualitas dan bernilai
                tambah bagi pelanggan serta masyarakat. Kami percaya bahwa setiap proyek bukan sekadar membangun sebuah
                bangunan, tetapi juga menciptakan ruang yang mendukung aktivitas, pertumbuhan, dan masa depan Indonesia.
                Bersama WIKA Building Division, kami membangun hari ini untuk menciptakan masa depan yang berkelanjutan.
              </p>
            </div>

            <div className="mb-10 space-y-5 border-t border-outline/30 pt-6 xl:contents xl:space-y-0">
              <div className="rounded-xl border border-outline/50 bg-surface p-5 shadow-sm xl:col-start-1 xl:row-start-2">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-primary">Visi</h4>
                </div>
                <p className="text-sm leading-relaxed text-primary/70">
                  Menjadi Perusahaan Terpercaya di Bidang Infrastruktur dan EPC yang berkelanjutan
                </p>
              </div>
              <div className="rounded-xl border border-outline/50 bg-surface p-5 shadow-sm xl:col-start-2 xl:row-start-2">
                <div className="mb-2.5 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-primary">Misi</h4>
                </div>
                <ul className="space-y-2 text-sm leading-relaxed text-primary/70">
                  {missions.map((mission) => (
                    <li key={mission} className="flex items-start gap-2 max-md:text-justify">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                      <span>{mission}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="xl:col-start-2 xl:row-start-3">
              <Link
                href="https://www.wika.co.id/id/perusahaan/tentang-kami"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-secondary"
              >
                <span>Learn More</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
