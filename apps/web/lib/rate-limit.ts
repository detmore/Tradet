const store = new Map<string, { count: number; resetAt: number }>();

// Prune expired entries to prevent unbounded memory growth.
// Run at most once every 60 s regardless of request volume.
let lastPruneAt = 0;

function pruneExpired() {
  const now = Date.now();
  if (now - lastPruneAt < 60_000) return;
  lastPruneAt = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  pruneExpired();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count++;
  return true;
}
