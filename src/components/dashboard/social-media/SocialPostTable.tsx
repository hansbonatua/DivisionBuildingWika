"use client";

import Link from "next/link";
import Image from "next/image";
import type { SocialPost } from "@/lib/demo/social-media";
import SocialPostStatusBadge from "@/components/dashboard/social-media/SocialPostStatusBadge";

type SocialPostTableProps = {
  posts: SocialPost[];
  onDelete: (id: number) => void;
};

export default function SocialPostTable({ posts, onDelete }: SocialPostTableProps) {
  const rows = [...posts].sort((a, b) => a.order - b.order);
  return (
    <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-outline p-4">
        <div className="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-secondary"
          >
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
          <h2 className="text-lg font-bold text-primary">Daftar Postingan</h2>
        </div>
        <span className="text-xs font-semibold text-primary/70">{posts.length} post</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="bg-background text-[11px] uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 text-left font-bold">Post</th>
              <th className="px-4 py-3 text-left font-bold">Account</th>
              <th className="px-4 py-3 text-left font-bold">Type</th>
              <th className="px-4 py-3 text-left font-bold">Order</th>
              <th className="px-4 py-3 text-left font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((post) => (
              <tr key={post.id} className="border-t border-outline/40 hover:bg-background/50">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded border border-outline/40">
                      <Image src={post.image} alt="" fill sizes="64px" loading="lazy" className="object-cover" />
                    </div>
                    <p className="max-w-56 truncate font-medium text-primary/70" title={post.caption}>
                      {post.caption}
                    </p>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 font-bold text-primary">{post.account}</td>
                <td className="px-4 py-2.5 text-primary/70">{post.type}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-lg bg-background px-1.5 py-0.5 text-[10px] font-bold text-primary/70">
                    #{post.order}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <SocialPostStatusBadge status={post.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <Link
                    href={`/dashboard/social-media/${post.id}/edit`}
                    className="rounded px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(post.id)}
                    className="rounded px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
