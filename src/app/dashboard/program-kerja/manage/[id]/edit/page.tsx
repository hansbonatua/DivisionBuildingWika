"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProgramKerjaForm, {
  type ProgramKerjaFormInitial,
  type ProgramKerjaFormValues,
  type ProgramKerjaGroupOption,
  type ProgramKerjaPicOption,
} from "@/components/dashboard/program-kerja/ProgramKerjaForm";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";

type DetailResponse = {
  program: {
    id: string;
    groupId: string;
    year: number;
    name: string;
    description: string;
    startMonth: number;
    endMonth: number;
    parameter: string;
    unit: "Jumlah" | "Persentase";
    monitor: string | null;
  };
  monthly: Array<{ month: number; raValue: number; riValue: number | null }>;
  picUserIds: string[];
};

type GroupsResponseItem = {
  id: string;
  name: string;
};

type UsersListItem = {
  id: string;
  name: string;
  role: string;
};

export default function EditProgramKerjaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [initial, setInitial] = useState<ProgramKerjaFormInitial | null>(null);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [riMonths, setRiMonths] = useState<number[]>([]);
  const [groups, setGroups] = useState<ProgramKerjaGroupOption[]>([]);
  const [picOptions, setPicOptions] = useState<ProgramKerjaPicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadDetail(): Promise<void> {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const [detailResponse, usersResponse, groupsResponse] = await Promise.all([
          fetch(`/api/program-kerja/${id}`),
          fetch("/api/users"),
          fetch("/api/program-kerja/groups"),
        ]);
        if (
          detailResponse.status === 401 ||
          detailResponse.status === 403 ||
          usersResponse.status === 401 ||
          usersResponse.status === 403
        ) {
          throw new Error("UNAUTHORIZED");
        }
        if (detailResponse.status === 404) {
          setNotFound(true);
          return;
        }
        if (!detailResponse.ok || !usersResponse.ok || !groupsResponse.ok) {
          throw new Error("LOAD_FAILED");
        }
        const detailBody = (await detailResponse.json()) as { data?: DetailResponse };
        const usersBody = (await usersResponse.json()) as { data?: UsersListItem[] };
        const groupsBody = (await groupsResponse.json()) as { data?: GroupsResponseItem[] };
        if (!detailBody.data) {
          throw new Error("LOAD_FAILED");
        }
        const detail = detailBody.data;
        const monthlyRa = Array.from({ length: 12 }, (_, index) => {
          const row = detail.monthly.find((item) => item.month === index + 1);
          return row ? row.raValue : 0;
        });
        setInitial({
          groupId: detail.program.groupId,
          name: detail.program.name,
          description: detail.program.description,
          startMonth: detail.program.startMonth,
          endMonth: detail.program.endMonth,
          parameter: detail.program.parameter,
          unit: detail.program.unit,
          monitor: detail.program.monitor ?? "",
          raPercentage: detail.program.unit === "Persentase" ? (monthlyRa[0] ?? 100) : 100,
          monthlyRa,
          picIds: detail.picUserIds,
        });
        setYear(detail.program.year);
        setRiMonths(
          detail.monthly.filter((item) => item.riValue !== null).map((item) => item.month),
        );
        setGroups(
          (Array.isArray(groupsBody.data) ? groupsBody.data : []).map((group) => ({
            id: group.id,
            name: group.name,
          })),
        );
        setPicOptions(
          (Array.isArray(usersBody.data) ? usersBody.data : [])
            .filter((user) => user.role === HEAD_OFFICE_ROLE)
            .map((user) => ({ id: user.id, name: user.name }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (err) {
        setError(
          err instanceof Error && err.message === "UNAUTHORIZED"
            ? "UNAUTHORIZED"
            : "Gagal memuat data Program Kerja.",
        );
      } finally {
        setLoading(false);
      }
    }
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handlePatch(values: ProgramKerjaFormValues): Promise<void> {
    const body =
      values.unit === "Persentase"
        ? {
            groupId: values.groupId,
            name: values.name,
            description: values.description,
            startMonth: values.startMonth,
            endMonth: values.endMonth,
            parameter: values.parameter,
            unit: values.unit,
            raPercentage: values.raPercentage,
            picIds: values.picIds,
            monitor: values.monitor,
          }
        : {
            groupId: values.groupId,
            name: values.name,
            description: values.description,
            startMonth: values.startMonth,
            endMonth: values.endMonth,
            parameter: values.parameter,
            unit: values.unit,
            monthlyRa: values.monthlyRa,
            picIds: values.picIds,
            monitor: values.monitor,
          };
    const response = await fetch(`/api/program-kerja/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 404) {
      throw new Error("Program Kerja tidak ditemukan.");
    }
    if (response.status === 409) {
      let message = "Perubahan bertentangan dengan aturan bisnis.";
      try {
        const errorBody = (await response.json()) as { error?: { message?: string } };
        if (errorBody.error?.message) {
          message = errorBody.error.message;
        }
      } catch {
        /* keep default message */
      }
      throw new Error(message);
    }
    if (response.status === 400) {
      throw new Error("Validasi gagal. Periksa kembali isian form.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Anda tidak memiliki akses untuk mengubah Program Kerja.");
    }
    if (!response.ok) {
      throw new Error("Gagal menyimpan perubahan Program Kerja.");
    }
    router.replace("/dashboard/program-kerja/manage");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Program Kerja</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data Program Kerja...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Program Kerja</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">Program Kerja tidak ditemukan.</p>
          <p className="mt-1 text-xs text-primary/70">ID &quot;{id}&quot; tidak ada pada database.</p>
          <Link
            href="/dashboard/program-kerja/manage"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Kembali ke Kelola Program Kerja
          </Link>
        </div>
      </div>
    );
  }

  if (error || !initial) {
    return (
      <div className="space-y-6">
        <div className="border-b border-outline pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Program Kerja</h1>
        </div>
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">
            {error === "UNAUTHORIZED" ? "Anda tidak memiliki akses ke halaman ini." : (error ?? "Program Kerja tidak ditemukan.")}
          </p>
          <Link
            href="/dashboard/program-kerja/manage"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Kembali ke Kelola Program Kerja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-outline pb-4">
        <nav className="mb-2 flex items-center gap-2 text-[11px] text-primary/50" aria-label="Breadcrumb">
          <Link href="/dashboard/program-kerja/manage" className="transition-colors hover:text-secondary">
            Kelola Program Kerja
          </Link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-bold text-secondary">Edit Program</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Edit Program Kerja</h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Perbarui master Program Kerja. Tahun terkunci setelah dibuat.
        </p>
      </div>

      <ProgramKerjaForm
        mode="edit"
        initial={initial}
        groups={groups}
        picOptions={picOptions}
        year={year}
        riMonths={riMonths}
        submitLabel="Simpan Perubahan"
        onSubmit={handlePatch}
      />
    </div>
  );
}
