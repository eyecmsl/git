"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { formatFileSize, getFileTypeLabel, getFileTypeColor } from "@/lib/utils";
import { supportsCompressionStream, compressFile, compressionRatio } from "@/lib/compress";

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const compressionSupported = supportsCompressionStream();

interface User {
  id: string; email: string; display_name: string; role: string; created_at: string;
}

interface Resource {
  id: string; title: string; description: string | null; category: string | null;
  file_path: string; file_type: string | null; file_size: number | null;
  original_size: number | null; is_compressed: boolean;
  is_password_protected: boolean; requires_membership: boolean;
  download_count: number; view_count: number;
  uploader_id: string; uploader_name: string | null;
  created_at: string; updated_at: string;
}

interface Membership {
  id: string; user_id: string; user_name: string | null; user_email: string | null;
  membership_type: string; is_active: boolean; created_at: string; expires_at: string | null;
}

type Tab = "users" | "resources" | "memberships";

function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "Delete", danger = true }: {
  message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-950 p-6 shadow-xl">
        <p className="text-sm text-neutral-300">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-lg border border-neutral-700 px-4 py-2 text-sm transition hover:bg-neutral-800">Cancel</button>
          <button onClick={onConfirm} className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${danger ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function FileTypeBadge({ type }: { type: string | null }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium uppercase leading-tight ${getFileTypeColor(type)}`}>
      {getFileTypeLabel(type)}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRequiresMembership, setEditRequiresMembership] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadPassword, setUploadPassword] = useState("");
  const [uploadCompress, setUploadCompress] = useState(false);
  const [uploadRequiresMembership, setUploadRequiresMembership] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || (user.role !== "admin" && user.role !== "owner")) { router.push("/dashboard"); return; }
    loadData();
  }, [user, loading, router, tab]);

  async function loadData() {
    setBusy(true);
    try {
      if (tab === "users") {
        const data = await api.get<{ users: User[] }>("/admin/users");
        setUsers(data.users);
      } else if (tab === "memberships") {
        const data = await api.get<{ memberships: Membership[] }>("/memberships");
        setMemberships(data.memberships);
      } else {
        const data = await api.get<{ resources: Resource[] }>("/resources");
        setResources(data.resources);
      }
    } catch { router.push("/dashboard"); }
    finally { setBusy(false); }
  }

  async function changeRole(targetId: string, newRole: string) {
    try {
      await api.patch(`/admin/users/${targetId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => u.id === targetId ? { ...u, role: newRole } : u));
      addToast("Role updated", "success");
    } catch (e) { addToast(e instanceof Error ? e.message : "Failed to update role", "error"); }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadTitle.trim() || !fileRef.current?.files?.[0]) return;
    const file = fileRef.current.files[0];
    if (file.size > MAX_UPLOAD_SIZE) { setFileError(`File exceeds maximum size of ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB`); return; }
    setFileError(""); setUploading(true);
    try {
      let fileToUpload = file;
      let isCompressed = false;
      let originalSize: number | undefined;

      if (uploadCompress && compressionSupported) {
        const result = await compressFile(file);
        fileToUpload = new File([result.blob], file.name, { type: file.type });
        originalSize = result.originalSize;
        isCompressed = true;
      }

      const form = new FormData();
      form.append("title", uploadTitle.trim());
      form.append("description", uploadDesc.trim());
      form.append("category", uploadCategory.trim());
      form.append("file", fileToUpload);
      form.append("is_compressed", String(isCompressed));
      if (originalSize) form.append("original_size", String(originalSize));
      if (uploadPassword.trim()) form.append("password", uploadPassword.trim());
      form.append("requires_membership", String(uploadRequiresMembership));

      await api.post("/resources", form);
      setUploadTitle(""); setUploadDesc(""); setUploadCategory(""); setUploadPassword(""); setUploadCompress(false); setUploadRequiresMembership(false);
      if (fileRef.current) fileRef.current.value = "";
      await loadData();
      addToast("Resource uploaded successfully", "success");
    } catch (e) { addToast(e instanceof Error ? e.message : "Upload failed", "error"); }
    finally { setUploading(false); }
  }

  async function handleSaveEdit(resourceId: string) {
    try {
      const body: Record<string, unknown> = { title: editTitle, description: editDesc, category: editCategory, requires_membership: editRequiresMembership };
      if (editPassword.trim()) body.password = editPassword.trim();
      await api.patch(`/resources/${resourceId}`, body);
      setEditing(null);
      await loadData();
      addToast("Resource updated", "success");
    } catch (e) { addToast(e instanceof Error ? e.message : "Update failed", "error"); }
  }

  async function handleDelete(resourceId: string) {
    try {
      await api.delete(`/resources/${resourceId}`);
      setDeleteTarget(null);
      await loadData();
      addToast("Resource deleted", "success");
    } catch (e) { addToast(e instanceof Error ? e.message : "Delete failed", "error"); }
  }

  async function handleGrantMembership(userId: string, type: string) {
    try {
      await api.post("/memberships/grant", { user_id: userId, membership_type: type });
      await loadData();
      addToast(`Membership granted (${type})`, "success");
    } catch (e) { addToast(e instanceof Error ? e.message : "Failed to grant membership", "error"); }
  }

  async function handleRevokeMembership(userId: string) {
    try {
      await api.post("/memberships/revoke", { user_id: userId });
      await loadData();
      addToast("Membership revoked", "success");
    } catch (e) { addToast(e instanceof Error ? e.message : "Failed to revoke membership", "error"); }
  }

  function startEdit(r: Resource) {
    setEditing(r.id); setEditTitle(r.title); setEditDesc(r.description || "");
    setEditCategory(r.category || ""); setEditPassword(""); setEditRequiresMembership(r.requires_membership);
  }

  if (loading) { return <main className="flex min-h-screen items-center justify-center"><p className="text-neutral-400">Loading...</p></main>; }
  if (!user) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "users", label: "Users" },
    { key: "resources", label: "Resources" },
    { key: "memberships", label: "Memberships" },
  ];

  return (
    <main className="mx-auto max-w-5xl p-8">
      {deleteTarget && (
        <ConfirmModal message="Are you sure you want to delete this resource? This action cannot be undone." onConfirm={() => handleDelete(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}

      <h1 className="mb-8 text-3xl font-bold">Admin Panel</h1>

      <div className="mb-6 flex gap-1 rounded-lg border border-neutral-800 p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setEditing(null); }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${tab === t.key ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {busy ? <p className="text-center text-neutral-500">Loading...</p> : (
        <>
          {tab === "users" && (
            <div className="overflow-hidden rounded-lg border border-neutral-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-900">
                  <tr><th className="px-4 py-3 font-medium">Email</th><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-900/50">
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{u.display_name}</td>
                      <td className="px-4 py-3"><span className="rounded bg-neutral-800 px-2 py-0.5 text-xs font-medium capitalize">{u.role}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {user.role === "owner" && u.role !== "owner" ? (
                            <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs outline-none">
                              <option value="user">User</option><option value="admin">Admin</option>
                            </select>
                          ) : <span className="text-xs text-neutral-500">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "memberships" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Manage Memberships</p>
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-900">
                    <tr><th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {memberships.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-neutral-500">No memberships found</td></tr>
                    ) : memberships.map((m) => (
                      <tr key={m.id} className="hover:bg-neutral-900/50">
                        <td className="px-4 py-3">{m.user_name || m.user_email || m.user_id}</td>
                        <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
                          m.membership_type === "permanent" ? "bg-emerald-950/50 text-emerald-400" :
                          m.membership_type === "automatic" ? "bg-blue-950/50 text-blue-400" :
                          "bg-yellow-950/50 text-yellow-400"
                        }`}>{m.membership_type}</span></td>
                        <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-medium ${m.is_active ? "bg-green-950/50 text-green-400" : "bg-red-950/50 text-red-400"}`}>{m.is_active ? "Active" : "Inactive"}</span></td>
                        <td className="px-4 py-3">
                          {m.membership_type === "manual" && m.is_active && user.role === "owner" && (
                            <button onClick={() => handleRevokeMembership(m.user_id)} className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 transition hover:bg-red-950">Revoke</button>
                          )}
                          {m.membership_type === "automatic" && (
                            <span className="text-[11px] text-neutral-600">Auto</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {user.role === "owner" && (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Grant Membership</p>
                  <p className="mb-4 text-xs text-neutral-500">Select a user from the Users tab to grant a membership type.</p>
                  <div className="flex gap-2">
                    <select id="grant-user" className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white">
                      {users.filter(u => u.role !== "owner").map(u => (
                        <option key={u.id} value={u.id}>{u.display_name} ({u.email})</option>
                      ))}
                    </select>
                    <select id="grant-type" className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white">
                      <option value="manual">Manual</option>
                      <option value="permanent">Permanent</option>
                    </select>
                    <button onClick={() => {
                      const sel = document.getElementById("grant-user") as HTMLSelectElement;
                      const type = document.getElementById("grant-type") as HTMLSelectElement;
                      if (sel?.value) handleGrantMembership(sel.value, type?.value || "manual");
                    }} className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">Grant</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "resources" && (
            <div className="space-y-6">
              <form onSubmit={handleUpload} className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Upload Resource</p>
                <div className="flex flex-col gap-3">
                  <input type="text" placeholder="Title" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} required className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white" />
                  <input type="text" placeholder="Description (optional)" value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white" />
                  <input type="text" placeholder="Category (optional)" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white" />
                  <div className="flex flex-wrap gap-4">
                    {compressionSupported && (
                      <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
                        <input type="checkbox" checked={uploadCompress} onChange={(e) => setUploadCompress(e.target.checked)} className="rounded border-neutral-600 bg-neutral-800" />
                        Compress (GZIP)
                      </label>
                    )}
                    <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
                      <input type="checkbox" checked={uploadRequiresMembership} onChange={(e) => setUploadRequiresMembership(e.target.checked)} className="rounded border-neutral-600 bg-neutral-800" />
                      Members only
                    </label>
                  </div>
                  <input type="password" placeholder="Password protect (optional)" value={uploadPassword} onChange={(e) => setUploadPassword(e.target.value)} className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white" />
                  <div>
                    <input ref={fileRef} type="file" required className="text-sm text-neutral-400 file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:text-neutral-200" />
                    <p className="mt-1 text-[11px] text-neutral-600">Max size: {MAX_UPLOAD_SIZE / (1024 * 1024)}MB</p>
                    {fileError && <p className="mt-1 text-xs text-red-400">{fileError}</p>}
                  </div>
                  <button type="submit" disabled={uploading} className="self-start rounded-lg bg-white px-6 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50">
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {resources.length === 0 ? <p className="text-center text-sm text-neutral-500">No resources yet.</p> : resources.map((r) => (
                  <div key={r.id} className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5">
                    {editing === r.id ? (
                      <div className="flex flex-col gap-3">
                        <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white" />
                        <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white" />
                        <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category" className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white" />
                        <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="New password (leave blank to keep)" className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none focus:border-white" />
                        <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
                          <input type="checkbox" checked={editRequiresMembership} onChange={(e) => setEditRequiresMembership(e.target.checked)} className="rounded border-neutral-600 bg-neutral-800" />
                          Members only
                        </label>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(r.id)} className="rounded bg-white px-4 py-1.5 text-sm font-medium text-black transition hover:bg-neutral-200">Save</button>
                          <button onClick={() => setEditing(null)} className="rounded border border-neutral-700 px-4 py-1.5 text-sm transition hover:bg-neutral-800">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileTypeBadge type={r.file_type} />
                            {r.is_compressed && <span className="rounded bg-blue-950/50 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-900/50">GZIP</span>}
                            {r.is_password_protected && <span className="rounded bg-yellow-950/50 px-2 py-0.5 text-[10px] font-medium text-yellow-400 border border-yellow-900/50">Locked</span>}
                            {r.requires_membership && <span className="rounded bg-purple-950/50 px-2 py-0.5 text-[10px] font-medium text-purple-400 border border-purple-900/50">Members</span>}
                          </div>
                          <p className="mt-2 font-medium">{r.title}</p>
                          {r.description && <p className="mt-1 text-sm text-neutral-400">{r.description}</p>}
                          <p className="mt-2 text-xs text-neutral-500">
                            {r.is_compressed && r.original_size ? `${formatFileSize(r.file_size)} (${compressionRatio(r.original_size, r.file_size || 0)} smaller)` : formatFileSize(r.file_size)}
                            {r.category ? ` · ${r.category}` : ""}
                            {r.uploader_name ? ` · by ${r.uploader_name}` : ""}
                            {` · ${r.download_count} dl · ${r.view_count} views`}
                          </p>
                        </div>
                        <div className="ml-4 flex shrink-0 gap-2">
                          <button onClick={() => startEdit(r)} className="rounded border border-neutral-700 px-3 py-1.5 text-xs transition hover:bg-neutral-800">Edit</button>
                          <button onClick={() => setDeleteTarget(r.id)} className="rounded border border-red-900 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-950">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
