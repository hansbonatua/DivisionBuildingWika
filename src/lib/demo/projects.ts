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
