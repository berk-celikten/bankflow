# BankFlow proje planı

BankFlow, Java ve bankacılık konularını somut bir proje üzerinden anlatabilmek için hazırlanacak bir **dijital bankacılık ve transfer yönetimi simülasyonu**. Kullanıcı Java'yı daha önce görmüş, şu anda başlangıç seviyesinden ilerlemek istiyor. Önce ajan çalışma düzeni kuruluyor; banka uygulaması henüz geliştirilmedi.

## İlk sürümün kapsamı

- Sanal müşteriler, sanal bakiyeler ve yalnızca TL hesapları.
- Müşterinin kendi hesaplarını, hareketlerini ve transferlerini görebildiği React ekranları.
- Uygulamadaki başka bir hesaba kurum içi transfer.
- Belirlenen eşik üzerindeki transferler için operasyon personeli onayı veya reddi.
- Kim, hangi işlemi, ne zaman yaptı sorusuna cevap veren denetim kayıtları.
- Tek Spring Boot arka uç uygulaması ve Oracle veritabanı.

Gerçek EFT/FAST bağlantısı, gerçek müşteri verisi, kart sistemi ve kredi değerlendirmesi ilk sürümün kapsamına dahil değil. Bu sınır projeyi tek kişi tarafından anlaşılabilir ve tamamlanabilir tutar. Sonraki özellikler ilk sürüm çalıştıktan sonra ayrıca değerlendirilir.

## Aşamalar

| Aşama | Ortaya çıkacak sonuç | Geçiş ölçütü |
| --- | --- | --- |
| 0. Ajanlar ve çalışma ortamı | Yönetici, geliştirici ve kontrolcü rolleri; görev panosu; VS Code çalışma alanı; araç teşhisi | Dosyalar doğrulanmış, kontrolcü raporu incelenmiş ve eksik araçlar açıkça kaydedilmiş olmalı. Eksik araçlar BF-002'de tamamlanmadan uygulamanın çalıştığı söylenmez. |
| 1. Resimli tasarım ve mimari | Müşteri paneli, transfer formu, işlem geçmişi ve personel onay ekranının görselleri; veri ve istek akışının çizimi | Ekranlar, roller, transfer durumları ve veri modeli birbirini karşılamalı. Görseller çalışan uygulama diye sunulmamalı. |
| 2. Uygulama temeli | Spring Boot, React ve gerçek Oracle bağlantısı; ortam ayarları ve ilk veritabanı şeması | Ön yüzden arka uca istek ve Oracle'a okuma/yazma örneği çalıştırılarak doğrulanmalı. Seçilen sürümler ve kurulum adımları kaydedilmeli. |
| 3. Kullanıcı ve hesaplar | Giriş, rol denetimi, müşteriye ait hesaplar ve hesap hareketleri | Müşteri başka müşterinin verisine erişememeli; yetkisiz istekler reddedilmeli. |
| 4. Transfer motoru | Tutar/bakiye kontrolleri, atomik para aktarımı, tekrar isteği ve eşzamanlılık yönetimi | Aşağıdaki kritik transfer senaryoları test kanıtlarıyla geçmeli. |
| 5. Operasyon ve denetim | Onay kuyruğu, onay/ret, işlem durumları ve denetim izi | Talep sahibi kendi transferini onaylayamamalı; karar sırasında bakiye yeniden kontrol edilmeli; tekrar onay para aktarmamalı. |
| 6. Tamamlama ve sunum | Kurulum rehberi, örnek veriler, ekran görüntüleri, test sonuçları ve GitHub'a uygun proje açıklaması | Temiz kurulum adımları uygulanmış; kritik testler geçmiş; bilinen sınırlamalar yazılmış olmalı. GitHub'da yayımlama ayrıca gerçek işlem olarak doğrulanır. |
| 7. Anlama ve başvuru hazırlığı | Kod üzerinden öğretim, Java tekrarı, CV proje maddesi ve mülakat provası | Kullanıcı bir transferin React → Spring Boot → Oracle yolunu ve temel tasarım kararlarını kendi cümleleriyle anlatabilmeli. |

## Transferin doğruluk kuralları

1. Para Java'da `BigDecimal`, Oracle'da `NUMBER(19,2)` ile tutulur. Sıfır veya negatif tutar ve ikiden fazla ondalık basamak reddedilir.
2. Transferde gönderen bakiyesinin azalması, alıcı bakiyesinin artması, borç/alacak hareketleri ve tamamlanmış durum birlikte kaydedilir. Bir adım başarısızsa tamamı geri alınır.
3. Aynı hesaptan eşzamanlı istekler bakiyeyi eksiye düşüremez. Kullanılacak kilitleme yaklaşımı uygulama aşamasında belirlenir ve gerçek Oracle üzerinde test edilir.
4. Aynı tekrar önleme anahtarı (`idempotency key`) ve aynı içerikle gelen istek ikinci kez para aktaramaz. Aynı anahtar farklı içerikle gelirse çakışma olarak reddedilir. Anahtar kullanıcı bağlamına göre ele alınır.
5. İlk sürümde onay bekleyen transfer bakiyeyi değiştirmez. Onay sırasında, aynı atomik işlem içinde güncel bakiye tekrar kontrol edilir. Yetersizse para aktarılmaz ve sonuç açıkça gösterilir.
6. Onay/ret yalnız yetkili personelce yapılır; talebi oluşturan kişi kendi talebini onaylayamaz. Tamamlanmış veya reddedilmiş işlem tekrar işlenemez.
7. Müşteri yalnız kendi hesap ve transferlerine erişebilir. Ön yüzde bir düğmeyi gizlemek tek başına yetkilendirme sayılmaz; arka uç da kontrol eder.
8. Geçmişte tamamlanan para hareketleri doğrudan değiştirilmez. Denetim kaydı hassas kimlik veya giriş sırlarını içermez.

## Çalışma ve öğrenme şekli

Yönetici bir seferde küçük ve sınanabilir görevler verir. Geliştirici uygulamayı yazar; kontrolcü bağımsız olarak kanıtları ve davranışı inceler. Kontrol sonucu sorun bulunursa görev geliştiriciye geri döner; yönetici kanıtları görmeden görevi tamamlandı işaretlemez.

Her küçük aşama sonunda kullanıcıya üç kısa cümleyle şu bilgiler verilir: **Ne çıktı? Ne kontrol edildi? Bununla ne öğrenebilirsin?** Ayrıntılı öğretim uygulama tamamlandıktan sonra kodun üzerinden yapılır. Kullanıcının her teknik kararı baştan bilmesi veya her küçük adımı onaylaması beklenmez.

Güncel görev durumları [GOREVLER.md](GOREVLER.md) dosyasındadır. Ajanların teslim ve inceleme düzeni [AJAN-SISTEMI.md](AJAN-SISTEMI.md) dosyasında, daha sonra izlenecek eğitim yolu [OGRENME-YOLU.md](OGRENME-YOLU.md) dosyasında açıklanır.
