# Zelix – Smart Training & Lifestyle Manager

![Status](https://img.shields.io/badge/Status-Stable%20v0.5-red)
![Platform](https://img.shields.io/badge/Platform-PWA%20%7C%20Mobile-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

**Zelix** je pokročilá PWA (Progressive Web App) aplikace pro správu silového tréninku a životního stylu. Běží offline, chová se jako nativní aplikace a klade důraz na maximální efektivitu bez zbytečností.

> **Motto:** Žádné zbytečnosti, jen čistá data, vibrace a progres.

---

## ⚡ Co je nového ve v0.5?

* **🧠 Smart Catch-up:** Pokud vynecháš trénink, Zelix ti další den nabídne jeho dohnání.
* **🛌 Smart Rest:** Tlačítko VOLNO platí jen pro aktuální den. Zítra tě aplikace automaticky vzbudí do režimu.
* **🎲 Generátor 2.0:** Možnost přegenerovat celý plán nebo jen konkrétní den (např. změna z "Nohy" na "Push").
* **✏️ Customizace:** Přejmenuj si tréninky podle sebe ("Upper A" -> "Vršek - Bomby").
* **🛡️ Backup Watchdog:** Aplikace hlídá, jak starou máš zálohu, a upozorní tě, pokud riskuješ ztrátu dat.

---

## 📖 Operační Manuál

### 1. Instalace (PWA) 🚀
Zelix nemá server. Žije ve tvém telefonu.
* **Android (Chrome):** Otevři menu -> *"Přidat na plochu"* / *"Nainstalovat aplikaci"*.
* **iOS (Safari):** Tlačítko Sdílet -> *"Přidat na plochu"*.
* *Poznámka:* Na Androidu povol v nastavení baterie režim **"Neomezeno"**, jinak systém "zabije" notifikace.

### 2. Start Mise (Onboarding) 🎯
Při prvním spuštění (nebo v *Nastavení -> Cviky -> Nový Plán*) projdeš generátorem:
1.  **Identita:** Tvé jméno.
2.  **Cíl:**
    * 🦍 **Objem (Hypertrophy):** 4x10, izolované cviky.
    * 🐂 **Síla (Strength):** 5x5, těžké základy.
    * 🏃 **Kondice / 🧨 Výbušnost.**
3.  **Kalibrace:** Zadej své maximálky (Bench, Dřep, Mrtvý tah), pokud je znáš.
4.  **Frekvence:** 3x, 4x nebo 5x týdně.

Systém automaticky vygeneruje **Tréninkový Split (A/B)** a **Rozvrh**.

### 3. Dashboard & Timeline 📋
Hlavní obrazovka je tvůj denní plán.
* **Checklist:** Kliknutím na položku (Jídlo, Suplementy, Trénink) ji označíš jako splněnou.
* **Následuje:** Karta nahoře ukazuje nejbližší úkol a odpočet. Tlačítkem **"✓"** ho splníš.
* **Smart Rest (🛌 VOLNO):**
    * Kliknutím aktivuješ režim odpočinku **pro tento den**.
    * Všechny tréninky zmizí, zůstane jen jídlo a regenerace.
    * **Zítra se režim sám vypne.**

### 4. Tréninkový Režim (GYM) 🏋️‍♂️
Kliknutím na tlačítko **GYM** spustíš trénink.
* **Smart Catch-up:** Pokud systém zjistí, že jsi včera flákal trénink, zeptá se: *"Chceš dohnat včerejšek?"*
* **Logování:**
    * Váhy se předvyplňují z minula.
    * Po sérii hodnotíš náročnost (**RPE**):
        * 🟢 **EASY:** Lehký. *(Příště přidám váhu)*
        * 🟡 **OK:** Akorát. *(Váha sedí)*
        * 🔴 **HARD:** Krev a pot. *(Váha zůstává)*
* **Vibrace:** Haptická odezva potvrzuje každou akci.

### 5. Tuning & Úpravy ⚙️
Vše upravíš v **Nastavení (⚙️)**.

#### Karta CVIKY:
* **Přejmenování:** Klikni na název tréninku (např. "UPPER_A") a přepiš ho na svůj název.
* **🎲 Generovat (Jeden den):** Nelíbí se ti pondělní trénink? Vyber v roletce třeba "PUSH" a klikni na kostku. Přepíše se jen ten den.
* **⚡ Nový Plán (Restart):** Změnil se ti život? Spusť průvodce znovu (změna z 3x na 4x týdně) bez ztráty historie váhy.

#### Karta ROZVRH:
* Nastav si dny (Gym, Sport, Volno) a časy.
* *Tip:* U dní volna se čas nezadává, aby tě aplikace nerušila.

### 6. Bezpečnost Dat 💾
Tvá data jsou pouze v prohlížeči.
* **Záloha:** Jdi do *Nastavení -> Systém -> Export*. Stáhne se soubor `.json`.
* **Watchdog:** Pokud nezálohuješ déle než **7 dní**, Zelix tě při startu upozorní.
* **Obnova:** Nový telefon? Stačí dát *Import* a nahrát soubor.

---

## 🛠 Technické Info

* **Stack:** Vanilla JS, HTML5, Tailwind CSS.
* **Storage:** LocalStorage + IndexedDB wrapper.
* **Logic:** Autoregulační algoritmus (RPE based linear progression).

---
