/** Uygulamanın yayınlandığı alt yol (umbracaelis.com/schwarzesonne). */
export const BASE_PATH = "/schwarzesonne";

/** Ham <a href> ve fetch çağrıları için alt yolu ekler. next/link bunu kendisi yapar. */
export function withBase(p: string) {
  return BASE_PATH + (p.startsWith("/") ? p : "/" + p);
}

/** İçerik HTML'indeki "@/" ile başlayan bağlantıları gerçek adrese çevirir. */
export function resolveContentLinks(html: string) {
  return html.replace(/href="@\//g, `href="${BASE_PATH}/`);
}

/** Karakter portresinin adresi; sürüm 0 ise portre yoktur. */
export function portraitUrl(characterId: string, version: number | null | undefined) {
  return version ? withBase(`/api/characters/${characterId}/portrait?v=${version}`) : null;
}
