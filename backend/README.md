# BankFlow backend

Java 21, Spring Boot 3.5.16, Spring Security, JPA ve Oracle JDBC. Yalnız sanal TL ve sentetik `BF-0001-TRY` hesap numaraları kullanılır. Gerçek bankacılık entegrasyonu yoktur.

## Çalıştırma

Java 21'i süreç için `JAVA_HOME` ile seçin. Resmi Maven Wrapper Maven 3.9.11'i indirir; ayrıca Maven kurmak gerekmez. Windows'ta `./mvnw.cmd`, Linux/macOS'ta `./mvnw` kullanılır.

Boş bir Oracle Free uygulama şeması hazırlayın ve ortam değişkenlerini girin:

```powershell
$env:BANKFLOW_DB_URL = 'jdbc:oracle:thin:@//localhost:1521/FREEPDB1'
$env:BANKFLOW_DB_USER = 'bankflow'
# BANKFLOW_DB_PASSWORD ve BANKFLOW_DEMO_PASSWORD değerlerini güvenli yerel ortamınızda belirleyin.
$env:SPRING_PROFILES_ACTIVE = 'dev'
./mvnw.cmd spring-boot:run
```

`dev` profili en az 12 karakterli `BANKFLOW_DEMO_PASSWORD` ister. Parola kaynakta bulunmaz; BCrypt ile saklanır. Yalnız boş kullanıcı tablosuna `ayse`, `mehmet`, `operator`, `supervisor` ve kurgusal hesaplar eklenir. Operatörler de ayrı hesapları olan müşterilerdir. Profil kapalıyken örnek veri eklenmez. Çalışma ortamında HTTPS ile `BANKFLOW_COOKIE_SECURE=true` kullanın.

Flyway `db/migration` altındaki sürümlü Oracle şemasını uygular. Hibernate yalnız doğrular, şemayı değiştirmez. Şema sahibi `CREATE SESSION`, `CREATE TABLE`, `CREATE SEQUENCE` ve yeterli tablespace kotasına ihtiyaç duyar.

Ön yüzün `dist` çıktısı paketlemeden önce `src/main/resources/static/` içine kopyalanabilir. Geliştirmede Vite `/api` isteklerini bu sunucuya yönlendirmelidir. API ve tarayıcı aynı kökeni kullanır; CORS açılmaz.

## API

Tüm para alanları JSON metnidir (`"1500.00"`). Zamanlar UTC ISO-8601 biçimindedir. Kimlikler sayıdır. JSON hatalar: `{ "code": "...", "message": "...", "fieldErrors": null }`.

TransferDto alanları: `id`, `reference`, `sourceAccountNumber`, `targetAccountNumber`, `sourceHolderName`, `targetHolderName`, `amount`, `description`, `status`, `createdAt`, `decidedAt`, `decisionReason`, `createdBy`, `decidedBy`. `createdBy` ve `decidedBy` sayısal kullanıcı kimlikleridir; henüz karar yoksa `decidedBy` null olur.

- `GET /api/auth/csrf` → `{token, headerName}`. Session cookie ile verilen header sonraki POST isteklerine eklenir.
- `POST /api/auth/login`: `application/x-www-form-urlencoded`, `username` ve `password`; CSRF zorunlu. Kullanıcı JSON'u döner.
- `GET /api/auth/me` → `{id, username, fullName, roles}`. Girişten sonra CSRF tekrar alınmalıdır.
- `POST /api/auth/logout`: CSRF zorunlu, 204 döner.
- `GET /api/accounts`, `GET /api/accounts/{id}/transactions`: yalnız hesap sahibi erişir. Operatör yetkisi bu kuralı aşmaz.
- `GET /api/beneficiaries`: kayıtlı hedef hesap numarası, ad ve etiket; bakiye içermez.
- `GET /api/dashboard`: toplam bakiye, hesap sayısı, gelen/giden hareket toplamı, kendi bekleyen transfer sayısı ve son 5 kendi transferi.
- `GET /api/transfers`: yalnız talep sahibinin transferleri.
- `POST /api/transfers`: `Idempotency-Key` header ve `{sourceAccountId,targetAccountNumber,amount,description}`. Anahtar 1–128 ASCII harf/rakam veya `._:-` içerir. Başarıda 200 ve TransferDto döner.
- `GET /api/operations/transfers`, `GET /api/operations/audit`: OPERATOR gerekir.
- `POST /api/operations/transfers/{id}/approve` gövdesi `{}`; `/reject` gövdesi `{reason}`. Kendi talebine karar verilemez. Ret gerekçesi 1–240 karakterdir.

