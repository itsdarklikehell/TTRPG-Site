import { route } from "@/lib/api";
import { destroyAllSessions } from "@/lib/auth/core";
import { endSession } from "@/lib/auth/session";

export const POST = route({}, async ({ user }) => {
  await destroyAllSessions(user.id);
  await endSession();
  return { ok: true };
});
