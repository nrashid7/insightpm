import { AppError } from "./errors.ts";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

export async function embedText(text: string): Promise<number[]> {
  const provider = Deno.env.get("EMBEDDING_PROVIDER") ?? "openai";

  if (provider === "voyage") {
    try {
      return await embedWithVoyage(text);
    } catch (err) {
      console.warn("[embeddings] Voyage failed, falling back to OpenAI:", err);
      return await embedWithOpenAI(text);
    }
  }

  try {
    return await embedWithOpenAI(text);
  } catch (err) {
    console.warn("[embeddings] OpenAI failed, falling back to Voyage:", err);
    return await embedWithVoyage(text);
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return await Promise.all(texts.map((text) => embedText(text)));
}

async function embedWithOpenAI(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new AppError("Missing OPENAI_API_KEY", 500, "CONFIG_ERROR");
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new AppError(`OpenAI embeddings error: ${errText}`, response.status, "EMBEDDING_ERROR");
  }

  const data = await response.json();
  return data.data[0].embedding as number[];
}

async function embedWithVoyage(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("VOYAGE_API_KEY");
  if (!apiKey) {
    throw new AppError("Missing VOYAGE_API_KEY", 500, "CONFIG_ERROR");
  }

  const response = await fetch(VOYAGE_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "voyage-3",
      input: text,
      output_dimension: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new AppError(`Voyage embeddings error: ${errText}`, response.status, "EMBEDDING_ERROR");
  }

  const data = await response.json();
  return data.data[0].embedding as number[];
}

export function chunkText(
  text: string,
  chunkSize = 800,
  overlap = 100,
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) break;
    start = end - overlap;
  }

  return chunks;
}
