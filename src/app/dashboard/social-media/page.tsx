"use client";

import { useState } from "react";
import Link from "next/link";
import { initialPosts, instagramAccounts } from "@/lib/demo/social-media";
import SocialAccountSummary from "@/components/dashboard/social-media/SocialAccountSummary";
import SocialPostTable from "@/components/dashboard/social-media/SocialPostTable";

export default function SocialMediaIndexPage() {
  const [posts, setPosts] = useState(initialPosts);

  function handleDelete(id: number): void {
    setPosts((prev) => prev.filter((post) => post.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Instagram CMS
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Official Embed Source</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Instagram Management</h1>
          <p className="max-w-3xl text-base text-primary/70">
            Manage Instagram content displayed on WIBEX website.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/dashboard/social-media/add"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-150 hover:bg-secondary"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            <span>Add Instagram Post</span>
          </Link>
        </div>
      </div>

      <SocialAccountSummary accounts={instagramAccounts} />

      <SocialPostTable posts={posts} onDelete={handleDelete} />
    </div>
  );
}
