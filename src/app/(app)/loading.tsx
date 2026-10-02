import { SunLogo } from "@/components/logo";

export default function Loading() {
  return (
    <div className="grid min-h-[50dvh] place-items-center" aria-busy="true" aria-label="Yükleniyor">
      <SunLogo className="h-10 w-10 animate-[spin_6s_linear_infinite] text-accent/70" />
    </div>
  );
}
