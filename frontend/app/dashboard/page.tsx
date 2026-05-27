"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { formatFileSize, isRecent, getFileTypeLabel, getFileTypeColor } from "@/lib/utils";
import { supportsCompressionStream, compressFile, decompressBlob, compressionRatio } from "@/lib/compress";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  original_size: number | null;
  is_compressed: boolean;
  is_password_protected: boolean;
  requires_membership: boolean;
  download_count: number;
  view_count: number;
  uploader_name: string | null;
  created_at: string;
}

const IMAGE_TYPES = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const PER_PAGE = 10;
const compressionSupported = supportsCompressionStream();

function CurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="text-5xl font-light tabular-nums tracking-tight">
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      <span className="text-3xl text-neutral-500">
        :{time.getSeconds().toString().padStart(2, "0")}
      </span>
    </p>
  );
}

function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  let period: string;
  if (hour < 12) period = "morning";
  else if (hour < 17) period = "afternoon";
  else period = "evening";
  return (
    <p className="text-lg text-neutral-400">
      Good {period}, <span className="text-neutral-100">{name}</span>
    </p>
  );
}

function FileTypeBadge({ type }: { type: string | null }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium uppercase leading-tight ${getFileTypeColor(type)}`}>
      {getFileTypeLabel(type)}
    </span>
  );
}

function RecentlyAddedBadge() {
  return (
    <span className="inline-block rounded bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium uppercase leading-tight text-emerald-400 border border-emerald-900/50">
      New
    </span>
  );
}

function PasswordModal({ resourceId, onSuccess, onCancel }: { resourceId: string; onSuccess: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError("");
    try {
      await api.post(`/resources/${resourceId}/verify-password`, { password });
      onSuccess();
    } catch {
      setError("Invalid password");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-950 p-6 shadow-xl">
        <p className="mb-4 text-sm font-medium">This file is password-protected</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-white"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={checking} className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50">
              {checking ? "Checking..." : "Unlock"}
            </button>
            <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-700 px-4 py-2 text-sm transition hover:bg-neutral-800">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResourceCard({ r, onDownload }: { r: Resource; onDownload: (r: Resource) => void }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 transition hover:border-neutral-700">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileTypeBadge type={r.file_type} />
            {r.is_compressed && (
              <span className="inline-block rounded bg-blue-950/50 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-900/50">
                GZIP
              </span>
            )}
            {r.is_password_protected && (
              <span className="inline-block rounded bg-yellow-950/50 px-2 py-0.5 text-[10px] font-medium text-yellow-400 border border-yellow-900/50">
                Locked
              </span>
            )}
            {r.requires_membership && (
              <span className="inline-block rounded bg-purple-950/50 px-2 py-0.5 text-[10px] font-medium text-purple-400 border border-purple-900/50">
                Members
              </span>
            )}
            {isRecent(r.created_at) && <RecentlyAddedBadge />}
          </div>
          <p className="mt-2 font-medium">{r.title}</p>
          {r.description && (
            <p className="mt-1 text-sm text-neutral-400 line-clamp-2">{r.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
            {r.is_compressed && r.original_size ? (
              <span title={`Original: ${formatFileSize(r.original_size)}`}>
                {formatFileSize(r.file_size)} ({compressionRatio(r.original_size, r.file_size || 0)} smaller)
              </span>
            ) : (
              <span>{formatFileSize(r.file_size)}</span>
            )}
            {r.category && <span className="capitalize">{r.category}</span>}
            {r.uploader_name && <span>by {r.uploader_name}</span>}
            <span>{r.download_count} downloads</span>
            <span>{r.view_count} views</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => onDownload(r)}
            className="rounded border border-neutral-700 px-3 py-1.5 text-xs transition hover:bg-neutral-800"
          >
            Download
          </button>
          <button
            onClick={async () => {
              const url = `${window.location.origin}/uploads/${r.file_path}`;
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {}
            }}
            className="rounded border border-neutral-700 px-3 py-1.5 text-xs transition hover:bg-neutral-800"
          >
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </div>
      {r.file_type && IMAGE_TYPES.has(r.file_type) && !r.is_password_protected && (
        <a href={`/uploads/${r.file_path}`} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-lg">
          <img
            src={`/uploads/${r.file_path}`}
            alt={r.title}
            className="max-h-64 w-full object-cover transition hover:opacity-90"
            loading="lazy"
          />
        </a>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { addToast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [popular, setPopular] = useState<Resource[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMembership, setHasMembership] = useState(false);
  const [passwordResource, setPasswordResource] = useState<Resource | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchInput, setSearchInput] = useState("");

  const fetchResources = useCallback(async (q: string, cat: string, sb: string, so: string, p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (cat) params.set("category", cat);
    params.set("sort_by", sb);
    params.set("sort_order", so);
    params.set("page", String(p));
    params.set("per_page", String(PER_PAGE));
    const data = await api.get<{ resources: Resource[]; total: number }>(`/resources?${params}`);
    if (p === 1) setResources(data.resources);
    else setResources((prev) => [...prev, ...data.resources]);
    setTotal(data.total);
  }, []);

  const fetchCategories = useCallback(async () => {
    try { const data = await api.get<{ categories: string[] }>("/categories"); setCategories(data.categories); } catch {}
  }, []);

  const fetchPopular = useCallback(async () => {
    try { const data = await api.get<{ resources: Resource[] }>("/resources/popular"); setPopular(data.resources.slice(0, 5)); } catch {}
  }, []);

  const fetchMembership = useCallback(async () => {
    try { const data = await api.get<{ has_membership: boolean }>("/memberships/check"); setHasMembership(data.has_membership); } catch {}
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) { fetchCategories(); fetchPopular(); fetchMembership(); }
  }, [user, fetchCategories, fetchPopular, fetchMembership]);

  useEffect(() => {
    if (user) { setPage(1); setFetching(true); fetchResources(search, selectedCategory, sortBy, sortOrder, 1).finally(() => setFetching(false)); }
  }, [user, search, selectedCategory, sortBy, sortOrder, fetchResources]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(e.target.value.trim()), 300);
  }

  function loadMore() { const next = page + 1; setPage(next); fetchResources(search, selectedCategory, sortBy, sortOrder, next); }

  async function handleDownload(r: Resource) {
    if (r.is_password_protected) { setPasswordResource(r); return; }
    if (r.requires_membership && !hasMembership) { addToast("Membership required to download this resource", "error"); return; }
    await doDownload(r);
  }

  async function doDownload(r: Resource) {
    try {
      await api.post(`/resources/${r.id}/download`);
      if (r.is_compressed && compressionSupported) {
        const resp = await fetch(`/uploads/${r.file_path}`);
        const blob = await resp.blob();
        const decompressed = await decompressBlob(blob);
        const url = URL.createObjectURL(decompressed);
        const a = document.createElement("a");
        a.href = url;
        a.download = r.title.replace(/[^a-zA-Z0-9]/g, "_") + "." + (r.file_type || "bin");
        a.click();
        URL.revokeObjectURL(url);
      } else {
        window.open(`/uploads/${r.file_path}`, "_blank");
      }
      addToast("Download started", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Download failed", "error");
    }
  }

  async function handlePasswordSuccess() {
    if (!passwordResource) return;
    const r = passwordResource;
    setPasswordResource(null);
    await doDownload(r);
  }

  const hasMore = resources.length < total;

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center"><p className="text-neutral-400">Loading...</p></main>;
  }
  if (!user) return null;

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      {passwordResource && <PasswordModal resourceId={passwordResource.id} onSuccess={handlePasswordSuccess} onCancel={() => setPasswordResource(null)} />}

      <div className="flex w-full max-w-2xl items-start justify-between">
        <div>
          <Greeting name={user.display_name} />
          <CurrentTime />
        </div>
        <div className="flex items-center gap-3">
          {hasMembership && <span className="rounded bg-purple-950/50 px-2.5 py-1 text-xs text-purple-400 border border-purple-900/50">Member</span>}
          {(user.role === "admin" || user.role === "owner") && (
            <button onClick={() => router.push("/admin")} className="rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300">Admin</button>
          )}
          <button onClick={() => { logout(); router.push("/login"); }} className="rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300">Sign out</button>
        </div>
      </div>

      {popular.length > 0 && (
        <div className="mt-12 w-full max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Popular</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {popular.map((r) => (
              <a key={r.id} href={`/uploads/${r.file_path}`} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-neutral-700 w-48">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="mt-1 text-xs text-neutral-500">{r.view_count} views</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {compressionSupported && (
        <div className="mt-4 w-full max-w-2xl">
          <p className="text-[11px] text-neutral-600">Compression Streams API available — file compression enabled</p>
        </div>
      )}

      <div className="mt-6 w-full max-w-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input type="text" placeholder="Search resources..." value={searchInput} onChange={handleSearchChange} className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2.5 text-sm outline-none transition focus:border-neutral-600" />
          <div className="flex gap-2">
            {categories.length > 0 && (
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-600">
                <option value="">All</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select value={`${sortBy}:${sortOrder}`} onChange={(e) => { const [sb, so] = e.target.value.split(":"); setSortBy(sb); setSortOrder(so); }} className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-600">
              <option value="created_at:desc">Newest</option>
              <option value="created_at:asc">Oldest</option>
              <option value="title:asc">Name A-Z</option>
              <option value="title:desc">Name Z-A</option>
              <option value="file_size:desc">Largest</option>
              <option value="file_size:asc">Smallest</option>
              <option value="download_count:desc">Most Downloaded</option>
              <option value="view_count:desc">Most Viewed</option>
            </select>
          </div>
        </div>

        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Study Materials {total > 0 && <span className="font-normal text-neutral-600"> ({total})</span>}
        </p>
        {fetching ? (
          <p className="text-sm text-neutral-500">Loading...</p>
        ) : resources.length === 0 ? (
          <p className="text-sm text-neutral-500">No resources available yet.</p>
        ) : (
          <div className="space-y-3">
            {resources.map((r) => <ResourceCard key={r.id} r={r} onDownload={handleDownload} />)}
          </div>
        )}

        {hasMore && (
          <div className="mt-6 text-center">
            <button onClick={loadMore} className="rounded-lg border border-neutral-800 px-8 py-2.5 text-sm text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-200">
              Load More ({resources.length}/{total})
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
