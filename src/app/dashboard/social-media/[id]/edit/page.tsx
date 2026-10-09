"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SocialPostForm, { type SocialPostFormValues } from "@/components/dashboard/social-media/SocialPostForm";
import SocialPostPreview from "@/components/dashboard/social-media/SocialPostPreview";
import SocialPostStatusBadge from "@/components/dashboard/social-media/SocialPostStatusBadge";
import type { SocialPostApiItem } from "@/components/dashboard/social-media/social-post-api.types";

export default function EditSocialPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<SocialPostApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveValues, setLiveValues] = useState<SocialPostFormValues | null>(null);
  const [livePreview, setLivePreview] = useState<string | null>(null);

  const handleValuesChange = useCallback((values: SocialPostFormValues, preview: string | null) => {
    setLiveValues(values);
    setLivePreview(preview);
  }, []);

  async function loadPost(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/social-posts/${id}`);
      if (response.status === 404) {
        setPost(null);
      } else if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      } else {
        const body = (await response.json()) as { data?: SocialPostApiItem };
        if (!body.data) {
          throw new Error("Empty response");
        }
        setPost(body.data);
      }
    } catch {
      setError("Gagal memuat data social media.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handlePatch(values: SocialPostFormValues): Promise<void> {
    const response = await fetch(`/api/social-posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: values.platform,
        account: values.account,
        caption: values.caption,
        url: values.url,
        type: values.type,
        imageUrl: values.imageUrl,
        imageAlt: values.imageAlt,
        status: values.status,
      }),
    });
    if (!response.ok) {
      let message = "Gagal menyimpan perubahan social media.";
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        if (body.error?.message) {
          message = body.error.message;
        }
      } catch {
        /* keep default message */
      }
      throw new Error(message);
    }
    router.push("/dashboard/social-media");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Post</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data social media...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Post</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error}</p>
          <button
            type="button"
            onClick={() => void loadPost()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Post</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">Post tidak ditemukan.</p>
          <p className="mt-1 text-xs text-primary/70">ID &quot;{id}&quot; tidak ada pada database.</p>
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

  const previewImage = livePreview ?? liveValues?.imageUrl ?? post.imageUrl;
  const preview = liveValues ?? {
    platform: post.platform,
    account: post.account,
    caption: post.caption,
    url: post.url,
    type: post.type,
    imageUrl: post.imageUrl,
    imageAlt: post.imageAlt,
    status: post.status,
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
          {post.account} — ID #{post._id} (order #{post.sortOrder})
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-outline p-4">
            <h2 className="text-lg font-bold text-primary">Edit Instagram Post #{post.sortOrder}</h2>
          </div>
          <SocialPostForm
            mode="edit"
            initialData={{
              platform: post.platform,
              account: post.account,
              caption: post.caption,
              url: post.url,
              type: post.type,
              imageUrl: post.imageUrl,
              imageAlt: post.imageAlt,
              status: post.status,
            }}
            submitLabel="Simpan Postingan"
            onSubmit={handlePatch}
            onValuesChange={handleValuesChange}
          />
        </div>
        <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm lg:sticky lg:top-4">
          <div className="flex items-center gap-2 border-b border-outline p-4">
            <h2 className="text-lg font-bold text-primary">Preview Post</h2>
          </div>
          <SocialPostPreview
            image={previewImage}
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
