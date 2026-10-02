"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction } from "@/components/interactive";
import { Button, Card } from "@/components/ui";
import { api } from "@/lib/client";

export function JoinCampaign() {
  const router = useRouter();
  const { busy, run } = useAction();
  const [code, setCode] = useState("");
  return (
    <Card className="p-5">
      <p className="kicker mb-2">Kampanyaya katıl</p>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() => api<{ id: string }>("/api/campaigns/join", { body: { code } }), "Kampanyaya katıldın.");
          if (r) router.push(`/kampanya/${r.id}`);
        }}
      >
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD-EFGH" maxLength={12} className="input font-mono uppercase" />
        <Button type="submit" variant="primary" disabled={busy || code.length < 4}>
          Katıl
        </Button>
      </form>
    </Card>
  );
}
