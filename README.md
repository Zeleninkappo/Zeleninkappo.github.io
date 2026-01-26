# Zelix v0.5 – Smart Training & Lifestyle Manager

![Status](https://img.shields.io/badge/Status-Stable%20v0.5-success)
![Platform](https://img.shields.io/badge/Platform-PWA%20%7C%20Mobile-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

**Zelix** je pokročilá PWA (Progressive Web App) aplikace pro správu silového tréninku a životního stylu. Běží offline, chová se jako nativní aplikace a klade důraz na maximální efektivitu bez zbytečností.

> **Motto:** Žádné zbytečnosti, jen čistá data, vibrace a progres.

---

## ⚡ Klíčové Vlastnosti

* **📳 Haptická Odezva (Game Feel):** Aplikace s vámi komunikuje fyzicky. Cítíte potvrzení série, uložení tréninku i odškrtnutí úkolu.
* **🔔 Chytré Notifikace:** Systém hlídá váš rozvrh a 10 minut předem vás upozorní na jídlo, trénink nebo suplementaci.
* **🔒 Offline-First & Soukromí:** Žádné servery, žádný cloud. Vaše data jsou bezpečně šifrována pouze ve vašem telefonu.
* **📈 Autoregulace (RPE Logic):** Algoritmus automaticky upravuje váhy pro příští trénink podle toho, jak se cítíte (Easy/OK/Hard).
* **🔄 Automatické Cyklování:** Střídání tréninkových týdnů (A/B) pro prevenci stagnace.

---

## 📖 Uživatelský Manuál

Tento text slouží jako nápověda přímo v aplikaci.

### 1. První kroky & Instalace 🚀
Pro správné fungování (offline režim, notifikace) je nutné aplikaci nainstalovat:
* **Android (Chrome):** Otevřete menu prohlížeče a zvolte *"Nainstalovat aplikaci"* nebo *"Přidat na plochu"*.
* **iOS (Safari):** Klikněte na tlačítko Sdílet a zvolte *"Přidat na plochu"*.

### 2. Nastavení Rozvrhu 📅
Jděte do **Nastavení (⚙️)** -> **Rozvrh**.
Zelix generuje vaši denní osu dynamicky. Nastavte si typ dne:
* **Gym:** Aktivuje tréninkovou osu (před/po suplementace).
* **Sport:** Jiná aktivita (fotbal, běh...).
* **Volno:** Režim regenerace (zaměřeno na jídlo a odpočinek).
* *Tip:* Vyplňte si časy jídel, ať vás aplikace upozorňuje ve správný čas.

### 3. Trénink & RPE Systém 🏋️‍♂️
Kliknutím na **GYM** spustíte trénink.
* Váhy se předvyplňují z minulého úspěšného pokusu.
* Po odcvičení série zvolte náročnost (RPE):
    * 🟢 **EASY:** Cítím rezervu. *(Příště +2.5 kg)*
    * 🟡 **OK:** Bylo to akorát. *(Příště +1.25 kg)*
    * 🔴 **HARD:** Limit, technika na hraně. *(Váha zůstává)*
* **Vibrace:** Krátké zavibrování potvrdí volbu. Dvojité zavibrování potvrdí uložení celého tréninku.

### 4. Notifikace na Androidu (Důležité!) ⚠️
Aby notifikace fungovaly spolehlivě i když telefon spí, musíte aplikaci povolit běh na pozadí:
1.  Jděte do **Nastavení telefonu** -> **Aplikace** -> **Zelix**.
2.  Najděte sekci **Baterie**.
3.  Přepněte na **"Neomezeno"** (Unrestricted).
*Bez tohoto kroku systém Android aplikaci po chvíli uspí a notifikace nedorazí.*

### 5. Zálohování Dat 💾
Vaše data žijí jen ve vašem prohlížeči.
* Pravidelně provádějte **Export** v *Nastavení -> Systém*.
* Stažený soubor `.json` si uložte (např. do cloudu).
* Při změně telefonu data obnovíte funkcí **Import**.

---

## 🛠 Technické Info

Projekt je postaven na čistých technologiích pro maximální výkon:
* **Stack:** Vanilla JS, HTML5, Tailwind CSS.
* **Storage:** LocalStorage + IndexedDB (přes wrapper).
* **PWA:** Service Workers pro offline cache a background procesy.

---

*Vyvinuto v Pardubicích. KRYT Style.*
* **📅 Chytrá Časová Osa (Smart Schedule):** Dynamický rozvrh dne, který se generuje na základě vašeho nastavení (Gym, Sport, Volno). Automaticky připomíná jídlo, tréninky i suplementaci.
* **📈 Autoregulace Zátěže (RPE):** Unikátní systém, který upravuje váhy pro příští trénink na základě vašeho pocitu (Easy/OK/Hard).
* **🤸 Podpora Calisthenics:** Plná podpora pro cviky s vlastní vahou (možnost označit cvik jako "Bez váhy").
* **📊 Analýza Progresu:** Grafický přehled objemu a zvednuté váhy u jednotlivých cviků.

---

## 📖 Uživatelský Manuál

### 1. Prvotní Nastavení ⚙️
Po prvním spuštění klikněte na ikonu **Nastavení** (vlevo nahoře).

* **Záložka Uživatel:** Vyplňte své jméno a hlavní sport.
* **Rozvrh:** Nastavte si typ aktivity pro každý den v týdnu:
    * *Volno:* Generuje relaxační osu (jídlo, regenerace).
    * *Gym:* Trénink v posilovně (aktivuje před/po tréninkovou suplementaci).
    * *Sport:* Váš specifický sport (fotbal, hokej, atd.).
    * *Double:* Dvoufázový trénink (Gym + Sport).
* **Záložka Stack:** Zde si nastavte suplementy (název, dávkování, časování), které se pak objeví na denní ose.

### 2. Správa Cviků (Nové!) 🛠️
V nastavení pod záložkou **Cviky** můžete upravovat svůj plán.
* Při přidávání nového cviku můžete zaškrtnout **"Cvik bez závaží (Calisthenics)"**.
* Takové cviky (např. Kliky, Plank) po vás v tréninku nebudou vyžadovat zadání váhy, pouze opakování/čas.

### 3. Tréninkový Mód (Gym Log) 🏋️‍♂️
Když nastane čas cvičit, klikněte na tlačítko **GYM**.
1.  Aplikace načte plán pro dnešní den a aktuální týden.
2.  U každého cviku vidíte historii z minula.
3.  **Zadávání sérií:** Vyplňte váhu (kg), opakování a série.
4.  **RPE (Rate of Perceived Exertion):** Po odcvičení zvolte náročnost:
    * 🟢 **EASY:** Systém příště automaticky přidá **+2.5 kg**.
    * 🟡 **OK:** Systém příště přidá **+1.25 kg** (micro-loading).
    * 🔴 **HARD:** Váha zůstává stejná.

### 4. Správa Dat a Zálohování 💾
**Důležité:** Protože data žijí pouze ve vašem prohlížeči, při vymazání historie prohlížeče o ně můžete přijít.

* Jděte do **Nastavení -> Systém**.
* Použijte tlačítko **Export** pro stažení zálohy (`.json` soubor).
* *Doporučení:* Provádějte zálohu pravidelně (např. jednou týdně).

---

## 🛠 Použité Technologie

Projekt je postaven na čistých webových technologiích pro maximální rychlost a snadnou údržbu:

* **Jádro:** HTML5, Vanilla JavaScript (ES6+)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (přes CDN)
* **Grafy:** [Chart.js](https://www.chartjs.org/)
* **Ikony:** SVG / Font Awesome koncept

---

## 🤝 Přispívání

Máte nápad na vylepšení?
1.  Forkněte tento projekt.
2.  Vytvořte Feature Branch (`git checkout -b feature/NovyNapad`).
3.  Commitněte změny.
4.  Pushněte do větve.
5.  Otevřete Pull Request.

---

*Vyvinuto pro osobní potřeby s důrazem na efektivitu.*
