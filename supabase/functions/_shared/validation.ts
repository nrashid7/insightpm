export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isOptionalString(v: unknown): v is string | undefined | null {
  return v === undefined || v === null || typeof v === "string";
}

function isOptionalBoolean(v: unknown): v is boolean | undefined | null {
  return v === undefined || v === null || typeof v === "boolean";
}

const MAX_PRODUCT_NAME_LENGTH = 200;
const MAX_WEBSITE_LENGTH = 500;
const MAX_COMPETITORS_LENGTH = 500;
const MAX_CUSTOM_FEEDBACK_LENGTH = 50_000;
const VALID_SOURCES = [
  "hackernews", "github", "stackoverflow", "appstore",
  "reddit", "trustpilot", "web", "youtube", "googleplay", "custom",
  "polymarket", "reddit_top", "tiktok", "x", "perplexity",
] as const;

export interface ValidatedAnalyzeInput {
  productName: string;
  website?: string;
  competitors?: string;
  sources?: string[];
  useCache?: boolean;
  customFeedback?: string;
  days?: number;
  includeMarketSignals?: boolean;
  marketSignalSources?: string[];
}

export function validateAnalyzeInput(body: unknown): ValidatedAnalyzeInput {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }

  const b = body as Record<string, unknown>;

  if (!isString(b.productName) || b.productName.trim().length === 0) {
    throw new ValidationError("productName is required and must be a non-empty string");
  }
  if (b.productName.length > MAX_PRODUCT_NAME_LENGTH) {
    throw new ValidationError(`productName must be at most ${MAX_PRODUCT_NAME_LENGTH} characters`);
  }

  if (!isOptionalString(b.website)) {
    throw new ValidationError("website must be a string");
  }
  if (isString(b.website) && b.website.length > MAX_WEBSITE_LENGTH) {
    throw new ValidationError(`website must be at most ${MAX_WEBSITE_LENGTH} characters`);
  }
  if (isString(b.website) && b.website.trim()) {
    let url: URL;
    try { url = new URL(b.website.includes('://') ? b.website : `https://${b.website}`); }
    catch { throw new ValidationError('website must be a public HTTP or HTTPS URL'); }
    const host = url.hostname.toLowerCase();
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      !host.includes('.') || host.endsWith('.localhost') || host.endsWith('.local') ||
      /^\[|^(?:0|10|127|169\.254|192\.168)\./.test(host) || /^172\.(?:1[6-9]|2\d|3[01])\./.test(host)) {
      throw new ValidationError('website must be a public HTTP or HTTPS URL');
    }
  }
  if (b.days !== undefined && (!Number.isInteger(b.days) || Number(b.days) < 1 || Number(b.days) > 90)) {
    throw new ValidationError('days must be an integer between 1 and 90');
  }
  if (!isOptionalBoolean(b.includeMarketSignals)) throw new ValidationError('includeMarketSignals must be a boolean');
  if (b.marketSignalSources !== undefined) validateMarketSignalsInput({ topic: b.productName, sources: b.marketSignalSources });

  if (!isOptionalString(b.competitors)) {
    throw new ValidationError("competitors must be a string");
  }
  if (isString(b.competitors) && b.competitors.length > MAX_COMPETITORS_LENGTH) {
    throw new ValidationError(`competitors must be at most ${MAX_COMPETITORS_LENGTH} characters`);
  }

  if (b.sources !== undefined && b.sources !== null) {
    if (!Array.isArray(b.sources)) {
      throw new ValidationError("sources must be an array");
    }
    for (const s of b.sources) {
      if (!isString(s) || !(VALID_SOURCES as readonly string[]).includes(s)) {
        throw new ValidationError(`Invalid source: "${s}". Valid sources: ${VALID_SOURCES.join(", ")}`);
      }
    }
  }

  if (!isOptionalBoolean(b.useCache)) {
    throw new ValidationError("useCache must be a boolean");
  }

  if (!isOptionalString(b.customFeedback)) {
    throw new ValidationError("customFeedback must be a string");
  }
  if (isString(b.customFeedback) && b.customFeedback.length > MAX_CUSTOM_FEEDBACK_LENGTH) {
    throw new ValidationError(`customFeedback must be at most ${MAX_CUSTOM_FEEDBACK_LENGTH} characters`);
  }

  return {
    productName: b.productName.trim(),
    website: isString(b.website) ? b.website.trim() : undefined,
    competitors: isString(b.competitors) ? b.competitors.trim() : undefined,
    sources: Array.isArray(b.sources) ? [...new Set(b.sources as string[])] : isString(b.customFeedback) && b.customFeedback.trim() ? ['custom'] : ['hackernews', 'github', 'stackoverflow', 'appstore'],
    days: typeof b.days === 'number' ? b.days : 30,
    includeMarketSignals: b.includeMarketSignals === true,
    marketSignalSources: Array.isArray(b.marketSignalSources) ? [...new Set(b.marketSignalSources as string[])] : undefined,
    useCache: typeof b.useCache === "boolean" ? b.useCache : undefined,
    customFeedback: isString(b.customFeedback) ? b.customFeedback : undefined,
  };
}

