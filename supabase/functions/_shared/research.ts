// Research-window and query-centric relevance design informed by last30days-skill.
// See THIRD_PARTY_NOTICES.md. No browser cookies or desktop credentials are used.
export type ApiObject = Record<string, unknown>;
export const object = (value: unknown): ApiObject => value && typeof value === "object" && !Array.isArray(value) ? value as ApiObject : {};
export const records = (value: unknown): ApiObject[] => Array.isArray(value) ? value.map(object) : [];
export const string = (value: unknown): string => typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
export const number = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;
export const env = (name: string): string => typeof Deno !== "undefined" ? Deno.env.get(name)?.trim() || "" : "";

export interface ResearchWindow { days: number; from: string; to: string }
export function researchWindow(days = 30): ResearchWindow {
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error("Research window must be between 1 and 90 days");
  const now = Date.now();
  return { days, from: new Date(now - days * 86400000).toISOString(), to: new Date(now).toISOString() };
}
export function timestamp(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(string(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
export function withinWindow(value: string | undefined, window: ResearchWindow): boolean {
  if (!value) return true; // Unknown publication dates remain explicitly undated.
  return value >= window.from && value <= window.to;
}
export function cleanText(value: unknown): string {
  return string(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => { const n = Number(code); return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : " "; })
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
export function safeUrl(value: unknown): string | undefined {
  try { const url = new URL(string(value)); return /^https?:$/.test(url.protocol) ? url.toString() : undefined; } catch { return undefined; }
}
export function websiteHost(value?: string): string {
  try { return new URL(value?.includes("://") ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}
export function sameWebsite(left: unknown, right?: string): boolean {
  const a = websiteHost(string(left)); const b = websiteHost(right);
  return Boolean(a && b && (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`)));
}
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Require the entity in the title, or its domain in the evidence; generic body words are insufficient. */
export function relevant(product: string, title: string, text = "", website?: string, tags: string[] = []): boolean {
  const phrase = product.trim();
  if (!phrase || /^(the|a|an|it|is|are|this|that|and|or)$/i.test(phrase)) return false;
  const host = websiteHost(website);
  if (host && new RegExp(`(?:^|[^a-z0-9.-])(?:www\\.)?${escapeRegex(host)}(?:[^a-z0-9.-]|$)`, "i").test(`${title} ${text}`)) return true;
  const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(phrase)}(?:$|[^\\p{L}\\p{N}])`, "iu");
  if (tags.some(tag => pattern.test(tag))) return true;
  if (!pattern.test(title)) return false;
  // Common-word brands require their actual capitalization (e.g. Notion vs "the notion of").
  if (/^(notion|linear|slack|figma|cursor|apple|teams|zoom|arc|raycast)$/i.test(phrase)) {
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(phrase)}(?:$|[^\\p{L}\\p{N}])`, "u").test(title);
  }
  return true;
}
export function stableId(source: string, key: string): string {
  // Non-cryptographic hash used only for deterministic evidence identity, never authorization.
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return `${source}:${(hash >>> 0).toString(16)}`;
}
export async function mapLimit<T, U>(values: T[], limit: number, fn: (value: T) => Promise<U>): Promise<U[]> {
  const result: U[] = new Array(values.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (next < values.length) { const index = next++; result[index] = await fn(values[index]); }
  }));
  return result;
}
export class SourceUnavailable extends Error {
  constructor(public status: "not_configured" | "unsupported", message: string) { super(message); }
}
export class ResearchClient {
  private readonly deadline = Date.now() + 18000;
  private calls = 0;
  readonly warnings: string[] = [];
  async json(url: string, init: RequestInit = {}): Promise<ApiObject | ApiObject[]> {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (++this.calls > 8 || Date.now() >= this.deadline) throw new Error("Source research budget exhausted");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(6000, Math.max(1, this.deadline - Date.now())));
      let retry = false;
      try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        if (!response.ok) {
          retry = response.status >= 500;
          throw new Error(`${new URL(url).hostname} returned HTTP ${response.status}`);
        }
        const data: unknown = await response.json();
        if (!data || typeof data !== "object") throw new Error("Provider returned an invalid JSON payload");
        const row = object(data);
        if (row.success === false || row.error_id) throw new Error("Provider reported an unsuccessful research request");
        return Array.isArray(data) ? records(data) : row;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") throw new Error("Source request timed out");
        if (!retry || attempt === 1) {
          // Never expose upstream response bodies or URLs containing API credentials.
          if (error instanceof Error && /returned HTTP|invalid JSON|unsuccessful research/.test(error.message)) throw error;
          throw new Error("Source request failed or returned malformed data");
        }
      } finally { clearTimeout(timer); }
    }
    throw new Error("Source unavailable");
  }
  async optional<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try { return await fn(); } catch (error) { this.warnings.push(error instanceof Error ? error.message : "Source enrichment failed"); return fallback; }
  }
}
