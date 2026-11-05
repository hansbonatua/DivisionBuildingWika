import {
  canManageKnowledgeManagement,
} from "@/lib/knowledge-management/access";
import {
  KNOWLEDGE_TYPE_LABELS,
  type KnowledgeType,
} from "@/lib/knowledge-management/schema";
import KnowledgeTable from "@/components/dashboard/knowledge-management/KnowledgeTable";

export default function KnowledgeManagementPage({
  knowledgeType,
  currentUserRole,
}: {
  knowledgeType: KnowledgeType;
  currentUserRole: string;
}) {
  const label = KNOWLEDGE_TYPE_LABELS[knowledgeType];
  const canManage = canManageKnowledgeManagement(currentUserRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Core Enterprise
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Knowledge Management</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">{label}</h1>
          <p className="mt-1 max-w-3xl text-base text-primary/70">
            {canManage
              ? `Kelola catatan ${label} berdasarkan Master Project, termasuk PIC dan evidence.`
              : `Lihat catatan ${label} berdasarkan Master Project, termasuk PIC dan evidence.`}
          </p>
        </div>
      </div>

      <KnowledgeTable
        knowledgeType={knowledgeType}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
