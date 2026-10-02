# Güvenlik önlemleri

## Hesaplar ve oturumlar
- Kayıt yalnızca GM davetiyle yapılır. Kod 79 bit rastgeledir, tek kullanımlıktır ve süresi dolar. Veritabanında yalnızca SHA-256 özeti tutulur.
- Şifreler bcrypt ile (maliyet 12) saklanır ve en az 10 karakter olmalıdır.
- Oturum sunucu tarafında tutulur. Çerezde rastgele bir token bulunur (HttpOnly, Secure, SameSite=Lax, yalnızca `/schwarzesonne` yolu için geçerli). Veritabanında bu token'ın da yalnızca özeti durur. Oturum süresi 14 gündür ve kullanıldıkça uzar.
- Şifre değişince, "tüm cihazlardan çık" denince ya da hesap devre dışı bırakılınca bütün oturumlar ve açık oyun odası bağlantıları anında kapanır.
- Giriş denemeleri sınırlıdır: IP başına 15 dakikada 30, aynı kullanıcı adı ve IP için 8, bir kullanıcı adına tüm IP'lerden toplam 60 deneme. nginx ayrıca IP başına dakikada 10 giriş isteğine izin verir. Tek bir IP'den başkasının hesabı kilitlenemez.
- Yetkiler üç seviyededir: oyuncu, GM (kendi kampanyaları) ve site yöneticisi (kullanıcı yönetimi, GM daveti).

## Uygulama
- Her API isteğinin gövdesi zod ile doğrulanır ve 64 KB ile sınırlıdır. Veri değiştiren isteklerde Origin başlığı kontrol edilir (CSRF koruması).
- Her istek kampanya üyeliği ve karakter sahipliği açısından sunucuda denetlenir. Oyuncular başkalarının GM notlarını, gizli zarları ve kendilerine ait olmayan fısıltıları göremez.
- Zarları her zaman sunucu atar (`crypto.randomInt`). İstemci yalnızca hangi zarın atılacağını söyler.
- Puan harcama ve seviye atlama işlemleri yarış durumlarına karşı koşullu güncelleme ve satır kilidiyle yapılır.
- İçerik Güvenliği Politikası (CSP) her istekte yeni bir nonce ile gönderilir: yalnızca sitenin kendi script'leri çalışır ve dış kaynak yüklenmez. Ayrıca X-Frame-Options DENY, nosniff, Referrer-Policy ve HSTS başlıkları vardır.
- Kullanıcı metinleri her yerde düz metin olarak gösterilir. Kural metinlerini HTML'e çeviren aktarıcı bütün metni kaçışlar.
- Socket bağlantısı oturum çereziyle doğrulanır, Origin kontrol edilir. Olaylar zod ile doğrulanır ve hızları sınırlanır. Oturum ve üyelik dakikada bir yeniden denetlenir.

## Sunucu
- Uygulama yalnızca `127.0.0.1:3000` adresini dinler; dışarıya nginx üzerinden açılır.
- İki ayrı kullanıcı vardır: uygulamayı `shz` çalıştırır (giriş yapamaz, kendi koduna yazamaz), kodu `shzdeploy` kurar (yalnızca SSH anahtarıyla girer, sudo ile sadece servisi yeniden başlatabilir).
- systemd sertleştirmesi açıktır: NoNewPrivileges, ProtectSystem=strict, PrivateTmp, yetkisiz yetenek seti ve bellek sınırı.
- PostgreSQL yalnızca yerelden erişilebilir. Uygulamanın veritabanı kullanıcısı süper kullanıcı değildir ve şifresi rastgeledir.
- Güvenlik duvarı (ufw) yalnızca SSH portunu ve Cloudflare'den gelen 80/443 trafiğini kabul eder. fail2ban SSH denemelerini engeller. Güvenlik güncellemeleri otomatik kurulur.
- Her gece veritabanı yedeği alınır ve 14 gün saklanır. Her deploy öncesinde de yedek alınır.
- GitHub Actions sunucuya root ile değil, `shzdeploy` kullanıcısının kısıtlı (`restrict`) anahtarıyla bağlanır. Sunucunun kimliği `SSH_KNOWN_HOSTS` ile sabitlenir.
- Deploy'dan önce tip kontrolü, testler, build ve `npm audit` (yüksek ve kritik) çalışır. Dependabot bağımlılık güncellemelerini haftalık önerir.
