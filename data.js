/* =========================================
   MODULE: DATA & BLUEPRINTS
   ========================================= */

const Data = {
    DB_KEY: 'ZELIX_DB_V050',           // Beze změny - zachovává kompatibilitu s existujícími daty
    RECOVERY_KEY: 'ZELIX_RECOVERY_SNAPSHOT', // Auto-záloha vytvořená těsně před importem
    DB_SCHEMA_VERSION: 2,

    // 1. KNIHOVNA CVIKŮ (Suroviny)
    library: {
        push_compound: ["Bench Press", "Military Press", "Dips (Weighted)", "Incline DB Press", "Landmine Press"],
        push_iso:      ["Triceps Pushdown", "Lateral Raises", "Skullcrushers", "Flyes", "Front Raises"],
        pull_compound: ["Deadlift", "Pull Ups", "Barbell Row", "Chin Ups", "T-Bar Row"],
        pull_iso:      ["Biceps Curls", "Face Pulls", "Hammer Curls", "Lat Pulldown", "Rear Delt Fly"],
        legs_squat:    ["Squat", "Front Squat", "Leg Press", "Goblet Squat", "Bulgarian Split Squat"],
        legs_hinge:    ["RDL (Romanian DL)", "Leg Curl", "Hip Thrust", "Glute Ham Raise", "Good Mornings"],
        legs_iso:      ["Leg Extension", "Calf Raise", "Seated Calf Raise"],
        core:          ["Plank", "Ab Wheel", "Hanging Leg Raises", "Russian Twists", "Woodchoppers"],
        explosive:     ["Power Clean", "Box Jumps", "Kettlebell Swing", "MedBall Slam", "Broad Jumps"],
        cardio:        ["Burpees", "Jump Rope", "Battle Ropes", "Sprint Intervals", "Rowing Machine"]
    },

    // 2. LOGIKA PRO CÍLE (Koření)
    strategies: {
        'strength':    { reps: 5,  sets: 5, rest: '3-5 min', focus: ['push_compound', 'pull_compound', 'legs_squat'] },
        'hypertrophy': { reps: 10, sets: 4, rest: '90 sec',  focus: ['push_iso', 'pull_iso', 'legs_iso'] },
        'endurance':   { reps: 15, sets: 3, rest: '45 sec',  focus: ['core', 'cardio'] },
        'explosive':   { reps: 6,  sets: 6, rest: '2 min',   focus: ['explosive'] }
    },

    // Current State (Database)
    state: {
        version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.0.0',
        schemaVersion: 2,
        bodyweight_history: [],
        userNoWeight: [],
        lastBackupDate: new Date().toISOString(),
        user: { name: 'Sportovec', sport: 'Sport', goal: 'hypertrophy' },
        settings: { theme: 'auto', days: {} },
        stack: [],
        forceRest: null,
        supplements: { enabled: true },
        completed_tasks: {},
        workout_history: [],
        exercise_stats: {},
        customWorkouts: { A: {}, B: {} } // Bude vygenerováno
    },

    init: function () {
        this.loadDB();
        Logic.init();
        UI.init();
    },

    isNoWeight: function (ex) {
        const sys = ["Plank", "Box Jumps", "Burpees", "Ab Wheel", "Pull Ups", "Chin Ups", "Dips"].some(x => ex.includes(x));
        const usr = this.state.userNoWeight && this.state.userNoWeight.includes(ex);
        return sys || usr;
    },

    // --- STREAK ENGINE ---
    // Počítá aktuální sérii po sobě jdoucích tréninkových dnů (podle rozvrhu, ne kalendářních dnů -
    // pokud má uživatel 3x týdně, "streak" nepočítá dny volna jako přerušení).
    getStreak: function () {
        const days = (this.state.settings && this.state.settings.days) ? this.state.settings.days : {};
        const history = this.state.workout_history || [];
        if (history.length === 0) return { current: 0, best: 0 };

        const trainedDates = new Set(history.map(h => h.date));
        const isPlannedTrainingDay = (date) => {
            const conf = days[date.getDay()];
            return !!(conf && (conf.type === 'gym' || conf.type === 'double'));
        };

        // Aktuální streak: jdeme zpětně ode dneška, přeskakujeme naplánované "volno" dny,
        // a počítáme, dokud narážíme na splněné tréninkové dny.
        let current = 0;
        let cursor = new Date();
        cursor.setHours(0, 0, 0, 0);
        // Pokud dnešek je tréninkový den a ještě není odtrénováno, nezapočítáváme ho jako zlomený streak -
        // začneme kontrolu od včerejška, aby appka netrestala uživatele před tím, než vůbec stihl cvičit.
        const todayStr = cursor.toISOString().split('T')[0];
        if (isPlannedTrainingDay(cursor) && !trainedDates.has(todayStr)) {
            cursor.setDate(cursor.getDate() - 1);
        }

        for (let i = 0; i < 400; i++) {
            const dStr = cursor.toISOString().split('T')[0];
            if (isPlannedTrainingDay(cursor)) {
                if (trainedDates.has(dStr)) { current++; cursor.setDate(cursor.getDate() - 1); }
                else break;
            } else {
                cursor.setDate(cursor.getDate() - 1); // volno den, přeskoč beze změny streaku
            }
        }

        // Nejdelší streak historicky (jednoduchý průchod seřazenými daty tréninků)
        const sortedDates = Array.from(trainedDates).sort();
        let best = 0, run = 0, prev = null;
        sortedDates.forEach(dStr => {
            const d = new Date(dStr + 'T00:00:00');
            if (prev) {
                const diffDays = Math.round((d - prev) / 86400000);
                // Pokud mezi tréninky nebyl žádný "naplánovaný a zmeškaný" tréninkový den, počítej dál
                let brokenStreak = false;
                const check = new Date(prev);
                check.setDate(check.getDate() + 1);
                while (check < d) {
                    if (isPlannedTrainingDay(check)) { brokenStreak = true; break; }
                    check.setDate(check.getDate() + 1);
                }
                run = brokenStreak ? 1 : run + 1;
            } else {
                run = 1;
            }
            if (run > best) best = run;
            prev = d;
        });

        return { current, best: Math.max(best, current) };
    },

    // --- REST TIMER: výchozí délka pauzy podle aktuálního cíle ---
    getRestSeconds: function () {
        const goal = (this.state.user && this.state.user.goal) || 'hypertrophy';
        const map = { strength: 210, hypertrophy: 90, endurance: 45, explosive: 120 };
        return map[goal] || 90;
    },

    loadDB: function () {
        let src = localStorage.getItem(this.DB_KEY);
        // Fallback pro migraci ze starší verze klíče
        if (!src) src = localStorage.getItem('ZELIX_DB_V030');

        if (src) {
            const parsed = Utils.safeParse(src, null);
            if (parsed && typeof parsed === 'object') {
                this.state = { ...this.state, ...parsed };
                if (!this.state.customWorkouts) this.state.customWorkouts = { A: {}, B: {} };
                if (!this.state.lastBackupDate) this.state.lastBackupDate = new Date().toISOString();
                this.migrateState();
                this.saveDB();
            } else {
                // Data jsou poškozená (corrupted JSON) - NEZAHAZUJEME je, uložíme
                // stranou pro případnou ruční záchranu a jedeme s čistým výchozím stavem.
                console.warn('Zelix DB: Poškozená data v localStorage, zálohuji stranou.');
                try { localStorage.setItem(this.DB_KEY + '_corrupted_' + Date.now(), src); } catch (e) { /* noop */ }
            }
        }
    },

    // Jednoduchý migrační systém - připraveno na budoucí změny struktury dat,
    // aniž by bylo nutné měnit DB_KEY (a tím uživatele nenávratně odstřihnout od historie).
    migrateState: function () {
        const v = this.state.schemaVersion || 1;
        if (v < 2) {
            if (!Array.isArray(this.state.userNoWeight)) this.state.userNoWeight = [];
            if (!this.state.supplements) this.state.supplements = { enabled: true };
        }
        this.state.schemaVersion = this.DB_SCHEMA_VERSION;
    },

    saveDB: function () {
        try {
            localStorage.setItem(this.DB_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.error('Zelix DB Save Error', e);
            if (typeof UI !== 'undefined' && UI.openAlertModal) {
                UI.openAlertModal(
                    'Chyba Ukládání',
                    'Úložiště prohlížeče je plné nebo nedostupné, poslední změna se NEULOŽILA.<br><br>Doporučuji hned udělat Export a promazat starší historii tréninků.'
                );
            }
        }
    },

    hardReset: function () {
        localStorage.clear();
        location.reload();
    },

    exportData: function () {
        this.state.lastBackupDate = new Date().toISOString();
        this.saveDB();

        const d = new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const a = document.createElement('a');
        a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state));
        a.download = `zelix_backup_${dateStr}.json`;
        a.click();

        if (typeof UI !== 'undefined') UI.vibrate([50, 50]);
    },

    // Bezpečnostní kontrola struktury importovaného souboru - zabraňuje
    // vložení náhodného/škodlivého JSONu, který by rozbil aplikaci nebo
    // (v kombinaci s chybějícím escapováním jinde) umožnil XSS.
    validateImportedState: function (obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
        const knownKeys = ['user', 'settings', 'stack', 'workout_history', 'exercise_stats', 'customWorkouts', 'bodyweight_history', 'supplements'];
        const hasKnownKey = knownKeys.some(k => k in obj);
        if (!hasKnownKey) return false;

        if (obj.workout_history && !Array.isArray(obj.workout_history)) return false;
        if (obj.bodyweight_history && !Array.isArray(obj.bodyweight_history)) return false;
        if (obj.stack && !Array.isArray(obj.stack)) return false;
        if (obj.user && typeof obj.user !== 'object') return false;
        if (obj.settings && typeof obj.settings !== 'object') return false;
        if (obj.customWorkouts && typeof obj.customWorkouts !== 'object') return false;

        return true;
    },

    importData: function (input) {
        const file = input.files && input.files[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) { // 20MB sanity limit
            UI.openAlertModal('Soubor je příliš velký', 'Maximální podporovaná velikost zálohy je 20 MB.');
            input.value = '';
            return;
        }

        const r = new FileReader();
        r.onload = function (e) {
            const parsed = Utils.safeParse(e.target.result, null);
            if (!parsed) {
                UI.openAlertModal('Chyba Importu', 'Soubor není platný JSON.');
                input.value = '';
                return;
            }
            if (!Data.validateImportedState(parsed)) {
                UI.openAlertModal('Chyba Importu', 'Soubor neobsahuje rozpoznatelnou strukturu dat Zelix. Import byl z bezpečnostních důvodů odmítnut.');
                input.value = '';
                return;
            }

            UI.openConfirmModal(
                'Přepsat data?',
                'Import <strong>nahradí</strong> tvá aktuální data importovaným souborem. Před importem se automaticky vytvoří záložní kopie (Recovery Slot), kterou lze v Nastavení kdykoliv obnovit.',
                () => {
                    try {
                        const current = localStorage.getItem(Data.DB_KEY);
                        if (current) localStorage.setItem(Data.RECOVERY_KEY, current);
                    } catch (e) { /* noop - recovery je bonus, ne blokující krok */ }

                    Data.state = { ...Data.state, ...parsed };
                    Data.migrateState();
                    Data.saveDB();
                    location.reload();
                },
                () => { input.value = ''; }
            );
        };
        r.onerror = function () {
            UI.openAlertModal('Chyba Čtení', 'Soubor se nepodařilo přečíst.');
            input.value = '';
        };
        r.readAsText(file);
    },

    restoreRecovery: function () {
        const snap = localStorage.getItem(this.RECOVERY_KEY);
        if (!snap) {
            UI.openAlertModal('Žádná Záloha', 'V tomto prohlížeči zatím není uložená žádná automatická záloha (vytváří se před každým importem).');
            return;
        }
        UI.openConfirmModal(
            'Obnovit zálohu?',
            'Přepíše aktuální data poslední automatickou zálohou, vytvořenou těsně před posledním importem.',
            () => {
                const parsed = Utils.safeParse(snap, null);
                if (!parsed) { UI.openAlertModal('Chyba', 'Záloha je bohužel poškozená.'); return; }
                this.state = { ...this.state, ...parsed };
                this.saveDB();
                location.reload();
            }
        );
    },

    setTheme: function (mode) {
        if (!this.state.settings) this.state.settings = {};
        this.state.settings.theme = mode;
        this.saveDB();
        UI.applyTheme();
    },

    saveSetup: function () {
        // 1. Uložení User Info
        const name = document.getElementById('setup-name').value.trim();
        const sport = document.getElementById('setup-sport').value.trim();
        if (name) this.state.user.name = name.slice(0, 40);
        if (sport) this.state.user.sport = sport.slice(0, 40);

        // 2. Uložení Časů Jídel
        const tB = document.getElementById('setup-time-breakfast').value;
        const tL = document.getElementById('setup-time-lunch').value;
        const tD = document.getElementById('setup-time-dinner').value;
        this.state.user.mealTimes = { breakfast: tB, lunch: tL, dinner: tD };

        // 3. Uložení Stacku (Supplements toggle)
        const suppsEn = document.getElementById('setup-supps-enabled').checked;
        if (!this.state.supplements) this.state.supplements = {};
        this.state.supplements.enabled = suppsEn;

        // 4. Uložení Rozvrhu (Timeline)
        const days = {};
        for (let i = 0; i < 7; i++) {
            const type = document.getElementById(`s-type-${i}`).value;
            const gymT = document.getElementById(`s-gym-${i}`).value;
            const fieldT = document.getElementById(`s-field-${i}`).value;
            days[i] = { type: type, gymTime: gymT, fieldTime: fieldT };
        }
        this.state.settings.days = days;

        // 5. Uložit a Refresh
        this.saveDB();
        UI.closeSetupModal();
        UI.updateUserGreeting();
        Logic.update(); // Překreslí timeline
        UI.vibrate([50, 50]);
    },

    // --- MEGA GENERATOR 3000 ---
    generateProgram: function (goal, daysCount) {
        const strat = this.strategies[goal] || this.strategies['hypertrophy'];
        const lib = this.library;

        const pick = (category, count) => {
            let pool = lib[category] || [];
            if (goal === 'explosive' && Math.random() > 0.5) pool = [...pool, ...lib.explosive];
            pool = pool.sort(() => 0.5 - Math.random());
            return pool.slice(0, count);
        };

        let schedule = {};

        if (daysCount === 3) {
            schedule = {
                1: { title: "Full Body A", type: "FB_A" },
                3: { title: "Full Body B", type: "FB_B" },
                5: { title: "Full Body A", type: "FB_A" }
            };
        } else if (daysCount === 4) {
            schedule = {
                1: { title: "Upper A", type: "UPPER_A" },
                2: { title: "Lower A", type: "LOWER_A" },
                4: { title: "Upper B", type: "UPPER_B" },
                5: { title: "Lower B", type: "LOWER_B" }
            };
        } else {
            schedule = {
                1: { title: "Push Power", type: "PUSH" },
                2: { title: "Pull Power", type: "PULL" },
                3: { title: "Legs Power", type: "LEGS" },
                4: { title: "Upper Hyper", type: "UPPER_A" },
                5: { title: "Lower Hyper", type: "LOWER_A" }
            };
        }

        const templates = { A: {}, B: {} };

        Object.keys(schedule).forEach(dayIndex => {
            const session = schedule[dayIndex];
            const type = session.type;

            templates.A[dayIndex] = {
                title: session.title,
                exercises: this.buildSession(type, 'A', strat)
            };
            templates.B[dayIndex] = {
                title: session.title.replace('A', 'B'),
                exercises: this.buildSession(type, 'B', strat)
            };
        });

        this.state.customWorkouts = templates;
        this.saveDB();
        return schedule;
    },

    buildSession: function (type, variant, strat) {
        const exercises = [];
        const pick = (cat) => {
            const pool = this.library[cat];
            const seed = variant === 'A' ? 0 : 1;
            return pool[(seed + Math.floor(Math.random() * pool.length)) % pool.length];
        };

        if (type.includes("FB")) {
            exercises.push(pick('legs_squat'));
            exercises.push(pick('push_compound'));
            exercises.push(pick('pull_compound'));
            exercises.push(pick('legs_hinge'));
            exercises.push(pick('core'));
        }
        else if (type.includes("UPPER")) {
            exercises.push(pick('push_compound'));
            exercises.push(pick('pull_compound'));
            exercises.push(pick('push_iso'));
            exercises.push(pick('pull_iso'));
            exercises.push(pick('core'));
        }
        else if (type.includes("LOWER")) {
            exercises.push(pick('legs_squat'));
            exercises.push(pick('legs_hinge'));
            exercises.push(pick('legs_iso'));
            exercises.push(pick('core'));
        }
        else if (type === "PUSH") {
            exercises.push(pick('push_compound'));
            exercises.push("Incline DB Press");
            exercises.push(pick('push_iso'));
            exercises.push(pick('push_iso'));
        }
        else if (type === "PULL") {
            exercises.push("Deadlift");
            exercises.push(pick('pull_compound'));
            exercises.push(pick('pull_iso'));
            exercises.push("Face Pulls");
        }
        else if (type === "LEGS") {
            exercises.push("Squat");
            exercises.push("RDL (Romanian DL)");
            exercises.push("Leg Press");
            exercises.push(pick('legs_iso'));
        }
        else if (type === "explosive") {
            exercises.push("Power Clean");
            exercises.push("Box Jumps");
            exercises.push("Kettlebell Swing");
            exercises.push("MedBall Slam");
            exercises.push("Broad Jumps");
        }
        else if (type === "PR_TEST") {
            exercises.push("Squat");
            exercises.push("Bench Press");
            exercises.push("Deadlift");
        }

        exercises.forEach(ex => {
            if (!this.state.exercise_stats[ex]) {
                this.state.exercise_stats[ex] = {
                    weight: 0,
                    reps: strat.reps,
                    sets: strat.sets,
                    rpe: 'medium'
                };
            }
        });

        return exercises;
    },

    regenerateDay: function (week, day, type) {
        const goal = this.state.user.goal || 'hypertrophy';
        const strat = this.strategies[goal] || this.strategies['hypertrophy'];
        const variant = week;

        const newExercises = this.buildSession(type, variant, strat);

        if (!this.state.customWorkouts[week]) this.state.customWorkouts[week] = {};
        if (!this.state.customWorkouts[week][day]) this.state.customWorkouts[week][day] = {};

        this.state.customWorkouts[week][day].exercises = newExercises;
        this.state.customWorkouts[week][day].title = `${type.replace('_', ' ')} (${variant})`;

        this.saveDB();
    }
};
