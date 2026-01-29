/* =========================================
   MODULE: DATA & BLUEPRINTS (FIXED v0.7.2)
   ========================================= */

const Data = {
    DB_KEY: 'ZELIX_DB_V0522',
    
    // 1. KNIHOVNA CVIKŮ
    library: {
        push_compound: ["Bench Press", "Military Press", "Kliky na bradlech (Se zátěží)", "Tlaky jednoruček (Šikmá)", "Landmine Press"],
        push_iso:      ["Stahování kladky (Triceps)", "Upažování", "Francouzské tlaky", "Rozpažování (Flyes)", "Předpažování"],
        pull_compound: ["Mrtvý tah (Deadlift)", "Shyby (Nadhmat)", "Přítahy v předklonu", "Shyby (Podhmat)", "Přítahy T-osy"],
        pull_iso:      ["Bicepsové zdvihy", "Face Pulls", "Kladivové zdvihy", "Stahování horní kladky", "Zapažování (Zadní ramena)"],
        legs_squat:    ["Dřep (Squat)", "Čelní dřep", "Leg Press", "Goblet dřep", "Bulharské dřepy"],
        legs_hinge:    ["Rumunský MT (RDL)", "Zakopávání", "Hip Thrust", "GHR (Glute Ham Raise)", "Good Mornings"],
        legs_iso:      ["Předkopávání", "Výpony (Stoj)", "Výpony (Sed)"],
        core:          ["Plank", "Kolečko (Ab Wheel)", "Zvedání nohou ve visu", "Ruské twisty", "Rotace s kladkou"],
        explosive:     ["Přemístění (Power Clean)", "Výskoky na bednu", "Kettlebell Swing", "Odhody medicinbalu", "Skoky do dálky"],
        cardio:        ["Angličáky (Burpees)", "Švihadlo", "Lodní lana", "Sprinty", "Veslování"]
    },

    strategies: {
        'strength':    { reps: 5,  sets: 5, rest: '3-5 min', focus: ['push_compound', 'pull_compound', 'legs_squat'] },
        'hypertrophy': { reps: 10, sets: 4, rest: '90 sec',  focus: ['push_iso', 'pull_iso', 'legs_iso'] },
        'endurance':   { reps: 15, sets: 3, rest: '45 sec',  focus: ['core', 'cardio'] },
        'explosive':   { reps: 6,  sets: 6, rest: '2 min',   focus: ['explosive'] }
    },

    state: { 
        version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.0.0',
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
        customWorkouts: { A: {}, B: {} } 
    },

    init: function() {
        this.loadDB();
        Logic.init();
        UI.init();
    },
    
    isNoWeight: function(ex) {
        const sys = ["Plank", "Výskoky", "Angličáky", "Kolečko", "Shyby", "Kliky", "Sprinty", "Švihadlo", "Lodní lana", "Veslování"].some(x => ex.includes(x));
        const usr = this.state.userNoWeight && this.state.userNoWeight.includes(ex);
        return sys || usr;
    },

    loadDB: function() {
        let src = localStorage.getItem(this.DB_KEY);
        if(!src) src = localStorage.getItem('ZELIX_DB_V060'); 
        if (src) {
            try {
                let parsed = JSON.parse(src);
                this.state = { ...this.state, ...parsed };
                if (!this.state.customWorkouts) this.state.customWorkouts = { A: {}, B: {} };
                if (!this.state.lastBackupDate) this.state.lastBackupDate = new Date().toISOString(); 
                this.saveDB();
            } catch (e) { console.warn("DB Corruption"); }
        }
    },

    saveDB: function() { localStorage.setItem(this.DB_KEY, JSON.stringify(this.state)); },
    hardReset: function() { localStorage.clear(); location.reload(); },
    
    exportData: function() {
        this.state.lastBackupDate = new Date().toISOString();
        this.saveDB();
        const d = new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const a = document.createElement('a');
        a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state));
        a.download = `zelix_backup_${dateStr}.json`;
        a.click();
        if (typeof UI !== 'undefined') UI.vibrate([50,50]);
    },

    importData: function(input) {
        const r = new FileReader();
        r.onload = function(e) {
            try {
                let parsed = JSON.parse(e.target.result);
                Data.state = { ...Data.state, ...parsed };
                Data.saveDB();
                location.reload();
            } catch (err) { alert("Chyba souboru"); }
        };
        r.readAsText(input.files[0]);
    },
    
    setTheme: function(mode) {
        if(!this.state.settings) this.state.settings={};
        this.state.settings.theme = mode;
        this.saveDB();
        UI.applyTheme();
    },

    saveSetup: function() {
        const name = document.getElementById('setup-name').value;
        const sport = document.getElementById('setup-sport').value;
        if(name) this.state.user.name = name;
        if(sport) this.state.user.sport = sport;

        const tB = document.getElementById('setup-time-breakfast').value;
        const tL = document.getElementById('setup-time-lunch').value;
        const tD = document.getElementById('setup-time-dinner').value;
        this.state.user.mealTimes = { breakfast: tB, lunch: tL, dinner: tD };

        const suppsEn = document.getElementById('setup-supps-enabled').checked;
        if(!this.state.supplements) this.state.supplements = {};
        this.state.supplements.enabled = suppsEn;

        const days = {};
        for(let i=0; i<7; i++) {
            const type = document.getElementById(`s-type-${i}`).value;
            const gymT = document.getElementById(`s-gym-${i}`).value;
            const fieldT = document.getElementById(`s-field-${i}`).value;
            days[i] = { type: type, gymTime: gymT, fieldTime: fieldT };
        }
        this.state.settings.days = days;

        this.saveDB();
        UI.closeSetupModal();
        UI.updateUserGreeting();
        Logic.update(); 
        UI.vibrate([50,50]);
    }, 

    generateProgram: function(goal, daysCount, duration = 'medium') {
        const strat = this.strategies[goal] || this.strategies['hypertrophy'];
        
        let schedule = {};
        if (daysCount === 3) {
             schedule = { 1: { title: "Full Body A", type: "FB_A" }, 3: { title: "Full Body B", type: "FB_B" }, 5: { title: "Full Body A", type: "FB_A" } };
        } else if (daysCount === 4) {
             schedule = { 1: { title: "Upper A", type: "UPPER_A" }, 2: { title: "Lower A", type: "LOWER_A" }, 4: { title: "Upper B", type: "UPPER_B" }, 5: { title: "Lower B", type: "LOWER_B" } };
        } else {
             schedule = { 1: { title: "Push Power", type: "PUSH" }, 2: { title: "Pull Power", type: "PULL" }, 3: { title: "Legs Power", type: "LEGS" }, 4: { title: "Upper Hyper", type: "UPPER_A" }, 5: { title: "Lower Hyper", type: "LOWER_B" } };
        }

        const templates = { A: {}, B: {} };
        Object.keys(schedule).forEach(dayIndex => {
            const session = schedule[dayIndex];
            templates.A[dayIndex] = { title: session.title, exercises: this.buildSession(session.type, 'A', strat, duration) };
            templates.B[dayIndex] = { title: session.title.replace('A', 'B'), exercises: this.buildSession(session.type, 'B', strat, duration) };
        });

        if(!this.state.user) this.state.user = {};
        this.state.user.duration = duration;
        this.state.customWorkouts = templates;
        this.saveDB();
        return schedule;
    },

    // --- GENERÁTOR (NEPRŮSTŘELNÁ LOGIKA) ---
   buildSession: function(type, variant, strat, duration = 'medium') {
        const exercises = [];
        const used = new Set();
        const lib = Data.library; 

        const add = (ex) => {
            if (!used.has(ex)) { exercises.push(ex); used.add(ex); }
        };

        const pick = (cat) => {
            const pool = lib[cat]; // <--- TEĎ SAHÁME DO PROMĚNNÉ 'lib', KTERÁ URČITĚ EXISTUJE
            if (!pool) return "Neznámý cvik"; 
            
            const available = pool.filter(ex => !used.has(ex));
            if (available.length === 0) return pool[0]; 
            
            const selected = available[Math.floor(Math.random() * available.length)];
            used.add(selected);
            return selected;
        };

        // SKELETONY
        if (type.includes("FB")) { 
            add(pick('legs_squat'));
            add(pick('push_compound'));
            add(pick('pull_compound'));
            add(pick('legs_hinge'));
            add(pick('core'));
            if (duration === 'long') { 
                add(pick('push_iso'));
                add(pick('pull_iso'));
            }
        } 
        else if (type.includes("UPPER")) {
            add(pick('push_compound'));
            add(pick('pull_compound'));
            add(pick('push_iso'));
            add(pick('pull_iso'));
            add(pick('core'));
            if (duration === 'long') {
                add(pick('push_compound'));
                add("Face Pulls");
            }
        }
        else if (type.includes("LOWER")) {
            add(pick('legs_squat'));
            add(pick('legs_hinge'));
            add(pick('legs_iso'));
            add(pick('core'));
            if (duration === 'long') {
                add("Výpady (Chůze)");
                add("Lýtka (Výpony)");
            }
        }
        else if (type === "PUSH") {
            add(pick('push_compound'));
            add("Tlaky jednoruček (Šikmá)"); 
            add(pick('push_iso'));
            add(pick('push_iso')); 
            if (duration === 'long') add("Upažování");
        }
        else if (type === "PULL") {
            add("Mrtvý tah (Deadlift)");
            add(pick('pull_compound'));
            add(pick('pull_iso'));
            add("Face Pulls");
            if (duration === 'long') add("Kladivové zdvihy");
        }
        else if (type === "LEGS") {
            add("Dřep (Squat)");
            add("Rumunský MT (RDL)");
            add("Leg Press");
            add(pick('legs_iso'));
            if (duration === 'long') add("Předkopávání");
        }
        else if (type === "explosive") {
            add("Přemístění (Power Clean)");
            add("Výskoky na bednu");
            add("Kettlebell Swing");
            add("Odhody medicinbalu");
            add("Skoky do dálky");
        }

        // FILTRACE PODLE ČASU
        let finalSelection = exercises;
        if (duration === 'short') {
            finalSelection = exercises.slice(0, 3);
        }

        finalSelection.forEach(ex => {
            if (!this.state.exercise_stats[ex]) {
                this.state.exercise_stats[ex] = { weight: 0, reps: strat.reps, sets: strat.sets, rpe: 'medium' };
            }
        });

        return finalSelection;
    },

    regenerateDay: function(week, day, type, duration = 'medium') {
        const goal = this.state.user.goal || 'hypertrophy';
        const strat = this.strategies[goal] || this.strategies['hypertrophy'];
        const variant = week; 

        const newExercises = this.buildSession(type, variant, strat, duration);
        
        if (!this.state.customWorkouts[week]) this.state.customWorkouts[week] = {};
        if (!this.state.customWorkouts[week][day]) this.state.customWorkouts[week][day] = {};
        
        this.state.customWorkouts[week][day].exercises = newExercises;
        
        let suffix = "";
        if (duration === 'short') suffix = " (Express)";
        if (duration === 'long') suffix = " (Volume)";
        
        this.state.customWorkouts[week][day].title = `${type.replace('_', ' ')}${suffix}`;

        this.saveDB();
    }
};

