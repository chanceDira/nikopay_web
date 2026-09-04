type RateLimitBucket = {
  windowMs: number;
  maxHits: number;
  hits: Map<string, number[]>;
};

export function createIpRateLimiter(options: {
  windowMs: number;
  maxHits: number;
}): RateLimitBucket {
  return {
    windowMs: options.windowMs,
    maxHits: options.maxHits,
    hits: new Map(),
  };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function allowIpRequest(bucket: RateLimitBucket, ip: string): boolean {
  const now = Date.now();
  const recent = (bucket.hits.get(ip) ?? []).filter(
    (stamp) => now - stamp < bucket.windowMs,
  );
  if (recent.length >= bucket.maxHits) {
    bucket.hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  bucket.hits.set(ip, recent);
  return true;
}
