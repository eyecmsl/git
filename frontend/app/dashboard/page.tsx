"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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

      <div className="mt-24 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Study Materials
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            Your study resources will appear here.
          </p>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Progress
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            Track your learning progress.
          </p>
        </div>
      </div>
    </main>
  );
}
