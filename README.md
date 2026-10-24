# Genetik Algoritma ile Kamuflaj Evrimi (Unity 6.3)

BLM5026 Bilgisayar Oyunlarında Yapay Zeka · Rapor 5 (Hafta 6) · Veysel Uğurlu
Bursa Teknik Üniversitesi, Bilgisayar Mühendisliği Yüksek Lisans · Doç. Dr. İzzet Fatih Şentürk

![Evrim](docs/week06/images/evolution.gif)

Renkli bireyler bir avcıdan kaçmaya çalışıyor. En uzun hayatta kalanlar ebeveyn oluyor, çocuklar renk genlerini onlardan alıyor (çaprazlama) ve genler arada bir rastgele değişiyor (mutasyon). Avcı parlak bireyleri önce yakaladığında, nesiller içinde popülasyon koyu zemine uyan renklere evriliyor.

| Deney (40 nesil, 10 seed) | 1. nesil parlaklık L | 40. nesil L |
|---|---|---|
| Parlak avcı | 0.486 | 0.113 |
| Mat avcı | 0.486 | 0.913 |
| Rastgele avcı / seçim yok | 0.486 | 0.474 / 0.460 |

Ayrıntılı rapor, kod açıklamaları ve tüm deneyler: **[docs/week06/README.md](docs/week06/README.md)**

## Çalıştırma

1. Unity Hub → Add project from disk → bu klasör (Unity 6000.3.x).
2. `Assets/Scenes/CamouflageScene.unity` → **Play** → parlak bireylere sol tık.
3. `PopulationManager` → **Automatic Hunter**: bilgisayar avlar.

## Proje yapısı

```
Assets/Scripts/   Genome, DNA, GeneticAlgorithm, PopulationManager, DemoRecorder
Assets/Scripts/Editor/   sahne kurucu, deney koşucu, rapor görüntüleri (menü: Genetik Algoritma)
Assets/Prefabs/Person.prefab   Assets/Scenes/CamouflageScene.unity
docs/week06/      rapor sayfası, grafikler, deney verisi
tools/            grafik ve animasyon scriptleri (Python)
```

Her hafta ayrı bir `feature/...` dalında geliştirilir ve Pull Request ile `main` dalına birleştirilir.

## Yapay zekâ kullanımı

Ders politikası gereği belirtilir: kodlama, deney scriptleri ve dokümantasyonun hazırlanmasında yapay zekâ asistanından yararlanılmıştır. Uygulama sunudaki adımları ve örnek kodları izler; proje Unity'de çalıştırılmış ve sonuçlar kontrol edilmiştir.
