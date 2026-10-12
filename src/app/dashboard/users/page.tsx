"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SafeUser } from "@/lib/users/service";
import UserTable from "@/components/dashboard/users/UserTable";

export default function UsersIndexPage() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadUsers(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = (await response.json()) as { data?: SafeUser[] };
      setUsers(Array.isArray(body.data) ? body.data : []);
    } catch {
      setError("Gagal memuat data user.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
    void loadCurrentUser();
  }, []);

  async function loadCurrentUser(): Promise<void> {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as { user?: { id?: string } };
      if (body.user?.id) {
        setCurrentUserId(body.user.id);
      }
    } catch {
      /* self-suspend UI hint is best-effort; server rules stay authoritative */
    }
  }

  async function handleStatusChange(id: string, nextStatus: "active" | "suspended"): Promise<void> {
    setActionError(null);
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (response.status === 403) {
      let message = "Perubahan status tidak diizinkan.";
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        if (body.error?.message) {
          message = body.error.message;
        }
      } catch {
        /* keep default message */
      }
      setActionError(message);
      throw new Error(message);
    }
    if (response.status === 404) {
      setActionError("User tidak ditemukan.");
      throw new Error("User tidak ditemukan.");
    }
    if (!response.ok) {
      setActionError("Gagal memperbarui status user.");
      throw new Error("Gagal memperbarui status user.");
    }
    const body = (await response.json()) as { data?: SafeUser };
    if (!body.data) {
      throw new Error("Empty response");
    }
    setUsers((prev) => prev.map((user) => (user.id === id ? body.data as SafeUser : user)));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase text-secondary">
              Access CMS
            </span>
            <span className="text-xs text-primary/50">•</span>
            <span className="text-xs text-primary/50">Satu form management</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">User Management</h1>
          <p className="max-w-3xl text-base text-primary/70">
            Tambah, edit, dan kelola user dalam satu halaman.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/dashboard/users/add"
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
            <span>Tambah User</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Memuat data user...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">{error}</p>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
          >
            Coba Lagi
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-primary/70">Belum ada data user.</p>
        </div>
      ) : (
        <>
          {actionError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
            >
              {actionError}
            </p>
          ) : null}
          <UserTable users={users} currentUserId={currentUserId} onStatusChange={handleStatusChange} />
        </>
      )}
    </div>
  );
}
