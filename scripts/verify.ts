/**
 * 精度検証: data/case3-test-questions.csv の全12問をパイプラインに通し、
 * 期待回答と照合する。ハルシネーション検証（該当なし2問）は notFound を確認する。
 *
 * 前提: .env.local にキー設定済み ＋ `npm run ingest` で取り込み済み。
 *   npm run verify
 */
import "../lib/loadEnv";
import { readFileSync } from "fs";
import path from "path";
import { searchChunks } from "../lib/search";
import { generateAnswer } from "../lib/anthropic";

interface Row {
  no: string;
  question: string;
  expected: string;
  kind: string; // 「該当あり」/「該当なし（…）」
}

/** このCSV特有のパース（期待回答に「3,000」等のカンマが混じる。列数は6固定） */
function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).slice(1); // ヘッダ除外
  return lines.map((line) => {
    const p = line.split(",");
    const kind = p[p.length - 1];
    const no = p[0];
    const question = p[1];
    // 出典文書・出典セクションは末尾2列、期待回答はその間（カンマを含みうる）
    const expected = p.slice(2, p.length - 3).join(",");
    return { no, question, expected, kind };
  });
}

async function main() {
  const csv = readFileSync(path.join(process.cwd(), "data", "case3-test-questions.csv"), "utf-8");
  const rows = parseCsv(csv);

  let hitCorrect = 0; // 該当ありで回答できた数
  let hitTotal = 0;
  let missCorrect = 0; // 該当なしで正しく弾いた数
  let missTotal = 0;

  for (const r of rows) {
    const chunks = await searchChunks(r.question);
    const { answer, citations, notFound } = await generateAnswer(r.question, chunks);
    const isNoInfo = r.kind.startsWith("該当なし");

    let ok: boolean;
    if (isNoInfo) {
      missTotal++;
      ok = notFound; // 「該当する情報が見つかりません」と答えられればOK
      if (ok) missCorrect++;
    } else {
      hitTotal++;
      ok = !notFound && answer.trim().length > 0;
      if (ok) hitCorrect++;
    }

    const cite = citations.map((c) => c.source.replace(/^case3-doc\d+-/, "")).join(", ");
    console.log(`\n[${r.no}] ${ok ? "✅" : "❌"} ${r.question}`);
    console.log(`  期待: ${r.expected}`);
    console.log(`  回答: ${answer}`);
    if (!isNoInfo) console.log(`  出典: ${cite || "（なし）"}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log(`該当あり: ${hitCorrect}/${hitTotal} 回答` +
    ` … 目標80%（${Math.ceil(hitTotal * 0.8)}問以上）: ${hitCorrect >= Math.ceil(hitTotal * 0.8) ? "達成" : "未達"}`);
  console.log(`該当なし: ${missCorrect}/${missTotal} 正しく「該当なし」`);
  console.log("※回答の内容一致は目視で最終確認してください（期待↔回答）");
}

main().catch((e) => {
  console.error("検証失敗:", e.message ?? e);
  process.exit(1);
});
