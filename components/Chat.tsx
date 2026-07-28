"use client";

import { useRef, useState } from "react";
import type { SearchResponse, Citation } from "@/lib/types";

interface QA {
  question: string;
  answer?: string;
  citations?: Citation[];
  notFound?: boolean;
  error?: string;
  loading: boolean;
}

const EXAMPLES = [
  "有給休暇は入社何ヶ月後に何日付与されますか？",
  "リモートワークは週何日まで可能ですか？",
  "パスワードの最低文字数と変更頻度を教えてください。",
];

function formatSource(c: Citation): string {
  const label = c.source.replace(/^case3-doc\d+-/, "");
  return [label, c.section, c.page ? `p${c.page}` : null].filter(Boolean).join(" / ");
}

export default function Chat({ onSignOut, email }: { onSignOut: () => void; email: string | null }) {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<QA[]>([]);
  const listEndRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    setInput("");
    const index = items.length;
    setItems((prev) => [...prev, { question: q, loading: true }]);
    requestAnimationFrame(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }));

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `サーバーエラー (${res.status})`);
      }
      const data: SearchResponse = await res.json();
      setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...data, loading: false } : it)));
    } catch (e) {
      const message = e instanceof Error ? e.message : "不明なエラー";
      setItems((prev) => prev.map((it, i) => (i === index ? { ...it, error: message, loading: false } : it)));
    } finally {
      requestAnimationFrame(() => listEndRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto">
      <header className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
        <div>
          <h1 className="font-semibold text-sm">社内文書検索AI</h1>
          <p className="text-xs opacity-60">テックブリッジ社内文書（RAG）</p>
        </div>
        <div className="text-right">
          {email && <p className="text-[11px] opacity-60 max-w-[160px] truncate">{email}</p>}
          <button onClick={onSignOut} className="text-xs underline opacity-70 hover:opacity-100">
            ログアウト
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {items.length === 0 && (
          <div className="text-sm opacity-70 space-y-3 pt-8">
            <p>社内文書について質問してください。回答には出典が付きます。</p>
            <div className="space-y-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => ask(ex)}
                  className="block w-full text-left px-3 py-2 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {items.map((it, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-end">
              <p className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap">
                {it.question}
              </p>
            </div>
            <div className="flex justify-start">
              <div className="bg-black/5 dark:bg-white/10 rounded-2xl rounded-bl-sm px-3 py-2 text-sm max-w-[90%]">
                {it.loading && <span className="opacity-60">回答を生成中…</span>}
                {it.error && <span className="text-red-600 dark:text-red-400">エラー: {it.error}</span>}
                {!it.loading && !it.error && (
                  <>
                    <p className={`whitespace-pre-wrap ${it.notFound ? "opacity-70 italic" : ""}`}>{it.answer}</p>
                    {!it.notFound && it.citations && it.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/15">
                        <p className="text-[11px] font-medium opacity-60 mb-1">出典</p>
                        <ul className="space-y-0.5">
                          {it.citations.map((c, j) => (
                            <li key={j} className="text-[11px] opacity-80">
                              📄 {formatSource(c)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={listEndRef} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2 p-3 border-t border-black/10 dark:border-white/10"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="質問を入力…"
          className="flex-1 rounded-full border border-black/15 dark:border-white/20 bg-transparent px-4 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          送信
        </button>
      </form>
    </div>
  );
}
