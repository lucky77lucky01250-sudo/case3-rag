-- 案件3 RAG — Supabase スキーマ（pgvector）
-- 適用方法: Supabaseダッシュボード → SQL Editor に貼り付けて実行
-- 前提: case3専用の新規プロジェクト（東京リージョン）

-- 1) pgvector 拡張を有効化
create extension if not exists vector;

-- 2) 文書チャンクテーブル
create table if not exists public.documents (
  id         uuid primary key default gen_random_uuid(),
  source     text not null,               -- 出典ファイル名（例: case3-doc1-employment-rules）
  section    text,                          -- 出典セクション見出し
  page       int,                           -- PDFのページ番号（1始まり）
  content    text not null,                 -- チャンク本文
  embedding  vector(1536) not null,         -- OpenAI text-embedding-3-small = 1536次元
  created_at timestamptz not null default now()
);

-- 3) ベクトル類似検索用インデックス（コサイン距離）
--    件数が少ないうちは ivfflat の lists は小さめでよい
create index if not exists documents_embedding_idx
  on public.documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- 4) 類似検索RPC：質問ベクトルに近いチャンクを上位N件返す
--    similarity = 1 - コサイン距離（1に近いほど類似）
create or replace function public.match_documents(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  source text,
  section text,
  page int,
  content text,
  similarity float
)
language sql stable
as $$
  select
    d.id,
    d.source,
    d.section,
    d.page,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- 5) RLS: MVPでは匿名selectを許可しない（検索はサーバー側のRPC経由）
--    Phase2で部署別アクセス制御（RLSポリシー）を追加する土台
alter table public.documents enable row level security;
-- ※ MVPではポリシーを付けない = service_role（サーバー）のみアクセス可
