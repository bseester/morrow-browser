# Morrow Browser

Morrow bu dalda doğrudan [Chromium kaynak kodundan](https://chromium.googlesource.com/chromium/src/) derlenir. Sekmeler, adres çubuğu, gezinme ve sayfa görüntüleme Chromium’un kendi masaüstü uygulamasından gelir. Uygulama **Chromium** adıyla açılır ve Chromium’un kendi profilini kullanır. Önceki Morrow profilinden otomatik veri aktarımı yoktur.

[`chromium.json`](chromium.json) kaynak sürümünü ve commit kimliğini sabitler. Kurulum, bu commit’i resmî depodan alır ve bağımlılıkları Chromium’un `DEPS` dosyasına göre eşitler. [Derleme ayarları](build/args.gn) sürüm derlemesini, profil güdümlü optimizasyonu (PGO), bileşensiz derlemeyi ve hata ayıklama sembollerinin çıkarılmasını kullanır.

## Hazırlık

Python 3, Git ve [depot_tools](https://chromium.googlesource.com/chromium/tools/depot_tools/) gerekir. `depot_tools` klasörünü platform kılavuzundaki gibi `PATH` değişkenine ekleyin ve kaynak ile derleme için en az 100 GB boş alan ayırın.

- [macOS derleme gereksinimleri](https://chromium.googlesource.com/chromium/src/+/157.0.8103.39/docs/mac_build_instructions.md)
- [Windows derleme gereksinimleri](https://chromium.googlesource.com/chromium/src/+/157.0.8103.39/docs/windows_build_instructions.md)
- [Linux derleme gereksinimleri](https://chromium.googlesource.com/chromium/src/+/157.0.8103.39/docs/linux/build_instructions.md)

Windows’ta komutları CMD üzerinden çalıştırın. Linux’ta ilk derlemeden önce platform kılavuzundaki sistem bağımlılıklarını kurun. Chromium kaynak yolunda boşluk kullanmayın.

## Kaynağı al, derle ve test et

```sh
python3 tools/chromium.py sync
python3 tools/chromium.py build
python3 tools/chromium.py test
```

Varsayılan kaynak dizini `.chromium/src`. Kaynağı başka bir diske almak için üç komutta da alt komuttan önce `--checkout /disk/chromium` kullanın. `test`, derlenmiş tarayıcıyı geçici bir profille açar, yerel bir HTTP sayfasını yükler ve sayfadaki JavaScript’in çalıştığını doğrular.

Çıktılar kaynak dizinindeki `out/Morrow` klasörüne yazılır.

| Platform | Tarayıcı |
| --- | --- |
| macOS | `Chromium.app` |
| Windows | `chrome.exe` |
| Linux | `chrome` |

Windows kurulum dosyası için `python3 tools/chromium.py build --installer` komutunu kullanın. Chromium `mini_installer.exe` çıktısını aynı klasöre yazar.

Masaüstü kontrolü için uygulamayı açın. Yeni sekme oluşturup adres çubuğundan bir sayfa yükleyin, bir bağlantıya tıklayın, geri ve ileri gidin ve sekmeler arasında geçiş yapın.

## Sürüm güncelleme

Yeni bir Chromium etiketi ve commit kimliği için `chromium.json` dosyasını birlikte güncelleyin, ardından eşitleme, derleme ve testi yeniden çalıştırın. Bu akış tarayıcıya otomatik güncelleme eklemez.
