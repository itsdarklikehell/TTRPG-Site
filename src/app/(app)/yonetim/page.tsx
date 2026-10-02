import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { pageGM } from "@/lib/auth/session";
import { AdminPanel } from "./admin-panel";

export const metadata: Metadata = { title: "Yönetim" };

export default async function AdminPage() {
  const user = await pageGM();
  const camps = await db.select({ id: campaigns.id, name: campaigns.name }).from(campaigns).where(eq(campaigns.gmId, user.id));
  return (
    <div>
      <PageHeader kicker="GM" title="Yönetim">
        Oyunculara davet kodu üret, hesapları yönet. Kayıt yalnızca davet koduyla yapılabilir; her kod tek kullanımlıktır.
      </PageHeader>
      <AdminPanel campaigns={camps} selfId={user.id} isAdmin={user.isAdmin} />
    </div>
  );
}
