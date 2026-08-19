import {
  jsonData,
  jsonError,
  readJsonBody,
} from "@/lib/http";
import { insertWaitlistSignup, parseWaitlistSignup } from "@/lib/waitlist";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 8;
const hits = new Map<string, number[]>();

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!allowWaitlist(ip)) {
    return jsonError("too many waitlist attempts", 429);
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError("invalid request body", 400);
  }

  const signup = parseWaitlistSignup(parsed.body);
  if (!signup.ok) {
    return jsonError(signup.reason, 400);
  }

  const inserted = await insertWaitlistSignup(signup.signup);
  if (!inserted.ok) {
    return jsonError(inserted.reason, 500);
  }

  return jsonData({ joined: true }, 201);
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function allowWaitlist(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}
