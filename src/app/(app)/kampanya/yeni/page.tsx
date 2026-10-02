import type { Metadata } from "next";
import { CampaignForm } from "@/components/campaign/campaign-form";
import { Card, PageHeader } from "@/components/ui";
import { pageGM } from "@/lib/auth/session";
import { content } from "@/lib/shz/content";

export const metadata: Metadata = { title: "Yeni kampanya" };

export default async function NewCampaign() {
  await pageGM();
  return (
    <div className="max-w-5xl">
      <PageHeader kicker="GM" title="Yeni kampanya">
        Kampanyayı oluşturduktan sonra oyuncularına katılma kodunu ya da kampanyaya bağlı bir davet kodu gönder.
      </PageHeader>
      <Card className="p-6">
        <CampaignForm presets={content().campaigns} />
      </Card>
    </div>
  );
}
