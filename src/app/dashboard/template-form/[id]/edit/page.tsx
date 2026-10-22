import Link from "next/link";
import TemplateFormEditor from "@/components/dashboard/template-form/TemplateFormEditor";

export default async function EditTemplateFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <nav
          className="mb-2 flex items-center gap-2 text-[11px] text-primary/50"
          aria-label="Breadcrumb"
        >
          <Link
            href="/dashboard/template-form"
            className="transition-colors hover:text-secondary"
          >
            Template &amp; Form
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
          <span className="font-bold text-secondary">Edit Template</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Edit Template &amp; Form
        </h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Perbarui tautan template atau form yang digunakan pada WIBEX Building
          Division.
        </p>
      </div>

      <TemplateFormEditor mode="edit" templateFormId={id} />
    </div>
  );
}
