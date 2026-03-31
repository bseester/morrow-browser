# 🚀 Morrow Browser v1.4.4 Release Notes

Morrow Browser'ın kullanıcı dostu özelliklerini ve erişilebilirliğini bir üst seviyeye taşıyan **v1.4.4** sürümüne hoş geldiniz. Bu sürüm, tarayıcı içinde beklenen "Sağ Tık" özgürlüğünü ve "Anlık Çeviri" gücünü beraberinde getiriyor.

---

## 🌍 1. Sayfa Çeviri Motoru (Morrow Translate Engine)

Artık yabancı dildeki web siteleri sizin için bir engel değil. Morrow, Google Çeviri altyapısını en zarif ve hissedilmez şekilde tarayıcıya entegre etti.

### ⚡ Doğrudan & Gizli Çeviri
- **Chromium Style Popup:** Adres çubuğundaki (Omnibox) yeni dil ikonuna bastığınızda, şifre menüsü estetiğinde bir çeviri penceresi açılır.
- **Otomatik Türkçe:** "Çevir" dediğiniz an sayfa otomatik olarak Türkçe'ye döner.
- **Gizli Araç Çubuğu (No-Toolbar Mode):** Google'ın o kalabalık üst çubuğunu tamamen gizledik. Sayfa orijinal düzenini korur, sadece metinler şeffaf bir şekilde çevrilir.
- **googtrans Akıllı Entegrasyon:** Çerez bazlı çeviri tetikleme sayesinde sayfayı yenilemeye gerek kalmadan anlık sonuç alırsınız.

---

## 🖱️ 2. Gelişmiş Sağ Tık Menüleri (Context Menus)

Tarayıcı içindeki etkileşimi daha doğal ve hızlı hale getirmek için özel React tabanlı sağ tık menülerini devreye aldık.

### 📋 Kopyala & Yapıştır Özgürlüğü
- **Kısayol Ekleme Paneli:** Artık site kısayolu eklerken URL kısmına sağ tıklayıp "Yapıştır" (Paste) diyebilirsiniz.
- **Favori Yönetimi:** Ana sayfadaki favori kutucuklarınıza sağ tıklayarak "Kaldır (Sil)" seçeneğiyle hızlıca temizlik yapabilirsiniz.

---

## 🎨 3. Görsel Cilalama & UX İyileştirmeleri

- **Premium Glassmorphism:** Çeviri ve sağ tık menüleri, Morrow'un imzası olan 30px blur efektli cam tasarımıyla hazırlandı.
- **Omnibox Revizyonu:** Adres çubuğundaki ikon dizilimi daha dengeli ve profesyonel hale getirildi.
- **Z-Index Optimizasyonu:** Menülerin ve overlay katmanlarının birbirini ezmesi engellendi.

---

## 🛠️ 4. Teknik İyileştirmeler

- **IPC Channel Security:** Yeni `TAB_TRANSLATE` kanalları ana işlem (Main) ve arayüz (Renderer) arasında güvenli bir şekilde bağlandı.
- **Mutation Resilience:** Sayfa içindeki script enjeksiyonları, sayfa değişimlerine karşı daha dirençli (Retry Mode) hale getirildi.

---

Morrow Browser v1.4.4 ile internet artık daha yerel, daha pratik ve daha şık. 🚀

*Morrow Development Team — 2026*
