// URL validation — shared across domain and app layers

const SAFE_URL_RE = /^https?:\/\//;

export function isSafeUrl(url: string): boolean {
  return SAFE_URL_RE.test(url);
}
