"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatFileSize, isRecent, getFileTypeLabel, getFileTypeColor } from "@/lib/utils";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  download_count: number;
  view_count: number;
  uploader_name: string | null;
  created_at: string;
}

const IMAGE_TYPES = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const PER_PAGE = 10;

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

function ResourceCard({ r }: { r: Resource }) {
  const [copied, setCopied] = useState(false);

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    try {
      await api.post(`/resources/${r.id}/download`);
    } catch {}
    window.open(`/uploads/${r.file_path}`, "_blank");
  }

  async function copyLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/uploads/${r.file_path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 transition hover:border-neutral-700">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileTypeBadge type={r.file_type} />
            {isRecent(r.created_at) && <RecentlyAddedBadge />}
          </div>
          <a href={`/uploads/${r.file_path}`} target="_blank" onClick={handleDownload} className="block mt-2">
            <p className="font-medium hover:text-neutral-200 transition-colors">{r.title}</p>
          </a>
          {r.description && (
            <p className="mt-1 text-sm text-neutral-400 line-clamp-2">{r.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
            <span>{formatFileSize(r.file_size)}</span>
            {r.category && <span className="capitalize">{r.category}</span>}
            {r.uploader_name && <span>by {r.uploader_name}</span>}
            <span>{r.download_count} downloads</span>
            <span>{r.view_count} views</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={copyLink}
            className="rounded border border-neutral-700 px-3 py-1.5 text-xs transition hover:bg-neutral-800"
          >
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </div>
      {r.file_type && IMAGE_TYPES.has(r.file_type) && (
        <a href={`/uploads/${r.file_path}`} target="_blank" className="mt-3 block overflow-hidden rounded-lg">
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
    if (p === 1) {
      setResources(data.resources);
    } else {
      setResources((prev) => [...prev, ...data.resources]);
    }
    setTotal(data.total);
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get<{ categories: string[] }>("/categories");
      setCategories(data.categories);
    } catch {}
  }, []);

  const fetchPopular = useCallback(async () => {
    try {
      const data = await api.get<{ resources: Resource[] }>("/resources/popular");
      setPopular(data.resources.slice(0, 5));
    } catch {}
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchPopular();
    }
  }, [user, fetchCategories, fetchPopular]);

  useEffect(() => {
    if (user) {
      setPage(1);
      setFetching(true);
      fetchResources(search, selectedCategory, sortBy, sortOrder, 1).finally(() => setFetching(false));
    }
  }, [user, search, selectedCategory, sortBy, sortOrder, fetchResources]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(e.target.value.trim());
    }, 300);
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchResources(search, selectedCategory, sortBy, sortOrder, next);
  }

  const hasMore = resources.length < total;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-400">Loading...</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="flex w-full max-w-2xl items-start justify-between">
        <div>
          <Greeting name={user.display_name} />
          <CurrentTime />
        </div>
        <div className="flex items-center gap-3">
          {user.role === "admin" || user.role === "owner" ? (
            <button
              onClick={() => router.push("/admin")}
              className="rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300"
            >
              Admin
            </button>
          ) : null}
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300"
          >
            Sign out
          </button>
        </div>
      </div>

      {popular.length > 0 && (
        <div className="mt-12 w-full max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Popular
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {popular.map((r) => (
              <a
                key={r.id}
                href={`/uploads/${r.file_path}`}
                target="_blank"
                className="shrink-0 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-neutral-700 w-48"
              >
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="mt-1 text-xs text-neutral-500">{r.view_count} views</p>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 w-full max-w-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search resources..."
            value={searchInput}
            onChange={handleSearchChange}
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2.5 text-sm outline-none transition focus:border-neutral-600"
          />
          <div className="flex gap-2">
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-600"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(":");
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-600"
            >
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
          Study Materials
          {total > 0 && <span className="font-normal text-neutral-600"> ({total})</span>}
        </p>
        {fetching ? (
          <p className="text-sm text-neutral-500">Loading...</p>
        ) : resources.length === 0 ? (
          <p className="text-sm text-neutral-500">No resources available yet.</p>
        ) : (
          <div className="space-y-3">
            {resources.map((r) => (
              <ResourceCard key={r.id} r={r} />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMore}
              className="rounded-lg border border-neutral-800 px-8 py-2.5 text-sm text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-200"
            >
              Load More ({resources.length}/{total})
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
