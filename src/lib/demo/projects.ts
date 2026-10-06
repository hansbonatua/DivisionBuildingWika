export type ProjectItem = {
  id: number;
  title: string;
  category: string;
  location: string;
  progress: number;
  status: "Active" | "Draft";
  image: string | null;
  imageAlt: string;
  reorderImage?: string;
  mediaImage?: string;
  icon: "building" | "hospital" | "plane" | null;
  formName: string;
  formLocation: string;
  description: string;
  fileName: string | null;
};

export const CATEGORY_OPTIONS: string[] = [
  "Gedung Pemerintah / Landmark IKN",
  "Komersial & High-rise",
  "Fasilitas Transportasi & Logistik",
  "Infrastruktur Hijau Terpadu",
];

const IMG_ISTANA_ROW =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD6O7YM16ouNVV8-WiyGOULxhSrzFsiAEwpb9W3Aq5zdbjLpkpm0vQJxHDhoRYDKY8pwP";
const IMG_ISTANA_REORDER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD6O7YM16ouNVV8-WiyGOULxhSrzFsiAEwpb9W3Aq5zdbjLpkpm0vQJxHDhoRYDKY8pwPXkPePWa-DEyXJ3H7Z0VGvPm1iy-p-YDS2fP9BSsWTep7Jp1Cxoi8sFdRVZARtEZaFnZghgfYwqtLzcICnDVSCaBfS1EY0cP_TO5XPavyImot9DQspr3vs22RpW4-W-x20cF--bouzCmhE64UR4wDqBg9HstKUZCVQW_FPgMYmN8hRcoEoP2A";
const IMG_ISTANA_MEDIA =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAbyrNWCXEvuQ9FCNHIl0Km3P7TgSM3OKk56iEEYYvcpmEwpjmUlYM8RDHRDCzJ4KcQ97XKWhi7hImelAHiEj_2Tc0-ycJlRn3mZXMa2xveMMuMpBHgmlgumBRbtktrGox0GPb92g61rxI97pjuy2PFJ6gKPM2NffidZGBeaNUPfYjFB7_PafJMtpnWaZefljDNrl8VM5_TBMIto1I6v-o0j40yK8EPW6auomiFVPi2JZg_ZQJbBVdshA";

export const initialProjects: ProjectItem[] = [
  {
    id: 1,
    title: "Istana Negara IKN",
    category: "Gedung Pemerintah",
    location: "IKN Nusantara",
    progress: 100,
    status: "Active",
    image: IMG_ISTANA_ROW,
    imageAlt: "Istana Negara IKN",
    reorderImage: IMG_ISTANA_REORDER,
    mediaImage: IMG_ISTANA_MEDIA,
    icon: null,
    formName: "Gedung Kantor Presiden & Istana Negara IKN",
    formLocation: "KIPP IKN Nusantara, Penajam Paser Utara, Kalimantan Timur",
    description:
      "Pembangunan Kompleks Istana Kepresidenan di Kawasan Inti Pusat Pemerintahan (KIPP) IKN dengan implementasi Structural BIM Level 500, teknologi modular ramah lingkungan, serta sertifikasi Bangunan Gedung Hijau (BGH) Platinum tingkat nasional.",
    fileName: "istana_negara_ikn_façade_monumental.webp (3.8 MB)",
  },
  {
    id: 2,
    title: "Menara BUMN Landmark Tower",
    category: "Komersial High-Rise",
    location: "Jakarta",
    progress: 88,
    status: "Active",
    image: null,
    imageAlt: "",
    icon: "building",
    formName: "Menara BUMN Landmark Tower",
    formLocation: "Jakarta",
    description: "",
    fileName: null,
  },
  {
    id: 3,
    title: "RS International Bali Sanur",
    category: "Fasilitas Kesehatan",
    location: "Bali",
    progress: 95,
    status: "Active",
    image: null,
    imageAlt: "",
    icon: "hospital",
    formName: "RS International Bali Sanur",
    formLocation: "Bali",
    description: "",
    fileName: null,
  },
  {
    id: 4,
    title: "Terminal 3 Ultimate CGK",
    category: "Infrastruktur Bandara",
    location: "Jakarta",
    progress: 100,
    status: "Draft",
    image: null,
    imageAlt: "",
    icon: "plane",
    formName: "Terminal 3 Ultimate CGK",
    formLocation: "Jakarta",
    description: "",
    fileName: null,
  },
];

export function getProjectById(id: number): ProjectItem | undefined {
  return initialProjects.find((project) => project.id === id);
}
