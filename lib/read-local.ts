export function readLocal(key: string, fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }

  return localStorage.getItem(key) ?? fallback;
}
