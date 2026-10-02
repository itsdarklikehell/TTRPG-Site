import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Hesap oluştur" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ kod?: string }> }) {
  const { kod } = await searchParams;
  return <RegisterForm code={(kod ?? "").slice(0, 40)} />;
}
