"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm text-neutral-400">Email</p>
        <p className="mb-4 font-medium">{user.email}</p>
        <p className="text-sm text-neutral-400">Display Name</p>
        <p className="mb-4 font-medium">{user.display_name}</p>
        <p className="text-sm text-neutral-400">Role</p>
        <p className="mb-4">
          <span className="rounded bg-neutral-800 px-2 py-0.5 text-sm font-medium capitalize">
            {user.role}
          </span>
        </p>
        <p className="text-sm text-neutral-400">User ID</p>
        <p className="mb-4 font-mono text-sm text-neutral-300">{user.id}</p>
      </div>
      {(user.role === "admin" || user.role === "owner") && (
        <Link
          href="/admin"
          className="rounded-lg border border-neutral-700 px-6 py-3 font-medium transition hover:bg-neutral-900"
        >
          Admin Panel
        </Link>
      )}
      <button
        onClick={() => {
          logout();
          router.push("/login");
        }}
        className="rounded-lg border border-neutral-700 px-6 py-3 font-medium transition hover:bg-neutral-900"
      >
        Sign Out
      </button>
    </main>
  );
}
