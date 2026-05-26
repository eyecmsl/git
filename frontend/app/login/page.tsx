"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { getPowToken } from "@/lib/pow";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, setUser } = useAuth();
  const turnstileEnabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED === "true";
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [email, setEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);

  const tryGetTurnstileToken = useCallback(async (): Promise<string> => {
    if (!turnstileEnabled || !turnstileReady || !turnstileRef?.current) return "";
    turnstileRef.current.execute();
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 5000)
    );
    try {
      const token = await Promise.race([
        turnstileRef.current.getResponsePromise(),
        timeout,
      ]);
      return token ?? "";
    } catch {
      return "";
    }
  }, [turnstileEnabled, turnstileReady, turnstileRef]);

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-400">Loading...</p>
      </main>
    );
  }

  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: Record<string, string> = { email, passphrase };
      if (turnstileEnabled) {
        const turnstileToken = await tryGetTurnstileToken();
        payload[turnstileToken ? "turnstile_token" : "pow_token"] =
          turnstileToken || await getPowToken();
      }

      const data = await api.post<{
        access_token: string;
        refresh_token: string;
        user: { id: string; email: string; display_name: string; role: string; avatar_url: string | null };
      }>("/auth/login", payload);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      setUser(data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      turnstileRef?.current?.reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-3xl font-bold">Sign In</h1>
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
            type="password"
            placeholder="Passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            required
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none focus:border-white"
          />
          {turnstileEnabled && (
            <Turnstile
              ref={turnstileRef}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onLoad={() => setTurnstileReady(true)}
              onError={() => setTurnstileReady(false)}
              options={{ execution: "execute", size: "invisible" }}
            />
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-neutral-500">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-white underline">
            Register
          </a>
        </p>
      </div>
    </main>
  );
}
