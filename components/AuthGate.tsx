"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowser, ALLOWED_EMAIL_DOMAIN } from "@/lib/supabaseClient";

type Status = "loading" | "signed-out" | "signed-in" | "sent" | "config-error";

export default function AuthGate({
  children,
}: {
  children: (ctx: { email: string | null; signOut: () => void }) => React.ReactNode;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseBrowser();
    } catch (e) {
      setError(e instanceof Error ? e.message : "設定エラー");
      setStatus("config-error");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setStatus(data.session ? "signed-in" : "signed-out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setStatus((prev) => (s ? "signed-in" : prev === "sent" ? "sent" : "signed-out"));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const addr = email.trim().toLowerCase();
    // 社内メールドメイン制限（Step2要件）
    if (!addr.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      setError(`@${ALLOWED_EMAIL_DOMAIN} のメールアドレスのみ利用できます。`);
      return;
    }
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: addr,
        options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
      });
      if (err) throw err;
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  function signOut() {
    getSupabaseBrowser().auth.signOut();
    setStatus("signed-out");
  }

  if (status === "signed-in") {
    return <>{children({ email: session?.user.email ?? null, signOut })}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-dvh px-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold">社内文書検索AI</h1>
          <p className="text-sm opacity-60">株式会社テックブリッジ</p>
        </div>

        {status === "config-error" && (
          <div className="text-sm rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="font-medium mb-1">セットアップが必要です</p>
            <p className="opacity-80 text-xs">{error}</p>
          </div>
        )}

        {status === "sent" && (
          <div className="text-sm rounded-lg border border-green-500/40 bg-green-500/10 p-3 space-y-2">
            <p>✉️ ログイン用リンクを送信しました。</p>
            <p className="opacity-70 text-xs">{email} のメールを確認し、リンクからログインしてください。</p>
          </div>
        )}

        {(status === "signed-out" || status === "loading") && (
          <form onSubmit={signIn} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
              className="w-full rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting || status === "loading"}
              className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-medium disabled:opacity-40"
            >
              {submitting ? "送信中…" : "ログインリンクを受け取る"}
            </button>
            <p className="text-[11px] opacity-50 text-center">
              @{ALLOWED_EMAIL_DOMAIN} の社内メールのみアクセスできます
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