10.000 TL ve üzeri talep onay bekler; başlangıçta bakiye kontrol edilir, para ayrılmaz. Onay anında tekrar kontrol edilir. Yetersiz bakiye 409 üretir, talep beklemede kalır. Tekrarlanan karar 409, kendi talebine karar 403 döner. Tutar pozitif, en fazla 17 tam ve 2 ondalık hanelidir. Aynı hesaba transfer 422 döner.

Aynı kullanıcı/anahtar/normalize içerik aynı transfer kaydını döndürür; tutar `100` ve `100.00` eşdeğerdir. Açıklamanın baş/son boşlukları temizlenir, boş açıklama null olur. Aynı anahtar farklı içerikte 409 üretir. Kayıt sonradan onaylandıysa tekrar istek mevcut karar durumunu döndürür.

İki hesap ID sırasıyla `PESSIMISTIC_WRITE` kilitlenir. Bakiye güncellemeleri, iki hareket ve denetim kaydı tek transaction içindedir. Aynı kullanıcının istekleri kullanıcı satırı kilidiyle sıralanır; ayrıca veritabanında `(created_by,idempotency_key)` unique kısıtı bulunur. Hareket/denetim kayıtları için değiştirme veya silme API'si yoktur.

## Kontroller

```powershell
./mvnw.cmd test
./mvnw.cmd package -DskipTests
```

`H2IntegrationTest` yalnız test kapsamındaki H2 ile iş mantığı ve HTTP güvenliğini sınar; Oracle kanıtı değildir. Üretim bağımlılıklarında H2 yoktur.

`OracleIntegrationTest`, üç `BANKFLOW_DB_*` değişkeni de mevcutsa gerçek Oracle'da aynı sözleşmeyi çalıştırır; aksi halde SKIPPED / NOT_RUN olur. **Test için adı `_test` ile biten ayrı, boş ve silinebilir bir şema kullanın (ör. `bankflow_test`): her test tüm BankFlow verilerini siler.** Ortam, datasource ve etkin Hikari kullanıcısı aynı test şemasını göstermiyorsa test bağlamı bağlantı, Flyway migration ve fixture DELETE işlemlerinden önce açık hata ile durur. URL yalnız kimlik bilgisi içermeyen `jdbc:oracle:thin:@//host:port/service` biçiminde olabilir; Hikari farklı URL'ye yönlenemez. Alternatif datasource/JNDI, ek sürücü bağlantı özellikleri ve oturum/şema yönlendirmeleri reddedilir. Ayrı Flyway kullanıcı/URL/şema ayarları da aynı hedefi göstermelidir; Flyway başlangıç SQL'i/bağlantı özellikleri ve JPA şema/bağlantı yönlendirmeleri kabul edilmez. Büyük/küçük harf farkı kabul edilir; şema öneki veya tırnaklı kullanıcı adı kabul edilmez. Geliştirme/çalışma veritabanına karşı çalıştırmayın. Yalnız gerçek Oracle testleri için:

```powershell
# BANKFLOW_DB_* değişkenlerini ayrı test şemasına yönlendirdikten sonra:
./mvnw.cmd '-Dtest=OracleIntegrationTest' test
```

Testler oturum/CSRF, veri izolasyonu, başarı/eksik bakiye/tutar doğrulaması, kısmi başarısızlıkta rollback, tekrar anahtarı, eşzamanlı harcama ve ters yön transferi, kendi talebini onaylama yasağı, yinelenen karar ve onay öncesi değişen bakiyeyi kapsar. Oracle kilitleri ve migration uyumu ancak bu paketin gerçek Oracle'da geçmesiyle doğrulanır.
