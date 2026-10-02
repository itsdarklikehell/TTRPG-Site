import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { campaignAccess } from "@/lib/access";
import { pageUser } from "@/lib/auth/session";
import { rulesData } from "@/lib/shz/content";
import { Wizard } from "./wizard";

export const metadata: Metadata = { title: "Karakter oluştur" };

export default async function CreateCharacter({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser();
  const access = await campaignAccess(id, user).catch(() => null);
  if (!access) notFound();
  return (
    <div>
      <PageHeader kicker={access.campaign.name} title="Karakter oluştur">
        Adımları sırayla doldur. Sağdaki özet her seçimde güncellenir; sorun varsa orada yazar. Karakterin GM onayından sonra aktif olur.
      </PageHeader>
      <Wizard campaignId={id} startPerkPoints={access.campaign.startPerkPoints} data={rulesData()} />
    </div>
  );
}
