"use client";
import { withBase } from "./base";

/** Uygulama API'sine JSON isteği; hata durumunda sunucunun mesajını fırlatır. */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(withBase(path), {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: opts.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* gövdesiz cevap */
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `İstek başarısız (${res.status})`;
    if (res.status === 401 && typeof window !== "undefined") window.location.href = withBase("/giris");
    throw new Error(msg);
  }
  return data as T;
}
