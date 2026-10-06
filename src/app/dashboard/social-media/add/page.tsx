"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import SocialPostForm, { type SocialPostFormValues } from "@/components/dashboard/social-media/SocialPostForm";

export default function AddSocialPostPage() {
  const router = useRouter();

  async function handleCreate(values: SocialPostFormValues): Promise<void> {
    const response = await fetch("/api/social-posts", {
      method: "POST",
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
      let message = "Gagal menambahkan post social media.";
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
          <span className="font-bold text-secondary">Tambah Post</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Tambah Post</h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Buat postingan Instagram baru. Status awal: Draft.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-outline p-4">
          <h2 className="text-lg font-bold text-primary">Add Instagram Post</h2>
        </div>
        <SocialPostForm mode="add" submitLabel="Simpan Postingan" onSubmit={handleCreate} />
      </div>
    </div>
  );
}
