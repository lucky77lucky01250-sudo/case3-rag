import { embedText } from "./embedding";
import { createAdminClient } from "./supabaseAdmin";
import { config } from "./config";
import type { RetrievedChunk } from "./types";

/**
 * 質問をベクトル化し、pgvectorの match_documents RPC で類似チャンクを上位K件取得する。
 */
export async function searchChunks(question: string): Promise<RetrievedChunk[]> {
  const embedding = await embedText(question);
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_count: config.topK,
  });
  if (error) throw new Error(`ベクトル検索に失敗: ${error.message}`);

  return (data ?? []).map((row: {
    source: string;
    section: string | null;
    page: number | null;
    content: string;
    similarity: number;
  }) => ({
    source: row.source,
    section: row.section,
    page: row.page,
    content: row.content,
    similarity: row.similarity,
  }));
}
