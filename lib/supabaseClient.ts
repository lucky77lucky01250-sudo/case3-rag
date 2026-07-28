"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/** ブラウザ用Supabaseクライアント（anonキー・認証用）。未設定なら明確なエラー */
export function getSupabaseBrowser(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabaseの環境変数(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)が未設定です。.env.localを確認してください。"
    );
  }
  if (!browserClient) browserClient = createClient(url, anon);
  return browserClient;
}

/** 認証を許可する社内メールドメイン */
export const ALLOWED_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "techbridge.co.jp";
