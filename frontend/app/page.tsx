import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Tea</h1>
      <p className="text-neutral-400 text-lg">Study materials, curated.</p>
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
    </main>
  );
}
