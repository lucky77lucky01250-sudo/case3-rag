import { NextResponse } from "next/server";
import { searchChunks } from "@/lib/search";
import { generateAnswer } from "@/lib/anthropic";
import type { SearchRequest, SearchResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: SearchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const question = body?.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "質問(question)が空です" }, { status: 400 });
  }

  try {
    const chunks = await searchChunks(question);
    const { answer, citations, notFound } = await generateAnswer(question, chunks);
    const res: SearchResponse = { answer, citations, notFound };
    return NextResponse.json(res);
  } catch (e) {
    const message = e instanceof Error ? e.message : "不明なエラー";
    console.error("[/api/search] error:", message);
    return NextResponse.json({ error: `検索処理に失敗しました: ${message}` }, { status: 500 });
  }
}
