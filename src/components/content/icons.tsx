import {
  BicepsFlexed,
  Bird,
  Bone,
  BookX,
  Box,
  Brain,
  Car,
  Church,
  Cigarette,
  Clover,
  Cog,
  Coins,
  Cpu,
  Cross,
  Crosshair,
  Droplets,
  Dumbbell,
  Eye,
  EyeOff,
  Feather,
  Footprints,
  Gauge,
  Glasses,
  HandCoins,
  Heart,
  HeartCrack,
  Languages,
  type LucideIcon,
  Magnet,
  MapPinned,
  Medal,
  Megaphone,
  MessageCircle,
  MessageCircleOff,
  MessagesSquare,
  Moon,
  Pill,
  Rabbit,
  Scale,
  ScanEye,
  ScrollText,
  Shield,
  Skull,
  Snowflake,
  Soup,
  Sparkles,
  Stamp,
  Sword,
  Swords,
  Syringe,
  Thermometer,
  Turtle,
  VenetianMask,
  Wind,
  Wine,
  Wrench,
  Zap,
} from "lucide-react";
import { SunLogo } from "../logo";
import { cx } from "../ui";

const PERK_ICONS: Record<string, LucideIcon> = {
  "careful-runner": Footprints,
  "one-hander": Sword,
  "speed-demon": Car,
  "two-hander": Swords,
  kench: Soup,
  bladesmith: Wrench,
  eisblut: Snowflake,
  falscher: Stamp,
  feldsanitater: Cross,
  katze: Eye,
  ortskundig: MapPinned,
  schwarzmarkt: HandCoins,
  trilingual: Languages,
  adlerauge: Crosshair,
  extrovert: MessageCircle,
  gluckspilz: Clover,
  heimwerker: Cog,
  runenkundig: ScrollText,
  schnell: Wind,
  tesla: Zap,
  cheetah: Rabbit,
  "follower-of-dreamer": Sparkles,
  metallvertraglich: Magnet,
  ruthig: VenetianMask,
  beherzt: Heart,
  "tdt-teich-der-toten": Droplets,
  adaptable: Thermometer,
  ubermuscler: Dumbbell,
  ubermensch: BicepsFlexed,
  "veteran-of-47": Medal,
  "sunday-driver": Turtle,
  tiryaki: Cigarette,
  analphabet: BookX,
  ayyas: Wine,
  empfi: Soup,
  kurzsichtig: Glasses,
  monolingual: MessageCircleOff,
  verschuldet: Coins,
  blutscheu: Droplets,
  ehrenkodex: Scale,
  gesucht: Crosshair,
  klaustrophob: Box,
  oaf: Footprints,
  okkultphobie: Skull,
  schlaflos: Moon,
  gottesfurchtig: Church,
  introvert: MessageCircleOff,
  kriegszitterer: Zap,
  laut: Megaphone,
  recovered: Pill,
  delicate: Feather,
  metallabstossung: Magnet,
  runenblind: EyeOff,
  "such-tiger": Syringe,
  unthermo: Thermometer,
  scheu: HeartCrack,
  kriegsversehrt: Bone,
  zargana: Feather,
  schizo: Brain,
  "pressured-pacifism": Bird,
};

export function PerkIcon({ perkKey, kind, className }: { perkKey: string; kind: "positive" | "negative"; className?: string }) {
  const I = PERK_ICONS[perkKey] ?? (kind === "positive" ? Shield : ScanEye);
  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center rounded-lg border",
        kind === "positive" ? "border-ok/30 bg-ok/10 text-ok" : "border-danger/30 bg-danger/10 text-danger",
        className ?? "h-10 w-10",
      )}
      aria-hidden
    >
      <I className="h-[55%] w-[55%]" strokeWidth={1.8} />
    </span>
  );
}

const TREE_ICONS: Record<string, LucideIcon | "sun"> = {
  ubermann: Shield,
  stahlkrieg: Crosshair,
  spionage: VenetianMask,
  diplomat: MessagesSquare,
  wunderwaffe: Cog,
  schwarzesonne: "sun",
  metallkorp: Cpu,
};

export function TreeIcon({ treeKey, className }: { treeKey: string; className?: string }) {
  const I = TREE_ICONS[treeKey] ?? Gauge;
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent", className ?? "h-12 w-12")} aria-hidden>
      {I === "sun" ? <SunLogo className="h-[62%] w-[62%]" /> : <I className="h-[55%] w-[55%]" strokeWidth={1.7} />}
    </span>
  );
}
