const API_BASE = "/api";

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex;
}

async function solve(nonce: string, difficulty: number): Promise<string> {
  const target = "0".repeat(difficulty);
  let solution = BigInt(0);
  while (true) {
    const h = await sha256(`${nonce}:${solution}`);
    if (h.startsWith(target)) {
      return solution.toString();
    }
    solution++;
    if (solution % BigInt(100000) === BigInt(0)) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

export async function getPowToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error("Failed to get PoW challenge");
  }

  const challenge = await res.json();
  const { challenge_id, nonce, difficulty, expires_at, sig } = challenge;

  const solution = await solve(nonce, difficulty);

  return `${challenge_id}:${solution}:${nonce}:${difficulty}:${expires_at}:${sig}`;
}
