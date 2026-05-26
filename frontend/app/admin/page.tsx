"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      router.push("/dashboard");
      return;
    }
    api.get<{ users: User[] }>("/admin/users")
      .then((data) => setUsers(data.users))
      .catch(() => router.push("/dashboard"))
      .finally(() => setBusy(false));
  }, [user, loading, router]);

  async function changeRole(targetId: string, newRole: string) {
    setBusy(true);
    try {
      await api.patch(`/admin/users/${targetId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, role: newRole } : u)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setBusy(false);
    }
  }

  if (loading || busy) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-400">Loading...</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-8 text-3xl font-bold">Admin Panel</h1>
      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-neutral-900/50">
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.display_name}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs font-medium capitalize">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.role === "owner" && u.role !== "owner" ? (
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs outline-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="text-xs text-neutral-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
