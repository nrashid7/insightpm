import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { embedText } from "./embeddings.ts";
import { AppError } from "./errors.ts";

export interface KnowledgeChunkMatch {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function searchKnowledge(
  supabase: SupabaseClient,
  businessId: string,
  query: string,
  matchCount = 5,
): Promise<KnowledgeChunkMatch[]> {
  const embedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: embedding,
    match_business_id: businessId,
    match_count: matchCount,
  });

  if (error) {
    throw new AppError(`Knowledge search failed: ${error.message}`, 500, "RETRIEVAL_ERROR");
  }

  return (data ?? []) as KnowledgeChunkMatch[];
}

export function formatKnowledgeContext(chunks: KnowledgeChunkMatch[]): string {
  if (chunks.length === 0) return "No relevant knowledge found.";

  return chunks
    .map((chunk, i) => `[${i + 1}] (score: ${chunk.similarity.toFixed(3)})\n${chunk.content}`)
    .join("\n\n");
}
