"use client";

import { useEffect, useState, useRef } from "react";
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

interface Resource {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploader_id: string;
  uploader_name: string | null;
  created_at: string;
  updated_at: string;
}

type Tab = "users" | "resources";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      router.push("/dashboard");
      return;
    }
    loadData();
  }, [user, loading, router, tab]);

  async function loadData() {
    setBusy(true);
    try {
      if (tab === "users") {
        const data = await api.get<{ users: User[] }>("/admin/users");
        setUsers(data.users);
      } else {
        const data = await api.get<{ resources: Resource[] }>("/resources");
        setResources(data.resources);
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  }

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

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadTitle.trim() || !fileRef.current?.files?.[0]) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("title", uploadTitle.trim());
      form.append("description", uploadDesc.trim());
      form.append("file", fileRef.current.files[0]);
      await api.post("/resources", form);
      setUploadTitle("");
      setUploadDesc("");
      if (fileRef.current) fileRef.current.value = "";
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveEdit(resourceId: string) {
    try {
      await api.patch(`/resources/${resourceId}`, {
        title: editTitle,
        description: editDesc,
      });
      setEditing(null);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function handleDelete(resourceId: string) {
    if (!confirm("Delete this resource?")) return;
    try {
      await api.delete(`/resources/${resourceId}`);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function startEdit(r: Resource) {
    setEditing(r.id);
    setEditTitle(r.title);
    setEditDesc(r.description || "");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-400">Loading...</p>
      </main>
    );
  }

  if (!user) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "users", label: "Users" },
    { key: "resources", label: "Resources" },
  ];

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-3xl font-bold">Admin Panel</h1>

      <div className="mb-6 flex gap-1 rounded-lg border border-neutral-800 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setEditing(null); }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {busy ? (
        <p className="text-center text-neutral-500">Loading...</p>
      ) : tab === "users" ? (
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
      ) : (
        <div className="space-y-6">
          <form onSubmit={handleUpload} className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Upload Resource
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white"
              />
              <input
                ref={fileRef}
                type="file"
                required
                className="text-sm text-neutral-400 file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:text-neutral-200"
              />
              <button
                type="submit"
                disabled={uploading}
                className="self-start rounded-lg bg-white px-6 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {resources.length === 0 ? (
              <p className="text-center text-sm text-neutral-500">No resources yet.</p>
            ) : (
              resources.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5"
                >
                  {editing === r.id ? (
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white"
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(r.id)}
                          className="rounded bg-white px-4 py-1.5 text-sm font-medium text-black transition hover:bg-neutral-200"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="rounded border border-neutral-700 px-4 py-1.5 text-sm transition hover:bg-neutral-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{r.title}</p>
                        {r.description && (
                          <p className="mt-1 text-sm text-neutral-400">{r.description}</p>
                        )}
                        <p className="mt-2 text-xs text-neutral-500">
                          {r.file_type?.toUpperCase() || "Unknown"}
                          {r.file_size ? ` · ${(r.file_size / 1024).toFixed(1)} KB` : ""}
                          {r.uploader_name ? ` · by ${r.uploader_name}` : ""}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0 gap-2">
                        <a
                          href={`/uploads/${r.file_path}`}
                          target="_blank"
                          className="rounded border border-neutral-700 px-3 py-1.5 text-xs transition hover:bg-neutral-800"
                        >
                          Download
                        </a>
                        <button
                          onClick={() => startEdit(r)}
                          className="rounded border border-neutral-700 px-3 py-1.5 text-xs transition hover:bg-neutral-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="rounded border border-red-900 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-950"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
}
