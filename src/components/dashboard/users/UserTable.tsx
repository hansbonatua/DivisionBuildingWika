"use client";

import Link from "next/link";
import type { CmsUser } from "@/lib/demo/users";
import UserAvatar from "@/components/dashboard/users/UserAvatar";
import UserRoleBadge from "@/components/dashboard/users/UserRoleBadge";

type UserTableProps = {
  users: CmsUser[];
  onDelete: (id: number) => void;
};

export default function UserTable({ users, onDelete }: UserTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-outline p-4">
        <div className="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-primary"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h2 className="text-lg font-bold text-primary">User List</h2>
        </div>
        <span className="text-xs font-semibold text-primary/70">{users.length} user</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-xs">
          <thead>
            <tr className="bg-background text-[11px] uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 text-left font-bold">Foto</th>
              <th className="px-4 py-3 text-left font-bold">Nama</th>
              <th className="px-4 py-3 text-left font-bold">NIP</th>
              <th className="px-4 py-3 text-left font-bold">Role</th>
              <th className="px-4 py-3 text-left font-bold">Jabatan</th>
              <th className="px-4 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-outline/40 hover:bg-background/50">
                <td className="px-4 py-2.5">
                  <UserAvatar user={user} />
                </td>
                <td className="px-4 py-2.5 font-bold text-primary">
                  {user.name}
                  <div className="text-[11px] font-medium text-slate-400">{user.phone}</div>
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-primary/70">{user.nip}</td>
                <td className="px-4 py-2.5">
                  <UserRoleBadge role={user.role} />
                </td>
                <td className="px-4 py-2.5 text-primary/70">{user.position}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <Link
                    href={`/dashboard/users/${user.id}/edit`}
                    className="rounded px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(user.id)}
                    className="rounded px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
