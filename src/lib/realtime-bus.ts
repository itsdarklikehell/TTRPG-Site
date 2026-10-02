import "server-only";
import type { Server } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __shzIO: Server | undefined;
}

/** API uçlarından oyun odasına bildirim (aynı süreçteki Socket.io sunucusu). */
export function notifyCampaign(campaignId: string, event: string, payload: unknown) {
  globalThis.__shzIO?.to(`c:${campaignId}`).emit(event, payload);
}
export function characterChanged(campaignId: string, characterId: string) {
  notifyCampaign(campaignId, "character:changed", { characterId });
}
