"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { formatFileSize, isRecent, getFileTypeLabel, getFileTypeColor } from "@/lib/utils";
import { supportsCompressionStream, compressFile, decompressBlob, compressionRatio } from "@/lib/compress";

interface Resource {
  id: string; title: string; description: string | null; category: string | null;
  file_path: string; file_type: string | null; file_size: number | null;
  original_size: number | null; is_compressed: boolean;
  is_password_protected: boolean; requires_membership: boolean;
  download_count: number; view_count: number;
  uploader_name: string | null; created_at: string;
}

interface Tag { id: string; name: string; slug: string; }
interface RecentItem { id: string; resource_id: string; resource_title: string; file_type: string | null; viewed_at: string; }
interface DownloadItem { id: string; resource_id: string; resource_title: string | null; created_at: string; }
interface CollectionType { id: string; name: string; description: string | null; resource_count: number; created_at: string; items: { id: string; resource_id: string; resource_title: string | null; position: number }[]; }

const IMAGE_TYPES = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const PER_PAGE = 10;
const compressionSupported = supportsCompressionStream();

function CurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
  return (<p className="text-5xl font-light tabular-nums tracking-tight">{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    <span className="text-3xl text-neutral-500">:{time.getSeconds().toString().padStart(2, "0")}</span></p>);
}

function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return <p className="text-lg text-neutral-400">Good {period}, <span className="text-neutral-100">{name}</span></p>;
}

