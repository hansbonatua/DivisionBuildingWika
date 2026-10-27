"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProgramKerjaForm, {
  type ProgramKerjaFormValues,
  type ProgramKerjaGroupOption,
  type ProgramKerjaPicOption,
} from "@/components/dashboard/program-kerja/ProgramKerjaForm";

type GroupsResponseItem = {
  id: string;
  name: string;
};

// Narrow PIC option shape from /api/program-kerja/pic-options.
type PicOptionItem = {
  id: string;
  name: string;
};

export default function AddProgramKerjaPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<ProgramKerjaGroupOption[]>([]);
  const [picOptions, setPicOptions] = useState<ProgramKerjaPicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const [groupsResponse, picResponse] = await Promise.all([
          fetch("/api/program-kerja/groups"),
          fetch("/api/program-kerja/pic-options"),
        ]);
        if (
          groupsResponse.status === 401 ||
          groupsResponse.status === 403 ||
          picResponse.status === 401 ||
          picResponse.status === 403
        ) {
          throw new Error("UNAUTHORIZED");
        }
        if (!groupsResponse.ok || !picResponse.ok) {
          throw new Error("LOAD_FAILED");
        }
        const groupsBody = (await groupsResponse.json()) as { data?: GroupsResponseItem[] };
        const picBody = (await picResponse.json()) as { data?: PicOptionItem[] };
        setGroups(
          (Array.isArray(groupsBody.data) ? groupsBody.data : []).map((group) => ({
            id: group.id,
            name: group.name,
          })),
        );
        // Head Office eligibility is enforced server-side by the endpoint.
        setPicOptions(
          (Array.isArray(picBody.data) ? picBody.data : []).map((pic) => ({
            id: pic.id,
            name: pic.name,
          })),
        );
      } catch (err) {
        setError(
          err instanceof Error && err.message === "UNAUTHORIZED"
            ? "UNAUTHORIZED"
            : "Gagal memuat data pendukung form.",
        );
      } finally {
        setLoading(false);
      }
    }
    void loadOptions();
  }, []);

  async function handleCreate(values: ProgramKerjaFormValues): Promise<void> {
    const base = {
      groupId: values.groupId,
      name: values.name,
      description: values.description,
      startMonth: values.startMonth,
      endMonth: values.endMonth,
      parameter: values.parameter,
      unit: values.unit,
      picIds: values.picIds,
      monitor: values.monitor,
    };
    const body =
      values.unit === "Persentase"
        ? { ...base, year: values.year, raPercentage: values.raPercentage }
        : { ...base, year: values.year, monthlyRa: values.monthlyRa };
    const response = await fetch("/api/program-kerja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 409) {
      throw new Error("Data bertentangan dengan aturan bisnis. Periksa kembali isian.");
    }
    if (response.status === 400) {
      let message = "Validasi gagal. Periksa kembali isian form.";
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
    if (response.status === 401 || response.status === 403) {
      throw new Error("Anda tidak memiliki akses untuk menambah Program Kerja.");
    }
    if (!response.ok) {
      throw new Error("Gagal menambahkan Program Kerja.");
    }
    router.replace("/dashboard/program-kerja/manage");
    router.refresh();
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
          <span className="font-bold text-secondary">Tambah Program</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Tambah Program Kerja</h1>
        <p className="mt-1 max-w-3xl text-base text-primary/70">
          Buat Program Kerja baru untuk tahun berjalan.
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data pendukung form...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">
            {error === "UNAUTHORIZED"
              ? "Anda tidak memiliki akses ke halaman ini."
              : error}
          </p>
          <Link
            href="/dashboard/program-kerja/manage"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Kembali ke Kelola Program Kerja
          </Link>
        </div>
      ) : (
        <ProgramKerjaForm
          mode="add"
          initial={{
            groupId: "",
            name: "",
            description: "",
            startMonth: 1,
            endMonth: 12,
            parameter: "",
            unit: "Persentase",
            monitor: "",
            raPercentage: 100,
            monthlyRa: Array.from({ length: 12 }, () => 0),
            picIds: [],
          }}
          groups={groups}
          picOptions={picOptions}
          submitLabel="Simpan Program"
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
