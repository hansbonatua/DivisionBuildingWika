import Image from "next/image";
import Link from "next/link";

type Stat = {
  value: string;
  label: string;
  description: string;
  highlight?: boolean;
};

const stats: Stat[] = [
  {
    value: "1960",
    label: "Since 1960",
    description: "Foundational Heritage",
  },
  {
    value: "250+",
    label: "Completed",
    description: "Strategic Projects",
  },
  {
    value: "Expansion",
    label: "Expansion",
    description: "Sustainable Scale",
    highlight: true,
  },
];

const missions: string[] = [
  "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Perferendis, deleniti!.",
  "Lorem ipsum dolor sit amet consectetur adipisicing elit. Labore, voluptatibus?.",
  "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Accusantium, reprehenderit!.",
];

export default function About() {
  return (
    <section
      id="about"
      className="relative w-full max-w-full overflow-hidden bg-gradient-to-b from-[#F2F9FF] via-surface to-[#DCEBFA] py-20 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
          <div className="relative w-full">
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
            <div className="pointer-events-none absolute -left-4 -top-4 hidden h-24 w-24 border-l-2 border-t-2 border-secondary/40 sm:block" />
            <div className="pointer-events-none absolute -bottom-4 -right-4 hidden h-24 w-24 border-b-2 border-r-2 border-secondary/40 sm:block" />
            <div className="mt-8 grid grid-cols-1 gap-4 min-[480px]:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.value + stat.label}
                  className="flex flex-col justify-center rounded-xl border border-outline/50 bg-surface p-4 text-center shadow-sm"
                >
                  {stat.highlight ? (
                    <div className="mb-1 flex items-center justify-center gap-1">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="text-secondary"
                      >
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                        <polyline points="16 7 22 7 22 13" />
                      </svg>
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-primary">{stat.value}</span>
                  )}
                  <span className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-secondary">
                    {stat.label}
                  </span>
                  <span className="mt-1 text-sm text-primary/70">{stat.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex w-full max-w-full flex-col justify-center">
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

            <div className="mb-10 space-y-5 border-t border-outline/30 pt-6">
              <div className="rounded-xl border border-outline/50 bg-surface p-5 shadow-sm">
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
                  Lorem ipsum dolor, sit amet consectetur adipisicing elit. Illo, quas..
                </p>
              </div>
              <div className="rounded-xl border border-outline/50 bg-surface p-5 shadow-sm">
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

            <div>
              <Link
                href="#about-detailed"
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
