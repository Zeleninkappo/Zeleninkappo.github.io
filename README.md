# Zelix – Smart Training & Lifestyle Manager

![Status](https://img.shields.io/badge/Status-Stable%20v0.6.3-red)
![Platform](https://img.shields.io/badge/Platform-PWA%20%7C%20Mobile-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

**Zelix** je pokročilá PWA aplikace pro správu silového tréninku a životního stylu. Běží offline, chová se jako nativní aplikace a klade důraz na maximální efektivitu.

> **Motto:** Žádné zbytečnosti, jen čistá data, vibrace a progres.

---

## 🆕 v0.6.3 – definitivně vyřešeno: `backdrop-filter` byl viník

Potvrzeno testem na reálném zařízení (Galaxy S24 Ultra): odstranění veškerého `backdrop-filter`/blur z celé appky artefakty definitivně odstranilo. Root cause: kombinace GPU-kompozitovaného live blur efektu a 120Hz adaptivní obnovovací frekvence displeje je na Androidu/Chromu dlouhodobě nestabilní (torn/roztržené framy, půlka layoutu, prázdné boxy - přesně vzorky, které jsme viděli). Header i všech 9 modálů teď používá pevné, téměř neprůhledné pozadí místo živého rozostření. Vizuálně appka vypadá jen nepatrně "plošeji", ale je to 100% spolehlivé napříč zařízeními a šetří GPU/baterii, protože compositor nemusí každý snímek přepočítávat blur.

**Poučení pro budoucí vývoj:** na tomhle stacku (Tailwind CDN + PWA na Androidu) se `backdrop-filter` na `position: sticky` nebo `position: fixed` prvcích nedoporučuje vůbec, bez ohledu na to, jak moc je "jen kosmetický". Pokud se v budoucnu bude chtít sklovitý efekt zpátky, řešit ho jako statický (předrenderovaný) gradient/obrázek, ne živý CSS filtr.

## 🆕 v0.6.2 – opraven skutečný viník: sticky + backdrop-filter na Android Chrome

Uživatelský test ukázal jasný otisk: layout se občas "opravil" po scrollu. To vylučuje Tailwind-JIT teorii z v0.6.1 (ta by scrollem neovlivnila nic) a ukazuje na jiný, samostatný a dobře zdokumentovaný bug Chromia na Androidu: kombinace `position: sticky` + `backdrop-filter` na stejném prvku má nestabilní GPU compositing vrstvu, která se po prvním layoutu občas vykreslí se špatnými rozměry a zůstane takhle "zamrzlá", dokud ji scroll nedonutí přepočítat. Header teď má blur oddělený na samostatném podkladovém prvku (ne přímo na sticky kontejneru) + `isolation: isolate` a `translateZ(0)` pro stabilní vlastní vrstvu od prvního vykreslení. Stejná prevence přidána i do modálů (`fixed` + `backdrop-blur-sm` má mírnější variantu stejného problému).

## 🆕 v0.6.1 – definitivní fix "rozjetého" layoutu na reálném mobilu

v0.6.0 opravila jen symptom (cachování starého UI). Skutečná příčina – Tailwind CDN generuje CSS až za běhu přes JS a na pomalejším mobilním CPU může proběhnout první vykreslení dřív, než styly stihnou doběhnout – zůstávala. v0.6.1 definuje layoutově kritické třídy (header, action-card, modály) ručně psaným CSS, které se načte synchronně před Tailwindem, takže k závodu (race condition) už nemůže dojít bez ohledu na rychlost zařízení. Detaily a instrukce pro vyčištění WebAPK úložiště viz sekce *Poznámka k nasazení* níže.

## 🆕 Co je nové v v0.6.0 (souhrn)

Tahle verze je kompletní bezpečnostní a spolehlivostní audit + sada nových funkcí nad rámec v0.5.x.

**Opraveno**
* **Bug s "rozjetým" UI po aktualizaci** (Service Worker teď používá network-first strategii pro HTML, takže se nikdy nezasekne poškozená/napůl vykreslená verze v cache).
* **Ztráta dat při přesunu/mazání cviku a suplementu** – `moveExercise`, `removeExercise`, `removeStackItem` teď korektně volají `saveDB()`.
* Kolize z-indexu mezi modálními okny (dřív se mohly dvě okna překrývat ve špatném pořadí).

**Zabezpečeno**
* Escapování veškerého uživatelského vstupu vkládaného do DOM (`Utils.escapeHtml`) – uzavřena Stored XSS díra (název cviku/suplementu/poznámka mohly dřív obsahovat spustitelný kód).
* `Content-Security-Policy` hlavička omezující, odkud smí appka načítat a spouštět kód.
* Validace struktury importovaného zálohovacího JSON souboru – appka odmítne cizí/poškozený soubor.
* Automatický recovery snapshot těsně před každým importem + tlačítko na obnovu v Nastavení → Systém.
* `saveDB()` má ošetřenou chybu při zaplněném úložišti (dřív appka tiše neuložila změny).

**Nové funkce**
* 🔥 **Streak tracker** – sleduje sérii po sobě jdoucích odtrénovaných dnů podle tvého rozvrhu.
* ⏱ **Rest Timer** – plovoucí lišta s odpočtem, automaticky nastartuje po zaznamenání série (délka podle tvého tréninkového cíle).
* 🏆 **Detekce nového osobního rekordu** – toast notifikace při dosažení nové maximální váhy u cviku.
* 📲 **Instalace na plochu** jedním tlačítkem (Nastavení → Systém), pokud to prohlížeč podporuje.
* 🔄 **Banner nové verze** – appka tě upozorní, když je na pozadí stažená novější verze, a nechá tě rozhodnout, kdy aktualizovat (místo tichého přepsání cache uprostřed zapisování tréninku).
* Živé přepínání світ/tma podle systému při zapnutém režimu "Auto".
* Zobrazení využitého úložiště prohlížeče v Nastavení.

---

## ⚡ Hlavní Funkce

* **🧠 Smart Catch-up:** Inteligentní detekce zameškaných tréninků s možností okamžitého dohnání.
* **💊 Stack Management:** Komplexní správa suplementace s automatickým časováním podle tréninkových dní.
* **🛌 Smart Rest:** Dynamický režim odpočinku, který se automaticky vypne následující den.
* **🎲 Generátor 2.0:** Možnost přegenerovat celý plán nebo jen konkrétní den (např. změna z "Nohy" na "Push").
* **🛡️ Backup Watchdog:** Automatická kontrola stáří zálohy (upozornění po 7 dnech).
* **🔥 Streak Tracker & ⏱ Rest Timer** (nové v0.6.0)

---

## 📖 Manuál Operátora

### 1. Instalace & Start 🚀
* **Android/iOS:** Přidat na plochu (Add to Home Screen), nebo použij tlačítko "📲 Nainstalovat na plochu" v Nastavení → Systém.
* **Baterie:** Na Androidu nutné povolit režim **"Neomezeno"** pro aplikaci (Chrome/Zelix), jinak nebudou chodit notifikace.
* **Onboarding:** Při prvním spuštění projdeš kalibrací (Jméno, Cíl, Frekvence, Maximálky).

### 2. Dashboard (Hlavní Panel) 📋
Tvůj denní rozvrh se generuje dynamicky každé ráno.
* **Checklist:** Položky (Jídlo, Suplementy, Trénink) mizí/šednou po splnění.
* **Streak odznak (🔥):** Vedle loga appky se objeví, jakmile máš aktivní sérii alespoň 1 odtrénovaného dne v řadě.
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
* **Rest Timer:** Po kliknutí na EASY/OK/HARD se automaticky spustí odpočinkový časovač dole na obrazovce (délku lze upravit tlačítky +15s/-15s nebo přeskočit).
* **1RM Kalkulačka:** Při zadávání váhy/opakování se v rohu ukazuje odhadované maximum.
* **Nový rekord:** Pokud zvedneš víc než kdy dřív, appka to po uložení tréninku oznámí.

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

### 4b. Průběh Tréninku (Detail) 📝
Jakmile jsi v režimu **GYM**, aplikace se stará o matematiku. Ty jen zvedáš.

* **Chytré předvyplnění:** Aplikace si pamatuje, co jsi zvedal minule u daného cviku.
* **1RM Kalkulačka:** Když zadáš váhu a počet opakování, v rohu kartičky se ihned ukáže *Est. 1RM* (Odhadované maximální zvednutí). Ideální pro kontrolu progresu v reálném čase.
* **RPE Tlačítka (Autoregulace):** Po sérii klikni na jedno z tlačítek. Tím říkáš algoritmu, jak naložit příště, a zároveň si spustíš odpočinkový časovač:
    * 🟢 **EASY:** Váha byla lehká (RPE < 7). Algoritmus příště automaticky přidá váhu (+2.5 kg).
    * 🟡 **OK:** Váha byla akorát (RPE 7-8.5). Váha zůstává stejná.
    * 🔴 **HARD:** Selhání nebo technický limit (RPE 9-10). Váha zůstává, nutná regenerace.
* **Poznámka:** Dole můžeš zapsat pocity (např. "Bolí rameno", "Nový pre-workout"). Poznámka se uloží k celému tréninku a uvidíš ji v historii.

### 5. Log & Editace Historie 📖
Udělal jsi chybu při zadávání? Nebo chceš vidět historii konkrétního cviku?

1.  Klikni na tlačítko **LOG** v hlavičce aplikace.
2.  **Seznam cviků:** Kliknutím na název cviku rozbalíš kompletní historii všech sérií.
3.  **Editace (Entry Manager):** Klikni na **konkrétní řádek** (sérii) v historii.
    * Otevře se okno úprav.
    * Můžeš přepsat váhu, opakování, série i RPE.
    * **Smazat cvik:** Odstraní jen tento jeden záznam z tréninku.
    * **Smazat trénink:** Smaže kompletně celý tréninkový den z historie.

### 6. Analýza & Grafy 📊
Sekce **Analýza Výkonu** se nachází na hlavní obrazovce pod checklistem.

* **Přepínač:** V roletce si vyber, co chceš vidět (Tělesná váha nebo konkrétní cvik).
* **Jak číst graf:**
    * 🟥 **Červená čára (Váha):** Ukazuje maximální zvednutou váhu v daný den. Sleduj trend.
    * ⬜ **Šedé sloupce (Objem):** Ukazují *Volume Load* (Série × Opakování). Pokud čára stagnuje, ale sloupce rostou, stále děláš progres (pracovní kapacita).

### 7. Sledování Váhy ⚖️
Klikni na tlačítko **⚖️ VÁHA** v hlavičce.

* Zadej svou aktuální ranní hmotnost na lačno (rozmezí 1–400 kg).
* Data se ukládají do historie a vykreslují v grafu *Analýza Výkonu -> Tělesná váha*.
* *Tip:* Važ se pravidelně (např. každé pondělí ráno) pro konzistentní data.

### 8. Editor Tréninků (TUNING) ⚙️
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

### 9. Data & Bezpečnost 💾
* **Export:** *Nastavení -> Systém -> Export*. Stáhne JSON soubor.
* **Watchdog:** Pokud systém zjistí, že záloha je starší než 7 dní, při startu tě vyzve k uložení.
* **Import:** Pro přenos na nový telefon. Před přepsáním dat appka automaticky uloží zálohu ("Recovery Slot"), kterou lze kdykoliv vzít zpět.
* **Obnovit zálohu:** Tlačítko v Nastavení → Systém vrátí data do stavu těsně před posledním importem.
* **Wipe:** Smazání všech dat (Hard Reset) – nevratné, appka na to upozorní.

---

## 🛠️ Poznámka k nasazení

* Aktuální verze: **v0.6.1** (bump v `config.js` – zajišťuje, že Service Worker stáhne novou verzi místo staré z cache).
* Soubory `icon-192.png` a `icon-512.png` musí existovat ve stejné složce jako `index.html` (nejsou součástí zdrojového kódu appky, jsou to binární obrázky – nahraď vlastním logem).
* Appka běží čistě staticky (žádný backend) – stačí nahrát všechny soubory na libovolný HTTPS hosting (Service Worker vyžaduje HTTPS nebo `localhost`).

### ⚠️ Když appka nainstalovaná na plochu (WebAPK) pořád ukazuje starou/rozbitou verzi

Android u appek přidaných přes "Přidat na plochu" vytváří samostatný **WebAPK** s vlastním úložištěm, oddělený od běžného Chromu. `Nastavení stránky → Vymazat data` uvnitř Chromu **tohle úložiště nemusí vyčistit**. Pokud po nasazení nové verze appka na ploše pořád vypadá při rozjetá:

1. Smaž ikonu appky z plochy (odinstaluj WebAPK).
2. Android Nastavení → Aplikace → Zelix (pokud tam ještě figuruje) → Úložiště → Vymazat vše.
3. V Chromu otevři URL appky, `Nastavení stránky → Vymazat data`.
4. Znovu "Přidat na plochu".

### Proč se to na telefonu chová jinak než v Chrome DevTools na PC

`cdn.tailwindcss.com` generuje CSS **za běhu přes JS** (Tailwind sám v konzoli varuje, že tohle není pro produkci). DevTools "Device Toolbar" na notebooku pořád běží na desktopovém CPU – Tailwind tam vždy stihne doběhnout dřív, než prohlížeč cokoliv vykreslí. Na reálném mobilu (i vlajkovém) může nastat opak: první vykreslení proběhne dřív, než Tailwind stihne dogenerovat styly pro `sticky`/`flex`/`backdrop-blur` header, a Chromium tenhle napůl vykreslený stav "zamrzne". Od v0.6.1 appka definuje layoutově kritické třídy (box model, flexbox, pozice u headeru a modálů) staticky v `<style>` bloku v `<head>`, který se načte synchronně před Tailwindem – Tailwind je pak jen doplní identickými hodnotami, takže vizuálně nic neproskočí a race condition nemůže nastat. Definitivní řešení (lokální build Tailwindu přes CLI místo CDN) zůstává doporučené pro budoucí verzi, viz sekce Architektura.
