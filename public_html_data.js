/* =========================================
   MODULE: DATA (State & Persistence)
   ========================================= */

const Data = {
    DB_KEY: 'ZELIX_DB_V030',
    
    // Default Data
    NO_WEIGHT_EXERCISES: ["Plank", "Russian Twists", "Hanging Leg Raises", "Box Jumps", "Burpees", "Ab Wheel", "Strečink", "Procházka", "Sauna"],

    defaultA: { 
        1: { title: "Upper Power A", exercises: ["Bench Press", "Barbell Row", "Military Press", "Dips", "Face Pulls", "Biceps Barbell Curl"] }, 
        2: { title: "Lower Hyper A", exercises: ["Squat", "RDL", "Leg Press", "Leg Extension", "Calf Raise", "Plank"] }, 
        3: { title: "Core & Mobility", exercises: ["Plank (Weighted)", "Russian Twists", "Hanging Leg Raises", "Cat-Camel", "Bird-Dog", "Foam Rolling"] }, 
        4: { title: "Full Body Explosive A", exercises: ["Power Clean", "Box Jumps", "Push Press", "Kettlebell Swing", "MedBall Slam", "Pull Ups"] }, 
        5: { title: "Upper Pump A", exercises: ["Incline DB Press", "Lat Pulldown", "Lateral Raises", "Triceps Pushdown", "Hammer Curls", "Rear Delt Fly"] }, 
        6: { title: "Legs Power (Sat)", exercises: ["Front Squat", "Bulgarian Split Squat", "Nordic Hamstring Curl", "Seated Calf Raise", "Ab Wheel"] }, 
        0: { title: "Arms & Abs (Sun)", exercises: ["Close Grip Bench", "Preacher Curl", "Skullcrushers", "Concentration Curl", "Leg Raises"] } 
    },

    defaultB: { 
        1: { title: "Upper Power B", exercises: ["Bench Press", "Pull Ups", "Seated DB Press", "Skullcrushers", "Upright Row", "Incline Curl"] }, 
        2: { title: "Lower Hyper B", exercises: ["Squat", "Lunges", "Hack Squat", "Leg Curl", "Seated Calf Raise", "Ab Wheel"] }, 
        3: { title: "Core & Mobility", exercises: ["Side Plank", "Woodchopper", "Leg Raises", "Cobra Stretch", "Hip Stretch", "Foam Rolling"] }, 
        4: { title: "Full Body Explosive B", exercises: ["Deadlift", "Broad Jumps", "Landmine Press", "One Arm KB Swing", "Plyo Push Ups", "Chin Ups"] }, 
        5: { title: "Upper Pump B", exercises: ["Dips", "Seated Row", "Front Raises", "Overhead Triceps", "Preacher Curl", "Face Pulls"] }, 
        6: { title: "Posterior Chain (Sat)", exercises: ["Deadlift", "Hip Thrust", "Good Mornings", "Glute Ham Raise", "Farmers Walk"] }, 
        0: { title: "Grip & Neck (Sun)", exercises: ["Shrugs", "Plate Pinch", "Neck Flexion", "Reverse Curl", "Wrist Curl"] } 
    },

    // Current State
    state: { 
        version: '0.3.0', 
        user: { name: 'Sportovec', sport: 'Sport' }, 
        settings: { theme: 'dark', days: {} }, 
        stack: [], 
        supplements: { enabled: true }, 
        completed_tasks: {}, 
        workout_history: [], 
        exercise_stats: {}, 
        customWorkouts: null // loaded later
    },

    init: function() {
        this.loadDB();
        Data.state.customWorkouts = Data.state.customWorkouts || { A: this.defaultA, B: this.defaultB };
        Logic.init();
        UI.init();
    },

    loadDB: function() {
        let src = localStorage.getItem(this.DB_KEY);
        // Fallback for migration
        if(!src) src = localStorage.getItem('ZELIX_DB_V024') || localStorage.getItem('ZELIX_DB_V023');
        
        if (src) {
            try {
                let parsed = JSON.parse(src);
                // Safe merge
                this.state = { ...this.state, ...parsed };
                // Ensure array structures
                if (!this.state.stack) this.state.stack = [];
                if (!this.state.workout_history) this.state.workout_history = [];
                this.saveDB();
            } catch (e) {
                console.warn("DB Corruption, using defaults");
            }
        }
    },

    saveDB: function() {
        localStorage.setItem(this.DB_KEY, JSON.stringify(this.state));
    },

    hardReset: function() {
        localStorage.clear();
        location.reload();
    },

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

    saveSetup: function() {
        if(!this.state.user) this.state.user={}; 
        const nameEl = document.getElementById('setup-name');
        if(nameEl) this.state.user.name = nameEl.value;
        const sportEl = document.getElementById('setup-sport');
        if(sportEl) this.state.user.sport = sportEl.value;
        
        if(!this.state.settings) this.state.settings={days:{}}; 
        const days = {}; 
        for(let i=0; i<7; i++) { 
            const type = document.getElementById(`s-type-${i}`).value;
            const gym = document.getElementById(`s-gym-${i}`).value;
            const field = document.getElementById(`s-field-${i}`).value;
            days[i] = { type, gymTime: gym, fieldTime: field }; 
        } 
        this.state.settings.days = days;
        
        if(!this.state.supplements) this.state.supplements={}; 
        this.state.supplements.enabled = document.getElementById('setup-supps-enabled').checked;
        
        this.saveDB(); 
        UI.updateUserGreeting();
        UI.closeSetupModal(); 
        Logic.update();
    },

    setTheme: function(mode) {
        if(!this.state.settings) this.state.settings={};
        this.state.settings.theme = mode;
        this.saveDB();
        UI.applyTheme();
    }
};