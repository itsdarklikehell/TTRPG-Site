import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { route } from "@/lib/api";

export const GET = route({ auth: "admin" }, async () => {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      isAdmin: users.isAdmin,
      disabled: users.disabled,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));
  return { users: rows };
});
