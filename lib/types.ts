// 案件3 RAG — 共通型定義

/** pgvector に保存する文書チャンク1件 */
export interface DocumentChunk {
  id: string;
  /** 出典ファイル名（例: case3-doc1-employment-rules） */
  source: string;
  /** 出典セクション見出し（例: 第2章 休日・休暇）。抽出できない場合は null */
  section: string | null;
  /** 何ページ目由来か（PDFのページ番号・1始まり）。不明なら null */
  page: number | null;
  /** チャンク本文 */
  content: string;
  /** 埋め込みベクトル（OpenAI text-embedding-3-small = 1536次元） */
  embedding?: number[];
}

/** 検索でヒットした1件（類似度つき） */
export interface RetrievedChunk {
  source: string;
  section: string | null;
  page: number | null;
  content: string;
  /** コサイン類似度（1に近いほど類似） */
  similarity: number;
}

/** /api/search のリクエスト */
export interface SearchRequest {
  question: string;
}

/** 回答に添える出典 */
export interface Citation {
  source: string;
  section: string | null;
  page: number | null;
}

/** /api/search のレスポンス */
export interface SearchResponse {
  /** AIが生成した回答本文 */
  answer: string;
  /** 出典（回答の根拠にした文書） */
  citations: Citation[];
  /** 文書内に根拠が見つからなかった場合 true（ハルシネーション抑制） */
  notFound: boolean;
}
