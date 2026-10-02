import "server-only";

export const isProd = process.env.NODE_ENV === "production";

/** Dışarıdan görünen köken (https://umbracaelis.com). Origin kontrolünde kullanılır. */
export function appOrigin(): string {
  const o = process.env.APP_ORIGIN;
  if (!o) {
    if (isProd) throw new Error("APP_ORIGIN tanımlı değil");
    return "http://localhost:3000";
  }
  return o.replace(/\/+$/, "");
}
