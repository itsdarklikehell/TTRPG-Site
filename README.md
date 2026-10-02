# Schwarzesonne

Schwarzesonne (SHZ) TTRPG'si için kampanya, karakter ve oyun odası sitesi.
Yayın adresi: **https://umbracaelis.com/schwarzesonne** (ana sayfa `umbracaelis.com`, "SHZ Giriş" butonu buraya açılır).

## Neler var

- **Davetle kayıt:** Siteye yalnızca GM'in ürettiği tek kullanımlık davet koduyla kayıt olunur. Kod bir kampanyaya bağlanırsa oyuncu kayıt olunca o kampanyaya otomatik katılır.
- **Kampanyalar:** Kasadaki 8 kampanyadan birini seçerek ya da kendi hikâyenle kampanya açılır. Başlangıç perk puanı, seviye sınırı ve Death Save ayarları kampanya bazındadır.
- **Karakter sihirbazı:** Kimlik → ekspertiz ağacı (ağaç stat'ına +2 ve ağaç bonusu; Metallkorp için T1 augment) → perkler (bütçe, birlikte alınamazlar, artan puanın stata dönüşmesi) → statlar (Klang +2, serbest 2 puan) → ilk yetenek → GM onayı.
- **Karakter kağıdı:** Augment ve Corruption etkileri eklenmiş statlar, yetenek ağaçları (kilitli yeteneğin eksik şartı yazar), sinerjiler, beden tablosu (yara, sargı, augment), Corruption çizelgesi, Inspiration, Death Save, envanter, notlar ve değişiklik kaydı.
- **Oyun odası (canlı):** IC/OOC sohbet, GM'e fısıltı, sunucunun attığı zarlar (d20 + stat ≥ eşik, yara cezası, negatif Klang, Inspiration borcu, kara büyü), Inspiration ile yeniden atma, GM'in "zar iste" düğmesi, gizli GM zarı, Death Save (d6), Pervitin zarı.
- **GM araçları:** Onay kuyruğu, toplu seviye atlatma (ağaç stat'ı + aksiyon stat'ı + MVP), karakter üzerinde tam düzenleme (her değişiklik kayda geçer), davet ve kullanıcı yönetimi.
- **Kurallar:** `/schwarzesonne/kurallar`. Temel kurallar, perkler, 7 ağaç, augmentler ve kampanyalar, arama ile birlikte.

## Gameset aktarıcı (Obsidian → site)

Oyun içeriği veritabanında değil, `content/shz.json` dosyasında durur. Bu dosya Obsidian kasasından üretilir:

```bash
npm run sync          # Codex/TTRPG klasörünü okur, content/shz.json yazar
npm run sync:check    # yalnızca doğrular, dosya yazmaz
npm run sync -- --vault "C:/yol/Codex/TTRPG"   # farklı bir kasa yolu
```

Varsayılan kasa yolu bu klasörün iki üstündeki `TTRPG` klasörüdür (`Codex/_Web/TTRPG-Site` → `Codex/TTRPG`). Aktarıcı her yeteneğin gereksinimini, öncülünü, kolunu ve sinerjisini okur. Hata bulursa (bilinmeyen öncül, bozuk dosya adı, tanınmayan uzuv) dosyayı yazmaz ve sorunu listeler. Kampanya klasörlerinden yalnızca `Campaign.md` okunur; seans ve GM notları siteye aktarılmaz.

Kuralları değiştirdikten sonra: `npm run sync` çalıştır, ardından commit ve push yap. Site birkaç dakika içinde güncellenir.

## Yerel geliştirme

Gerekenler: Node.js 20.12 veya üstü (önerilen 22) ve PostgreSQL 14 veya üstü.

```bash
npm install
cp .env.example .env        # DATABASE_URL'i kendi yerel veritabanına göre düzenle
npm run db:migrate          # tabloları oluşturur
npm run create-gm -- --username fatih --name "Fatih"   # geçici şifreyi ekrana yazar
npm run dev                 # http://localhost:3000/schwarzesonne
```

Diğer komutlar: `npm test` (kural motoru testleri), `npm run typecheck`, `npm run build`.

Veritabanı şeması `src/db/schema.ts` içinde. Şemayı değiştirince `npm run db:generate` yeni bir migration üretir. Deploy sırasında migration'lar otomatik uygulanır; veri silen bir adım yoktur.

## Yayına alma

`main` dalına her push'ta GitHub Actions şunları yapar: tip kontrolü, testler, build ve bağımlılık taraması. Hepsi geçerse kodu sunucuya `shz` kullanıcısıyla gönderir. Sunucuda yeni sürüm ayrı bir klasöre kurulur, veritabanı yedeği alınır, migration'lar ve build çalışır, sonra yeni sürüme geçilir. Sağlık kontrolü başarısız olursa önceki sürüme otomatik dönülür.

İlk kurulum ve sunucu sertleştirmesi için: [docs/SUNUCU-KURULUMU.md](docs/SUNUCU-KURULUMU.md).
Güvenlik önlemlerinin listesi: [docs/GUVENLIK.md](docs/GUVENLIK.md).

## Yapı

```
content/shz.json        Obsidian'dan üretilen oyun içeriği (elle düzenlenmez)
scripts/                sync-vault (aktarıcı), migrate, create-gm
server.ts               Next.js + Socket.io tek süreç (yalnızca 127.0.0.1)
server/realtime.ts      Oyun odası: sohbet, zarlar, zar istekleri
src/lib/shz/            Kural motoru (statlar, yetenek şartları, perk bütçesi, yara, zar)
src/lib/auth/           Oturum, şifre, hız sınırı
src/app/                Sayfalar ve API uçları
drizzle/                Veritabanı migration'ları
deploy/                 Sunucu kurulum betiği, deploy betiği, giriş sayfası
```
