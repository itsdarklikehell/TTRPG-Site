import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { pageUser } from "@/lib/auth/session";
import { AccountForms } from "./account-forms";

export const metadata: Metadata = { title: "Hesap" };

export default async function AccountPage() {
  const user = await pageUser();
  return (
    <div className="max-w-2xl">
      <PageHeader kicker="Hesap" title={user.displayName}>
        @{user.username} · {user.role === "GM" ? "GM" : "Oyuncu"}
      </PageHeader>
      <AccountForms />
    </div>
  );
}
