import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ENGINEERING_DATABASE_CATEGORY_LABELS,
  engineeringDatabaseCategoryFromSlug,
} from "@/lib/engineering-database/access";
import EngineeringDatabaseEditor from "@/components/dashboard/engineering-database/EngineeringDatabaseEditor";

export default async function NewEngineeringDatabaseEntryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = engineeringDatabaseCategoryFromSlug(slug);
  if (!category) {
    notFound();
  }
  const categoryLabel = ENGINEERING_DATABASE_CATEGORY_LABELS[category];

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <nav
          className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-primary/50"
          aria-label="Breadcrumb"
        >
          <Link
            href="/dashboard/engineering-database/summary"
            className="transition-colors hover:text-secondary"
          >
            Engineering Databases
          </Link>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <Link
            href={`/dashboard/engineering-database/${slug}`}
            className="transition-colors hover:text-secondary"
          >
            {categoryLabel}
          </Link>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-bold text-secondary">Tambah</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Tambah {categoryLabel}
        </h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Tambahkan dokumen {categoryLabel} untuk salah satu Master Project.
        </p>
      </div>

      <EngineeringDatabaseEditor mode="create" category={category} />
    </div>
  );
}
