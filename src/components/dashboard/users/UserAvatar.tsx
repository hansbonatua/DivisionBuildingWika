import Image from "next/image";

type AvatarUser = {
  name: string;
  photo?: string | null;
  photoUrl?: string | null;
};

function displayInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function UserAvatar({ user }: { user: AvatarUser }) {
  const photo = user.photoUrl ?? user.photo ?? null;
  if (photo && (photo.startsWith("/") || photo.startsWith("http://") || photo.startsWith("https://"))) {
    if (photo.startsWith("/")) {
      return (
        <span className="relative block h-10 w-10 overflow-hidden rounded-full border border-outline/40">
          <Image src={photo} alt="" fill sizes="40px" className="object-cover" />
        </span>
      );
    }
    return (
      // Remote URLs bypass next/image so no remotePatterns config is needed.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt="" className="h-10 w-10 rounded-full border border-outline/40 object-cover" />
    );
  }
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt="" className="h-10 w-10 rounded-full border border-outline/40 object-cover" />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary">
      {displayInitials(user.name) || "-"}
    </div>
  );
}
