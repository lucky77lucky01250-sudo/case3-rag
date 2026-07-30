# 社内文書検索AI（RAG） — case3-rag

社内文書（PDF）を読み込ませ、質問に**出典付き**で回答するRAGアプリ。文書に無い内容は「該当する情報が見つかりません」と答え、ハルシネーションを抑制する。

AIエンジニア講座 案件3の成果物（架空クライアント「株式会社テックブリッジ」向けMVP）。

**🔗 公開URL: https://case3-rag.vercel.app**
※認証を社内メールドメイン（`@techbridge.co.jp`）に限定しているため、公開URLはログイン画面まで表示されます（機能デモはローカル環境で実施）。バックエンド（`/api/search`）は本番環境でも動作確認済み。

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

## 精度（`npm run verify` 実測）
`data/case3-test-questions.csv`（全12問）で検証。

| 種別 | 結果 |
|---|---|
| 文書に記載あり（10問） | **10/10 正答＋出典表示**（目標80%を達成） |
| 文書に記載なし（2問・育児休業/退職金） | **2/2「該当する情報が見つかりません」**＝ハルシネーション抑制 |

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
5. 精度検証（任意）
   ```bash
   npm run verify
   ```
6. 開発サーバー起動
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

## 設計メモ（実装で得た学び）
- **ベクトルインデックスは HNSW を採用。** 当初 `ivfflat (lists=10)` にしたところ、`probes=1`（既定）が少量データで最近傍を取りこぼし、記載ありの正答が 5/10 に低下。HNSW へ変更して 10/10 に回復した。
- **チャンキングは見出し単位＋ページ番号付き。** PDFから章・節見出し（`第N章` / `N.`）を検出してセクション境界で分割し、出典に「ファイル名＋セクション＋ページ」を付与できるようにした。
- **回答はグラウンディング徹底。** 与えたチャンクのみを根拠にJSON（`answer`/`notFound`/`used`）で生成させ、`used` から出典を機械的に構築。文書外は `notFound=true` で「該当なし」を返す。

## Phase2（別途見積もり・本MVPの対象外）
Word/Confluence対応 ／ 部署別アクセス制御（RLS）／ Slack連携 ／ 差分更新パイプライン ／ **APIのサーバーサイド認証**（MVPの認証はクライアント側ゲート）。

> ⚠️ 本リポジトリの文書はすべてRAG検証用のサンプルであり、実在の規程ではありません。
