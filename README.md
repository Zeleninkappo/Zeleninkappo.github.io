# Zelix – Smart Training & Lifestyle Manager

![Status](https://img.shields.io/badge/Status-Stable%20v0.6-red)
![Platform](https://img.shields.io/badge/Platform-PWA%20%7C%20Mobile-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

**Zelix** je pokročilá PWA aplikace pro správu silového tréninku a životního stylu. Běží offline, chová se jako nativní aplikace a klade důraz na maximální efektivitu.

> **Motto:** Žádné zbytečnosti, jen čistá data, vibrace a progres.

---

## ⚡ Hlavní Funkce (v0.5)

* **🧠 Smart Catch-up:** Inteligentní detekce zameškaných tréninků s možností okamžitého dohnání.
* **💊 Stack Management:** Komplexní správa suplementace s automatickým časováním podle tréninkových dní.
* **🛌 Smart Rest:** Dynamický režim odpočinku, který se automaticky vypne následující den.
* **🎲 Generátor 2.0:** Možnost přegenerovat celý plán nebo jen konkrétní den (např. změna z "Nohy" na "Push").
* **🛡️ Backup Watchdog:** Automatická kontrola stáří zálohy (upozornění po 7 dnech).

---

## 📖 Manuál Operátora

### 1. Instalace & Start 🚀
* **Android/iOS:** Přidat na plochu (Add to Home Screen).
* **Baterie:** Na Androidu nutné povolit režim **"Neomezeno"** pro aplikaci (Chrome/Zelix), jinak nebudou chodit notifikace.
* **Onboarding:** Při prvním spuštění projdeš kalibrací (Jméno, Cíl, Frekvence, Maximálky).

### 2. Dashboard (Hlavní Panel) 📋
Tvůj denní rozvrh se generuje dynamicky každé ráno.
* **Checklist:** Položky (Jídlo, Suplementy, Trénink) mizí/šednou po splnění.
* **Smart Rest (🛌 VOLNO):**
    * Aktivuje režim regenerace **pouze pro dnešek**.
    * Skryje tréninky a před-tréninkové suplementy.
    * Zobrazí "Snídani" (i když ji máš v tréninkové dny skrytou) a ranní/večerní suplementy.
* **Následuje:** Karta nahoře vždy ukazuje nejbližší akci.

### 3. Tréninkový Režim (GYM) 🏋️‍♂️
* **Logování:** Váhy a opakování se předvyplňují z minulého úspěšného tréninku.
* **RPE (Hodnocení):**
    * 🟢 **EASY:** Váha byla lehká -> Příště systém automaticky přidá (+2.5kg / +1.25kg).
    * 🟡 **OK:** Váha akorát -> Zůstává.
    * 🔴 **HARD:** Limit -> Váha zůstává, nutná regenerace.
* **1RM Kalkulačka:** Při zadávání váhy/opakování se v rohu ukazuje odhadované maximum.

---

### 4. Správa Suplementů (STACK) 💊
*Nastavení -> Stack*

Zelix funguje jako automatický dávkovač. Nemusíš myslet na to, co si vzít – objeví se to v checklistu.

1.  **Aktivace:** Přepínačem nahoře zapneš/vypneš celý modul.
2.  **Přidání látky:**
    * **Název:** Např. "Creatine", "Vitamín C".
    * **Dávka:** Např. "5g", "1 tbl".
3.  **Časování (Klíčové!):**
    * **Ráno / Večer:** Zobrazí se **každý den** (i ve Volno).
    * **Před / Při / Po tréninku:** Zobrazí se **pouze v den tréninku** (Gym/Double). Automaticky se řadí kolem času tréninku (-30 min, +90 min).
4.  **Frekvence:**
    * *Každý den:* Klasika (Kreatin, Vitamíny).
    * *Jen trénink:* Pre-workouty, Pumpuy, Intra-BCAA.
    * *Jen volno:* Specifická regenerace.

---

### 5. Editor Tréninků (TUNING) ⚙️
*Nastavení -> Cviky*

Zde máš plnou kontrolu nad tréninkovým plánem.

#### A. Úprava konkrétního dne
1.  Vyber **Týden (A/B)** a **Den (Po-Ne)**.
2.  **Přejmenování:** Nahoře přepiš název (např. "UPPER_A" -> "Vršek - Těžký").
3.  **Seznam cviků:**
    * **▲/▼:** Změna pořadí.
    * **✖:** Smazání cviku.
4.  **Přidání cviku:**
    * Napiš název a klikni na **+**.
    * **Checkbox ☐:** Zaškrtni pro **cviky bez závaží** (Kliky, Plank). V logu pak zmizí kolonka pro "KG".
5.  **🎲 Rychlý Generátor (Dole):**
    * Nelíbí se ti aktuální den? Vyber šablonu (např. "PULL") a klikni na **Generovat**.
    * Přepíše kompletně cviky **jen pro tento jeden den**.

#### B. Globální Restart (⚡ Nový Plán)
Tlačítko nahoře *"Změna Režimu"*.
* Použij, pokud měníš celou filozofii (např. přechod z 3x týdně na 5x týdně).
* Spustí znovu průvodce (Onboarding).
* **Zachová:** Historii vah, tělesnou váhu, nastavení jídel.
* **Přepíše:** Celý rozvrh a seznam cviků.

---

### 6. Data & Bezpečnost 💾
* **Export:** *Nastavení -> Systém -> Export*. Stáhne JSON soubor.
* **Watchdog:** Pokud systém zjistí, že záloha je starší než 7 dní, při startu tě vyzve k uložení.
* **Import:** Pro přenos na nový telefon.
* **Wipe:** Smazání všech dat (Hard Reset).

---
 
