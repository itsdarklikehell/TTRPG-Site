import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div>
        <p className="text-5xl">☀️</p>
        <h1 className="mt-4 text-3xl">Burada bir şey yok</h1>
        <p className="mt-2 text-muted">Aradığın sayfa bulunamadı ya da görme iznin yok.</p>
        <Link href="/panel" className="mt-6 inline-block text-accent hover:underline">
          Panele dön
        </Link>
      </div>
    </div>
  );
}
