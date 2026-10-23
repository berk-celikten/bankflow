# BankFlow ortak kuralları

Başlangıçta yalnız bu dosyayı ve `memory/STATE.md` dosyasını oku. Tüm planı, sohbet geçmişini veya kaynak ağacını baştan yükleme. Atanan görev için gereken bölüm/dosyaları hedefli oku.

Kullanıcı numaralı hedef seçer; yalnız seçilen hedefe kadar ilerle. Hedefler docs/HEDEFLER.md içinde. İlk hazırlık sonrası hedef seçilmeden uygulama geliştirmesine başlama.

## Roller ve akış

Ana sohbet yöneticidir: görev, dosya sahipliği, kabul ölçütü ve pano güncellemesi ondadır. Geliştirici uygular ve gerçek kontrol kanıtını verir; kontrolcü ayrı inceler, kaynakları değiştirmez. Bulgu varsa geliştirici düzeltir ve yeniden incelenir. Geliştirici kendi işini kabul etmez. `READY → IN_PROGRESS → IN_REVIEW → DONE`; engelde neden kaydedilir.

Kullanıcının erişebildiği geliştirici/kontrolcü sohbetleri `memory/STATE.md` içinde kayıtlıdır. Bu sohbetler görev bekler; kendiliğinden çalışmaz. Açık insan yetkisi olmadan başka sohbete mesaj gönderme. Altajan aracıyla çalışılıyorsa aynı anda en fazla iki altajan kullan; roller desteklenmiyorsa talimatları görev mesajına taşı.

## Kısa hafıza

`STATE.md`: mevcut aşama ve sıradaki iş. `DECISIONS.md`: gerektiğinde kararlar. `HANDOFF.md`: oturum devri gerektiğinde kısa özet. Ayrıntılar yalnız görevle ilgili `docs/` bölümlerinde, geçmiş kanıtlar `memory/archive/` altında tutulur. Aynı bilgiyi dosyalara tekrar kopyalama. Güncel durumu yönetici yazar; çalışan ajan yalnız sahip olduğu dosyaları değiştirir. Logları ve tüm geçmişi hafızaya ekleme. Uzunluğu `node scripts/context-budget.mjs` ile kontrol et; bu gerçek token ölçümü değildir.

## Ürün sınırları

Java Spring Boot + React + Oracle; tek arka uç uygulaması; sanal TL hesapları ve kurum içi transfer. Gerçek EFT/FAST yok. Para: BigDecimal / NUMBER(19,2); API'de ondalık metin. Transfer atomik olmalı; hata tam geri alınmalı; eşzamanlılık eksi bakiyeye yol açmamalı. Kullanıcı/veri izolasyonu, tekrar isteklerini önleme, onay anında bakiye kontrolü, kendi talebini onaylayamama ve tutarlı denetim kaydı gerekir. Oracle davranışı başka veritabanıyla doğrulanmış sayılamaz.

## Teslim

Kısa Türkçe kullan; kullanıcı Java'yı yeniden öğreniyor. İlgili kontrolleri çalıştır; yapılmayanları NOT_RUN yaz. Her teslim: ne değişti, kontrol sonucu, açık sorun, sıradaki adım. Ayrıntılı öğretim, CV ve mülakat uygulama tamamlandıktan sonra; sorulara o an cevap ver. Mevcut kullanıcı değişikliklerini koru, sırları kaydetme, global izin/model/güven ayarlarını değiştirme. Kullanıcı istemedikçe yayımlama veya başvuru gönderme.
