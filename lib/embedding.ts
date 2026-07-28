import OpenAI from "openai";
import { config } from "./config";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: config.openai.apiKey() });
  return client;
}

/** 1本のテキストを埋め込みベクトルに変換 */
export async function embedText(text: string): Promise<number[]> {
  const res = await getClient().embeddings.create({
    model: config.openai.embeddingModel,
    input: text.replace(/\n/g, " "),
  });
  return res.data[0].embedding;
}

/** 複数テキストをまとめて埋め込み（取り込み時のバッチ用・API往復を減らす） */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await getClient().embeddings.create({
    model: config.openai.embeddingModel,
    input: texts.map((t) => t.replace(/\n/g, " ")),
  });
  // input順とdata順は一致する
  return res.data.map((d) => d.embedding);
}
