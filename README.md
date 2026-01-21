​Zelix v0.4 – Smart Training & Lifestyle Manager
​Zelix je minimalistická, ale výkonná webová aplikace pro správu tréninku a životního stylu. Funguje jako váš digitální trenér a deník v jednom. Běží kompletně ve vašem prohlížeči (offline-first) a klade důraz na rychlost, automatizaci a měřitelný progres.
​⚡ Klíčové Vlastnosti
​Offline-First Architektura: Žádné servery, žádné přihlašování. Všechna data se ukládají bezpečně do vašeho prohlížeče (localStorage).
​Automatické Cyklování Týdnů (A/B): Aplikace sama pozná, jaký je týden v roce, a podle toho automaticky střídá tréninkové plány (Týden A / Týden B), aby tělo neustrnulo v rutině.
​Chytrá Časová Osa: Dynamický rozvrh dne, který se generuje na základě vašeho nastavení (Gym, Sport, Volno). Automaticky připomíná jídlo, tréninky i suplementaci.
​Autoregulace Zátěže (RPE): Unikátní systém, který upravuje váhy pro příští trénink na základě vašeho pocitu (Easy/OK/Hard). Pokud byl trénink lehký, Zelix automaticky přidá váhu.
​Analýza Progresu: Grafický přehled objemu a zvednuté váhy u jednotlivých cviků.
​🚀 Jak začít (Rychlý start)
​Jelikož je Zelix Single Page Application (SPA) bez backendu, instalace je triviální:
​Stáhněte si tento repozitář.
​Otevřete soubor index.html v libovolném moderním prohlížeči (Chrome, Safari, Edge, Firefox).
​To je vše. Aplikace je připravena.
​📖 Uživatelský Manuál
​1. Prvotní Nastavení ⚙️
​Po prvním spuštění klikněte na ikonu Nastavení (vlevo nahoře).
​Záložka Uživatel: Vyplňte své jméno a hlavní sport.
​Rozvrh: Nastavte si typ aktivity pro každý den v týdnu:
​Volno: Generuje relaxační osu (jídlo, regenerace).
​Gym: Trénink v posilovně (aktivuje před/po tréninkovou suplementaci).
​Sport: Váš specifický sport (fotbal, hokej, atd.).
​Double: Dvoufázový trénink (Gym + Sport).
​Záložka Stack: Zde si můžete nastavit suplementy (název, dávkování, časování), které se pak objeví ve vaší denní ose.
​2. Denní Používání (Timeline) 📅
​Na hlavní obrazovce vidíte "Timeline" – osu vašeho dne.
​Položky se odškrtávají kliknutím.
​Action Card: Nahoře vždy vidíte, co následuje a odpočet času ("NÁSLEDUJE: GYM TRÉNINK za -0:45").
​Tlačítko VOLNO (vpravo nahoře) slouží k vynucení odpočinkového dne, pokud se necítíte na trénink, i když ho máte v plánu.
​3. Tréninkový Mód (Gym Log) 🏋️‍♂️
​Když nastane čas cvičit, klikněte na tlačítko GYM.
​Aplikace načte plán pro dnešní den a aktuální týden (A nebo B).
​U každého cviku vidíte, co jste zvedali minule.
​Zadávání sérií: Vyplňte váhu (kg), opakování a série.
​RPE (Důležité!): Po odcvičení cviku zvolte náročnost:
​🟢 EASY: Příště +2.5 kg.
​🟡 OK: Příště +1.25 kg.
​🔴 HARD: Váha zůstává stejná.
​Pro uložení klikněte na "ULOŽIT TRÉNINK".
​4. Správa Dat a Zálohování 💾
​Protože data žijí ve vašem prohlížeči, při vymazání historie prohlížeče o ně můžete přijít.
​Jděte do Nastavení -> Systém.
​Použijte tlačítko Export pro stažení zálohy (.json soubor). Doporučujeme dělat pravidelně!
​Tlačítko Import slouží k obnovení dat ze zálohy (např. při přechodu na jiný telefon/počítač).
​🛠 Technologie
​Projekt je postaven na čistých webových technologiích pro maximální životnost a kompatibilitu:
​HTML5 & Vanilla JavaScript (ES6+)
​Tailwind CSS (Styling)
​Chart.js (Vizualizace dat)
​Font Awesome / SVG Icons
​Vyvinuto pro osobní potřeby s důrazem na efektivitu a "No-BS" přístup k tréninku. 
