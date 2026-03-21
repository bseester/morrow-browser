# Morrow Browser 🚀

**Morrow Browser**, Electron, React ve TypeScript ile geliştirilmiş, hız ve kişiselleştirilebilirlik odaklı modern bir masaüstü internet tarayıcısıdır.

## ✨ Özellikler

- 🗂️ **Çalışma Alanları (Workspaces):** Sekmeleri farklı çalışma alanlarına bölerek iş ve kişisel hayatını ayır.
- 🔖 **Kişisel Yer İmleri:** Her çalışma alanının kendine ait ve bağımsız Yer İmleri (Bookmarks) ve Hızlı Erişim Kısayolları.
- 🎨 **Modern ve Şık Arayüz:** Karanlık mod (Dark Mode) ve akıcı cam tasarımlar.
- 🌐 **Dinamik Sekme Logoları (Favicons):** Sitelerin kendi gerçek logolarını doğrudan sekmelerde akıcı gösterir.
- ⬇️ **İndirme ve Geçmiş Yönetimi:** Sorunsuz dosya indirme desteği ve kalıcı (persistent) veri tabanı.

## 🛠️ Kurulum ve Geliştirme

Projeyi yerelde çalıştırmak için:

1. Bağımlılıkları kurun:
   ```bash
   npm install
   ```

2. Geliştirme modunu (Dev) başlatın:
   ```bash
   npm run dev
   ```

## 📦 Paketleme (Production / Setup)

Uygulamayı bir `.exe` (Windows) paketlemek için:

### Windows İçin:
```bash
npm run package:win
```
*Not: Sembolik link (symlink) hatalarını önlemek için terminalinizi **Yönetici olarak** veya Windows **Geliştirici Modu** açıkken çalıştırmanız önerilir.*

---

## 🔧 Son Gelişmeler ve İyileştirmeler

Bu başlık altında son yapılan görsel, işlevsel ve kararlılık güncellemeleri listelenmektedir:

### 🔍 1. Adres Çubuğu (Omnibox) & Öneriler
- **Dinamik İkonlar:** Arama önerileri tipine göre (**🎵 Müzik**, **🌐 Web**, **🔍 Arama**) otomatik rozet kazanır.
- **Split Metin Alanı:** Okunabilirliği artırmak adına öneriler iki satıra bölünür.
- **AI Entegrasyonu:** Adres çubuğu içine estetik ve hover animasyonlu bir **✨ AI** butonu eklendi.

### 🛡️ 2. Sekme & Navigasyon Güvenliği
- **Otomatik Düzeltme Fall-back:** Boş sekmelerde veya kilitlenmelerde `activeTabId` null dahi olsa arama kilitlenmesi yaşanmaz, otomatik sekme yaratılır.

### 🎛️ 3. 3-Nokta Menü (Chrome Menu Overlay)
- **Güvenceli Çalışma Modu:** Overlay pencerelerinde (`sandbox: false`) standartları uygulanarak sayfa içi çakışmalar giderildi.
- **Dinamik Port Çözümleme:** Geliştirme ortamında (`npm run dev`) overlay dosyalarının yüklenememe hatası giderildi.

---
İyi kullanımlar! 🌈
