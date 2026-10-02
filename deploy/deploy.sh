#!/usr/bin/env bash
# Sunucuda "shzdeploy" kullanıcısı olarak çalışır (GitHub Actions tarafından çağrılır).
# Uygulamanın kendisi "shz" kullanıcısıyla çalışır ve bu dosyalara yazamaz.
# Kullanım: deploy.sh <sürüm-klasörü-adı>
set -euo pipefail
umask 027

BASE=/opt/schwarzesonne
NAME="${1:?sürüm adı gerekli}"
[[ "$NAME" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "Geçersiz sürüm adı"; exit 1; }
REL="$BASE/releases/$NAME"
[ -d "$REL" ] || { echo "Sürüm klasörü yok: $REL"; exit 1; }
cd "$REL"

PREV="$(readlink -f "$BASE/current" 2>/dev/null || true)"
ln -sfn "$BASE/shared/.env" .env

echo "==> Paketler"
if [ -n "$PREV" ] && [ -d "$PREV/node_modules" ] && cmp -s "$PREV/package-lock.json" package-lock.json; then
  cp -al "$PREV/node_modules" node_modules
else
  npm ci --no-audit --no-fund
fi

set -a; . "$BASE/shared/.env"; set +a

# Bağlantı bilgisini komut satırı yerine ortam değişkenleriyle ver (ps çıktısında görünmesin).
eval "$(node -e '
  const u = new URL(process.env.DATABASE_URL);
  const q = (v) => "\x27" + String(v).replace(/\x27/g, "\x27\\\x27\x27") + "\x27";
  console.log(`export PGHOST=${q(u.hostname)} PGPORT=${q(u.port || 5432)} PGUSER=${q(decodeURIComponent(u.username))} PGPASSWORD=${q(decodeURIComponent(u.password))} PGDATABASE=${q(u.pathname.slice(1))}`);
')"

echo "==> Veritabanı yedeği (deploy öncesi)"
mkdir -p "$BASE/backups"
pg_dump --no-owner | gzip > "$BASE/backups/pre-deploy-$NAME.sql.gz"
ls -1t "$BASE"/backups/pre-deploy-*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm --

echo "==> Migration"
npx tsx scripts/migrate.ts

echo "==> Build"
NEXT_TELEMETRY_DISABLED=1 npm run build
# Çalışan uygulama yalnızca önbelleğe yazabilir.
mkdir -p .next/cache
chmod -R g+rwX .next/cache

echo "==> Giriş sayfası"
rsync -a --delete deploy/landing/ /var/www/umbracaelis/

echo "==> Yayına al"
ln -sfn "$REL" "$BASE/current.new" && mv -Tf "$BASE/current.new" "$BASE/current"
sudo /usr/bin/systemctl restart schwarzesonne

ok=""
for _ in $(seq 1 40); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/schwarzesonne/giris; then ok=1; break; fi
  sleep 2
done
if [ -z "$ok" ]; then
  echo "!! Sağlık kontrolü başarısız, önceki sürüme dönülüyor"
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    ln -sfn "$PREV" "$BASE/current.new" && mv -Tf "$BASE/current.new" "$BASE/current"
    sudo /usr/bin/systemctl restart schwarzesonne
  fi
  exit 1
fi

echo "==> Eski sürümleri temizle (son 4 kalır)"
cd "$BASE/releases" && ls -1t | tail -n +5 | xargs -r rm -rf --
echo "==> Tamam: $NAME"
