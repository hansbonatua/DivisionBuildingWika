import { userInitials, type CmsUser } from "@/lib/demo/users";

export default function UserAvatar({ user }: { user: Pick<CmsUser, "photo" | "name"> }) {
  if (user.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.photo} alt="" className="h-10 w-10 rounded-full border border-outline/40 object-cover" />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary">
      {userInitials(user.name)}
    </div>
  );
}
