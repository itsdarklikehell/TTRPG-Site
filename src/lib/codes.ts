import { randomInt } from "node:crypto";

// Karışabilecek karakterler (0/O, 1/I/L) çıkarılmış alfabe.
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function chunk(n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHA[randomInt(ALPHA.length)];
  return s;
}

/** Hesap davet kodu: ~79 bit rastgelelik. Örn. SHZ-7KQM-X2PA-R9TD-H4NC */
export function inviteCode() {
  return `SHZ-${chunk(4)}-${chunk(4)}-${chunk(4)}-${chunk(4)}`;
}

/** Kampanyaya katılma kodu (hesap gerektirir, tahmin edilse bile tek başına zarar vermez). */
export function joinCode() {
  return `${chunk(4)}-${chunk(4)}`;
}

export function normalizeCode(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
