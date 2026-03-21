# Morrow Browser V1.3.4 - Rebranding & Tab Grouping Release

Bu sürümde uygulama ismi **Morrow Browser** olarak güncellendi ve sekme düzeninde köklü görsel/mantıksal iyileştirmeler yapıldı.

### Yeni Özellikler & Değişiklikler
- **Yeniden Markalama**: "Aura" ibareleri ve protokoller (`morrow://`) tamamen güncellendi.
- **Sağ Tık ile Gruplama**: Bir sekmeye sağ tıklayıp **"Sağdaki ile Grupla"** diyerek anında dinamik grup oluşturabilirsiniz.
- **Grup Görseli**: Gruplanan sekmeler küçülür ve grup sınırlarına görsel derinlik katmak adına boşluk (`12px`) ayrılır.

### Hata Düzeltmeleri
- **Main Process Crash**: Çoklu veya seri x (kapatma) tetiklemelerindeki `Object has been destroyed` kilitlenmesi giderildi.

---

# Morrow Browser V1.3.1 - AdBlock Integration Release

Bu sürümde Aura Browser'a tam kapsamlı reklam engelleme (AdBlock) özellikleri entegre edildi.

### Yeni Özellikler (AdBlock & Güvenlik)
- **uBlock Origin Entegrasyonu**: Dünyanın en güçlü reklam engelleyicisi olan uBlock Origin, tarayıcıya "Core Extension" olarak dahil edildi. Her açılışta otomatik olarak yüklenir.
- **Tek Oturum (Default Session) Desteği**: Reklam engelleyici artık tüm sekmelerde (Haber siteleri, YouTube vb.) kusursuz çalışacak şekilde ana oturuma bağlandı.
- **uBlock Dashboard Erişimi**: 
  - Ayarlar sayfasında (Privacy bölümü) özel kontrol butonu.
  - Yan panelde (Sidebar) kolay erişim butonu.
  - Tek tıkla uBlock Origin kontrol paneline tam sekme erişimi.
- **Dahili AdBlocker Çekirdeği**: Ağ seviyesinde 40'tan fazla reklam ve takip ağını (DoubleClick, AdForm, Taboola vb.) filtreleyen yerleşik bir koruma katmanı eklendi.

### Diğer İyileştirmeler
- **Omnibox Yıldız Butonu**: Adres çubuğuna Lucide ikon setinden modern bir "Favorilere Ekle" yıldızı eklendi.
- **Kullanıcı Arayüzü**: Yıldız butonu ve AI yardımcısı yan yana getirilerek Omnibox düzenlendi.
- **Paketleme**: Windows için yeni yükleyici (`Aura Browser Setup 1.3.1.exe`) oluşturuldu.

---
*Aura Browser ile daha temiz ve hızlı bir web deneyimi sizi bekliyor!*
