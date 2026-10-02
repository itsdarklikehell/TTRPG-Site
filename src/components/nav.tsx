import Link from "next/link";
import { SunLogo } from "./logo";
import type { SessionUser } from "@/lib/auth/session";
import { LogoutButton, MobileMenu } from "./nav-client";

export function Brand() {
  return (
    <Link href="/panel" className="flex items-center gap-2.5">
      <SunLogo className="h-8 w-8 text-accent" />
      <span className="leading-tight">
        <span className="block font-serif text-[15px] font-semibold tracking-[0.06em] text-ink">SCHWARZESONNE</span>
        <span className="block text-[10px] uppercase tracking-[0.22em] text-accent">Umbra Caelis</span>
      </span>
    </Link>
  );
}

export function TopNav({ user }: { user: SessionUser | null }) {
  const links = user
    ? [
        { href: "/panel", label: "Panel" },
        { href: "/kurallar", label: "Kurallar" },
        ...(user.role === "GM" ? [{ href: "/yonetim", label: "Yönetim" }] : []),
        { href: "/hesap", label: "Hesap" },
      ]
    : [
        { href: "/kurallar", label: "Kurallar" },
        { href: "/giris", label: "Giriş" },
      ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm text-muted transition hover:bg-surface2 hover:text-ink">
              {l.label}
            </Link>
          ))}
          {user && (
            <>
              <span className="mx-2 h-5 w-px bg-line" />
              <span className="mr-1 text-sm text-ink/80">
                {user.displayName}
                {user.role === "GM" && <span className="ml-1.5 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">GM</span>}
              </span>
              <LogoutButton />
            </>
          )}
        </nav>
        <MobileMenu links={links} loggedIn={!!user} name={user?.displayName ?? null} />
      </div>
    </header>
  );
}
