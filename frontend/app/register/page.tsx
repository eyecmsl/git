"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerPasskey } from "@/lib/webauthn";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerPasskey(email, displayName);
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-3xl font-bold">Create Account</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none focus:border-white"
          />
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none focus:border-white"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Passkey"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <a href="/login" className="text-white underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
