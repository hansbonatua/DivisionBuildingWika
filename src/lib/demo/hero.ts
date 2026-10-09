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

export function shortTitle(title: string): string {
  return title.replace(/^\d+\.\s*/, "");
}
