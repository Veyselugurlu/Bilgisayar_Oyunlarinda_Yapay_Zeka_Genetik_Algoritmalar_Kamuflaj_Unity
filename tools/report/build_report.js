// Builds the Rapor 5 (week 6) Word report from docs/week06/data and docs/week06/images.
//   STUDENT_NO=... REPORT_OUT=<path.docx> NODE_PATH=<folder with node_modules/docx> node tools/report/build_report.js
// The student number is passed at build time so it never ends up in the public repository.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ExternalHyperlink, TableOfContents, Footer, PageNumber, LevelFormat,
} = require("docx");

const ROOT = path.resolve(__dirname, "..", "..");
const DOCS = path.join(ROOT, "docs", "week06");
const IMG = path.join(DOCS, "images");
const STUDENT_NO = process.env.STUDENT_NO || "……………………";
const REPO_URL = "https://github.com/Veyselugurlu/Bilgisayar_Oyunlarinda_Yapay_Zeka_Genetik_Algoritmalar_Kamuflaj_Unity";
const BRANCH = "feature/week06-genetik-algoritma-kamuflaj";

const S = JSON.parse(fs.readFileSync(path.join(DOCS, "data", "summary.json"), "utf8"));
const C = S.conditions;
const v = (cond, key, gen, digits = 3) => C[cond][`${key}_g${gen}`][0].toFixed(digits);
const vs = (cond, key, gen, digits = 3) => `${C[cond][`${key}_g${gen}`][0].toFixed(digits)} ± ${C[cond][`${key}_g${gen}`][1].toFixed(digits)}`;

const BLUE = "1F4E79", ACCENT = "2A6FDB", INK = "222222";

// ------------------------------------------------------------------ helpers
const t = (text, o = {}) => new TextRun({ text, ...o });
const P = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [t(runs)], spacing: { after: 120, line: 300 }, ...o });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(text)], pageBreakBefore: true });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text)] });
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [t(text)] });
const B = (text) => t(text, { bold: true });
const I = (text) => t(text, { italics: true });
const Cd = (text) => t(text, { font: "Consolas", size: 19, color: "8A2B06" });
const bullet = (runs) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: Array.isArray(runs) ? runs : [t(runs)], spacing: { after: 60, line: 288 } });
const numIn = (instance) => (runs) => new Paragraph({ numbering: { reference: "numbers", level: 0, instance }, children: Array.isArray(runs) ? runs : [t(runs)], spacing: { after: 60, line: 288 } });
const num1 = numIn(1), num2 = numIn(2), num3 = numIn(3), num4 = numIn(4);
const link = (text, url) => new ExternalHyperlink({ link: url, children: [t(text, { style: "Hyperlink" })] });

function code(lines) {
  return lines.map((line, i) => new Paragraph({
    children: [t(line === "" ? " " : line, { font: "Consolas", size: 18 })],
    shading: { type: ShadingType.CLEAR, fill: "F5F5F5", color: "auto" },
    spacing: { after: i === lines.length - 1 ? 160 : 0, line: 240 },
    indent: { left: 200, right: 200 },
  }));
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

let figNo = 0;
function figure(file, caption, widthPx = 600, numbered = true) {
  const full = path.join(IMG, file);
  if (!fs.existsSync(full)) { console.warn("missing figure, skipped:", file); return []; }
  if (numbered) { figNo += 1; caption = `Şekil ${figNo}. ${caption}`; }
  const { w, h } = pngSize(full);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(full), transformation: { width: widthPx, height: Math.round(widthPx * h / w) },
        altText: { title: caption, description: caption, name: file } })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [t(caption, { italics: true, size: 19, color: "555555" })] }),
  ];
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "BFC5CD" };
const borders = { top: border, bottom: border, left: border, right: border };
function table(headers, rows, widths, caption) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (text, w, head) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: head ? { fill: "DCE6F2", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [t(String(text), { bold: head, size: 19 })] })],
  });
  const out = [new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], false)) }))],
  })];
  if (caption) out.push(new Paragraph({ spacing: { before: 60, after: 200 }, children: [t(caption, { italics: true, size: 19, color: "555555" })] }));
  return out;
}

function note(runs) {
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [t(runs)],
    shading: { type: ShadingType.CLEAR, fill: "EAF2FB", color: "auto" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 } },
    spacing: { before: 120, after: 200, line: 288 }, indent: { left: 200, right: 200 },
  });
}

