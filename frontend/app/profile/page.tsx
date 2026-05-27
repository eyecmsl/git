"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const { addToast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    setDisplayName(user.display_name);
    setBio((user as any).bio || "");
  }, [user, loading, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.patch<{ user: any }>("/profile", { display_name: displayName, bio });
      setUser(data.user);
      addToast("Profile updated", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to update", "error");
    }
    setSaving(false);
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append("avatar", file);
      const data = await api.post<{ avatar_url: string }>("/profile/avatar", form);
      setUser({ ...user!, avatar_url: data.avatar_url });
      addToast("Avatar updated", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to update avatar", "error");
    }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-neutral-400">Loading...</p></main>;
  if (!user) return null;

  return (
    <main className="mx-auto max-w-lg p-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push("/dashboard")} className="text-sm text-neutral-500 hover:text-neutral-300">&larr; Dashboard</button>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border border-neutral-700 bg-neutral-800">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-neutral-400">
                {user.display_name[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <button type="button" onClick={() => fileRef.current?.click()} className="text-sm text-neutral-400 hover:text-neutral-200 underline">
              Change avatar
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Email</label>
          <p className="text-sm text-neutral-300">{user.email}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Display Name</label>
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-white" />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-white resize-none" />
        </div>

        <button type="submit" disabled={saving}
          className="self-start rounded-lg bg-white px-6 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50">
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </main>
  );
}
