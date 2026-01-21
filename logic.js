/* =========================================
   MODULE: LOGIC (Calculations & Processing)
   ========================================= */

const Logic = {
    currentWeekType: 'A',
    currentSchedule: [],
    forceRest: false,
    nextIdx: 0,
    tempActiveRPEs: {},
    activeEditSessionIdx: null,
    activeEditLogIdx: null,

    init: function() {
        this.calculateWeekType();
        this.startLoop();
    },

    startLoop: function() {
        this.update();
        setInterval(() => this.updateDashboard(new Date()), 1000);
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
        
        let type = this.forceRest ? 'rest' : conf.type;
        UI.updateDayBadge(type.toUpperCase());

        let evs = [];
        const supps = Data.state.supplements || { enabled: false };
        const sport = Data.state.user.sport || 'Sport';

        if (type === 'rest') {
            if (supps.enabled) {
                if (Data.state.stack) Data.state.stack.filter(s => s.timing === 'morning').forEach(s => evs.push({ time: '09:00', title: s.name, type: 'supp' }));
                evs.push({ time: '12:00', title: 'Oběd', type: 'food' });
                evs.push({ time: '20:00', title: 'Večeře', type: 'food' });
            } else {
                evs.push({ time: '--:--', title: 'Dnes volno', type: 'rest' });
            }
        } else {
            const gT = conf.gymTime;
            const fT = conf.fieldTime;

            if (supps.enabled) {
                if (Data.state.stack) Data.state.stack.filter(s => s.timing === 'morning').forEach(s => evs.push({ time: '06:00', title: s.name, type: 'supp' }));
                evs.push({ time: '06:15', title: 'Snídaně', type: 'food' });
            }

            // Gym Logic
            if (type === 'gym' || type === 'double') {
                if (supps.enabled && Data.state.stack) {
                    Data.state.stack.filter(s => s.timing === 'pre').forEach(s => evs.push({ time: this.addMin(gT, -30), title: s.name, type: 'urgent' }));
                }
                evs.push({ time: gT, title: 'GYM TRÉNINK', type: 'activity' });
                if (supps.enabled && Data.state.stack) {
                    Data.state.stack.filter(s => s.timing === 'post').forEach(s => evs.push({ time: this.addMin(gT, 90), title: s.name, type: 'supp' }));
                }
            }

            // Sport Logic
            if (type === 'training' || type === 'double') {
                evs.push({ time: fT, title: sport.toUpperCase(), type: 'activity-high' });
            }

            // Evening
            if (supps.enabled && Data.state.stack) {
                Data.state.stack.filter(s => s.timing === 'evening').forEach(s => evs.push({ time: '22:00', title: s.name, type: 'rest' }));
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

    finishWorkout: function() {
        const d = new Date().getDay();
        const w = Data.state.customWorkouts[this.currentWeekType][d];
        const t = new Date().toISOString().split('T')[0];
        const l = [];

        w.exercises.forEach((ex, i) => {
            const kg = parseFloat(document.getElementById(`kg-${i}`).value) || 0;
            const r = parseFloat(document.getElementById(`reps-${i}`).value) || 0;
            const s = parseFloat(document.getElementById(`sets-${i}`).value) || 0;
            const isNoWeight = Data.NO_WEIGHT_EXERCISES.some(x => ex.includes(x));

            if (kg > 0 || (isNoWeight && r > 0)) {
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
            Data.state.workout_history.push({ date: t, title: w.title, logs: l });
            Data.saveDB();
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