// 案件3 RAG — 環境変数・定数の一元管理

/** 必須の環境変数を取得（未設定なら分かりやすいエラーで落とす） */
function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `環境変数 ${name} が未設定です。.env.local を確認してください（.env.local.example が雛形です）。`
    );
  }
  return v;
}

export const config = {
  supabase: {
    url: () => required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    // 取り込みスクリプト（サーバー専用）でのみ使用。クライアントに絶対渡さない
    serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  },
  openai: {
    apiKey: () => required("OPENAI_API_KEY"),
    /** 埋め込みモデル。Claudeは埋め込み専用APIを提供しないためOpenAIを使用 */
    embeddingModel: "text-embedding-3-small",
    /** text-embedding-3-small の次元数（スキーマの vector(1536) と一致させること） */
    embeddingDimensions: 1536,
  },
  anthropic: {
    apiKey: () => required("ANTHROPIC_API_KEY"),
    /** 回答生成モデル */
    model: "claude-sonnet-4-5",
  },
  /** 認証を許可する社内メールドメイン（Step2要件: 社内ドメイン制限） */
  allowedEmailDomain: process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "techbridge.co.jp",
  /** チャンキング設定 */
  chunk: {
    /** 1チャンクの目安文字数（日本語） */
    size: 500,
    /** チャンク間のオーバーラップ文字数（文脈の切れ目を緩和） */
    overlap: 100,
  },
  /** 類似検索で取得する上位件数（Step2設計: 上位5件） */
  topK: 5,
} as const;
