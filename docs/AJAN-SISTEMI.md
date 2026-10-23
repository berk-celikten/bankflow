# BankFlow ajan çalışma düzeni

Bu düzenin amacı işi küçük parçalara ayırmak, kodu ayrı bir gözle kontrol etmek ve ilerlemeyi anlaşılır tutmak. **Yönetici ana oturumdur; geliştirici ve kontrolcü onun verdiği görevleri yapan altajanlardır.**

Kullanıcının doğrudan yazabilmesi için aynı projede **BankFlow - Geliştirici** ve **BankFlow - Kontrolcü** adlı ayrı sohbetler de açıldı. Bu erişilebilir sohbetler altajan araçlarındaki geçici görevlerden ayrıdır. Sohbet kimlikleri public depoya eklenmez; yerel .local/agents.json içinde tutulur. Kendiliğinden sohbetler arası mesajlaşma veya sürekli çalışma yoktur.

Kısa başlangıç bağlamı yalnız AGENTS.md ve memory/STATE.md'dir. Bu uzun rehber yalnız gerektiğinde okunur. Rutin kontrol Luna/High; geliştirme Sol/Medium; transfer, yetki, tekrar istekleri, eşzamanlılık ve onay incelemesi Sol/High kullanır. Kullanıcı hedef seçer; görevler yalnız seçilen hedef sınırında ilerler.

## Roller

| Rol | Sorumluluğu | Teslimi |
| --- | --- | --- |
| Yönetici | Kapsamı ve sıradaki işi belirler; dosya sahipliğini ayırır; kabul ölçütlerini yazar; bağımlılıkları takip eder; kullanıcıya kısa açıklama yapar. | Güncel görev panosu, net görev tanımı ve kanıta dayalı kabul kararı. |
| Geliştirici (`developer`) | Verilen kapsamda kodu ve ilgili belgeleri yazar; gerekli kontrolleri çalıştırır; sorunları düzeltir. | Değişen dosyalar, ne yaptığı, kontrol komutları/sonuçları ve kalan eksikler. |
| Kontrolcü (`reviewer`) | Kabul ölçütlerini, iş kurallarını, yetkileri ve test kanıtlarını bağımsız inceler. İncelediği uygulama kodunu değiştirmez. | Önem sırasına göre somut bulgular, kanıtlar ve kabul/düzeltme önerisi. |

Kontrolcü, geliştiricinin kendi kendine verdiği bir unvan değildir; ayrı bir inceleme görevi alır. Kontrolcünün bulduğu sorunları geliştirici düzeltir, kontrolcü düzeltmeyi yeniden inceler. Son kabul ve panodaki durum değişikliği yöneticiye aittir.

## İşin akışı

```text
Yönetici: küçük görev + kabul ölçütü + dosya sahipliği
    ↓
Geliştirici: uygula + çalıştır + kanıtla
    ↓
Kontrolcü: bağımsız incele
    ├─ Sorun var → geliştiriciye düzeltme → yeniden inceleme
    └─ Ölçütler sağlandı → yönetici kanıtları değerlendirir → DONE
```

Bağımsız işler paralel yapılabilir. Aynı dosyada eşzamanlı değişiklik yapılmaz; ortak dosyanın sahibi önceden belirlenir. Testin çalışmadığı bir ortamda kontrolcü incelemenin sınırını belirtir ve çalışmış test sonucu uydurmaz.

## VS Code ve oturumların sınırı

