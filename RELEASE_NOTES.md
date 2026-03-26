# Morrow Browser V1.3.5 - Omnibox & AdBlock Fixes
Bu sürümde arama çubuğuna entegrasyonlar sağlanmış ve tarayıcının çekirdek özelliklerindeki bazı ufak pürüzler giderilmiştir.

### Yeni Özellikler & Değişiklikler
- **Arama Çubuğu (Omnibox) Geçmiş Entegrasyonu**: Artık adres çubuğundan doğrudan kendi arama geçmişinizi anında tarayabilirsiniz. Bulunan geçmiş sonuçları `🕒` (saat) ikonuyla gösterilir ve eş zamanlı olarak web'den gelen sonuçlarla harmanlanır.

### Hata Düzeltmeleri
- **Ayarlar Ekranında Z-Index Hatası**: `/settings` (Ayarlar) sayfası açıldığında arka plandaki sekmelerin arayüzü örtmesi hatası `TabManager` optimizasyonlarıyla düzeltildi.
- **Kategorik Adblock Engeli**: Sekme oluşturulma Partition'ları düzeltilerek webRequest eklentilerinin (Adblock v.b) her sekmede %100 istikrarla çalışması güvence altına alındı.
- **Geçmiş (History)**: Sayfalar arası dolaşımın veritabanına işlenmemesi durumu TabManager IPC kanalları kullanılarak onarıldı. Artık verileriniz başarıyla tutuluyor.

---

# Morrow Browser V1.3.4 - Rebranding & Tab Grouping Release

Bu sürümde uygulama ismi **Morrow Browser** olarak güncellendi ve sekme düzeninde köklü görsel/mantıksal iyileştirmeler yapıldı.

### Yeni Özellikler & Değişiklikler
- **Yeniden Markalama**: "Aura" ibareleri ve protokoller (`morrow://`) tamamen güncellendi.
- **Sağ Tık ile Gruplama**: Bir sekmeye sağ tıklayıp **"Sağdaki ile Grupla"** diyerek anında dinamik grup oluşturabilirsiniz.
- **Grup Görseli**: Gruplanan sekmeler küçülür ve grup sınırlarına görsel derinlik katmak adına boşluk (`12px`) ayrılır.
- **Oto-Güncelleme Sistemi**: v1.3.3'teki `version_id` ve `version.json` tabanlı özel oto-güncelleme uyarı sistemi geri getirildi.

### Hata Düzeltmeleri
- **Main Process Crash**: Çoklu veya seri x (kapatma) tetiklemelerindeki `Object has been destroyed` kilitlenmesi giderildi.

---
*Morrow Browser ile daha temiz ve hızlı bir web deneyimi sizi bekliyor!*
