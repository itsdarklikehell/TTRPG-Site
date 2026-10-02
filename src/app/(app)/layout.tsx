import { TopNav } from "@/components/nav";
import { RoomReturn } from "@/components/room-return";
import { pageUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser();
  return (
    <>
      <TopNav user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <RoomReturn />
    </>
  );
}
