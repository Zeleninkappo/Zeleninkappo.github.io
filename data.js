/* =========================================
   MODULE: DATA & BLUEPRINTS
   ========================================= */

const Data = {
    DB_KEY: 'ZELIX_DB_V050',
    
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
        bodyweight_history: [],
        userNoWeight: [],
        user: { name: 'Sportovec', sport: 'Sport', goal: 'hypertrophy' }, 
        settings: { theme: 'auto', days: {} }, 
        stack: [], 
        supplements: { enabled: true }, 
        completed_tasks: {}, 
        workout_history: [], 
        exercise_stats: {}, 
        customWorkouts: { A: {}, B: {} } // Will be generated
    },

    init: function() {
        this.loadDB();
        Logic.init();
        UI.init();
    },
    
    isNoWeight: function(ex) {
        const sys = ["Plank", "Box Jumps", "Burpees", "Ab Wheel", "Pull Ups", "Chin Ups", "Dips"].some(x => ex.includes(x));
        const usr = this.state.userNoWeight && this.state.userNoWeight.includes(ex);
        return sys || usr;
    },

    loadDB: function() {
        let src = localStorage.getItem(this.DB_KEY);
        // Fallback pro migraci
        if(!src) src = localStorage.getItem('ZELIX_DB_V030'); 
        
        if (src) {
            try {
                let parsed = JSON.parse(src);
                this.state = { ...this.state, ...parsed };
                if (!this.state.customWorkouts) this.state.customWorkouts = { A: {}, B: {} };
                this.saveDB();
            } catch (e) { console.warn("DB Corruption"); }
        }
    },

    saveDB: function() { localStorage.setItem(this.DB_KEY, JSON.stringify(this.state)); },
    hardReset: function() { localStorage.clear(); location.reload(); },
    
    exportData: function() {
        const a = document.createElement('a');
        a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state));
        a.download = `zelix_backup.json`;
        a.click();
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
        // 1. Uložení User Info
        const name = document.getElementById('setup-name').value;
        const sport = document.getElementById('setup-sport').value;
        if(name) this.state.user.name = name;
        if(sport) this.state.user.sport = sport;

        // 2. Uložení Časů Jídel
        const tB = document.getElementById('setup-time-breakfast').value;
        const tL = document.getElementById('setup-time-lunch').value;
        const tD = document.getElementById('setup-time-dinner').value;
        this.state.user.mealTimes = { breakfast: tB, lunch: tL, dinner: tD };

        // 3. Uložení Stacku (Supplements toggle)
        const suppsEn = document.getElementById('setup-supps-enabled').checked;
        if(!this.state.supplements) this.state.supplements = {};
        this.state.supplements.enabled = suppsEn;

        // 4. Uložení Rozvrhu (Timeline)
        const days = {};
        for(let i=0; i<7; i++) {
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
        UI.vibrate([50,50]);
    }, 

    // --- MEGA GENERATOR 3000 ---
    // Toto je funkce, která "uvaří" trénink na míru
    generateProgram: function(goal, daysCount) {
        console.log(`Generuji program: ${goal} na ${daysCount} dní.`);
        const strat = this.strategies[goal] || this.strategies['hypertrophy'];
        const lib = this.library;
        
        // Pomocná funkce pro výběr cviků (aby se neopakovaly)
        const pick = (category, count) => {
            let pool = lib[category] || [];
            // Pokud je cíl "explosive", mícháme tam explozivní cviky
            if (goal === 'explosive' && Math.random() > 0.5) pool = [...pool, ...lib.explosive];
            // Shuffle
            pool = pool.sort(() => 0.5 - Math.random());
            return pool.slice(0, count);
        };

        // Definice struktur (Splity)
        let schedule = {};

        if (daysCount === 3) {
            // 3 DNY = FULL BODY A / B (Střídání)
            // Day 1 (Mon), Day 3 (Wed), Day 5 (Fri)
            schedule = {
                1: { title: "Full Body A", type: "FB_A" },
                3: { title: "Full Body B", type: "FB_B" },
                5: { title: "Full Body A", type: "FB_A" } // V dalším týdnu se to otočí díky logice A/B týdnů
            };
        } else if (daysCount === 4) {
            // 4 DNY = UPPER / LOWER
            schedule = {
                1: { title: "Upper A", type: "UPPER_A" },
                2: { title: "Lower A", type: "LOWER_A" },
                4: { title: "Upper B", type: "UPPER_B" },
                5: { title: "Lower B", type: "LOWER_B" }
            };
        } else {
            // 5 DNÍ = HYBRID PPL + UPPER/LOWER (Maximální pokrytí)
            schedule = {
                1: { title: "Push Power", type: "PUSH" },
                2: { title: "Pull Power", type: "PULL" },
                3: { title: "Legs Power", type: "LEGS" },
                4: { title: "Upper Hyper", type: "UPPER_A" },
                5: { title: "Lower Hyper", type: "LOWER_A" }
            };
        }

        // Generování obsahu (A i B verze pro variabilitu)
        const templates = {
            A: {}, B: {}
        };

        // Naplnění dní cviky
        Object.keys(schedule).forEach(dayIndex => {
            const session = schedule[dayIndex];
            const type = session.type;
            
            // Generujeme A verzi
            templates.A[dayIndex] = {
                title: session.title,
                exercises: this.buildSession(type, 'A', strat)
            };
            
            // Generujeme B verzi (jiné cviky)
            templates.B[dayIndex] = {
                title: session.title.replace('A', 'B'), // Malý hack pro název
                exercises: this.buildSession(type, 'B', strat)
            };
        });

        // Uložení do State
        this.state.customWorkouts = templates;
        this.saveDB();
        return schedule; // Vracíme rozvrh pro nastavení timeline
    },

    buildSession: function(type, variant, strat) {
        const exercises = [];
        const pick = (cat, n) => {
            const pool = this.library[cat];
            // Jednoduchý hash pro deterministický výběr (aby A bylo vždy stejné, ale B jiné)
            const seed = variant === 'A' ? 0 : 1; 
            // Posuneme pole a vezmeme
            return pool[(seed + Math.floor(Math.random()*pool.length)) % pool.length];
        };

        // SKELETONY TRÉNINKŮ
        if (type.includes("FB")) { // Full Body
            exercises.push(pick('legs_squat', 1));
            exercises.push(pick('push_compound', 1));
            exercises.push(pick('pull_compound', 1));
            exercises.push(pick('legs_hinge', 1));
            exercises.push(pick('core', 1));
        } 
        else if (type.includes("UPPER")) {
            exercises.push(pick('push_compound', 1));
            exercises.push(pick('pull_compound', 1));
            exercises.push(pick('push_iso', 1));
            exercises.push(pick('pull_iso', 1));
            exercises.push(pick('core', 1));
        }
        else if (type.includes("LOWER")) {
            exercises.push(pick('legs_squat', 1));
            exercises.push(pick('legs_hinge', 1));
            exercises.push(pick('legs_iso', 1));
            exercises.push(pick('core', 1));
        }
        else if (type === "PUSH") {
            exercises.push(pick('push_compound', 1));
            exercises.push("Incline DB Press"); // Hardcoded popular
            exercises.push(pick('push_iso', 1));
            exercises.push(pick('push_iso', 1));
        }
        else if (type === "PULL") {
            exercises.push("Deadlift");
            exercises.push(pick('pull_compound', 1));
            exercises.push(pick('pull_iso', 1));
            exercises.push("Face Pulls");
        }
        else if (type === "LEGS") {
            exercises.push("Squat");
            exercises.push("RDL (Romanian DL)");
            exercises.push("Leg Press");
            exercises.push(pick('legs_iso', 1));
        }
       else if (type === "explosive") {
            exercises.push("Power Clean");
            exercises.push("Box Jumps");
            exercises.push("Kettlebell Swing");
            exercises.push("MedBall Slam");
            exercises.push("Broad Jumps");
        }

        // Aplikujeme statistiky (reps/sets) podle cíle hned teď
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

   regenerateDay: function(week, day, type) {
        const goal = this.state.user.goal || 'hypertrophy';
        const strat = this.strategies[goal] || this.strategies['hypertrophy'];
        
        // 1. Zjistíme variantu (A nebo B) podle týdne
        // Týden A = variant 'A', Týden B = variant 'B'
        const variant = week; 

        // 2. Vygenerujeme cviky
        const newExercises = this.buildSession(type, variant, strat);
        
        // 3. Uložíme do DB
        if (!this.state.customWorkouts[week]) this.state.customWorkouts[week] = {};
        if (!this.state.customWorkouts[week][day]) this.state.customWorkouts[week][day] = {};
        
        this.state.customWorkouts[week][day].exercises = newExercises;
        
        // Nastavíme i titulek, pokud chybí
       this.state.customWorkouts[week][day].title = `${type.replace('_', ' ')} (${variant})`;

        this.saveDB();
    }
};
 






