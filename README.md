# Zelix v0.4 – Smart Training & Lifestyle Manager

![Status](https://img.shields.io/badge/Status-Active-success)
![Technology](https://img.shields.io/badge/Tech-VanillaJS%20%7C%20Tailwind-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

**Zelix** je minimalistická, ale výkonná webová aplikace pro správu tréninku a životního stylu. Funguje jako váš digitální trenér a deník v jednom. Běží kompletně ve vašem prohlížeči (offline-first) a klade důraz na rychlost, automatizaci a měřitelný progres.

> **Motto:** Žádné zbytečnosti, jen čistá data a progres.

## ⚡ Klíčové Vlastnosti

* **🔒 Offline-First Architektura:** Žádné servery, žádné přihlašování. Všechna data se ukládají bezpečně do `localStorage` vašeho prohlížeče.
* **🔄 Automatické Cyklování Týdnů (A/B):** Aplikace sama pozná, jaký je týden v roce, a podle toho automaticky střídá tréninkové plány (Týden A / Týden B), aby tělo neustrnulo v rutině.
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
