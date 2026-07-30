import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

/**
 * APIリクエストの Authorization: Bearer <access_token> を検証する（サーバー専用）。
 * 有効なSupabaseセッションかつ社内メールドメインのユーザーのみ許可。
 * @returns 認証OKなら { email }、NGなら null（呼び出し側で401を返す）
 */
export async function getAuthedUser(req: Request): Promise<{ email: string } | null> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  const token = header?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  // anonキーのクライアントでトークンを検証（getUser(jwt)はサーバー側で署名検証する）
  const supabase = createClient(config.supabase.url(), config.supabase.anonKey(), {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;

  const email = data.user.email.toLowerCase();
  // クライアント側ゲートと同じ社内ドメイン制限をサーバーでも強制
  if (!email.endsWith(`@${config.allowedEmailDomain}`)) return null;

  return { email };
}