function FileTypeBadge({ type }: { type: string | null }) {
  return <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium uppercase leading-tight ${getFileTypeColor(type)}`}>{getFileTypeLabel(type)}</span>;
}

function RecentlyAddedBadge() {
  return <span className="inline-block rounded bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium uppercase leading-tight text-emerald-400 border border-emerald-900/50">New</span>;
}

function PasswordModal({ resourceId, onSuccess, onCancel }: { resourceId: string; onSuccess: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [checking, setChecking] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setChecking(true); setError("");
    try { await api.post(`/resources/${resourceId}/verify-password`, { password }); onSuccess(); }
    catch { setError("Invalid password"); } finally { setChecking(false); }
  }
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-950 p-6 shadow-xl">
      <p className="mb-4 text-sm font-medium">This file is password-protected</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} autoFocus className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-white" />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={checking} className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50">{checking ? "Checking..." : "Unlock"}</button>
          <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-700 px-4 py-2 text-sm transition hover:bg-neutral-800">Cancel</button>
        </div>
      </form>
    </div>
  </div>);
}

function ResourcePreviewModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const isImage = resource.file_type && IMAGE_TYPES.has(resource.file_type);
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
    <div className="max-w-4xl max-h-[90vh] w-full mx-4" onClick={e => e.stopPropagation()}>
      <div className="flex justify-end mb-2">
        <button onClick={onClose} className="text-white/60 hover:text-white text-lg">&times;</button>
      </div>
      {isImage ? (
        <img src={`/uploads/${resource.file_path}`} alt={resource.title} className="max-h-[80vh] mx-auto rounded-lg" />
      ) : resource.file_type === "pdf" ? (
        <iframe src={`/uploads/${resource.file_path}`} className="w-full h-[80vh] rounded-lg" />
      ) : resource.file_type === "mp4" ? (
        <video src={`/uploads/${resource.file_path}`} controls className="max-h-[80vh] mx-auto rounded-lg" />
      ) : (
        <div className="flex items-center justify-center h-64 text-neutral-500">Preview not available for this file type</div>
      )}
    </div>
  </div>);
}

function ResourceCard({ r, onDownload, onPreview }: { r: Resource; onDownload: (r: Resource) => void; onPreview: (r: Resource) => void }) {
  const [copied, setCopied] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    api.get<{ favorited: boolean }>(`/favorites/${r.id}/check`).then(d => setFavorited(d.favorited)).catch(() => {});
    api.get<{ tags: Tag[] }>(`/resources/${r.id}/tags`).then(d => setTags(d.tags)).catch(() => {});
  }, [r.id]);

  async function toggleFav() {
    try {
      if (favorited) { await api.delete(`/favorites/${r.id}`); setFavorited(false); }
      else { await api.post(`/favorites/${r.id}`); setFavorited(true); }
    } catch {}
  }

  return (<div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 transition hover:border-neutral-700">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <FileTypeBadge type={r.file_type} />
          {r.is_compressed && <span className="rounded bg-blue-950/50 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-900/50">GZIP</span>}
          {r.is_password_protected && <span className="rounded bg-yellow-950/50 px-2 py-0.5 text-[10px] font-medium text-yellow-400 border border-yellow-900/50">Locked</span>}
          {r.requires_membership && <span className="rounded bg-purple-950/50 px-2 py-0.5 text-[10px] font-medium text-purple-400 border border-purple-900/50">Members</span>}
          {isRecent(r.created_at) && <RecentlyAddedBadge />}
          {tags.map(t => <span key={t.id} className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-400 border border-neutral-700">{t.name}</span>)}
        </div>
        <p className="mt-2 font-medium">{r.title}</p>
        {r.description && <p className="mt-1 text-sm text-neutral-400 line-clamp-2">{r.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
          {r.is_compressed && r.original_size
            ? <span title={`Original: ${formatFileSize(r.original_size)}`}>{formatFileSize(r.file_size)} ({compressionRatio(r.original_size, r.file_size || 0)} smaller)</span>
            : <span>{formatFileSize(r.file_size)}</span>}
          {r.category && <span className="capitalize">{r.category}</span>}
          {r.uploader_name && <span>by {r.uploader_name}</span>}
          <span>{r.download_count} downloads</span>
          <span>{r.view_count} views</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 items-start">
        <button onClick={toggleFav} className="text-lg leading-none transition hover:scale-110" title={favorited ? "Unfavorite" : "Favorite"}>{favorited ? "★" : "☆"}</button>
      </div>
    </div>
    {r.file_type && IMAGE_TYPES.has(r.file_type) && !r.is_password_protected && (
      <button onClick={() => onPreview(r)} className="mt-3 block w-full overflow-hidden rounded-lg text-left">
        <img src={`/uploads/${r.file_path}`} alt={r.title} className="max-h-64 w-full object-cover transition hover:opacity-90" loading="lazy" />
      </button>
    )}
    <div className="mt-3 flex gap-2">
      <button onClick={() => onDownload(r)} className="rounded border border-neutral-700 px-3 py-1.5 text-xs transition hover:bg-neutral-800">Download</button>
      <button onClick={() => onPreview(r)} className="rounded border border-neutral-700 px-3 py-1.5 text-xs transition hover:bg-neutral-800">Preview</button>
      <button onClick={async () => {
        const url = `${window.location.origin}/uploads/${r.file_path}`;
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
      }} className="rounded border border-neutral-700 px-3 py-1.5 text-xs transition hover:bg-neutral-800">{copied ? "Copied!" : "Share"}</button>
    </div>
  </div>);
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { addToast } = useToast();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
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
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [collections, setCollections] = useState<CollectionType[]>([]);
  const [favorites, setFavorites] = useState<Resource[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [suggestions, setSuggestions] = useState<{ titles: string[]; tags: string[]; categories: string[] }>({ titles: [], tags: [], categories: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newCollName, setNewCollName] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    if (stored) setTheme(stored);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
    api.patch("/profile", { theme_preference: next }).catch(() => {});
  }

  const fetchResources = useCallback(async (q: string, cat: string, sb: string, so: string, p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (cat) params.set("category", cat);
    params.set("sort_by", sb); params.set("sort_order", so);
    params.set("page", String(p)); params.set("per_page", String(PER_PAGE));
    const data = await api.get<{ resources: Resource[]; total: number }>(`/resources?${params}`);
    if (p === 1) setResources(data.resources); else setResources(prev => [...prev, ...data.resources]);
    setTotal(data.total);
  }, []);

  const fetchMeta = useCallback(async () => {
    try { const d = await api.get<{ categories: string[] }>("/categories"); setCategories(d.categories); } catch {}
    try { const d = await api.get<{ recent: RecentItem[] }>("/recently-viewed"); setRecentItems(d.recent); } catch {}
    try { const d = await api.get<{ downloads: DownloadItem[] }>("/downloads"); setDownloads(d.downloads); } catch {}
    try { const d = await api.get<{ collections: CollectionType[] }>("/collections"); setCollections(d.collections); } catch {}
    try { const d = await api.get<{ favorites: Resource[] }>("/favorites"); setFavorites(d.favorites); } catch {}
    try { const d = await api.get<{ has_membership: boolean }>("/memberships/check"); setHasMembership(d.has_membership); } catch {}
  }, []);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
  useEffect(() => { if (user) { fetchMeta(); api.get<{ resources: Resource[] }>("/resources/popular").then(d => setPopular(d.resources.slice(0, 5))).catch(() => {}); } }, [user, fetchMeta]);
  useEffect(() => { if (user) { setPage(1); setFetching(true); fetchResources(search, selectedCategory, sortBy, sortOrder, 1).finally(() => setFetching(false)); } }, [user, search, selectedCategory, sortBy, sortOrder, fetchResources]);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false); }
    document.addEventListener("mousedown", handleClick); return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value; setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(v.trim());
      if (v.trim().length >= 1) {
        api.get<{ titles: string[]; tags: string[]; categories: string[] }>(`/suggestions?q=${encodeURIComponent(v.trim())}`)
          .then(setSuggestions).catch(() => {});
        setShowSuggestions(true);
      } else { setShowSuggestions(false); }
    }, 200);
  }

  function pickSuggestion(val: string) { setSearchInput(val); setSearch(val); setShowSuggestions(false); }

  function loadMore() { const next = page + 1; setPage(next); fetchResources(search, selectedCategory, sortBy, sortOrder, next); }

  async function handleDownload(r: Resource) {
    if (r.is_password_protected) { setPasswordResource(r); return; }
    if (r.requires_membership && !hasMembership) { addToast("Membership required", "error"); return; }
    await doDownload(r);
  }

  async function doDownload(r: Resource) {
    try {
      await api.post(`/resources/${r.id}/download`);
      if (r.is_compressed && compressionSupported) {
        const resp = await fetch(`/uploads/${r.file_path}`); const blob = await resp.blob();
        const decompressed = await decompressBlob(blob);
        const url = URL.createObjectURL(decompressed); const a = document.createElement("a");
        a.href = url; a.download = r.title.replace(/[^a-zA-Z0-9]/g, "_") + "." + (r.file_type || "bin");
        a.click(); URL.revokeObjectURL(url);
      } else window.open(`/uploads/${r.file_path}`, "_blank");
      addToast("Download started", "success");
    } catch (e) { addToast(e instanceof Error ? e.message : "Download failed", "error"); }
  }

  async function handlePasswordSuccess() { if (!passwordResource) return; const r = passwordResource; setPasswordResource(null); await doDownload(r); }

  async function createCollection() {
    if (!newCollName.trim()) return;
    try { await api.post("/collections", { name: newCollName.trim() }); setNewCollName(""); addToast("Collection created", "success"); fetchMeta(); } catch (e) { addToast(e instanceof Error ? e.message : "Failed", "error"); }
  }

  async function addToCollection(collectionId: string, resourceId: string) {
    try { await api.post(`/collections/${collectionId}/items`, { resource_id: resourceId }); addToast("Added to collection", "success"); fetchMeta(); } catch (e) { addToast(e instanceof Error ? e.message : "Failed", "error"); }
  }

  const hasMore = resources.length < total;

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-neutral-400">Loading...</p></main>;
  if (!user) return null;

  return (<main className="flex min-h-screen flex-col items-center p-8">
    {passwordResource && <PasswordModal resourceId={passwordResource.id} onSuccess={handlePasswordSuccess} onCancel={() => setPasswordResource(null)} />}
    {previewResource && <ResourcePreviewModal resource={previewResource} onClose={() => setPreviewResource(null)} />}

    <div className="flex w-full max-w-4xl items-start justify-between">
      <div><Greeting name={user.display_name} /><CurrentTime /></div>
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/profile")} className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300">Profile</button>
        <button onClick={toggleTheme} className="rounded-lg border border-neutral-800 px-3 py-2 text-sm transition hover:border-neutral-700">{theme === "dark" ? "☀️" : "🌙"}</button>
        {hasMembership && <span className="rounded bg-purple-950/50 px-2.5 py-1 text-xs text-purple-400 border border-purple-900/50">Member</span>}
        {(user.role === "admin" || user.role === "owner") && (
          <button onClick={() => router.push("/admin")} className="rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300">Admin</button>
        )}
        <button onClick={() => { logout(); router.push("/login"); }} className="rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300">Sign out</button>
      </div>
    </div>

    <div className="mt-8 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-6">
        {popular.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Popular</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {popular.map(r => (
                <button key={r.id} onClick={() => setPreviewResource(r)} className="shrink-0 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-neutral-700 w-48 text-left">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{r.view_count} views</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={searchRef} className="relative">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input type="text" placeholder="Search resources..." value={searchInput} onChange={handleSearchChange}
                onFocus={() => searchInput.trim() && setShowSuggestions(true)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2.5 text-sm outline-none transition focus:border-neutral-600" />
              {showSuggestions && (suggestions.titles.length > 0 || suggestions.tags.length > 0 || suggestions.categories.length > 0) && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2 shadow-xl">
                  {suggestions.titles.length > 0 && <><p className="px-2 py-1 text-[10px] font-semibold text-neutral-500 uppercase">Titles</p>{suggestions.titles.map(s => <button key={s} onClick={() => pickSuggestion(s)} className="block w-full text-left px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800 rounded">{s}</button>)}</>}
                  {suggestions.tags.length > 0 && <><p className="px-2 py-1 text-[10px] font-semibold text-neutral-500 uppercase mt-1">Tags</p>{suggestions.tags.map(s => <button key={s} onClick={() => pickSuggestion(s)} className="block w-full text-left px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800 rounded">#{s}</button>)}</>}
                  {suggestions.categories.length > 0 && <><p className="px-2 py-1 text-[10px] font-semibold text-neutral-500 uppercase mt-1">Categories</p>{suggestions.categories.map(s => <button key={s} onClick={() => pickSuggestion(`category:${s}`)} className="block w-full text-left px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800 rounded">{s}</button>)}</>}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {categories.length > 0 && (
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-600">
                  <option value="">All</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <select value={`${sortBy}:${sortOrder}`} onChange={e => { const [sb, so] = e.target.value.split(":"); setSortBy(sb); setSortOrder(so); }} className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-600">
                <option value="created_at:desc">Newest</option>
                <option value="created_at:asc">Oldest</option>
                <option value="title:asc">A-Z</option>
                <option value="title:desc">Z-A</option>
                <option value="file_size:desc">Largest</option>
                <option value="file_size:asc">Smallest</option>
                <option value="download_count:desc">Most Downloaded</option>
                <option value="view_count:desc">Most Viewed</option>
              </select>
            </div>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Study Materials {total > 0 && <span className="font-normal text-neutral-600"> ({total})</span>}
        </p>
        {fetching ? <p className="text-sm text-neutral-500">Loading...</p>
        : resources.length === 0 ? <p className="text-sm text-neutral-500">No resources available yet.</p>
        : <div className="space-y-3">{resources.map(r => <ResourceCard key={r.id} r={r} onDownload={handleDownload} onPreview={setPreviewResource} />)}</div>}
        {hasMore && <div className="mt-6 text-center"><button onClick={loadMore} className="rounded-lg border border-neutral-800 px-8 py-2.5 text-sm text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-200">Load More ({resources.length}/{total})</button></div>}
      </div>

      <div className="space-y-6">
        <div>
          <button onClick={() => { setShowFavorites(!showFavorites); if (showDownloads) setShowDownloads(false); if (showCollections) setShowCollections(false); }}
            className="w-full text-left text-xs font-semibold uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition">
            ★ Favorites ({favorites.length})
          </button>
          {showFavorites && (
            <div className="mt-2 space-y-1">
              {favorites.length === 0 ? <p className="text-xs text-neutral-600">No favorites yet</p>
              : favorites.map(f => (
                <div key={f.id} className="flex items-center justify-between">
                  <button onClick={() => setPreviewResource(f)} className="text-xs text-neutral-400 hover:text-neutral-200 truncate">{f.title}</button>
                  <button onClick={async () => { await api.delete(`/favorites/${f.id}`); fetchMeta(); }} className="text-xs text-neutral-600 hover:text-red-400 ml-1">&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <button onClick={() => { setShowCollections(!showCollections); if (showFavorites) setShowFavorites(false); if (showDownloads) setShowDownloads(false); }}
            className="w-full text-left text-xs font-semibold uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition">
            📂 Collections ({collections.length})
          </button>
          {showCollections && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-1">
                <input type="text" placeholder="New collection..." value={newCollName} onChange={e => setNewCollName(e.target.value)}
                  className="flex-1 rounded border border-neutral-800 bg-neutral-900/50 px-2 py-1 text-xs outline-none focus:border-neutral-600" />
                <button onClick={createCollection} className="rounded bg-white px-2 py-1 text-xs font-medium text-black">+</button>
              </div>
              {collections.map(c => (
                <details key={c.id} className="text-xs">
                  <summary className="cursor-pointer text-neutral-400 hover:text-neutral-200">{c.name} ({c.resource_count})</summary>
                  <div className="mt-1 ml-2 space-y-0.5">
                    {c.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-neutral-500 truncate">{item.resource_title || item.resource_id}</span>
                        <button onClick={() => { api.delete(`/collections/${c.id}/items/${item.resource_id}`).then(fetchMeta).catch(() => {}); }} className="text-neutral-600 hover:text-red-400 ml-1">&times;</button>
                      </div>
                    ))}
                    {c.items.length === 0 && <p className="text-neutral-600">Empty</p>}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        <div>
          <button onClick={() => { setShowDownloads(!showDownloads); if (showFavorites) setShowFavorites(false); if (showCollections) setShowCollections(false); }}
            className="w-full text-left text-xs font-semibold uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition">
            ⬇️ Recent Downloads
          </button>
          {showDownloads && (
            <div className="mt-2 space-y-1">
              {downloads.length === 0 ? <p className="text-xs text-neutral-600">No downloads yet</p>
              : downloads.slice(0, 10).map(d => (
                <p key={d.id} className="text-xs text-neutral-500 truncate">{d.resource_title || d.resource_id}</p>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">🕐 Recently Viewed</p>
          <div className="mt-2 space-y-1">
            {recentItems.length === 0 ? <p className="text-xs text-neutral-600">None yet</p>
            : recentItems.slice(0, 8).map(item => (
              <p key={item.id} className="text-xs text-neutral-500 truncate">{item.resource_title}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  </main>);
}
