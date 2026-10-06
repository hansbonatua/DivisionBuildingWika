import { getAccountPostCount, type SocialAccount } from "@/lib/demo/social-media";

export default function SocialAccountSummary({
  accounts,
  counts,
}: {
  accounts: SocialAccount[];
  counts?: Record<string, number>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {accounts.map((account) => (
        <div
          key={account.username}
          className="flex items-center gap-3 rounded-lg border border-outline bg-surface p-4 shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-sm font-bold text-secondary">
            {account.username.charAt(1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-primary">{account.username}</div>
            <div className="truncate text-[11px] text-slate-500">{account.description}</div>
          </div>
          <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-[11px] font-bold text-primary/70">
            {counts?.[account.username] ?? getAccountPostCount(account.username)} post
          </span>
        </div>
      ))}
    </div>
  );
}
