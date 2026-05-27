"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-400">Loading...</p>
      </main>
    );
  }

  if (user) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Tea</h1>
      <p className="text-neutral-400 text-lg">Study materials, curated.</p>
      <p className="max-w-md text-center text-sm text-neutral-600">
        A private platform for sharing study materials with passphrase-based authentication,
        client-side compression, and granular access control.
      </p>
      <div className="flex gap-4">
        <Link
          href="/register"
          className="rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-neutral-200"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-neutral-700 px-6 py-3 font-medium transition hover:bg-neutral-900"
        >
          Sign In
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 text-center text-sm text-neutral-500 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <p className="font-medium text-neutral-300">Passphrase Auth</p>
          <p className="mt-1">System-generated 5-word passphrases, bcrypt-hashed</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <p className="font-medium text-neutral-300">Client Compression</p>
          <p className="mt-1">GZIP compression in-browser via CompressionStream API</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <p className="font-medium text-neutral-300">Access Control</p>
          <p className="mt-1">Roles, membership tiers, password-protected files</p>
        </div>
      </div>
    </main>
  );
}
