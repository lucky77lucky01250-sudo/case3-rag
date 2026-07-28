import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

/**
 * service_role キーを使うサーバー専用クライアント。
 * RLSをバイパスするため、**絶対にクライアント（ブラウザ）へ渡さない**。
 * 取り込みスクリプトと API Route（サーバー側）でのみ使用する。
 */
export function createAdminClient() {
  return createClient(config.supabase.url(), config.supabase.serviceRoleKey(), {
    auth: { persistSession: false },
  });
}
