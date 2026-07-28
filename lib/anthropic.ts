import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config";
import type { RetrievedChunk, Citation } from "./types";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: config.anthropic.apiKey() });
  return client;
}

export interface AnswerResult {
  answer: string;
  citations: Citation[];
  notFound: boolean;
}

const SYSTEM_PROMPT = `あなたは社内文書検索AIです。ユーザーの質問に対し、**与えられた参考文書だけ**を根拠に日本語で回答してください。

厳守ルール:
- 参考文書に書かれている内容だけで答える。文書に無い内容は推測・創作しない。
- 根拠が参考文書に見つからない場合は、notFoundをtrueにし、answerは「該当する情報が見つかりませんでした。」とする。
- 一般常識や文書外の知識で補完しない。
- 回答は簡潔に、要点のみ。

出力は必ず次のJSONのみ（前後に説明やコードフェンスを付けない）:
{"answer": string, "notFound": boolean, "used": number[]}
usedは実際に根拠として使った参考文書の番号（1始まり）の配列。notFoundがtrueなら空配列。`;

/** 検索結果を根拠に、出典付きの回答を生成する */
export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[]
): Promise<AnswerResult> {
  if (chunks.length === 0) {
    return { answer: "該当する情報が見つかりませんでした。", citations: [], notFound: true };
  }

  const context = chunks
    .map((c, i) => `【参考文書${i + 1}】(出典: ${c.source}${c.section ? ` / ${c.section}` : ""}${c.page ? ` / p${c.page}` : ""})\n${c.content}`)
    .join("\n\n");

  const res = await getClient().messages.create({
    model: config.anthropic.model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `質問: ${question}\n\n${context}` }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = parseAnswerJson(text);

  // usedの番号（1始まり）を出典に変換。重複は除去
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const n of parsed.used) {
    const c = chunks[n - 1];
    if (!c) continue;
    const key = `${c.source}|${c.section}|${c.page}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({ source: c.source, section: c.section, page: c.page });
  }

  return {
    answer: parsed.answer,
    notFound: parsed.notFound,
    citations: parsed.notFound ? [] : citations,
  };
}

/** Claudeが返したJSON文字列を安全にパース（コードフェンス等が混ざっても救済） */
function parseAnswerJson(text: string): { answer: string; notFound: boolean; used: number[] } {
  const match = text.match(/\{[\s\S]*\}/);
  const raw = match ? match[0] : text;
  try {
    const obj = JSON.parse(raw);
    return {
      answer: typeof obj.answer === "string" ? obj.answer : "該当する情報が見つかりませんでした。",
      notFound: obj.notFound === true,
      used: Array.isArray(obj.used) ? obj.used.filter((n: unknown) => typeof n === "number") : [],
    };
  } catch {
    // JSONとして読めなかった場合は本文をそのまま回答として扱う（出典なし）
    return { answer: text.trim() || "回答の生成に失敗しました。", notFound: false, used: [] };
  }
}
