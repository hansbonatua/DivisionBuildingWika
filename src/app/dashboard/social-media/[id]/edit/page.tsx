"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSocialPostById } from "@/lib/demo/social-media";
import SocialPostForm, { type SocialPostFormValues } from "@/components/dashboard/social-media/SocialPostForm";
import SocialPostPreview from "@/components/dashboard/social-media/SocialPostPreview";
import SocialPostStatusBadge from "@/components/dashboard/social-media/SocialPostStatusBadge";

export default function EditSocialPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const post = getSocialPostById(Number(id));
  const [liveValues, setLiveValues] = useState<SocialPostFormValues | null>(null);

  if (!post) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Post</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">Post tidak ditemukan.</p>
          <p className="mt-1 text-xs text-primary/70">ID &quot;{id}&quot; tidak ada pada data demo.</p>
          <Link
            href="/dashboard/social-media"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Kembali ke Media Sosial
          </Link>
        </div>
      </div>
    );
  }

  const preview = liveValues ?? {
    image: post.image,
    account: post.account,
    caption: post.caption,
    url: post.url,
    type: post.type,
    status: post.status,
    order: post.order,
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <nav className="mb-2 flex items-center gap-2 text-[11px] text-primary/50" aria-label="Breadcrumb">
          <Link href="/dashboard/social-media" className="transition-colors hover:text-secondary">
            Media Sosial
          </Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-bold text-secondary">Edit Post</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Post</h1>
          <SocialPostStatusBadge status={post.status} />
        </div>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          {post.account} — ID #{post.id}. Demo: perubahan tidak disimpan permanen.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-outline p-4">
            <h2 className="text-lg font-bold text-primary">Edit Instagram Post #{post.id}</h2>
          </div>
          <SocialPostForm
            mode="edit"
            initialData={post}
            submitLabel="Simpan Postingan"
            onSubmit={() => router.push("/dashboard/social-media")}
            onValuesChange={setLiveValues}
          />
        </div>
        <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm lg:sticky lg:top-4">
          <div className="flex items-center gap-2 border-b border-outline p-4">
            <h2 className="text-lg font-bold text-primary">Preview Post</h2>
          </div>
          <SocialPostPreview
            image={preview.image}
            account={preview.account}
            caption={preview.caption}
            url={preview.url}
            type={preview.type}
            status={preview.status}
          />
        </div>
      </div>
    </div>
  );
}
