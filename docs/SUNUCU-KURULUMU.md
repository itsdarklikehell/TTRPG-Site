# Sunucu kurulumu (bir kez)

Bu adımlar eski TTRPG sitesini kapatır, eski veritabanını siler ve yeni Schwarzesonne sitesini kurar. Toplam 15–20 dakika sürer.

## 0. Hazırlık

- Sunucu: Hetzner, Ubuntu, `umbracaelis.com` Cloudflare üzerinden bu sunucuya yönleniyor (turuncu bulut açık).
- Cloudflare origin sertifikası sunucuda duruyor: `/etc/ssl/cloudflare-cert.pem` ve `/etc/ssl/cloudflare-key.pem` (eski kurulumdan).
- Cloudflare → SSL/TLS ayarı **Full (strict)** olmalı.

## 1. Kodu GitHub'a gönder

Bilgisayarında, `Codex/_Web/TTRPG-Site` klasöründe:

```bash
git add -A
git commit -m "Schwarzesonne 2.0"
git push
```

Bu ilk push'taki **Deploy** işi kırmızı biter, çünkü sunucu henüz hazır değil. Bu normal.

## 2. Kurulum betiğini sunucuya kopyala ve çalıştır

Bilgisayarında (PowerShell), `TTRPG-Site` klasöründeyken:

```powershell
scp deploy/server-setup.sh root@204.168.160.198:/root/
```

Sonra sunucuya bağlan ve çalıştır:

```bash
ssh root@204.168.160.198
bash /root/server-setup.sh
```

Betik her önemli adımda soru sorar:

| Soru | Önerilen cevap |
|---|---|
| Devam edilsin mi? | `e` |
| pm2 süreçleri silinsin mi? | `E` (eski site) |
| Silmeden önce yedek alınsın mı? | `E` (yedek `/root` altına; istersen sonra silersin) |
| Eski veritabanını silmek için SIL yaz | `SIL` |
| Bu SSH portları açık kalacak, doğru mu? | `E` |
| Güvenlik duvarı kuralları sıfırlansın mı? | `E` (bu sunucuda başka servis yoksa) |
| 80/443 yalnızca Cloudflare'e açılsın mı? | `E` |
| SSH'de şifreyle giriş kapatılsın mı? | Bilgisayarındaki SSH anahtarıyla girdiğinden emin değilsen `H` |

Betik sonunda ekrana **GitHub'a girilecek değerleri** yazar. Bu pencereyi kapatma.

## 3. GitHub ayarları

GitHub → `TTRPG-Site` deposu → **Settings → Secrets and variables → Actions**. Betiğin yazdığı değerleri gir:

| Secret | Değer |
|---|---|
| `SSH_HOST` | sunucu IP'si (zaten var, aynı kalabilir) |
| `SSH_PORT` | genelde `22` |
| `SSH_KNOWN_HOSTS` | betiğin yazdığı tek satır |
| `SSH_PRIVATE_KEY` | betiğin yazdığı `-----BEGIN … END-----` bloğu (eskisinin **yerine**) |

Ayrıca **Settings → Environments → New environment** ile `production` adında bir ortam oluştur. İstersen "Required reviewers" açıp her deploy'u kendin onaylayabilirsin.

## 4. İlk deploy

GitHub → **Actions → Deploy → Run workflow**. Önce *Kontrol*, sonra *Sunucuya yükle* çalışır (3–5 dakika).

## 5. GM hesabını oluştur

Sunucuda:

```bash
sudo -u shzdeploy bash -lc 'cd /opt/schwarzesonne/current && SHZ_ENV_FILE=/opt/schwarzesonne/shared/.env npm run create-gm -- --username fatih --name "Fatih"'
```

Ekrana geçici bir şifre yazılır. `https://umbracaelis.com/schwarzesonne` adresinden giriş yap, **Hesap** sayfasından şifreni değiştir. Bu hesap site yöneticisidir: kullanıcıları yönetebilir ve GM daveti üretebilir.

## 6. Oyuncuları davet et

**Yönetim → Yeni davet**: Oyuncunun adını not olarak yaz, kampanyayı seç, **Davet kodu üret** de, çıkan bağlantıyı oyuncuya gönder. Her kod tek kullanımlıktır ve süresi dolar.

## Günlük kullanım

- **Kural değiştirdin mi?** `npm run sync` → commit → push. Site birkaç dakika içinde güncellenir.
- **Loglar:** `journalctl -u schwarzesonne -n 100 --no-pager`
- **Yeniden başlat:** `systemctl restart schwarzesonne`
- **Yedekler:** her gece `/var/backups/schwarzesonne`, ayrıca her deploy öncesi `/opt/schwarzesonne/backups`.
- **Yedekten geri dönme:** `gunzip -c YEDEK.sql.gz | sudo -u postgres psql schwarzesonne` (önce `systemctl stop schwarzesonne`).
- **Önceki sürüme dönme:** GitHub'da önceki commit'e `git revert` yapıp push et ya da Actions'ta eski bir çalıştırmayı yeniden başlat.
