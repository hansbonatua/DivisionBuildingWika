export type HeroSlide = {
  id: number;
  title: string;
  badge: string;
  badgeActive: boolean;
  description: string;
  image: string;
  imageAlt: string;
  fileName: string;
  project: string;
  location: string;
};

export const INTERVAL_OPTIONS = ["6 Detik (Rekomendasi)", "8 Detik", "10 Detik"];

export const initialSlides: HeroSlide[] = [
  {
    id: 1,
    title: "1. Istana Garuda IKN",
    badge: "1. Istana Garuda IKN",
    badgeActive: true,
    description: "Membangun Mahakarya Berkelanjutan...",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBI61CsC76JrjgVszdRHU_JE79kjwJZQA4XNaRRH9ZP_EiShOgPuqccoqgYtptS9Ls4laQ9DgDhal3Qk_INiCxZZgdwKAXuU_8Dg-9ijgDC_BIAm7-tTK2Ew7CVmiE5eJyC22ndEZ9u8vgJx7uiLDUoaDN4rN1QfuPfV0ipA7DuHJhQ3skOChA8kpD5ID4x9bvi0fLtN9uS-vpSGrGj6y6Bl0TzGUZen5MJmtL5PtzFeovFKY6oazbFNkn_DMORUVvUDCo",
    imageAlt: "Istana Negara IKN",
    fileName: "Istana Garuda IKN.png",
    project: "ISTANA GARUDA IKN",
    location: "Penajam Paser Utara, Nusantara (IKN)",
  },
  {
    id: 2,
    title: "2. Jembatan Teluk Balikpapan",
    badge: "STANDBY",
    badgeActive: false,
    description: "Konektivitas Logistik Pesisir Timur...",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDN04dMnunxDFE1W2lnOO7g2jW07hvO2m-Nmx9UHv8_HUaahnAYbmAp0c4JiUVXfpzaRH-R3qX4zZt1OoaqHen3kAw9cfyIj-ovFKrqYIvUjQJeQ2jC-BDdkVYwaRvXnq-curDS_hYanFR3Oe7vJdttMbwAUf6MbDH9MmYpKlovmsHRlj_9LS79h-8TblFvQFcwJf0KcUmOYOShoLkCtKvJE9qDMg-W4VAJNHc0CAVzohqE7z99kgJHrg",
    imageAlt:
      "Panoramic aerial view of the modern steel bridge of Teluk Balikpapan in East Kalimantan constructed by civil engineers under a crisp clear sky with architectural hairlines and blue sea.",
    fileName: "Jembatan Teluk Balikpapan.png",
    project: "JEMBATAN TELUK BALIKPAPAN",
    location: "Teluk Balikpapan, Kalimantan Timur",
  },
  {
    id: 3,
    title: "3. Green Airport Hub Sidoarjo",
    badge: "SCHEDULED",
    badgeActive: false,
    description: "Fasilitas Penerbangan Nol Emisi Karbon...",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCunk79B9QxObbQh4HjBVobUtae7rzIvaVMN772oDUDH9kgyp-ewZCsMxpTh08_11nhh_mgoV-i7X67LlrbRcV7AJulDr1mszJcE9Xu-kZ0MTpXKsxx7L5pVjGug0KBc91j2QSCEJ9z2pC2WJzj-dxPlj7s4ee4ZoH7k-5ojbUmvJzGpafshtepKYrCpXDeV_CLjq8GN8AQcYU0h3QUjDEnxD9sOWjO05IEyGpT-Fka7uWl3Y_lzObgNA",
    imageAlt:
      "High-tech green airport terminal building in Sidoarjo with curved solar-paneled structural roofing and expansive glass facade under bright architectural daylight.",
    fileName: "Green Airport Hub Sidoarjo.png",
    project: "GREEN AIRPORT HUB SIDOARJO",
    location: "Sidoarjo, Jawa Timur",
  },
];

export function getHeroById(id: number): HeroSlide | undefined {
  return initialSlides.find((slide) => slide.id === id);
}

export function shortTitle(title: string): string {
  return title.replace(/^\d+\.\s*/, "");
}
