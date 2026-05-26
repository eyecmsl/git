"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { getPowToken } from "@/lib/pow";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading, setUser } = useAuth();
  const turnstileEnabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED === "true";
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPassphrase, setGeneratedPassphrase] = useState<string | null>(null);
  const [pendingTokens, setPendingTokens] = useState<{ access: string; refresh: string; user: { id: string; email: string; display_name: string; role: string; avatar_url: string | null } } | null>(null);
  const [copied, setCopied] = useState(false);
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
      const payload: Record<string, string> = { email, display_name: displayName };
      if (turnstileEnabled) {
        const turnstileToken = await tryGetTurnstileToken();
        payload[turnstileToken ? "turnstile_token" : "pow_token"] =
          turnstileToken || await getPowToken();
      } else {
        payload["pow_token"] = await getPowToken();
      }

      const data = await api.post<{
        access_token: string;
        refresh_token: string;
        passphrase: string;
        user: { id: string; email: string; display_name: string; role: string; avatar_url: string | null };
      }>("/auth/register", payload);
      setGeneratedPassphrase(data.passphrase);
      setPendingTokens({ access: data.access_token, refresh: data.refresh_token, user: data.user });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      turnstileRef?.current?.reset();
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!pendingTokens) return;
    localStorage.setItem("access_token", pendingTokens.access);
    localStorage.setItem("refresh_token", pendingTokens.refresh);
    setUser(pendingTokens.user);
    router.push("/dashboard");
  }

  async function handleCopy() {
    if (generatedPassphrase) {
      await navigator.clipboard.writeText(generatedPassphrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (generatedPassphrase) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-2 text-3xl font-bold">Account Created</h1>
          <p className="mb-8 text-neutral-400">
            Save your passphrase — you will need it to sign in. It will not be shown again.
          </p>
          <div className="mb-6 rounded-lg border border-yellow-600 bg-yellow-900/30 p-6">
            <p className="mb-3 text-sm text-yellow-400">⚠ Your generated passphrase</p>
            <code className="select-all break-all rounded bg-neutral-800 px-4 py-3 text-lg font-mono">
              {generatedPassphrase}
            </code>
          </div>
          <button
            onClick={handleCopy}
            className="mb-4 w-full rounded-lg border border-neutral-600 px-6 py-3 font-medium transition hover:bg-neutral-800"
          >
            {copied ? "Copied!" : "Copy passphrase"}
          </button>
          <button
            onClick={handleConfirm}
            className="w-full rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-neutral-200"
          >
            I saved my passphrase — go to dashboard
          </button>
        </div>
      </main>
    );
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
            {loading ? "Verifying..." : "Create Account"}
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
