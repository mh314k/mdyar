import { APP_VERSION, GITHUB_REPO } from "./meta";

export type UpdateInfo = {
  current: string;
  latest: string;
  url: string;
  outdated: boolean;
};

const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^v/i, "").split(/[-+]/)[0] ?? "";
}

export function compareSemver(a: string, b: string): number {
  const left = normalizeVersion(a).split(".").map((n) => Number.parseInt(n, 10) || 0);
  const right = normalizeVersion(b).split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(left.length, right.length, 3);
  for (let i = 0; i < len; i++) {
    const d = (left[i] ?? 0) - (right[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Ask GitHub for the latest published release. Returns null when offline,
 * the request fails, or GitHub has no release yet.
 */
export async function checkLatestRelease(
  current = APP_VERSION,
): Promise<UpdateInfo | null> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return null;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(RELEASES_API, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: string; html_url?: string };
    const tag = typeof data.tag_name === "string" ? data.tag_name : "";
    const url = typeof data.html_url === "string" ? data.html_url : "";
    if (!tag || !url) return null;
    const latest = normalizeVersion(tag);
    if (!latest) return null;
    return {
      current: normalizeVersion(current),
      latest,
      url,
      outdated: compareSemver(latest, current) > 0,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
