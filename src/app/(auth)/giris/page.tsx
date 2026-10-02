import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sonra?: string }> }) {
  const { sonra } = await searchParams;
  // Yalnızca site içi yollara yönlendir (açık yönlendirme engeli).
  const next = sonra && /^\/[a-zA-Z0-9/_\-#?=&]*$/.test(sonra) && !sonra.startsWith("//") ? sonra : "/panel";
  return <LoginForm next={next} />;
}
