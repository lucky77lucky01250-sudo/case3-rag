import pdfParse from "pdf-parse";
import { config } from "./config";

export interface PdfChunk {
  section: string | null;
  page: number | null;
  content: string;
}

/** PDFを1ページずつテキスト抽出する（ページ番号を出典に使うため） */
async function extractPages(buffer: Buffer): Promise<string[]> {
  const pages: string[] = [];
  // pdf-parse は各ページで pagerender を呼ぶ。順番に配列へ積む
  const render = (pageData: {
    getTextContent: (o: object) => Promise<{ items: { str: string; transform: number[] }[] }>;
  }) =>
    pageData
      .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
      .then((tc) => {
        let lastY: number | null = null;
        let text = "";
        for (const item of tc.items) {
          const y = item.transform[5];
          if (lastY === null || lastY === y) text += item.str;
          else text += "\n" + item.str;
          lastY = y;
        }
        pages.push(text);
        return text;
      });

  await pdfParse(buffer, { pagerender: render });
  return pages;
}

/** 見出し行か判定（「第N章 …」「N. …」形式・短く・句読点で終わらない） */
function isHeading(line: string): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length > 30) return false;
  if (/[。、]$/.test(t)) return false;
  return /^第\d+章[\s　].+$/.test(t) || /^\d+\.[\s　].+$/.test(t);
}

/**
 * PDFバッファを「見出しでセクション分け・ページ番号つき」のチャンクに変換する。
 * セクションが長い場合は config.chunk.size を目安に分割する。
 */
export async function pdfToChunks(buffer: Buffer): Promise<PdfChunk[]> {
  const pages = await extractPages(buffer);

  // (行, ページ番号) のフラットな列にする
  const lines: { text: string; page: number }[] = [];
  pages.forEach((pageText, i) => {
    for (const raw of pageText.split(/\r?\n/)) {
      const t = raw.trim();
      if (t) lines.push({ text: t, page: i + 1 });
    }
  });

  const chunks: PdfChunk[] = [];
  let section: string | null = null;
  let buf: string[] = [];
  let bufPage: number | null = null;

  const flush = () => {
    if (buf.length === 0) return;
    chunks.push({ section, page: bufPage, content: buf.join("\n") });
    buf = [];
    bufPage = null;
  };

  for (const ln of lines) {
    if (isHeading(ln.text)) {
      flush();
      section = ln.text;
      continue;
    }
    if (buf.length === 0) bufPage = ln.page;
    buf.push(ln.text);
    if (buf.join("\n").length >= config.chunk.size) flush();
  }
  flush();

  return chunks;
}