export interface ValidatedCollectInput {
  productName: string;
  website?: string;
  competitors?: string;
  analysisId?: string;
  sources?: string[];
  customFeedback?: string;
}

export function validateCollectInput(body: unknown): ValidatedCollectInput {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }

  const b = body as Record<string, unknown>;

  if (!isString(b.productName) || b.productName.trim().length === 0) {
    throw new ValidationError("productName is required");
  }
  if (b.productName.length > MAX_PRODUCT_NAME_LENGTH) {
    throw new ValidationError(`productName must be at most ${MAX_PRODUCT_NAME_LENGTH} characters`);
  }

  if (b.analysisId !== undefined && b.analysisId !== null) {
    if (!isString(b.analysisId) || !/^[0-9a-f-]{36}$/i.test(b.analysisId)) {
      throw new ValidationError("analysisId must be a valid UUID");
    }
  }

  return {
    productName: b.productName.trim(),
    website: isString(b.website) ? b.website.trim() : undefined,
    competitors: isString(b.competitors) ? b.competitors.trim() : undefined,
    analysisId: isString(b.analysisId) ? b.analysisId : undefined,
    sources: Array.isArray(b.sources) ? b.sources.filter((s): s is string => isString(s)) : undefined,
    customFeedback: isString(b.customFeedback) ? b.customFeedback : undefined,
  };
}

export interface ValidatedClassifyInput {
  analysisId: string;
}

export function validateClassifyInput(body: unknown): ValidatedClassifyInput {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  if (!isString(b.analysisId) || !/^[0-9a-f-]{36}$/i.test(b.analysisId)) {
    throw new ValidationError("analysisId is required and must be a valid UUID");
  }
  return { analysisId: b.analysisId };
}

// ─── Market Signals validation ──────────────────────────────────

const VALID_MARKET_SOURCES = [
  "polymarket", "reddit_top", "hackernews", "github", "youtube", "tiktok", "x", "perplexity",
] as const;

export interface ValidatedMarketSignalsInput {
  topic: string;
  sources?: string[];
}

export function validateMarketSignalsInput(body: unknown): ValidatedMarketSignalsInput {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }

  const b = body as Record<string, unknown>;

  const topic = isString(b.topic) ? b.topic.trim() : isString(b.productName) ? b.productName.trim() : "";
  if (!topic) {
    throw new ValidationError("topic (or productName) is required");
  }
  if (topic.length > MAX_PRODUCT_NAME_LENGTH) {
    throw new ValidationError(`topic must be at most ${MAX_PRODUCT_NAME_LENGTH} characters`);
  }

  let sources: string[] | undefined;
  if (b.sources !== undefined && b.sources !== null) {
    if (!Array.isArray(b.sources)) {
      throw new ValidationError("sources must be an array");
    }
    for (const s of b.sources) {
      if (!isString(s) || !(VALID_MARKET_SOURCES as readonly string[]).includes(s)) {
        throw new ValidationError(`Invalid market source: "${s}". Valid: ${VALID_MARKET_SOURCES.join(", ")}`);
      }
    }
    sources = b.sources as string[];
  }

  return { topic, sources };
}
