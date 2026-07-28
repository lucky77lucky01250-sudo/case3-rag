# 社内文書検索AI（RAG） — case3-rag

社内文書（PDF）を読み込ませ、質問に**出典付き**で回答するRAGアプリ。文書に無い内容は「該当する情報が見つかりません」と答え、ハルシネーションを抑制する。

AIエンジニア講座 案件3の成果物（架空クライアント「株式会社テックブリッジ」向けMVP）。

## 技術構成
- **UI/API**: Next.js (App Router) + Vercel
- **DB**: Supabase（東京リージョン）+ pgvector
- **Embedding**: OpenAI `text-embedding-3-small`（1536次元）
- **回答生成**: Anthropic Claude（Sonnet）
- **認証**: Supabase Auth + 社内メールドメイン制限

## パイプライン
```
取り込み: PDF → テキスト抽出 → チャンキング → Embedding → pgvector保存
検索:     質問 → Embedding → ベクトル類似検索(上位5) → Claudeで回答生成 → 出典付き表示
```

## セットアップ
1. 依存インストール
   ```bash
   npm install
   ```
2. Supabase（case3専用の新規プロジェクト・東京リージョン）を作成し、`supabase/schema.sql` をSQL Editorで実行
3. 環境変数を設定
   ```bash
   cp .env.local.example .env.local
   # .env.local に各キーを記入
   ```
4. 文書を取り込み
   ```bash
   npm run ingest
   ```
5. 開発サーバー起動
   ```bash
   npm run dev
   ```

## ディレクトリ
- `lib/` … 共通ロジック（config / types / chunk / embedding / supabase）
- `supabase/schema.sql` … pgvectorスキーマ＋類似検索RPC
- `scripts/` … 取り込み・検証スクリプト
- `data/` … ダミー文書5本＋精度検証用CSV（12問）

## 開発（Worktree並列）
機能ごとにgit worktreeで並列開発している。
- `rag-embeddings` … 取り込みパイプライン
- `rag-search-api` … 検索＆回答API
- `rag-ui` … チャットUI＋認証

> ⚠️ 本リポジトリの文書はすべてRAG検証用のサンプルであり、実在の規程ではありません。
