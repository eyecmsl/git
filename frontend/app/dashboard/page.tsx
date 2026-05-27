"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploader_name: string | null;
  created_at: string;
}

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

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      api.get<{ resources: Resource[] }>("/resources")
        .then((data) => setResources(data.resources))
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, [user]);

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

      <div className="mt-16 w-full max-w-2xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Study Materials
        </p>
        {fetching ? (
          <p className="text-sm text-neutral-500">Loading...</p>
        ) : resources.length === 0 ? (
          <p className="text-sm text-neutral-500">No resources available yet.</p>
        ) : (
          <div className="space-y-3">
            {resources.map((r) => (
              <a
                key={r.id}
                href={`/uploads/${r.file_path}`}
                target="_blank"
                className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 transition hover:border-neutral-700 hover:bg-neutral-900"
              >
                <p className="font-medium">{r.title}</p>
                {r.description && (
                  <p className="mt-1 text-sm text-neutral-400">{r.description}</p>
                )}
                <p className="mt-2 text-xs text-neutral-500">
                  {r.file_type?.toUpperCase() || "Unknown"}
                  {r.file_size ? ` · ${(r.file_size / 1024).toFixed(1)} KB` : ""}
                  {r.uploader_name ? ` · by ${r.uploader_name}` : ""}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