- VS Code çalışma alanı proje dosyalarını, rehberleri ve kontrol görevlerini bir araya getirir.
- Projeye özel ajan tanımları `.codex/agents/developer.toml` ve `.codex/agents/reviewer.toml` dosyalarında; ortak ayarlar `.codex/config.toml` dosyasındadır.
- `AGENTS.md`, projede çalışacak ajanların ortak çalışma kurallarını içerir.
- Bu sohbette gerçek altajan araçlarıyla görev devri yapılmaktadır. Proje dosyalarının varlığı, yeni bir VS Code/Codex oturumunda ajanların keşfedilip çalıştırıldığını tek başına kanıtlamaz; o doğrulama ayrıca yapılır ve raporlanır.
- Proje ayarlarının yüklenmesi Codex istemcisinin sürümüne ve projenin güven durumuna bağlıdır. Giriş veya güven seçimi gerekirse kullanıcı kendi arayüzünde tamamlar; mevcut izinler genişletilmez.
- Ajanlar aktif bir çalışma oturumunda görev alır. Bu dosyalar kendiliğinden sürekli çalışan bir arka plan hizmeti kurmaz ve sohbet kapalıyken çalışma yapıldığını göstermez.

Resmî başvuru: [Codex altajanları](https://learn.chatgpt.com/docs/agent-configuration/subagents) ve [projeye özel ayarlar](https://learn.chatgpt.com/docs/config-file/config-basic).

## Yönetici için görev şablonu

```text
Görev kimliği: BF-007
Amaç: Aynı para birimindeki iki sanal hesap arasında atomik transfer.
Geliştirici dosya sahipliği: Yönetici tarafından bu görev için listelenen dosyalar.
Girdi: Kullanıcının kendi kaynak hesabı, hedef hesap, pozitif tutar ve tekrar önleme anahtarı.
İş kuralları: Yetersiz bakiye reddedilir; iki hesap ve hareketler birlikte kaydedilir.
Kabul ölçütleri:
  - Başarıda gönderen azalır, alıcı aynı miktarda artar.
  - Hata olduğunda hiçbir yarım aktarım kalmaz.
  - Başka müşterinin kaynak hesabı kullanılamaz.
Kontroller: İlgili birim/entegrasyon testleri ve gerekli Oracle doğrulaması.
Teslim: Değişiklik özeti, dosyalar, gerçek test sonuçları ve açık eksikler.
```

Bu örnek gelecek bir uygulama görevidir; BF-007'nin tamamlandığını göstermez. Yönetici görevi vermeden önce o aşamanın somut dosya yollarını ve gereken testleri belirler.

## Geliştirici teslim şablonu

```text
Görev:
Yapılan değişiklik ve kullanıcıya etkisi:
Değişen dosyalar:
Çalıştırılan kontroller ve sonuçları:
Çalıştırılamayan kontroller ve nedeni:
Kalan eksik / karar gerektiren konu:
Kontrolcüye özellikle bakmasını önerdiğim yer:
```

## Kontrolcü rapor şablonu

```text
Görev ve incelenen sürüm/dosya durumu:
Kapsanan kabul ölçütleri:
Bulgular:
  - Önem: kritik / önemli / küçük
  - Konum: dosya ve ilgili bölüm/satır
  - Sorun ve oluştuğu senaryo:
  - Beklenen davranış:
  - Kanıt veya yeniden üretme adımı:
Çalıştırılan kontrollerin gerçek sonuçları:
Çalıştırılamayan kontroller ve inceleme sınırı:
Sonuç: kabul önerisi / düzeltme gerekli
```

## Tamamlanma kuralı

Bir uygulama görevi için dosyalar yazılmış, kabul ölçütleri doğrulanmış, gereken testler geçmiş ve kontrolcünün önemli bulguları giderilmiş olmalı. Gerçek Oracle kontrolü gerektiren bir davranış yalnızca farklı bir veritabanında denendiğinde Oracle doğrulanmış sayılmaz. Yönetici sonucu kullanıcıya sade dille anlatır ve görev panosunu günceller.

Her aşamanın kullanıcı açıklaması üç kısa cümleyle yapılır: **“Şu parçayı tamamladık. Şu davranışı kontrol ettik. Bu parçada daha sonra şu konuyu öğreneceksin.”** Ayrıntılı kod öğretimi uygulama tamamlandıktan sonra başlar.