// ------------------------------------------------------------------ content
const cover = [
  new Paragraph({ spacing: { before: 1100, after: 120 }, alignment: AlignmentType.CENTER, children: [t("BURSA TEKNİK ÜNİVERSİTESİ", { bold: true, size: 28, color: BLUE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Lisansüstü Eğitim Enstitüsü · Bilgisayar Mühendisliği Yüksek Lisans", { size: 22 })] }),
  new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [t("BLM5026 Bilgisayar Oyunlarında Yapay Zeka", { size: 26, color: "444444" })] }),
  new Paragraph({ spacing: { before: 300, after: 120 }, alignment: AlignmentType.CENTER, children: [t("Rapor 5 (Hafta 6)", { bold: true, size: 44, color: BLUE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Genetik Algoritmalar:", { bold: true, size: 32 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [t("Unity ile Kamuflajın Evrimi", { bold: true, size: 32 })] }),
  ...figure("evolution_filmstrip.png", "Otomatik avcı parlak bireyleri önce yakaladıkça popülasyon nesiller içinde koyulaşıyor", 520, false),
  new Paragraph({ spacing: { before: 300 }, alignment: AlignmentType.CENTER, children: [B("Öğrenci: "), t("Veysel Uğurlu")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [B("Öğrenci No: "), t(STUDENT_NO)] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [B("Dersi Veren: "), t("Doç. Dr. İzzet Fatih Şentürk")] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [B("Tarih: "), t("Ekim 2026")] }),
  new Paragraph({ spacing: { before: 300 }, alignment: AlignmentType.CENTER, children: [B("GitHub deposu: "), link(REPO_URL, REPO_URL)] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [t("Bu haftanın dalı: ", { size: 20 }), link(BRANCH, `${REPO_URL}/tree/${BRANCH}`)] }),
];

const toc = [
  new Paragraph({ pageBreakBefore: true, children: [t("İçindekiler", { bold: true, size: 32, color: BLUE })], spacing: { after: 200 } }),
  new TableOfContents("İçindekiler", { hyperlink: true, headingStyleRange: "1-2" }),
];

const ozet = [
  H1("Özet"),
  P("Bu raporda dersin 6. haftasında işlenen genetik algoritma (GA) konusunun Unity 6.3'teki uygulaması anlatılmaktadır. Uygulamada ekrandaki renkli bireyler bir avcıdan kaçmaya çalışır. Avcıdan en uzun kaçan bireyler bir sonraki neslin ebeveynleri olur, çocuklar renk genlerini onlardan miras alır ve genler arada bir rastgele değişir. Kamuflaj için hiçbir kural yazılmamıştır; zemine uyan renkler seçilim, çaprazlama ve mutasyon sonucunda kendiliğinden ortaya çıkar."),
  P("Sunudaki dokuz sınıf içi etkinliğin tamamı uygulanmıştır: fitness tasarımı, Person prefab'ı, DNA yapısı, yeni Input System ile fare avı, hayatta kalan bireyin fitness hatasının düzeltilmesi, sabit popülasyon boyutu, uniform çaprazlama, gen başına mutasyon ve boyut geni. Seçilim, çaprazlama ve mutasyon tek bir sınıfta toplanmış; canlı sahne ile toplu deneyler aynı kodu kullanmaktadır."),
  P([t("Sunudaki kontrollü deney 10 farklı seed ile 40'ar nesil tekrarlanmıştır. Parlak bireyleri önce yakalayan avcıda ortalama parlaklık L "), t(v("bright", "mean_L", 1)), t("'den "), B(v("bright", "mean_L", 40)), t("'e düşmüş, mat bireyleri önce yakalayan avcıda "), B(v("dull", "mean_L", 40)), t("'e yükselmiştir. Rastgele avcıda ve seçilimin kapatıldığı kontrol koşulunda yönlü bir değişim görülmemiştir.")]),
  P([t("Ev ödevi olarak dört mutasyon oranı aynı başlangıç koşullarında karşılaştırılmıştır. Mutasyon olmadığında popülasyon birkaç nesilde tek renge kilitlenmiş, 0.10 oranı bu ayarlarda en koyu sonucu ("), t(v("mut0.10", "mean_L", 40)), t(") vermiş, 0.50 oranı ise seçilimin etkisini büyük ölçüde silmiştir. Challenge'da eklenen boyut geni, avcı yalnızca renge baktığında yönsüz kalmış; büyük bireyler daha görünür olduğunda ortalama boyut 1.0'dan "), t(v("size_visible", "mean_s", 40, 2)), t("'ye inmiştir.")]),
  P([B("Anahtar kelimeler: "), t("genetik algoritma, seçilim, uniform çaprazlama, mutasyon, fitness, kamuflaj, Unity 6.3, Input System")]),
];

const giris = [
  H1("1. Giriş"),
  H2("1.1 Bu haftanın amacı"),
  P("Sunu üç hedef koyuyor: genetik algoritma ile genetik programlama arasındaki farkı açıklamak, Unity 2D sahnesinde nesil tabanlı seçilim, çaprazlama ve mutasyonu kurmak, ve parlak av / mat av koşullarında ortalama parlaklığın nasıl değiştiğini incelemek. Sunudaki ifadeyle kazanım, hazır bir modeli çalıştırmak yerine bir evrimsel arama mekanizmasını tasarlamaktır."),
  H2("1.2 Genetik algoritma nedir?"),
  P("Genetik algoritma, doğal seçilimi taklit eden bir arama yöntemidir. Her çözüm adayı bir birey olarak düşünülür ve özellikleri sayılardan oluşan bir kromozomda tutulur. Bireyler bir ölçüte göre değerlendirilir (fitness). İyi olanların genleri birleştirilerek yeni bireyler üretilir (çaprazlama), bu genlerin bir kısmı rastgele değiştirilir (mutasyon) ve bu döngü nesiller boyu tekrarlanır. Algoritma çözümün nasıl bulunacağını bilmez; sadece hangi adayın daha iyi olduğunu ölçer."),
  P("Bu projede birey ekrandaki bir dairedir, kromozomu da rengini belirleyen üç sayıdır. Fitness, avcıdan ne kadar süre kaçabildiğidir. Avcı parlak daireleri daha kolay fark ediyorsa uzun yaşayanlar koyu renkli olur, onların çocukları da koyu renk genleri taşır."),
  ...table(["Kavram", "Anlamı", "Bu projedeki karşılığı"], [
    ["Birey", "Bir çözüm adayı", "Ekrandaki bir daire (Person prefab'ı)"],
    ["Kromozom / genotip", "Bireyin genleri", "[r, g, b] (0 ile 1 arası); challenge'da 4. gen s"],
    ["Fenotip", "Genlerin dışarıdan görünen hali", "Dairenin rengi ve büyüklüğü"],
    ["Fitness", "Bireyin ne kadar iyi olduğu", "Hayatta kalma süresi (en fazla 10 s)"],
    ["Seçilim", "Ebeveynlerin seçilmesi", "Fitness sıralamasında ilk %50"],
    ["Çaprazlama", "Ebeveyn genlerinin birleşmesi", "Her gen anneden ya da babadan %50 olasılıkla"],
    ["Mutasyon", "Genin rastgele değişmesi", "Gen başına %2 olasılıkla yeni rastgele değer"],
    ["Nesil", "Bir değerlendirme turu", "10 saniye; sonunda 10 çocuk doğar"],
  ], [1900, 2900, 4226], "Tablo 1. Temel kavramlar"),
  H2("1.3 Genetik algoritma ve genetik programlama"),
  P("Sunu bu ayrımı özellikle vurguluyor. Genetik algoritmada birey sabit uzunlukta bir gen vektörüdür; örneğin [0.3, 0.8, 0.5]. Genetik programlamada ise birey çalıştırılabilir bir programdır; örneğin \"düşman yakınsa saklan, değilse devriye gez\" gibi bir karar ağacı. İki yöntemde de seçilim, çaprazlama ve mutasyon kullanılır; aralarındaki fark evrimleşen şeydir. Bu çalışmada yalnızca renk ve boyut gibi sayısal parametreler evrimleştiği için uygulama bir genetik algoritmadır."),
  H2("1.4 Parlaklık ölçüsü"),
  P([t("Avcının neyi \"parlak\" gördüğünü ve deneylerde neyi ölçtüğümüzü tanımlamak için sunudaki göreli parlaklık formülü kullanıldı: "), B("L = 0.2126 r + 0.7152 g + 0.0722 b"), t(". Katsayılar insan gözünün renklere duyarlılığını yansıtır; göz en çok yeşile, en az maviye duyarlıdır. Bu yüzden aynı değerdeki yeşil gen, mavi genden yaklaşık on kat daha fazla parlaklık katar.")]),
];

const kurulum = [
  H1("2. Proje Kurulumu"),
  P("Sunudaki başlangıç adımları uygulandı. Unity 6.3 kurulumunda klasik \"2D (Core)\" şablonu bulunmadığı için onun yerini alan Universal 2D şablonu kullanıldı; bu şablonda Input System paketi hazır geliyor."),
  ...table(["Adım (slayt 11, 14)", "Yapılan"], [
    ["Yeni 2D proje", "Unity 6000.3.25f1, Universal 2D şablonu (URP 17.3)"],
    ["Input System paketi", "com.unity.inputsystem 1.20.0"],
    ["Active Input Handling", "Input System Package (New)"],
    ["Klasörler", "Assets/Scripts, Assets/Prefabs, Assets/Scenes"],
    ["Main Camera", "Orthographic, Size 5, konum (0, 0, -10), koyu zemin rengi"],
    ["Person prefab", "Circle sprite, CircleCollider2D, ölçek (0.4, 0.4, 1), DNA.cs"],
  ], [3000, 6026], "Tablo 2. Proje ayarları"),
  P("Sunuya göre özgün ders paketi yalnızca C# dosyaları içeriyor; sahne ve prefab elle kurulmalı. Kurulumun tekrarlanabilir olması için bu işi yapan bir editor scripti yazıldı (CamouflageSceneBuilder.cs). Unity menüsündeki \"Genetik Algoritma → 1. Sahneyi ve Prefab'ı Kur\" komutu prefab'ı ve sahneyi her seferinde aynı şekilde oluşturuyor."),
  note([B("URP 2D notu: "), t("Universal 2D'de sprite'lar varsayılan olarak 2D ışıkla aydınlatılır; sahnede ışık yoksa daireler siyah görünür. Ekrandaki rengin genlerdeki renkle birebir aynı olması için Person prefab'ına ışıktan etkilenmeyen Sprite-Unlit-Default materyali verildi.")]),
];

const mimari = [
  H1("3. Sahne ve Mimari"),
  P("Sahne iki script ve bir prefab'dan oluşuyor (slayt 12). Play'e basıldığında PopulationManager on birey oluşturuyor."),
  ...code([
    "CamouflageScene",
    "├── Main Camera",
    "├── PopulationManager        PopulationManager.cs (+ DemoRecorder.cs)",
    "└── (Play sırasında) Person(Clone) × 10",
    "",
    "Assets/Scripts/Genome.cs             kromozom ve parlaklık L",
    "Assets/Scripts/DNA.cs                birey: Initialize, Kill, FinishGeneration",
    "Assets/Scripts/GeneticAlgorithm.cs   seçilim, çaprazlama, mutasyon, otomatik avcı",
    "Assets/Scripts/PopulationManager.cs  nesil döngüsü, fare ile av, ekran bilgisi",
    "Assets/Prefabs/Person.prefab         SpriteRenderer + CircleCollider2D + DNA",
  ]),
  P("Görevler sunudaki tek sorumluluk ilkesine göre ayrıldı (slayt 15). DNA yalnızca bireyin durumunu tutar: genleri, ölü olup olmadığı ve hayatta kalma süresi. Fare tıklamasını, nesil saatini ve yeni neslin oluşturulmasını PopulationManager yönetir. Tıklamayı her bireyin kendisinin dinlemesi yerine tek bir yöneticinin dinlemesi hem kodu sadeleştirir hem de aynı tıklamanın birden fazla bireyi etkilemesini önler."),
  P("Sunudaki koddan farklı olarak seçilim, çaprazlama, mutasyon ve otomatik avcı ayrı bir GeneticAlgorithm sınıfına taşındı. Bunun sebebi deneylerdir: 10 koşul × 10 seed × 40 nesil, gerçek zamanda yaklaşık 11 saat sürerdi. Deneyler aynı sınıfı kare çizmeden çağırarak birkaç saniyede tamamlandı; canlı sahnede görülen evrim ile deneylerde ölçülen evrim aynı kodla üretildi."),
  ...figure("editor/01_scene_population_manager.png", "Unity Editor: CamouflageScene ve PopulationManager ayarları (popülasyon 10, nesil süresi 10 s, ebeveyn oranı 0.5, mutasyon 0.02)"),
  ...figure("editor/02_person_prefab.png", "Person prefab'ı: SpriteRenderer, CircleCollider2D ve DNA bileşenleri"),
];

const uygulama = [
  H1("4. Sınıf İçi Etkinliklerin Uygulanması"),
  H2("4.1 Etkinlik 1: Fitness tasarımı"),
  P("Avlanan bir bireyin ne kadar iyi olduğu, ne kadar süre yakalanmadan kalabildiğiyle ölçüldü. Erken avlanan A bireyi düşük, hiç avlanmayan B bireyi yüksek fitness alır ve B'nin genleri sonraki nesle aktarılmalıdır. Fitness değişkeni DNA.SurvivalTime, yönü ise \"büyük olan iyi\"dir. Bu karar seçim sırasını doğrudan belirler: bireyler SurvivalTime'a göre büyükten küçüğe sıralanır ve listenin başındakiler ebeveyn olur."),
  H2("4.2 Etkinlik 2-3: Person prefab'ı ve DNA yapısı"),
  P("Genler önce bir Genome yapısında tutulur, ardından DNA.Initialize ile görünür hale getirilir. Renk kanallarının sırası önemlidir: sunu, new Color(r, b, g) yazmanın yeşil ve mavi kanalları yer değiştireceği konusunda uyarıyor."),
  ...code([
    "public void Initialize(Genome genome)",
    "{",
    "    r = genome.r; g = genome.g; b = genome.b; s = genome.s;",
    "    spriteRenderer.color = genome.Color;            // new Color(r, g, b, 1f)",
    "    transform.localScale = originalScale * s;       // boyut geni (challenge)",
    "    IsDead = false; SurvivalTime = 0f;",
    "    spriteRenderer.enabled = true; hitCollider.enabled = true;",
    "}",
  ]),
  P("Genler Start() yerine Initialize() ile verilir. Start(), Instantiate'ten hemen sonra değil, bir sonraki kare başlamadan önce çalışır. Genleri Start içinde rastgele atasaydık, PopulationManager'ın çaprazlamayla ürettiği çocuk genleri bu rastgele değerlerle ezilirdi. Initialize, Instantiate'in hemen ardından çağrıldığı için birey daha ekranda görünmeden doğru genlere sahip olur."),
  P("Prefab'daki CircleCollider2D fare tıklamasının hangi bireye isabet ettiğini bulmak için gereklidir. Kamera ile collider'ın ilişkisi de burada ortaya çıkıyor: bireyler kameranın gördüğü alanın içinde oluşturulmalıdır. Spawn alanı sabit sayılarla değil kameranın orthographicSize ve aspect değerlerinden hesaplandı; aksi halde geniş olmayan bir ekranda bazı bireyler görüş dışında kalır, hiç avlanamaz ve haksız biçimde en yüksek fitness'ı alır."),
  H2("4.3 Etkinlik 4: Avcı tıklaması"),
  ...code([
    "if (Mouse.current == null || !Mouse.current.leftButton.wasPressedThisFrame) return;",
    "Vector2 p = Mouse.current.position.ReadValue();",
    "Vector3 world = sceneCamera.ScreenToWorldPoint(",
    "    new Vector3(p.x, p.y, -sceneCamera.transform.position.z));",
    "Collider2D hit = Physics2D.OverlapPoint((Vector2)world);",
    "if (hit != null && hit.TryGetComponent(out DNA target))",
    "    target.Kill(elapsed);",
  ]),
  P("Fare konumu ekran pikseli cinsindendir (örneğin 640, 360), bireyler ise dünya biriminde durur (örneğin 1.2, -0.8). ScreenToWorldPoint bu dönüşümü yapar; z değeri kameranın sprite düzlemine uzaklığıdır. 2D'de ışın göndermeye gerek yoktur; Physics2D.OverlapPoint o noktadaki collider'ı bulur. Eski OnMouseDown yerine yeni Input System kullanıldı."),
  P("Bir birey iki kez avlanamaz: Kill() metodu IsDead doğruysa hemen geri döner. Avlanan bireyin SpriteRenderer'ı ve collider'ı kapatılır; birey görünmez olur ve OverlapPoint onu bir daha bulamaz. Nesne silinmez, çünkü nesil sonunda fitness değeri hâlâ gereklidir."),
  H2("4.4 Etkinlik 5: Hata avcılığı"),
  P("Sunudaki eski DNA.cs'de timeToDie = 0 ile başlanıyor ve yalnızca avlanan bireylerde güncelleniyordu. Hiç tıklanmayan, yani en başarılı birey 0 değeriyle kalıyordu. Sunudaki tartışma sorusunun cevabı: ilk ölen birey 1.0, hayatta kalan 0.0 değerini alırsa OrderByDescending ilk öleni en başa koyar; algoritma en kötü bireyi ebeveyn seçer ve evrim ters yöne işler."),
  ...code([
    "public void Kill(float elapsedTime)",
    "{",
    "    if (IsDead) return;",
    "    IsDead = true;",
    "    SurvivalTime = elapsedTime;",
    "    HideFromHunter();",
    "}",
    "public void FinishGeneration(float duration)",
    "{",
    "    if (!IsDead) SurvivalTime = duration;   // 10 s'lik nesilde sağ kalan = 10",
    "}",
  ]),
  H2("4.5 Etkinlik 6: Yeni neslin boyutu"),
  ...code([
    "List<int> ranked = Enumerable.Range(0, genomes.Count)",
    "    .OrderBy(_ => Random.value)               // eşitleri rastgele sırala",
    "    .OrderByDescending(i => fitness[i])       // kararlı sıralama",
    "    .ToList();",
    "int k = Mathf.Clamp(Mathf.CeilToInt(populationSize * selectedFraction), 2, ranked.Count);",
    "for (int i = 0; i < populationSize; i++)",
    "{",
    "    Genome mother = genomes[ranked[Random.Range(0, k)]];",
    "    Genome father = genomes[ranked[Random.Range(0, k)]];",
    "    children.Add(Breed(mother, father, settings));",
    "}",
  ]),
  P("Hayatta kalan bütün bireylerin fitness'ı 10'dur. Önce rastgele karıştırıp sonra sıralamak, bu eşit bireylerin her nesilde aynı sırada kalmasını önler; OrderByDescending kararlı bir sıralama olduğu için karıştırma sırasını eşitler arasında korur."),
  P("Çocuk sayısı ebeveyn sayısına bağlı değildir. Her çift tek bir çocuk üretseydi 5 ebeveynden yalnızca 2-3 çocuk doğar ve popülasyon her nesilde küçülürdü (10 → 5 → 2...). Döngü populationSize kadar döndüğü ve her seferinde havuzdan iki ebeveyn çektiği için her nesilde tam 10 birey oluşur."),
  H2("4.6 Etkinlik 7-8: Çaprazlama ve mutasyon"),
  ...code([
    "public static float InheritOrMutate(float mother, float father, float mutationRate)",
    "{",
    "    float inherited = Random.value < 0.5f ? mother : father;",
    "    if (Random.value < mutationRate)",
    "        return Random.value;",
    "    return inherited;",
    "}",
    "",
    "float r = InheritOrMutate(mother.r, father.r, settings.mutationRate);",
    "float g = InheritOrMutate(mother.g, father.g, settings.mutationRate);",
    "float b = InheritOrMutate(mother.b, father.b, settings.mutationRate);",
  ]),
  P("Her gen için Random.value ayrı çağrılır; çocuk kırmızıyı anneden, yeşili babadan alabilir. Bütün RGB üçlüsü tek bir ebeveynden alınsaydı çocuk o ebeveynin kopyası olurdu ve yeni renk kombinasyonu oluşmazdı. Uniform çaprazlama sayesinde örneğin kırmızısı düşük bir anne ile yeşili düşük bir babanın, ikisinden de koyu bir çocuğu olabilir."),
  P("Mutasyon olasılığı gen başınadır: 0.02 oranında üç genden her biri ayrı ayrı %2 olasılıkla yeni bir rastgele değer alır. Çaprazlama yalnızca var olan genleri karıştırır, yeni değer üretmez; popülasyona yeni renkler mutasyonla girer."),
  H2("4.7 Nesil geçişi"),
  P("Bütün adımlar sunudaki sırayla PopulationManager.BreedNewPopulation içinde birleşir (slayt 33):"),
  num1("Hayatta kalanların fitness'ı nesil süresine eşitlenir (FinishGeneration)."),
  num1("Bireyler karıştırılıp fitness'a göre sıralanır, ilk %50 ebeveyn havuzu olur."),
  num1("Tam populationSize kadar çocuk genomu üretilir ve saklanır."),
  num1("Eski nesil Destroy edilir, liste temizlenir."),
  num1("Saklanan genomlarla yeni bireyler oluşturulur; nesil saati sıfırlanır."),
  P("Çocuk genomlarının eski nesil silinmeden önce hesaplanması önemlidir. Destroy kare sonunda çalışır; sıra ters olsaydı silinmek üzere olan nesnelere erişilir ya da genler kaybolurdu."),
  ...figure("editor/03_play_generation1.png", "Play modu, 1. nesil: oyuncu avcı; sol üstteki kutu nesil, süre, canlı birey sayısı ve ortalama parlaklığı gösteriyor"),
];

const canli = [
  H1("5. Canlı Çalışma ve Otomatik Avcı"),
  P("Sunudaki kontrollü deney için bir otomatik avcı eklendi (Inspector'da Automatic Hunter). Avcı her 1.5 saniyede bir canlı bireyi yakalar: kurala göre en parlak, en mat ya da rastgele birini. 10 saniyelik bir nesilde 6 birey avlanır, 4 birey hayatta kalır. Ebeveyn havuzu ilk 5 bireydir: 4 hayatta kalan ve en son avlanan."),
  P("Sahne Windows build'i olarak otomatik avcıyla çalıştırıldı ve kareler kaydedildi. 13 nesilde ortalama parlaklık 0.62'den 0.07'ye indi; ilk nesildeki beyaz, sarı ve açık yeşil bireyler yerini koyu mavi, koyu yeşil ve koyu kırmızı bireylere bıraktı (Şekil " + (figNo + 1) + ")."),
  ...figure("evolution_filmstrip.png", "Build'den kaydedilen kareler: parlak avcı ile 1., 2., 4., 7., 10. ve 13. nesil"),
  ...figure("editor/04_play_auto_hunter_console.png", "Unity Editor'da otomatik avcı ile birkaç nesil sonra: popülasyon koyulaşmış, Console'da her neslin ortalama parlaklığı yazıyor ve hata yok"),
];

const deney = [
  H1("6. Kontrollü Deney: Avcı Kuralı"),
  H2("6.1 Deney düzeni"),
  P("Sunu iki koşulun aynı seed ile ve birden fazla seed ile tekrarlanmasını istiyor; tek gözlemin bilimsel bir sonuç olmadığını da vurguluyor (slayt 35-36). Buna göre:"),
  bullet("Her koşul 10 farklı seed ile (1-10) ve 40 nesil boyunca çalıştırıldı."),
  bullet("Aynı seed aynı başlangıç popülasyonunu verdiği için koşullar arasındaki tek fark incelenen ayardır."),
  bullet("Sunudaki karşılaştırmalar yapıldı: parlak avcı, mat avcı, rastgele avcı (renk ile ölüm zamanı arasında ilişki yok) ve seçim yok (parlak avcı var ama ebeveynler bütün popülasyondan rastgele seçiliyor)."),
  bullet("Ölçülen değer her neslin ortalama parlaklığı L; ayrıca popülasyon içi çeşitlilik (L'nin standart sapması) ve renk kanalları."),
  P("Deneyler ExperimentRunner.cs ile, kare çizmeden ve canlı sahneyle aynı GeneticAlgorithm koduyla hesaplandı. Sonuçlar generations.csv dosyasına (10 koşul × 10 seed × 40 nesil = 4.000 satır) yazıldı; rapordaki bütün sayılar bu dosyadan otomatik alındı."),
  H2("6.2 Sonuçlar"),
  ...table(["Koşul", "1. nesil L", "10. nesil L", "40. nesil L"], [
    ["Parlak avcı", vs("bright", "mean_L", 1), vs("bright", "mean_L", 10), vs("bright", "mean_L", 40)],
    ["Mat avcı", vs("dull", "mean_L", 1), vs("dull", "mean_L", 10), vs("dull", "mean_L", 40)],
    ["Rastgele avcı", vs("random", "mean_L", 1), vs("random", "mean_L", 10), vs("random", "mean_L", 40)],
    ["Seçim yok", vs("noselection", "mean_L", 1), vs("noselection", "mean_L", 10), vs("noselection", "mean_L", 40)],
  ], [2826, 2066, 2066, 2068], "Tablo 3. Ortalama parlaklık L (10 seed ortalaması ± standart sapma)"),
  ...figure("hunter_rules.png", "Avcı kuralına göre ortalama parlaklığın nesiller boyu değişimi (çizgi: 10 seed ortalaması, gölge: ±1 standart sapma)"),
  P([t("İki hipotez de doğrulandı. Parlakları önce avlayan avcıda ortalama parlaklık ilk 10 nesilde "), t(v("bright", "mean_L", 1)), t("'den "), t(v("bright", "mean_L", 10)), t("'e hızla düştü, sonra yavaşça "), t(v("bright", "mean_L", 40)), t("'e indi. Matları önce avlayan avcıda değişim tam tersi yönde oldu. Rastgele avcıda ve seçimin kapatıldığı kontrolde ortalama 0.47 civarında kaldı; demek ki yönlü değişimin sebebi avcının renge göre seçmesi ve uzun yaşayanların ebeveyn olmasıdır. Bu iki kontrolde seed'ler arası sapmanın büyük olması (yaklaşık ± 0.18), küçük bir popülasyonda şansın renk dağılımını rastgele bir yöne sürüklediğini (genetik sürüklenme) gösteriyor.")]),
  ...figure("rgb_channels.png", "Parlak avcıda renk kanallarının değişimi"),
  P([t("Parlak avcıda en hızlı düşen kanal yeşil oldu (40. nesilde "), t(v("bright", "mean_g", 40)), t("). Parlaklık formülünde yeşilin ağırlığı en büyük olduğundan yeşili düşük bireyler en az görünenlerdir. Mavi kanalın ağırlığı çok küçük olduğu için seçilim baskısı da zayıf kaldı; 40. nesilde mavi ("), t(v("bright", "mean_b", 40)), t(") üç kanalın en yükseğidir.")]),
];

const mutasyon = [
  H1("7. Ev Ödevi: Mutasyon Oranlarının Karşılaştırılması"),
  P("Sunudaki ev ödevi, aynı başlangıç koşullarıyla farklı mutasyon oranlarını karşılaştırmayı istiyor. Parlak avcı ile dört oran denendi; diğer bütün ayarlar ve seed'ler aynıdır."),
  ...table(["Mutasyon oranı", "10. nesil L", "40. nesil L", "40. nesilde çeşitlilik std(L)"], [
    ["0", vs("mut0.00", "mean_L", 10), vs("mut0.00", "mean_L", 40), v("mut0.00", "std_L", 40)],
    ["0.02 (ders değeri)", vs("mut0.02", "mean_L", 10), vs("mut0.02", "mean_L", 40), v("mut0.02", "std_L", 40)],
    ["0.10", vs("mut0.10", "mean_L", 10), vs("mut0.10", "mean_L", 40), v("mut0.10", "std_L", 40)],
    ["0.50", vs("mut0.50", "mean_L", 10), vs("mut0.50", "mean_L", 40), v("mut0.50", "std_L", 40)],
  ], [2400, 2200, 2200, 2226], "Tablo 4. Mutasyon oranına göre ortalama parlaklık ve çeşitlilik"),
  ...figure("mutation_rates.png", "Mutasyon oranları: solda ortalama parlaklık, sağda popülasyon içi çeşitlilik"),
  P([B("Mutasyon 0: "), t("Çaprazlama yeni bir gen değeri yaratamaz, yalnızca var olanları karıştırır. Seed'e göre 5. ile 10. nesil arasında bütün bireyler aynı renge kilitlendi; çeşitlilik tam sıfıra indi ve evrim durdu. Ulaşılan renk, ilk nesilde şans eseri bulunan genlerle sınırlı kaldı.")]),
  P([B("Mutasyon 0.02: "), t("Seçilim baskın, mutasyon zaman zaman yeni bir değer getiriyor. İlerleme yavaş ama sürekli.")]),
  P([B("Mutasyon 0.10: "), t("Bu ayarlarda en koyu sonuç bu oranda alındı. Yeni değerler daha sık denendiği için daha koyu renkler bulundu; kötü mutasyonlar ise avcı tarafından hemen elendi.")]),
  P([B("Mutasyon 0.50: "), t("Her nesilde genlerin yarısı rastgele değiştiği için seçilimin kazandırdığı büyük ölçüde kayboldu ve ortalama 0.35 civarında kaldı. Sunudaki tartışma sorusunun cevabı budur: kaynak PDF'deki %50 örneği ders demosunda seçilimin etkisini görünmez hale getirir.")]),
  note("Sonuç: mutasyon gereklidir, çünkü yeni renkleri popülasyona o getirir. Ama oran yüksek olursa seçilimin biriktirdiğini bozar. En iyi oran popülasyon boyutuna ve avcının baskısına bağlıdır; burada bulunan 0.10, yalnızca bu ayarlar (N = 10, nesil başına 6 av) için geçerlidir."),
];

const challenge = [
  H1("8. Challenge: Boyut Geni"),
  P("Kromozoma dördüncü bir gen eklendi: s (sizeMultiplier, 0.5 ile 1.5 arası). Gen başlangıçta rastgele atanır, çaprazlamada ve mutasyonda diğer genler gibi işlenir ve bireyin ekrandaki büyüklüğünü değiştirir."),
  ...code([
    "// DNA.Initialize içinde",
    "transform.localScale = originalScale * s;",
    "",
    "// GeneticAlgorithm.Breed içinde",
    "s = Random.value < 0.5f ? mother.s : father.s;",
    "if (Random.value < settings.mutationRate) s = RandomSize();",
  ]),
  P("Sunudaki soru: görünürlük yalnız renge bağlıysa büyüklük geni evrilir mi? Bunu test etmek için iki koşul karşılaştırıldı: avcının yalnızca parlaklığa baktığı durum ve görünürlüğün parlaklık × boyut olduğu, yani büyük bireylerin daha kolay fark edildiği durum."),
  ...table(["Koşul", "40. nesil boyut s", "40. nesil L"], [
    ["Avcı yalnızca parlaklığa bakar", vs("size_color", "mean_s", 40), vs("size_color", "mean_L", 40)],
    ["Büyükler daha görünür (L × s)", vs("size_visible", "mean_s", 40), vs("size_visible", "mean_L", 40)],
  ], [3800, 2600, 2626], "Tablo 5. Boyut geni (10 seed, başlangıç ortalaması 1.0)"),
  ...figure("size_gene.png", "Boyut geninin nesiller boyu değişimi"),
  P([t("Avcı yalnızca renge baktığında boyutun hayatta kalmaya etkisi yoktur. Ortalama boyut 1.0 civarında kaldı ama her seed'de farklı bir yöne kaydı (sapma ± "), t(C.size_color.mean_s_g40[1].toFixed(2)), t("); bu yönsüz bir sürüklenmedir. Görünürlüğe boyut da katıldığında küçük bireyler daha geç yakalandı ve ortalama boyut "), t(v("size_visible", "mean_s", 40, 2)), t("'ye indi. Bir gen ancak hayatta kalmayı etkiliyorsa yönlü olarak evrilir; sunudaki çözüm slaytının \"yalnız parlaklığa göre avlanan otomatik avcı boyut üzerinde doğrudan seçilim yaratmaz\" uyarısı deneyle doğrulandı.")]),
];

const tartisma = [
  H1("9. Tartışma"),
  H2("9.1 Ne iddia edemeyiz?"),
  P("Sunu, bu tür bir deneyden çıkarılamayacak sonuçları da listeliyor (slayt 36):"),
  bullet("\"Mükemmel kamuflaj oluştu\" denemez. Avcının algısı yalnızca bir parlaklık sıralamasıdır; gerçek bir göz modeli, zemin dokusu veya renk kontrastı yoktur."),
  bullet("\"Her nesilde mutlaka daha iyi olur\" denemez. Parlak avcı deneyinde nesilden nesle geçişlerin 105/390'ında (%27) ortalama parlaklık bir önceki nesle göre arttı. Küçük popülasyonda şans ve mutasyon bu geri adımlara yol açıyor."),
  bullet("\"Tek tekrarla kanıtlandı\" denemez. Bu yüzden her koşul 10 seed ile tekrarlandı ve sapmalar raporlandı."),
  bullet("Sonuçlar seçilen ayarlara bağlıdır: popülasyon 10, nesil başına 6 av, ebeveyn oranı %50."),
  H2("9.2 Çıkış bileti soruları (slayt 40)"),
  ...table(["Soru", "Cevap"], [
    ["RGB vektörü genotip mi, fenotip mi?", "Genotip. Ekranda görünen renk fenotiptir."],
    ["Hiç tıklanmayan bireyin 10 s sonundaki fitness'ı?", "10, yani nesil süresinin tamamı (FinishGeneration)."],
    ["Mutasyon sıfırken crossover yeni gen değeri yaratabilir mi?", "Hayır. Deneyde mutasyon 0 iken çeşitlilik 5-10 nesilde sıfıra indi."],
    ["Bu örnek GA mı, GP mi?", "Genetik algoritma: evrimleşen şey sabit uzunluklu bir sayı dizisi, program değil."],
  ], [4200, 4826], "Tablo 6. Ders sonu soruları"),
];

const sorunlar = [
  H1("10. Karşılaşılan Sorunlar ve Çözümler"),
  ...table(["Sorun", "Neden", "Çözüm"], [
    ["\"2D (Core)\" şablonu yok", "Unity 6.3 kurulumunda yalnızca Universal 2D şablonu var", "Universal 2D kullanıldı; Input System hazır geldi"],
    ["Daireler siyah görünebilir", "URP 2D'de sprite'lar 2D ışık ister", "Sprite-Unlit-Default materyali: ekrandaki renk = gen rengi"],
    ["Play'de hiç birey oluşmadı", "Sahne kurucuda prefab referansı boş kaldı; NewScene kullanılmayan asset'leri bellekten boşaltıyor", "Prefab, yeni sahne açıldıktan sonra yükleniyor; referans boşsa kurucu hata veriyor"],
    ["Kaydedilen animasyon kesik kesik", "Kare kaydetmek oyunu yavaşlattı, her karede çok fazla oyun zamanı geçti", "Time.captureFramerate = 30 ile her kareye sabit zaman adımı"],
    ["Bellek yetersizliği riski", "Başka bir Unity projesi açıkken boş sanal bellek 3.4 GB", "Unity işlemleri tek tek çalıştırıldı"],
  ], [2500, 3200, 3326], "Tablo 7. Karşılaşılan sorunlar"),
];

const sonuc = [
  H1("11. Sonuç"),
  P("Sunudaki kamuflaj laboratuvarı Unity 6.3'te bütün etkinlikleriyle kuruldu. Bireyler fare ile ya da otomatik bir avcıyla avlanabiliyor, her nesil seçilim, uniform çaprazlama ve gen başına mutasyonla oluşuyor ve popülasyon boyutu her nesilde sabit kalıyor."),
  bullet([t("Avcının seçimi evrimin yönünü belirledi: parlak avcıda L "), t(v("bright", "mean_L", 40)), t("'e indi, mat avcıda "), t(v("dull", "mean_L", 40)), t("'e çıktı; rastgele avcıda ve seçimsiz kontrolde yönlü değişim olmadı.")]),
  bullet("Mutasyon çeşitliliğin kaynağıdır. Mutasyon yokken popülasyon kilitlendi, çok yüksek mutasyon ise seçilimi bozdu."),
  bullet("Bir gen yalnızca hayatta kalmayı etkiliyorsa yönlü evrilir; boyut geni ancak boyut görünürlüğü etkilediğinde küçüldü."),
  P([B("Sonraki adımlar: "), t("Avcıya zemin rengiyle kontrast ölçen bir algı modeli vermek, zemini desenli yapmak, turnuva seçilimi gibi başka seçilim yöntemlerini karşılaştırmak ve sununun son slaytındaki gibi davranış ağaçlarını evrimleştiren bir genetik programlama örneği denemek.")]),
];

const github = [
  H1("12. GitHub Deposu ve Dosya Yapısı"),
  P([B("Depo: "), link(REPO_URL, REPO_URL)]),
  P([t("Dersin ilk haftasında tanımlanan akış izlendi. main dalında boş Unity 2D projesi bulunuyor. Bu haftanın işi "), Cd(BRANCH), t(" dalında küçük ve anlamlı commit'lerle geliştirildi ve Pull Request ile main dalına birleştirilmek üzere hazırlandı. Library, Temp, Logs ve Builds klasörleri ile rapor dosyaları .gitignore ile repo dışında tutuldu.")]),
  ...code([
    "Assets/Scripts/         Genome, DNA, GeneticAlgorithm,",
    "                        PopulationManager, DemoRecorder",
    "Assets/Scripts/Editor/  CamouflageSceneBuilder, ExperimentRunner,",
    "                        ReportScreenshots",
    "Assets/Prefabs/         Person.prefab",
    "Assets/Scenes/          CamouflageScene.unity",
    "docs/week06/            README, images/, data/",
    "tools/                  plot_experiments.py, make_gif.py, report/",
  ]),
  P("Çalıştırmak için: Unity Hub → Add project from disk → depo klasörü (Unity 6000.3.x). Ardından Assets/Scenes/CamouflageScene.unity açılıp Play'e basılır ve parlak bireylere tıklanır. Otomatik avcı için PopulationManager'daki Automatic Hunter kutusu işaretlenir."),
  ...figure("editor/05_package_manager_input_system.png", "Package Manager: projede Input System 1.20.0 yüklü", 520),
  H2("Yapay zekâ kullanım beyanı"),
  P("Ders politikası gereği belirtilir: Kodlama, deney scriptleri ve raporun hazırlanmasında yapay zekâ asistanından (Anthropic Claude) yararlanılmıştır. Uygulama sunudaki adımları ve örnek kodları izler. Proje Unity'de çalıştırılmış ve sonuçlar kontrol edilmiştir. Rapordaki bütün sayılar gerçek deney çıktılarından alınmıştır."),
];

const kaynaklar = [
  H1("Kaynaklar"),
  num4("İ. F. Şentürk, BLM5026 ders sunusu: \"Genetik Algoritmalar: Unity ile Kamuflajın Evrimi (Unity 6.3)\", Bursa Teknik Üniversitesi, 2026."),
  num4("J. H. Holland, Adaptation in Natural and Artificial Systems, MIT Press, 1992."),
  num4("D. E. Goldberg, Genetic Algorithms in Search, Optimization, and Machine Learning, Addison-Wesley, 1989."),
  num4("M. Mitchell, An Introduction to Genetic Algorithms, MIT Press, 1998."),
  num4("J. R. Koza, Genetic Programming: On the Programming of Computers by Means of Natural Selection, MIT Press, 1992."),
  num4("I. Millington, Artificial Intelligence for Games, 3. baskı, CRC Press, 2019."),
  num4("ITU-R Recommendation BT.709, Parameter values for the HDTV standards for production and international programme exchange."),
];

// ------------------------------------------------------------------ document
const doc = new Document({
  creator: "Veysel Uğurlu",
  title: "BLM5026 Rapor 5 (Hafta 6): Genetik Algoritmalar",
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: "Calibri", size: 22, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: BLUE }, paragraph: { spacing: { before: 120, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: ACCENT }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, color: BLUE }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [t("BLM5026 · Rapor 5 (Hafta 6) · Genetik Algoritmalar · ", { size: 17, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], size: 17, color: "888888" })] })] }) },
    children: [...cover, ...toc, ...ozet, ...giris, ...kurulum, ...mimari, ...uygulama, ...canli, ...deney, ...mutasyon, ...challenge, ...tartisma, ...sorunlar, ...sonuc, ...github, ...kaynaklar],
  }],
});

const out = process.env.REPORT_OUT || path.join(DOCS, "Rapor5_Hafta6_GenetikAlgoritma.docx");
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log("written", out, Math.round(buf.length / 1024), "KB"); });
