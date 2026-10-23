# BankFlow görev panosu

Başlangıç tarihi: **23 Ekim 2026**. Ajan çalışma düzeni ve kısa hafıza kontrolleri tamamlandı; banka uygulaması henüz yazılmadı. Kullanıcı hedef seçerek geliştirmeyi başlatacak.

## Durumların anlamı

- `BACKLOG`: İleride yapılacak; çalışmaya başlanmadı.
- `READY`: Bağımlılıkları belirli; başlanabilir.
- `IN_PROGRESS`: Geliştirici üzerinde çalışıyor.
- `IN_REVIEW`: Geliştirici teslim etti; kontrolcü ve yönetici değerlendirmesi sürüyor.
- `CHANGES_REQUESTED`: Kontrolcü sorun buldu; geliştirici düzeltmeli.
- `DONE`: Kabul ölçütleri gerçek kanıtlarla doğrulandı ve yönetici kabul etti.
- `BLOCKED`: İlerlemek için giderilmesi gereken somut bir engel var; engel ve sıradaki adım kaydedilmeli.

## Görevler

| Kimlik | Görev | Durum | Bağımlılık | Kabul ölçütü |
| --- | --- | --- | --- | --- |
| BF-001 | Yönetici, geliştirici ve kontrolcü düzenini; VS Code çalışma alanını ve rehberleri kur | DONE | — | Dosya/JSON/görev/TOML ve hafıza kontrolleri geçti; bağımsız kontrolcü PASS verdi. Özel rollerin yeni IDE oturumunda keşfi ayrıca NOT_RUN olarak kayıtlı. |
| BF-002 | Geliştirme araçlarını ve Oracle çalıştırma yolunu hazırla | READY | — | Java/JDK, Maven veya proje sarmalayıcısı, Node ve Oracle çalıştırma yöntemi belirli; seçilen yolun sürümleri ve bağlantısı doğrulanmış. Docker seçilirse kurulumu ve çalışması da doğrulanmış. |
| BF-003 | Resimli ekran tasarımı, roller, transfer durumları ve mimariyi hazırla | BACKLOG | BF-001 | Dört ana ekran görseli, istek akışı ve veri modeli birbiriyle uyumlu. |
| BF-004 | Spring Boot, React ve Oracle uygulama temelini kur | BACKLOG | BF-002, BF-003 | Ön yüz → API → Oracle okuma/yazma akışı çalışıyor; kurulum adımları kayıtlı. |
| BF-005 | Giriş, roller ve kullanıcı veri izolasyonunu uygula | BACKLOG | BF-004 | Yetkisiz istekler ve başka müşterinin hesaplarına erişim testlerle reddediliyor. |
| BF-006 | Hesap ve hareket ekranlarını bağla | BACKLOG | BF-005 | Doğru müşteri hesapları ve tutarları gösteriliyor; filtre ve boş/hata durumları çalışıyor. |
| BF-007 | Atomik TL transferini geliştir | BACKLOG | BF-006 | Başarılı aktarım, yetersiz bakiye, geçersiz tutar ve hata halinde geri alma testleri geçiyor. |
| BF-008 | Tekrar isteklerini ve eşzamanlı transferleri güvenceye al | BACKLOG | BF-007 | Aynı isteğin tekrarı ikinci aktarım yapmıyor; farklı içerikli anahtar kullanımı reddediliyor; eşzamanlı işlemlerde bakiye negatif olmuyor. Oracle testi ayrı raporlanıyor. |
| BF-009 | Operasyon onayı ve ret süreçlerini tamamla | BACKLOG | BF-008 | Kendi talebini onaylama, yetersiz bakiye ve yinelenen karar senaryoları doğru işleniyor. |
| BF-010 | Denetim izi ve işlem özetlerini tamamla | BACKLOG | BF-009 | Yetkili personel olayları filtreleyebiliyor; hassas giriş sırları kayıtlarda bulunmuyor. |
| BF-011 | Uçtan uca kontrolleri ve temiz kurulum rehberini tamamla | BACKLOG | BF-010 | Kritik senaryoların test kanıtları, gerçek Oracle doğrulaması ve çalıştırılmış kurulum adımları mevcut. |
| BF-012 | GitHub sunumu ve ekran görüntülerini hazırla | BACKLOG | BF-011 | README, mimari, örnek ekranlar, kurulum ve sınırlamalar hazır; yayımlama yapıldıysa gerçek adres doğrulanmış. |
| BF-013 | Java tekrarı ve projeyi kod üzerinden öğret | BACKLOG | BF-012 | Kullanıcı transfer akışını açıklıyor ve küçük bir değişikliği rehberli olarak yapabiliyor. |
| BF-014 | CV ve mülakat hazırlığı yap | BACKLOG | BF-013 | Kullanıcının gerçek katkısını doğru anlatan proje maddesi, proje sunumu ve mülakat provası hazırlanmış. |

## İlk ortam gözlemi

- VS Code, Node.js, Git ve Codex CLI bulundu.
- VS Code'da `openai.chatgpt` eklentisi listelendi.
- İlk kontrolde `java`, `javac`, `mvn` ve `docker` PATH üzerinde bulunamadı. Bu sonuç, bilgisayarda hiçbir yerde kurulu olmadıklarını kanıtlamaz; kurulum veya konum tespiti BF-002 kapsamında yapılacak.
- Oracle bağlantısı henüz doğrulanmadı.
- Bir banka uygulaması testi veya gerçek para transferi çalıştırılmadı.

## Kanıt kaydı

Görevi `DONE` yapan yönetici aşağıdaki kaydı ekler. Sadece dosyanın mevcut olması, banka davranışının doğru çalıştığını kanıtlamaz.

```text
Görev: BF-...
İncelenen dosyalar / sürüm:
Çalıştırılan kontrol:
Gerçek sonuç:
Kontrolcü sonucu: kabul / düzeltme gerekli
Çalıştırılamayan kontrol ve nedeni:
Yöneticinin kabulü:
Sıradaki görev:
```

İlk kurulum kanıtları [BF-001 kontrol kaydında](../memory/archive/BF-001.md). Sonraki görevlerde kanıtlar görev kimliğiyle ilişkilendirilir; yapılmamış kontroller yapılmış gibi yazılmaz.
