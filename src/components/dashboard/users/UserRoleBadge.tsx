export default function UserRoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-block rounded border border-outline/60 bg-background px-2 py-0.5 text-[11px] font-bold text-primary/70">
      {role}
    </span>
  );
}
