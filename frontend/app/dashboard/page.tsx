"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 0,
  admin: 1,
  user: 2,
};

function Section({
  label,
  minLevel,
  userLevel,
  children,
}: {
  label: string;
  minLevel: number;
  userLevel: number;
  children: React.ReactNode;
}) {
  if (userLevel > minLevel) return null;
  return (
    <section className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
        {label}
      </p>
      {children}
    </section>
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

  const level = ROLE_HIERARCHY[user.role] ?? 2;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="mb-4 text-3xl font-bold">Dashboard</h1>

      <Section label="A — System" minLevel={0} userLevel={level}>
        <p className="mb-4 text-sm text-neutral-400">Full system administration.</p>
        <Link
          href="/admin"
          className="inline-block rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-800"
        >
          User Management
        </Link>
      </Section>

      <Section label="B — Administration" minLevel={1} userLevel={level}>
        <p className="mb-4 text-sm text-neutral-400">Administrative tools.</p>
        <Link
          href="/admin"
          className="inline-block rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-800"
        >
          Admin Panel
        </Link>
      </Section>

      <Section label="C — Account" minLevel={2} userLevel={level}>
        <p className="mb-3 text-sm text-neutral-400">Email</p>
        <p className="mb-4 font-medium">{user.email}</p>
        <p className="mb-3 text-sm text-neutral-400">Display Name</p>
        <p className="mb-4 font-medium">{user.display_name}</p>
        <p className="mb-3 text-sm text-neutral-400">Role</p>
        <p className="mb-4">
          <span className="rounded bg-neutral-800 px-2 py-0.5 text-sm font-medium capitalize">
            {user.role}
          </span>
        </p>
        <p className="mb-3 text-sm text-neutral-400">User ID</p>
        <p className="mb-4 font-mono text-sm text-neutral-300">{user.id}</p>
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="mt-2 rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-800"
        >
          Sign Out
        </button>
      </Section>
    </main>
  );
}
