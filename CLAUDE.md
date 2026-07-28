# case3-rag — 社内文書検索AI（RAG）

AIエンジニア講座 案件3の成果物。架空クライアント「株式会社テックブリッジ」向けの社内文書検索AI（MVP）。

## このプロジェクトの目的
- 社内文書（PDF）をAIに読み込ませ、質問に**出典付き**で回答するRAGを実装する
- 文書に無い内容は「該当する情報が見つかりません」と答える（ハルシネーション抑制）
- **ポートフォリオ素材**として綺麗に残す（実案件受注時に見せる）

## 技術構成（Step2で確定）
- UI/API: Next.js (App Router) + Vercel
- DB: Supabase（東京リージョン）+ pgvector
- Embedding: OpenAI `text-embedding-3-small`（1536次元）※Claudeは埋め込みAPI非提供
- 回答生成: Anthropic Claude（Sonnet）
- 認証: Supabase Auth + 社内メールドメイン制限

## パイプライン
取り込み: PDF → テキスト抽出 → チャンキング → Embedding → pgvector保存
検索: 質問 → Embedding → ベクトル類似検索(上位5) → Claudeで回答生成 → 出典付き表示

## Worktree並列開発（講座の学習ポイント）
- `../rag-embeddings` (feature/embeddings) … 取り込みパイプライン
- `../rag-search-api` (feature/search-api) … 検索＆回答API
- `../rag-ui` (feature/ui) … チャットUI＋認証
- 共通基盤（lib/・supabase/schema.sql・data/）はmainに置き、各worktreeはそこから分岐

## 重要な約束
- `SUPABASE_SERVICE_ROLE_KEY` と各APIキーはサーバー専用。`NEXT_PUBLIC_` 以外はクライアントに出さない
- 秘密値は `.env.local`（git管理外）。雛形は `.env.local.example`
- 埋め込み次元(1536)は `lib/config.ts` と `supabase/schema.sql` の両方で一致させる

## 主要ファイル
- `lib/config.ts` … 環境変数・定数の一元管理
- `lib/types.ts` … 共通型
- `lib/chunk.ts` … チャンキング
- `lib/embedding.ts` … OpenAI埋め込み
- `lib/supabaseAdmin.ts` … サーバー専用Supabaseクライアント
- `supabase/schema.sql` … pgvectorスキーマ＋match_documents RPC
- `data/` … ダミー文書5本（source=md / pdf）＋ case3-test-questions.csv（精度検証用12問）
