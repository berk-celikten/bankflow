# BankFlow üzerinden öğrenme yolu

Java'yı eskiden bilip bugün pek hatırlamamak bu projeye başlamak için engel değil. Geliştirmeyi ajanlar üstlenecek; uygulama tamamlandıktan sonra onu birlikte anlayıp küçük değişiklikler yapabilecek noktaya geleceğiz. Bu belge planlanan eğitim yoludur; aşağıdaki dersler henüz yapılmadı.

## Geliştirme sırasında

Her küçük aşamanın sonunda üç kısa cümle paylaşılır: ne ortaya çıktı, ne kontrol edildi ve o parçadan hangi konu öğrenilebilir. Bu aşamada kullanıcıdan bütün kodu okuması veya teknik kararları ezberlemesi beklenmez. Ekranları kullanmak ve “bu işlem neden böyle davranıyor?” sorusunu takip etmek yeterlidir.

## Uygulama bittikten sonra

| Sıra | Konu | BankFlow'daki örnek | Küçük çalışma |
| --- | --- | --- | --- |
| 1 | Java'yı hatırlama | Hesap, müşteri ve transfer nesneleri | Bir sınıfın alanlarını ve bir metodun girdisini/çıktısını açıklama. |
| 2 | Temel Java araçları | Listeler, durum değerleri, hata türleri, `BigDecimal` | Bir transfer tutarını doğrulayan küçük kuralı anlama ve değiştirme. |
| 3 | Web isteğinin yolu | React formu → HTTP isteği → API yanıtı | Tarayıcıdan gönderilen bir isteğin içeriğini ve sonucunu inceleme. |
| 4 | Spring Boot | Controller, service, repository ve bağımlılıkların verilmesi | Bir transferin hangi dosyalardan geçtiğini gösterme. |
| 5 | Oracle ve SQL | Kullanıcı, hesap, transfer ve hareket ilişkileri | Kendi örnek hesabının son hareketlerini SQL ile listeleme. |
| 6 | Transaction ve tutarlılık | İki hesabın birlikte güncellenmesi | Hata halinde neden yarım transfer kalmaması gerektiğini açıklama. |
| 7 | React | Bileşen, durum, form ve API çağrısı | Bir filtre veya açıklama alanında küçük değişiklik yapma. |
| 8 | Güvenlik ve test | Kendi hesabını görme, rol denetimi ve başarısız transfer | Yetkisiz erişim ve yetersiz bakiye testinin neyi kanıtladığını anlatma. |
| 9 | İleri iş kuralları | Eşzamanlı istekler, tekrar önleme anahtarı, onay süreci | Aynı isteğin neden ikinci kez para aktarmadığını örnekle açıklama. |
| 10 | Projeyi sunma | Mimari ve demo senaryosu | Projeyi önce iki dakikada, ardından bir transfer üzerinden ayrıntılı anlatma. |

Her çalışmada önce çalışan davranışı göreceğiz, sonra ilgili az sayıdaki dosyayı okuyacağız. Ardından küçük bir değişiklik yapıp uygun kontrolü çalıştıracağız. İlerleme ezberlenen terim sayısına göre değil, kullanıcının davranışı kendi cümleleriyle açıklayabilmesine göre değerlendirilecek.

## Mülakata geçiş

Proje ve temel kod akışı anlaşıldıktan sonra şu başlıklara çalışacağız:

- Java: nesne yönelimli programlama, koleksiyonlar, hata yönetimi ve para hesapları.
- Spring Boot: API, katmanlar, doğrulama, transaction ve yetkilendirme.
- Oracle/SQL: ilişkiler, anahtarlar, join, index ve kilitlemenin amacı.
- Test: birim, entegrasyon ve uçtan uca kontrolün hangi sorulara cevap verdiği.
- Proje kararları: tek Spring Boot uygulaması seçimi, transferin bütünlüğü, tekrar istekleri ve onay süreci.
- İletişim: bilinmeyen bir soruyu dürüstçe ele alma, bir hatayı araştırma ve çözümü açıklama.

CV'de projenin amacı, kullanılan teknolojiler ve doğrulanan davranışlar yazılır. Ajanların hazırladığı kodu baştan sona kendin yazmış gibi anlatmak yerine, geliştirme desteğini ve sonradan anladığın/değiştirdiğin parçaları doğru ifade edeceğiz. Hedef, projenin gerçekten açıklayabildiğin ve üzerinde çalışabildiğin bir çalışma örneğine dönüşmesidir.

## Örnek demo akışı

1. Sanal müşteri olarak giriş yap ve hesaplarını göster.
2. Geçerli bir TL transferi yap; iki hesaptaki değişimi ve hareketleri incele.
3. Yetersiz bakiyeli bir isteğin neden reddedildiğini göster.
4. Onay bekleyen transferi personel ekranında değerlendir.
5. Bir test üzerinden hata olduğunda bakiyelerin nasıl korunduğunu anlat.

Bu demo ancak ilgili özellikler geliştirilip doğrulandıktan sonra uygulanacak. Başvuru hazırlığı görev panosunda BF-013 ve BF-014 olarak planlıdır.
