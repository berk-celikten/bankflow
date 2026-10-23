# BankFlow — güncel durum

Tarih: 23 Ekim 2026. Aşama: Hedef 0 hazır; ilk dosyalar public depoda. Ajan/VS Code/hafıza kontrolleri geçti. Banka uygulaması henüz yazılmadı.

Hedef: Java Spring Boot + React + Oracle ile sanal TL transferi ve operasyon onayı. Kullanıcı başlangıç seviyesinde; ayrıntılı öğrenme ve mülakat proje bitince.

Kaynak: bu dosyanın üstündeki BankFlow klasörü. Public depo: https://github.com/berk-celikten/bankflow . Tek etkin çalışma kopyası kullanılacak.

Erişilebilir sohbetler:
- Yönetici: ana koordinasyon sohbeti.
- Geliştirici: BankFlow - Geliştirici (Sol / Medium).
- Kontrolcü: BankFlow - Kontrolcü (Luna / High; kritik işte Sol / High).

Sohbet kimlikleri yalnız gitignore kapsamındaki .local/agents.json dosyasında tutulur.

BF-001 DONE: iki bağımsız inceleme PASS; kanıt memory/archive/BF-001.md. Yerel özel rol keşfi NOT_RUN.
Ortam: VS Code/Codex eklentisi, Node, npm ve Git mevcut. java/javac/mvn/docker PATH'te bulunamadı. Oracle bağlantısı NOT_RUN.
Sıradaki iş: kullanıcının hedef seçmesi. Hedef 1 seçilince BF-002 araçlar ve BF-003 tasarıma geç; öncesinde uygulama kodu yazma. CI akışı mevcut GitHub izni nedeniyle henüz yayımlanmadı; son test hedefinde ele alınacak.

Detay gerektiğinde: docs/GOREVLER.md içindeki ilgili görev. Karar için DECISIONS.md; devir için HANDOFF.md. Tüm belgeleri otomatik okuma.
