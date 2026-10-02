import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "shz_session";
const PUBLIC = [/^\/giris(\/|$)/, /^\/kayit(\/|$)/, /^\/kurallar(\/|$)/, /^\/api\//, /^\/emblems\//, /^\/favicon/];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname; // basePath hariç
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  // Kaba erişim kontrolü (asıl doğrulama sunucu tarafında yapılır).
  if (!PUBLIC.some((r) => r.test(path)) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/giris";
    url.search = path !== "/" ? `?sonra=${encodeURIComponent(path)}` : "";
    return NextResponse.redirect(url);
  }

  // İçerik Güvenliği Politikası: her istek için yeni nonce.
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  const host = req.headers.get("host") ?? "";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' wss://${host}${dev ? ` ws://${host}` : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico).*)" }],
};
