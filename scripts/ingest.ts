/**
 * 取り込みパイプライン: data/pdf/*.pdf を
 *   PDF抽出 → チャンキング → Embedding → pgvector(documents) 保存 する。
 *
 * 使い方:
 *   npm run ingest          # 本番: 埋め込み→Supabaseへ保存（キー必須）
 *   npm run ingest -- --dry # ドライラン: チャンク分割だけ確認（キー不要）
 */
import "../lib/loadEnv";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { pdfToChunks } from "../lib/pdf";
import { embedBatch } from "../lib/embedding";
import { createAdminClient } from "../lib/supabaseAdmin";

const PDF_DIR = path.join(process.cwd(), "data", "pdf");
const DRY = process.argv.includes("--dry");

async function main() {
  const files = readdirSync(PDF_DIR).filter((f) => f.endsWith(".pdf")).sort();
  if (files.length === 0) {
    console.error(`PDFが見つかりません: ${PDF_DIR}`);
    process.exit(1);
  }
  console.log(`取り込み対象: ${files.length}本 ${DRY ? "(ドライラン)" : ""}\n`);

  // 1) 全PDFをチャンク化
  type Row = { source: string; section: string | null; page: number | null; content: string };
  const rows: Row[] = [];
  for (const file of files) {
    const source = file.replace(/\.pdf$/, "");
    const chunks = await pdfToChunks(readFileSync(path.join(PDF_DIR, file)));
    console.log(`■ ${source}: ${chunks.length}チャンク`);
    for (const c of chunks) {
      console.log(`   - p${c.page ?? "?"} [${c.section ?? "（見出しなし）"}] ${c.content.slice(0, 34).replace(/\n/g, " ")}…`);
      rows.push({ source, section: c.section, page: c.page, content: c.content });
    }
  }
  console.log(`\n合計 ${rows.length}チャンク`);

  if (DRY) {
    console.log("\n[--dry] 埋め込み・保存はスキップしました。");
    return;
  }

  // 2) 埋め込み（バッチでAPI往復を削減）
  console.log("\n埋め込み生成中…");
  const embeddings = await embedBatch(rows.map((r) => r.content));

  // 3) Supabaseへ保存（既存を全消ししてから入れ直す＝冪等）
  const supabase = createAdminClient();
  console.log("既存documentsを削除中…");
  const { error: delErr } = await supabase.from("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) throw delErr;

  const payload = rows.map((r, i) => ({ ...r, embedding: embeddings[i] }));
  console.log(`${payload.length}件を挿入中…`);
  const { error: insErr } = await supabase.from("documents").insert(payload);
  if (insErr) throw insErr;

  console.log("\n✅ 取り込み完了");
}

main().catch((e) => {
  console.error("\n❌ 取り込み失敗:", e.message ?? e);
  process.exit(1);
});
