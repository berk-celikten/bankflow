# BankFlow - Proje Hedefleri

**Proje türü:** Java Spring Boot + React + Oracle tabanlı, modüler banka portföy uygulaması

**Kapsam:** Önce çalışan ve güvenilir proje; CV, öğrenme anlatımı ve mülakat çalışması daha sonra
**İlerleme biçimi:** Her seferinde bir hedef sınırı. Kullanıcı `Hedef N` diyerek o hedefe kadar çalışmayı başlatır.

> Bu belge geliştirme sözleşmesidir. Uygulama henüz yazılmadı. Hedef 0, bu dokümanla birlikte tamamlanan proje başlangıç hazırlıklarını ifade eder; çalışan uygulama özelliği değildir.

## Kapsam ve çalışma ilkeleri

- İlk sürüm sanal müşteriler ve TL cinsinden uygulama içi hesaplarla çalışır. Gerçek EFT/FAST, gerçek banka bağlantısı veya gerçek para hareketi yoktur.
- Tek bir Spring Boot uygulaması, modüler bir yapı olarak geliştirilir. Mikroservis, Kafka ve kapsamı büyüten altyapılar bu sürüme eklenmez.
- Para tutarları Java `BigDecimal` ile, Oracle `NUMBER(19,2)` olarak modellenir. Float/double ile parasal hesap yapılmaz.
- Onay bekleyen transfer bakiyeyi değiştirmez. Yetkili onay anında bakiye tekrar kontrol edilir ve hareket atomik olarak uygulanır.
- Değiştirilemeyen audit akışı uygulamada geçmiş kayıtların güncellenmesini/silinmesini engeller. Bu, üretim düzeyinde kriptografik veya altyapısal “tamper-proof” garantisi değildir.
- Güncel durum `STATE.md` içinde kısa tutulur; test kanıtları görevle ilişkili arşiv dosyasında saklanır. `AGENTS.md` ortak kurallardır ve günlük kaydı olarak büyütülmez. Ajanlar hafızayı hedefli okur; ilgisiz tüm geçmişi yüklemez.
- Geliştirici modeli: GPT-6.1 Sol, medium. Rutin inceleme: Luna, high. Kritik transfer, yetki ve onay değişiklikleri: Sol, high.
- Zaman çizelgesi veya işe alınma garantisi verilmez. Önemli ve çözülmemiş kusur varsa hedef tamamlandı sayılmaz; çalıştırılamayan kontrol `NOT_RUN` diye açıkça raporlanır.

## Hedef haritası

| Hedef | Sonuç |
|---|---|
| 0 | Ajan/VS Code, kısa hafıza ve herkese açık repo başlangıç hazırlığı |
| 1 | Doğrulanmış çalışma ortamı, ekran tasarımı, veri modeli ve API sözleşmesi |
| 2 | Çalışan temel, giriş, roller, hesaplar ve müşteri veri izolasyonu |
| 3 | Güvenli, atomik ve eşzamanlılığa dayanıklı TL kurum içi transfer |
| 4 | İkinci kişi kuralıyla operasyon onayı/ret ve değiştirilemeyen uygulama audit akışı |
| 5 | Tamamlanmış müşteri/personel arayüzleri, uçtan uca kanıtlar ve teslim |

## Hedef 0 - Proje başlangıç hazırlığı

**Durum:** Bu teslimle tamamlanan hazırlık. Uygulama kodu veya çalışan ürün değildir.

