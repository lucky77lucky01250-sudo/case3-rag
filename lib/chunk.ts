import { config } from "./config";

export interface RawChunk {
  section: string | null;
  content: string;
}

/**
 * Markdown本文をチャンクに分割する。
 * 方針: まず見出し（## / ###）でセクションに割り、
 *       長いセクションは config.chunk.size を目安にオーバーラップ付きで再分割する。
 * これにより各チャンクに「どのセクション由来か」を保持でき、出典表示に使える。
 */
export function chunkMarkdown(markdown: string): RawChunk[] {
  const lines = markdown.split(/\r?\n/);
  const sections: { section: string | null; body: string[] }[] = [];
  let current: { section: string | null; body: string[] } = { section: null, body: [] };

  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      if (current.body.join("").trim() !== "" || current.section) sections.push(current);
      current = { section: heading[1].trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.join("").trim() !== "" || current.section) sections.push(current);

  const chunks: RawChunk[] = [];
  for (const sec of sections) {
    const text = sec.body.join("\n").trim();
    if (text === "") continue;
    for (const piece of splitBySize(text, config.chunk.size, config.chunk.overlap)) {
      chunks.push({ section: sec.section, content: piece });
    }
  }
  return chunks;
}

/** 文字数ベースでオーバーラップ付き分割（日本語は文字数で十分な近似） */
function splitBySize(text: string, size: number, overlap: number): string[] {
  if (text.length <= size) return [text];
  const out: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    out.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - overlap;
  }
  return out;
}
