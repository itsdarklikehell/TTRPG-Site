import { route } from "@/lib/api";
import { characterAccess, ownerCharacter, publicCharacter } from "@/lib/access";

export const GET = route({}, async ({ params, user }) => {
  const a = await characterAccess(params.id, user);
  if (a.isGM) return { character: a.character, view: "gm" };
  if (a.isOwner) return { character: ownerCharacter(a.character), view: "owner" };
  return { character: publicCharacter(a.character), view: "public" };
});
