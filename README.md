# BankFlow

Java Spring Boot, React ve Oracle ile geliştirilen bankacılık simülasyonu. Müşteriler sanal TL hesaplarını ve hesap hareketlerini görüntüler, transfer oluşturur; operasyon kullanıcıları yüksek tutarlı talepleri onaylar veya gerekçeyle reddeder.

Gerçek para, EFT/FAST veya banka entegrasyonu içermez. `BF-…-TRY` numaraları uygulama içi hesap numaralarıdır.

## Özellikler

- Oturumla giriş, CSRF koruması ve müşteri bazında hesap/veri izolasyonu.
- Hesap özeti, kayıtlı alıcılar, hesap hareketleri ve durum filtreli transfer geçmişi.
- 10.000 TL altındaki transferlerde anlık işlem; 10.000 TL ve üzerindeki taleplerde bağımsız operasyon onayı.
- Talebi oluşturan kişinin kendi talebini onaylamasını veya reddetmesini engelleyen kontrol.
- Ret gerekçesi, işlem referansı ve denetim kayıtları.
- Türkçe, masaüstü ve mobil ekranlara uyarlanan arayüz.

## Teknik yapı

| Katman | Teknolojiler |
| --- | --- |
| Arka uç | Java 21, Spring Boot 3.5, Spring Security, Spring Data JPA |
| Ön yüz | React 19, TypeScript, Vite |
| Veri | Oracle Database Free, Flyway, Oracle JDBC |
| Kontrol | JUnit, Spring MockMvc, Vitest, gerçek HTTP senaryoları |
| Çalıştırma | Docker Compose; tek uygulama, aynı origin üzerinden arayüz ve API |

Para değerleri API'de ondalık metin, Java'da `BigDecimal`, Oracle'da `NUMBER(19,2)` olarak tutulur. Bir transfer; iki hesap bakiyesi, iki hesap hareketi ve denetim kaydıyla aynı veritabanı transaction'ında tamamlanır. Hata halinde tamamı geri alınır.

Hesaplar kimlik sırasıyla kilitlenir. `Idempotency-Key`, kullanıcı bazında tek işlem üretir; aynı anahtar farklı içerikle kullanılırsa `409` döner. Onay anında bakiye yeniden denetlenir. Bekleyen talep bakiyeyi rezerve etmez.

## Yerelde çalıştırma

Docker Desktop'ın Linux container motoru açık olmalıdır. Windows'ta WSL 2 ve Sanal Makine Platformu gerekir; bunların ilk kurulumundan sonra bilgisayarı yeniden başlatmak gerekebilir. İlk açılışta Oracle görüntüsü indirilir ve veritabanı hazırlanır.

Depo kökünde PowerShell ile:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start.ps1
```

Bu çağrı izin ayarını yalnız açılan PowerShell süreci için uygular; bilgisayarın genel ayarını değiştirmez. Script çalıştırma zaten açıksa doğrudan `.\tools\start.ps1` de kullanılabilir.

Uygulama: <http://localhost:8080>

`configure.ps1`, yalnız yerel `.env` dosyasında rastgele veritabanı ve demo şifreleri oluşturur. Dosya Git'e eklenmez. Demo kullanıcılarının ortak giriş şifresi bu dosyadaki `BANKFLOW_DEMO_PASSWORD` değeridir.

| Kullanıcı | Rol |
| --- | --- |
| `ayse`, `mehmet` | Müşteri |
| `operator`, `supervisor` | Müşteri ve operasyon |

Demo hesapları yalnız `dev` profiliyle, boş şemada oluşturulur. Mevcut veriler yeniden başlatmada sıfırlanmaz. Uygulama ve Oracle portları yalnız yerel bilgisayara bağlanır.

Verileri koruyarak durdurmak için:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\stop.ps1
```

## Testler

Java 21 ve Node.js 24 ile:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\test.ps1
```

Bu kontrol ön yüz testlerini/derlemesini ve izole H2 üzerinde arka uç sözleşme testlerini çalıştırır. H2 sonucu Oracle doğrulaması yerine geçmez.

Çalışan yerel Oracle üzerinde ayrı test şemasıyla:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\test.ps1 -Oracle
```

Oracle testleri yalnız adı `_test` ile biten ayrı şemada çalıştırılmalıdır; testler bu şemanın uygulama tablolarını temizleyip örnek veriler üretir. Demo uygulama şeması test için kullanılmaz.

Çalışan demo uygulamasında gerçek HTTP kontrolü:

```powershell
node --env-file=.env tests/api-smoke.mjs
```

Bu kontrol yalnız localhost'a izin verir ve sanal demo verilerinde transfer/onay/ret işlemleri oluşturur.

Test kapsamı; yetki ve CSRF sınırları, veri izolasyonu, hassas para doğrulaması, aynı isteğin tekrarı, eşzamanlı harcama, karşılıklı transfer, atomik geri alma, bağımsız onay ve ret işlemlerini içerir.

## Geliştirme

`backend/` Maven Wrapper içerir. Oracle bağlantısı `BANKFLOW_DB_URL`, `BANKFLOW_DB_USER`, `BANKFLOW_DB_PASSWORD`; demo verileri `BANKFLOW_DEMO_PASSWORD` ortam değişkenleriyle yapılandırılır. Ön yüz geliştirme sunucusu `/api` isteklerini `localhost:8080` adresine yönlendirir.

```powershell
# Arka uç: Oracle bağlantı değişkenleri ve demo şifresi oturumda ayarlanmışken
.\backend\mvnw.cmd -f backend/pom.xml spring-boot:run -Dspring-boot.run.profiles=dev

# Başka bir terminalde, frontend klasöründe
npm ci
npm run dev
```

Üretim yayını için HTTPS, güvenli session cookie (`BANKFLOW_COOKIE_SECURE=true`), dışarıdan yönetilen sırlar ve ayrı veritabanı yetkileri gerekir. Depodaki Compose ayarı yerel portföy demosu içindir.
