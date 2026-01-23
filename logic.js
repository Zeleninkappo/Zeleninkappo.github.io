/* =========================================
   MODULE: LOGIC (Calculations & Processing)
   ========================================= */

const Logic = {
    currentWeekType: 'A',
	currentSessionExercises: [],
    currentSchedule: [],
    forceRest: false,
    nextIdx: 0,
    tempActiveRPEs: {},
    activeEditSessionIdx: null,
    activeEditLogIdx: null,
	lastNotifiedEventIndex: -1,

    init: function() {
        this.calculateWeekType();
        this.startLoop();
    },

    startLoop: function() {
        this.update();
        setInterval(() => {
            const now = new Date();
            this.updateDashboard(now);
            this.checkNotifications(now); // <--- NOVÉ: Kontrola každou vteřinu
        }, 1000);
    },

    update: function() {
        this.calculateWeekType();
        this.updateSchedule();
        this.updateDashboard(new Date());
    },

    calculateWeekType: function() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const week = Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7);
        this.currentWeekType = (week % 2 !== 0) ? 'A' : 'B';
        UI.updateWeekBadge(this.currentWeekType);
    },

    updateSchedule: function() {
        if (!Data.state.settings || !Data.state.settings.days) return;
        const d = new Date().getDay();
        const conf = Data.state.settings.days[d] || { type: 'rest', gymTime: '14:30', fieldTime: '19:30' };
        
        // 1. Načteme časy jídel (nebo použijeme defaultní)
        const mt = (Data.state.user && Data.state.user.mealTimes) ? Data.state.user.mealTimes : { breakfast: '06:15', lunch: '12:00', dinner: '20:00' };

        let type = this.forceRest ? 'rest' : conf.type;
        UI.updateDayBadge(type.toUpperCase());

        let evs = [];
        const supps = Data.state.supplements || { enabled: false };
        const sport = Data.state.user.sport || 'Sport';

        // --- REST DAYS (Volno) ---
        if (type === 'rest') {
            if (supps.enabled && Data.state.stack) {
                // Ranní stack + DÁVKA
                Data.state.stack.filter(s => s.timing === 'morning').forEach(s => 
                    evs.push({ time: '09:00', title: `${s.name} (${s.dose})`, type: 'supp' })
                );
            }
            // Jídlo - VLASTNÍ ČASY
            evs.push({ time: mt.lunch, title: 'Oběd', type: 'food' });
            evs.push({ time: mt.dinner, title: 'Večeře', type: 'food' });
        } 
        // --- TRAINING DAYS (Trénink) ---
        else {
            const gT = conf.gymTime;
            const fT = conf.fieldTime;

            if (supps.enabled && Data.state.stack) {
                Data.state.stack.filter(s => s.timing === 'morning').forEach(s => 
                    evs.push({ time: '06:00', title: `${s.name} (${s.dose})`, type: 'supp' })
                );
            }
            // Snídaně - VLASTNÍ ČAS
            evs.push({ time: mt.breakfast, title: 'Snídaně', type: 'food' });
            // Oběd a Večeře i v tréninkový den
            evs.push({ time: mt.lunch, title: 'Oběd', type: 'food' });
            evs.push({ time: mt.dinner, title: 'Večeře', type: 'food' });

            // Gym Logic
            if (type === 'gym' || type === 'double') {
                if (supps.enabled && Data.state.stack) {
                    Data.state.stack.filter(s => s.timing === 'pre').forEach(s => 
                        evs.push({ time: this.addMin(gT, -30), title: `${s.name} (${s.dose})`, type: 'urgent' })
                    );
                }
                evs.push({ time: gT, title: 'GYM TRÉNINK', type: 'activity' });
                if (supps.enabled && Data.state.stack) {
                    Data.state.stack.filter(s => s.timing === 'post').forEach(s => 
                        evs.push({ time: this.addMin(gT, 90), title: `${s.name} (${s.dose})`, type: 'supp' })
                    );
                }
            }

            // Sport Logic
            if (type === 'training' || type === 'double') {
                evs.push({ time: fT, title: sport.toUpperCase(), type: 'activity-high' });
            }

            // Evening
            if (supps.enabled && Data.state.stack) {
                Data.state.stack.filter(s => s.timing === 'evening').forEach(s => 
                    evs.push({ time: '22:00', title: `${s.name} (${s.dose})`, type: 'rest' })
                );
            }
        }

        evs.sort((a, b) => a.time === '--:--' ? 0 : a.time.localeCompare(b.time));
        this.currentSchedule = evs;
        UI.renderTimeline(evs);
    },

    updateDashboard: function(now) {
        UI.updateLiveTime(now);
        
        const mins = now.getHours() * 60 + now.getMinutes();
        const today = now.toISOString().split('T')[0];
        const done = Data.state.completed_tasks[today] || [];
        
        let f = -1;
        for (let i = 0; i < this.currentSchedule.length; i++) {
            const ev = this.currentSchedule[i];
            if (ev.time === '--:--') continue;
            const [h, m] = ev.time.split(':').map(Number);
            if (((h * 60 + m > mins) || (h * 60 + m <= mins && mins - (h * 60 + m) < 60)) && !done.includes(i)) {
                f = i;
                break;
            }
        }
        
        this.nextIdx = f;
        UI.renderActionCard(f, this.currentSchedule[f], mins, now);
    },

	checkNotifications: function(now) {
        if (Notification.permission !== "granted") return;

        const currentMins = now.getHours() * 60 + now.getMinutes();
        
        this.currentSchedule.forEach((ev, i) => {
            if (ev.time === '--:--') return;
            
            const [h, m] = ev.time.split(':').map(Number);
            const eventMins = h * 60 + m;
            const diff = eventMins - currentMins;

            // Upozornit 10 minut předem (a jen jednou pro danou událost)
            // Podmínka: Je to za 10 min A ZÁROVEŇ jsme tuto událost (i) ještě neohlásili
            if (diff === 10 && this.lastNotifiedEventIndex !== i) {
                
                this.lastNotifiedEventIndex = i; // Označíme jako ohlášené
                
                let body = `Za 10 minut: ${ev.title}`;
                if (ev.type === 'food') body = `🍽️ Nezapomeň se najíst: ${ev.title}`;
                if (ev.type === 'activity') body = `🏋️ Připrav se! Trénink za 10 min.`;
                if (ev.type === 'supp') body = `💊 Čas na suplementy: ${ev.title}`;

                try {
                    new Notification("Zelix Reminder", { body: body, icon: "icon-192.png", vibrate: [200, 100, 200] });
                } catch(e) { console.log("Notify error", e); }
            }
        });
        
    },

    addMin: function(t, m) {
        if(!t) return "--:--";
        const [hh, mm] = t.split(':').map(Number);
        const d = new Date(); d.setHours(hh); d.setMinutes(mm + m);
        return d.toLocaleTimeString('cs-CZ', {hour:'2-digit', minute:'2-digit'});
    },

    toggleForceRest: function() {
        this.forceRest = !this.forceRest;
        UI.toggleForceRestBtn(this.forceRest);
        this.update();
    },

    confirmAction: function() {
        const t = new Date().toISOString().split('T')[0];
        if (!Data.state.completed_tasks[t]) Data.state.completed_tasks[t] = [];
        Data.state.completed_tasks[t].push(this.nextIdx);
        Data.saveDB();
        this.update();
    },

    toggleTask: function(i) {
        const t = new Date().toISOString().split('T')[0];
        if (!Data.state.completed_tasks[t]) Data.state.completed_tasks[t] = [];
        const idx = Data.state.completed_tasks[t].indexOf(i);
        if (idx === -1) Data.state.completed_tasks[t].push(i);
        else Data.state.completed_tasks[t].splice(idx, 1);
        Data.saveDB();
        this.update();
    },
    
    setRPE: function(ex, rpe, i, btn) {
        // 1. Uložíme hodnotu do dočasného stavu
        this.tempActiveRPEs[ex] = rpe;

        // 2. Vizuální feedback (přepínání tříd na tlačítkách)
        const parent = btn.parentElement;
        // Odstraníme selected třídy ze všech sourozenců
        Array.from(parent.children).forEach(b => {
            b.classList.remove('selected-easy', 'selected-medium', 'selected-hard');
        });
        // Přidáme správnou barvu aktuálnímu tlačítku
        btn.classList.add(`selected-${rpe}`);
		this.saveWorkoutDraft();
		
    },

    // Workout Logic
    checkWorkoutEntry: function() {
        if (this.forceRest) { alert("Režim volna."); return; }
        const today = new Date().toISOString().split('T')[0];
        if (Data.state.workout_history.some(h => h.date === today)) {
            UI.openDuplicateModal();
        } else {
            this.forceOpenWorkout();
        }
    },

    forceOpenWorkout: function() {
        UI.closeDuplicateModal();
        // Safety check for week type
        if (!this.currentWeekType) this.calculateWeekType();
        
        const d = new Date().getDay();
        const w = Data.state.customWorkouts[this.currentWeekType][d];
        
        this.tempActiveRPEs = {};
        UI.openWorkoutModal(w, Data.state.exercise_stats, Data.state.workout_history);
    },

	// --- AUTOSAVE SYSTEM ---
    saveWorkoutDraft: function() {
        if (!this.currentSessionExercises || this.currentSessionExercises.length === 0) return;
        
        const draft = {};
        this.currentSessionExercises.forEach((ex, i) => {
            const kg = document.getElementById(`kg-${i}`).value;
            const reps = document.getElementById(`reps-${i}`).value;
            const sets = document.getElementById(`sets-${i}`).value;
            const rpe = this.tempActiveRPEs[ex] || null;

            // Uložíme jen pokud je alespoň něco vyplněno
            if (kg || reps || sets || rpe) {
                draft[ex] = { kg, reps, sets, rpe };
            }
        });
		const note = document.getElementById('workout-note').value;
        if (note) draft._note = note;
		
        localStorage.setItem('ZELIX_WORKOUT_DRAFT', JSON.stringify(draft));
    },

	// --- 1RM CALCULATOR ---
    handleInput: function(i) {
        this.saveWorkoutDraft();


        this.update1RM(i);
    },

    update1RM: function(i) {
        const kgInput = document.getElementById(`kg-${i}`);
        const repsInput = document.getElementById(`reps-${i}`);
        const el = document.getElementById(`orm-${i}`);

        if (!kgInput || !repsInput || !el) return;

        const kg = parseFloat(kgInput.value) || 0;
        const reps = parseFloat(repsInput.value) || 0;

        if (kg > 0 && reps > 0) {
            // Epley Formula: w * (1 + r/30)
            const oneRm = Math.round(kg * (1 + reps/30));
            // Zobrazíme jen pokud je 1RM odlišné od pracovní váhy (např. při 1 opakování je to stejné)
            if (reps > 1) {
                el.innerText = `Est. 1RM: ${oneRm}kg`;
            } else {
                el.innerText = ''; // U jedniček 1RM nezobrazujeme (je to ta váha)
            }
        } else {
            el.innerText = '';
        }
    },

	saveBodyweight: function() {
        const val = parseFloat(document.getElementById('new-bodyweight').value);
        if (!val || val <= 0) return;

        const today = new Date().toISOString().split('T')[0];
        
        // Inicializace pole, pokud neexistuje
        if (!Data.state.bodyweight_history) Data.state.bodyweight_history = [];

        // Pokud už dnes záznam je, přepíšeme ho (vymažeme starý pro dnešek)
        Data.state.bodyweight_history = Data.state.bodyweight_history.filter(x => x.date !== today);
        
        // Přidáme nový
        Data.state.bodyweight_history.push({ date: today, kg: val });
        
        // Seřadíme podle data (pro jistotu)
        Data.state.bodyweight_history.sort((a,b) => new Date(a.date) - new Date(b.date));

        Data.saveDB();
        UI.closeWeightModal();
        
        // Pokud je zrovna zobrazen graf váhy, aktualizujeme ho
        const chartSel = document.getElementById('chart-select');
        if (chartSel && chartSel.value === 'Bodyweight') {
            UI.updateChart('Bodyweight');
        }
    },

    clearWorkoutDraft: function() {
        localStorage.removeItem('ZELIX_WORKOUT_DRAFT');
        this.tempActiveRPEs = {};
    },

    finishWorkout: function() {
        const d = new Date().getDay();
        const w = Data.state.customWorkouts[this.currentWeekType][d];
        const t = new Date().toISOString().split('T')[0];
        const l = [];
		const noteVal = document.getElementById('workout-note').value.trim();

        w.exercises.forEach((ex, i) => {
            const kg = parseFloat(document.getElementById(`kg-${i}`).value) || 0;
            const r = parseFloat(document.getElementById(`reps-${i}`).value) || 0;
            const s = parseFloat(document.getElementById(`sets-${i}`).value) || 0;
            const isNoWeight = Data.isNoWeight(ex); 

            if (r > 0) {
                let nKg = kg;
                const rpe = this.tempActiveRPEs[ex] || 'medium';
                if (!isNoWeight) {
                    if (rpe === 'easy') nKg += 2.5;
                    else if (rpe === 'medium') nKg += 1.25;
                }
                l.push({ ex: ex, kg: kg, reps: r, sets: s, rpe: rpe });
                Data.state.exercise_stats[ex] = { weight: Math.round(nKg * 2) / 2, reps: r, sets: s, rpe: rpe };
            }
        });

        if (l.length > 0) {
            Data.state.workout_history.push({ date: t, title: w.title, logs: l, note: noteVal});
            Data.saveDB();
			this.clearWorkoutDraft();
            UI.closeWorkoutModal();
            UI.populateChartSelect();
            UI.updateChart(l[0].ex);
            this.update();
        } else {
            alert("Vyplň alespoň jeden cvik.");
        }
    },

    // Entry Manager Logic
    saveEntryEdit: function() {
        if (this.activeEditSessionIdx === null) return;
        const kg = parseFloat(document.getElementById('mgr-kg').value) || 0;
        const r = parseFloat(document.getElementById('mgr-reps').value) || 0;
        const s = parseFloat(document.getElementById('mgr-sets').value) || 0;
        const rp = document.getElementById('mgr-rpe-cont').dataset.selected;
        
        const l = Data.state.workout_history[this.activeEditSessionIdx].logs[this.activeEditLogIdx];
        l.kg = kg; l.reps = r; l.sets = s; l.rpe = rp;
        
        const ex = l.ex;
        Data.state.exercise_stats[ex] = { weight: kg, reps: r, sets: s, rpe: rp };
        
        Data.saveDB();
        UI.closeEntryManager();
        UI.openHistoryModal();
        UI.populateChartSelect();
        UI.updateChart(ex);
    },

    deleteEntry: function() {
        if (this.activeEditSessionIdx === null) return;
        Data.state.workout_history[this.activeEditSessionIdx].logs.splice(this.activeEditLogIdx, 1);
        if (Data.state.workout_history[this.activeEditSessionIdx].logs.length === 0) {
            Data.state.workout_history.splice(this.activeEditSessionIdx, 1);
        }
        Data.saveDB();
        UI.closeEntryManager();
        UI.openHistoryModal();
        this.update();
    },
	executeSessionDelete: function() {
        if (this.activeEditSessionIdx === null) return;
        const dateToRemove = Data.state.workout_history[this.activeEditSessionIdx].date;
        Data.state.workout_history.splice(this.activeEditSessionIdx, 1);
        if (Data.state.completed_tasks[dateToRemove]) {
            delete Data.state.completed_tasks[dateToRemove];
        }

        Data.saveDB();

        UI.closeSessionDeleteModal();
        UI.openHistoryModal(); 
        this.update();
    },


};