**Kapsam:** Ajan rolleri ve model seçimleri; VS Code çalışma alanı; hedefli ve kısa proje hafızası; kamuya açık GitHub repo başlangıç ayarları. Repo [berk-celikten/bankflow](https://github.com/berk-celikten/bankflow) oluşturulup doğrulanmıştır. İlk kod gönderimi henüz yapılmadı; repo uygulamanın çalıştığını göstermez.

**Kabul ve kontrol:** Ajan talimatları kapsam sınırlarını ve test kanıtı kaydını açıklar; hafıza hedefli okunabilir; VS Code çalışma alanı ve repo başlangıç dosyaları hazırdır. Gizli bilgi repo içine konmaz. Uygulama özelliği iddia edilmez.

## Hedef 1 - Tasarım ve teknik sözleşmeler

**Sonuç:** Uygulama kodlamasına geçmek için doğrulanmış ortam ve üzerinde anlaşılmış tasarım.

**Kabul koşulları:**
- JDK sürümü ve Oracle bağlantısı kurulur; bağlantı bilgileri gizli tutulur. Oracle üzerinde küçük bir bağlantı/sorgu doğrulaması yapılır.
- Müşteri, kullanıcı/rol, hesap, transfer isteği, defteri kebir/hareket, onay ve audit varlıkları; ilişkiler, benzersizlikler, tutar hassasiyeti ve durum geçişleri belgelenir.
- Müşteri ve personel akışları için resimli ekran taslakları hazırlanır; temel gezinme ve hata/boş/yükleniyor durumları belirlenir.
- REST API uçları, istek/yanıt örnekleri, kimlik doğrulama, rol kuralları, hata biçimi, idempotency anahtarı ve transfer onay akışı yazılı sözleşmeye bağlanır.
- İlk sürüm kapsamı ve modüler Spring Boot sınırı korunur.

**Nasıl doğrulanır:** Temiz ortamdan JDK ile derleme/çalıştırma; Oracle oturumu ve sorgusu; şema/model sözleşmesi incelemesi; taslak ve API örneklerinin birbirini tutarlılık açısından kapsama kontrolü. Bu hedefte henüz ürün işlevi tamamlanmış sayılmaz.

## Hedef 2 - Çalışan temel, kimlik ve hesaplar

**Sonuç:** Kullanıcı giriş yapar; yetkisi dahilindeki hesapları görür ve müşteri verisi başka müşteriye sızmaz.

**Kabul koşulları:**
- Spring Boot modülleri, React uygulaması ve Oracle şeması temiz kurulum adımlarıyla ayağa kalkar; yapılandırma sırları repoya yazılmaz.
- Giriş/çıkış ve oturum/token yaşam döngüsü güvenli biçimde uygulanır. Müşteri ve personel rolleri sunucu tarafında denetlenir.
- Müşteri yalnız kendi müşteri profili ve hesaplarına erişir; istek gövdesine başka müşteri kimliği yazmak yetki sağlamaz.
- Personel ekranı yalnız rolünün izin verdiği müşteri/hesap bilgilerine erişir. Sunucu tarafı yetki kontrolleri UI gizlemesine dayanmaz.
- Temel hesap listeleme/detay ve bakiye görünümü tanımlı test verisiyle çalışır.

**Nasıl doğrulanır:** Oracle entegreli uygulama başlatma; geçerli/geçersiz giriş; rol bazlı erişim kontrolleri; müşteri A'nın müşteri B verisine kimlik parametresini değiştirerek ve doğrudan API çağrısıyla erişemediğini kanıtlama; temiz kurulum talimatlarının uygulanması.

## Hedef 3 - Güvenli kurum içi transfer

**Sonuç:** Bir müşteri kendi yetkili hesabından başka uygulama içi TL hesabına güvenilir transfer başlatır.

**Kabul koşulları:**
- Tutar `BigDecimal`, Oracle kolonları `NUMBER(19,2)`; sıfır/negatif, aşırı hassasiyet ve geçersiz tutar reddedilir.
- Transfer aynı veritabanı transaction'ında iki hesap bakiyesini ve hareket kayıtlarını günceller. Herhangi bir adım hata verirse tamamı rollback olur.
- Yetersiz bakiye transferi reddedilir; kısmi borç/alacak kaydı kalmaz.
- Idempotency aynı anahtar ve aynı içerikte tek sonucu döndürür. Aynı anahtar farklı içerikle tekrar gelirse açıkça reddedilir.
- Eşzamanlı taleplerde kilitleme/izolasyon stratejisiyle hiçbir hesap negatif bakiyeye düşmez ve çift harcama oluşmaz.
- Bu hedef için gerçek Oracle üzerinde entegrasyon testi ve çalıştırma kanıtı gerekir. H2 taklidi tek başına kabul edilmez.

**Nasıl doğrulanır:** Gerçek Oracle'da başarılı transferden önce/sonra iki hesap ve hareket toplamlarını karşılaştırma; yetersiz bakiye; aynı anahtarlı tekrar ve farklı içerik; transaction ortasında kontrollü hata ile rollback; paralel harcama denemeleri; bakiye negatifliği ve çift kayıt kontrolü.

## Hedef 4 - Operasyon onayı, ret ve audit

**Sonuç:** Gereken transferler bekler; yetkili personel ikinci kişi kuralına uyarak onaylar veya reddeder.

**Kabul koşulları:**
- Bekleyen transfer talebi oluşturmak bakiyeleri ve kesinleşmiş hareketleri değiştirmez.
- Onayda uygulama, tek atomik transaction içinde güncel kaynak bakiyeyi tekrar kontrol eder ve transferi uygular. Yetersiz bakiye varsa onay başarısız olur; kısmi sonuç kalmaz.
- Talebi oluşturan kullanıcı kendi talebini onaylayamaz. Rol ve izin kontrolü sunucu tarafında yapılır.
- Ret gerekçesi ve aktör kaydedilir; ret bakiyeyi değiştirmez. Tekrarlanan/geçersiz durum geçişleri reddedilir.
- Durum değişiklikleri ve kritik aktör/işlem bilgileri audit kaydına eklenir. Uygulama mevcut kayıtların API/uygulama yolu ile güncellenmesini veya silinmesini engeller; altyapı yöneticisine karşı üretim düzeyinde tamper-proof iddiası yoktur.

**Nasıl doğrulanır:** Bekleyen talep öncesi/sonrası bakiye; farklı personelin onayı; talep sahibinin kendini onaylama girişimi; bekleme sırasında kaynağın bakiyesinin azalması sonrası onay; ret ve ret gerekçesi; yinelenen onay; audit sıralaması, aktör ve değiştirilemezlik denemeleri.

## Hedef 5 - Tamamlanmış kullanıcı deneyimi ve teslim

**Sonuç:** Müşteri ve operasyon personeli ana akışları kullanılabilir arayüzden tamamlar; proje yeni bir ortamda kurulup doğrulanabilir.

**Kabul koşulları:**
- React müşteri ve personel ekranları tasarıma uygun, tutarlı ve responsive'dir.
- Ana ekranlarda filtreleme, boş liste, yükleniyor, doğrulama/hata ve başarılı işlem durumları vardır. Yetki ihlali kullanıcı arayüzünde de anlaşılır gösterilir.
- Uçtan uca senaryolar girişten hesap görüntüleme, transfer isteği, operasyon onayı/reddi ve güncel bakiyeye kadar çalışır.
- Temiz kurulum README'si bağımlılıkları, Java/Oracle gereksinimini, yapılandırmayı, testleri ve çalıştırma adımlarını doğru anlatır. Ekran görüntüleri gerçekten çalışan uygulamadan alınır.
- CI uygun derleme ve otomatik test kontrollerini çalıştırır. Başarısız veya atlanan kontroller saklanmaz; `NOT_RUN` olarak raporlanır.
- Bilinen önemli kusur kalmaz; uygulama kapsamı, sınırlamalar ve proje teslim bilgileri net biçimde yazılır.

**Nasıl doğrulanır:** Yeni ortamda README ile kurulum; CI sonucu; müşteri ve personel için uçtan uca senaryolar; dar/geniş ekran kontrolü; yükleniyor/boş/hata durumları ve gerçek ekran görüntülerinin incelemesi.

## Bitti tanımı ve ilerleme komutları

Bir hedef ancak o hedefin tüm kabul koşulları karşılandığında, uygun kontroller çalıştırılıp sonuçları kaydedildiğinde ve önemli çözülmemiş kusur kalmadığında tamamlanır. Çalıştırılamayan kontrol başarı gibi sunulmaz; `NOT_RUN` ve nedeni yazılır. Hedef 5 tamamlandığında proje teslimi biter. Öğretici anlatım, CV düzenleme ve mülakat hazırlığı bundan sonra ayrı bir çalışma olarak ele alınır.

- `Hedef 1'i tamamla` - yalnız Hedef 1 sınırına kadar çalış; uygulama özelliğine erken geçme.
- `Hedef 2'yi tamamla` - Hedef 0-2 kabul koşullarını tamamla ve kanıtla.
- `Hedef 3'ü tamamla` - önceki hedefleri koru; Oracle transfer güvenliğini kanıtla.
- `Hedef 4'ü tamamla` - onay/ret ve ikinci kişi kurallarını kanıtla.
- `Hedef 5'i tamamla` - uçtan uca proje teslimini tamamla.

İlerleme hedef numarasıyla verilir; daha sonraki hedefler kullanıcı başlatmadan yapılmaz. Bu hedefler takvim veya işe alınma vaadi değildir.
