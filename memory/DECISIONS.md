# Kararlar

- 23.10.2026: Banka başvuruları için BankFlow seçildi. Teknolojiler: Java Spring Boot, React, Oracle. Sürümler uygulama kurulumunda sabitlenecek.
- İlk sürüm: sanal TL hesapları, banka içi transfer, personel onayı ve denetim izi. Gerçek para veya EFT/FAST entegrasyonu yok.
- Tek Spring Boot uygulaması. Transfer tutarlılığı ve testler ilk öncelik. İş kuralları AGENTS.md'de; ayrıntılı kabul ölçütleri görev panosunda.
- Kullanıcı Java'yı yeniden öğreniyor. Önce ajan sistemi, ardından tasarım ve uygulama. Tamamlandıktan sonra kod öğretimi, CV ve mülakat.
- Yönetici ana sohbet. Geliştirici uygular, kontrolcü bağımsız inceler, yönetici kabul eder. Kullanıcı ayrıca doğrudan açabildiği iki rol sohbeti istedi; bunlar oluşturuldu.
- Hafıza dosya tabanlıdır; istemcinin dahili kalıcı hafızası değildir. Her başlangıçta yalnız AGENTS.md ve STATE.md okunur. Diğer dosyalar görev gerektirdikçe açılır. Eski raporlar başlangıç bağlamına eklenmez.
- Kullanıcı model/düşünme ayarını yöneticiye bıraktı. Geliştirici: GPT-6.1 Sol/medium. Rutin kontrol ve dar işler: GPT-6 Luna/high. Transfer, yetki, eşzamanlılık ve onay incelemesi: GPT-6.1 Sol/high. Gereksiz Max/Ultra yok; global izinler değişmez. Token miktarı garanti edilmez.
- Onay bekleyen transfer bakiyeyi değiştirmez. Onayda bakiye yeniden kontrol edilir ve aktarım atomik yapılır. Aynı anahtar/farklı içerik reddedilir; kullanıcı kendi talebini onaylayamaz.

Yeni karar yalnız gerçekten yön değiştirirse eklenir; günlük ilerleme STATE.md'ye yazılır.
