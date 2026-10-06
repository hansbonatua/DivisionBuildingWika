export type SocialAccount = {
  username: string;
  description: string;
};

export type SocialPost = {
  id: number;
  image: string;
  account: string;
  caption: string;
  url: string;
  type: string;
  status: "Published" | "Draft" | "Hidden";
  order: number;
};

export const TYPE_OPTIONS = ["Image", "Video", "Reels"];
export const STATUS_OPTIONS: SocialPost["status"][] = ["Draft", "Published", "Hidden"];

export const instagramAccounts: SocialAccount[] = [
  { username: "@wika.building", description: "Project Showcase & Engineering Field Updates" },
  { username: "@ptwijayakarya", description: "Corporate Governance & Stakeholder Relations" },
];

export const initialPosts: SocialPost[] = [
  {
    id: 1,
    image: "/asset/hero/8.jpg",
    account: "@wika.building",
    caption: "WIKA Building project update...",
    url: "https://www.instagram.com/p/Ddsj3YCkb7r/",
    type: "Image",
    status: "Published",
    order: 1,
  },
  {
    id: 2,
    image: "/asset/hero/11.jpg",
    account: "@wika.building",
    caption: "Structural milestone sejumlah lantai tercapai...",
    url: "https://www.instagram.com/p/DdoAuNlKuS6/",
    type: "Reels",
    status: "Published",
    order: 2,
  },
  {
    id: 3,
    image: "/asset/hero/12.jpg",
    account: "@ptwijayakarya",
    caption: "Corporate governance update...",
    url: "https://www.instagram.com/p/DcNyStaEZjr/",
    type: "Image",
    status: "Draft",
    order: 3,
  },
];

export function getSocialPostById(id: number): SocialPost | undefined {
  return initialPosts.find((post) => post.id === id);
}

export function getAccountPostCount(username: string): number {
  return initialPosts.filter((post) => post.account === username).length;
}
