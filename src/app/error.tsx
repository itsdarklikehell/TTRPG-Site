"use client";
import Link from "next/link";
import { useEffect } from "react";
import { SunLogo } from "@/components/logo";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <SunLogo className="mx-auto h-12 w-12 text-accent" />
        <h1 className="mt-4 text-2xl">Bir şeyler ters gitti</h1>
        <p className="mt-2 text-muted">Sayfa yüklenirken bir hata oluştu. Tekrar denemek çoğu zaman yeter.</p>
        {error.digest && <p className="mt-1 font-mono text-xs text-muted">Kod: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-onAccent">
            Tekrar dene
          </button>
          <Link href="/panel" className="rounded-lg border border-line px-4 py-2 text-sm">
            Panele dön
          </Link>
        </div>
      </div>
    </div>
  );
}
