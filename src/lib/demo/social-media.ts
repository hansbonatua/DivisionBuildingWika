export type SocialAccount = {
  username: string;
  description: string;
};

export const TYPE_OPTIONS = ["Image", "Video", "Reels"];
export const STATUS_OPTIONS: ("Published" | "Draft" | "Hidden")[] = ["Draft", "Published", "Hidden"];

export const instagramAccounts: SocialAccount[] = [
  { username: "@wika.building", description: "Project Showcase & Engineering Field Updates" },
  { username: "@ptwijayakarya", description: "Corporate Governance & Stakeholder Relations" },
];

export function getAccountPostCount(_username: string): number {
  return 0;
}
