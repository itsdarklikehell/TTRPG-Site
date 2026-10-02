"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { api } from "@/lib/client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError(null);
        try {
          await api("/api/auth/login", { body: { username: f.get("username"), password: f.get("password") } });
          router.replace(next);
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <Field label="Kullanıcı adı">
        <input name="username" autoComplete="username" required maxLength={40} className="input" autoFocus />
      </Field>
      <Field label="Şifre">
        <input name="password" type="password" autoComplete="current-password" required maxLength={200} className="input" />
      </Field>
      {error && <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={busy}>
        {busy ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>
      <p className="text-center text-sm text-muted">
        Davet kodun mu var?{" "}
        <Link href="/kayit" className="text-accent hover:underline">
          Hesap oluştur
        </Link>
      </p>
    </form>
  );
}
