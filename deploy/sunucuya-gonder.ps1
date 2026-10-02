# Kurulum betiğini sunucuya kopyalar ve orada çalıştırır.
# Kullanım (PowerShell, TTRPG-Site klasöründe):  powershell -ExecutionPolicy Bypass -File deploy\sunucuya-gonder.ps1

$Sunucu = "root@204.168.160.198"
$Betik  = Join-Path $PSScriptRoot "server-setup.sh"

Write-Host "1/2 server-setup.sh sunucuya kopyalanıyor..."
scp $Betik "${Sunucu}:/root/server-setup.sh"
if ($LASTEXITCODE -ne 0) { Write-Host "Kopyalama başarısız. Sunucu adresini ve şifreni kontrol et."; exit 1 }

Write-Host "2/2 Betik sunucuda çalıştırılıyor (soruları cevapla)..."
ssh -t $Sunucu "bash /root/server-setup.sh"
