/* =========================================
   MODULE: LOGIC (Calculations & Processing)
   ========================================= */

const Logic = {
    currentWeekType: 'A',
    currentSessionExercises: [],
    currentSchedule: [],
    activeWorkoutDayIdx: null,
    forceRest: false,
    nextIdx: 0,
    tempActiveRPEs: {},
    activeEditSessionIdx: null,
    activeEditLogIdx: null,

    notifiedEvents: [],
    lastCheckDate: null,
    _loopHandle: null,

    // --- REST TIMER STATE ---
    restTimer: { remaining: 0, total: 0, handle: null, running: false },

    init: function () {
        const today = new Date().toISOString().split('T')[0];
        this.forceRest = (Data.state.forceRest === today);
        if (!this.forceRest && Data.state.forceRest !== null) {
            Data.state.forceRest = null;
            Data.saveDB();
        }

        UI.toggleForceRestBtn(this.forceRest);
        this.calculateWeekType();
        this.startLoop();
        setTimeout(() => this.checkBackupFreshness(), 2000);
    },

    startLoop: function () {
        this.update();
        if (this._loopHandle) clearInterval(this._loopHandle);
        // 1s tick - hodiny a odpočet teď reagují plynule (dřív 5s = "trhaný" pocit).
        // Náklad je zanedbatelný (jen textové updaty), notifikace se kontrolují ve stejném tiku.
        this._loopHandle = setInterval(() => {
            const now = new Date();
            this.updateDashboard(now);
            this.checkNotifications(now);
        }, 1000);
    },

    update: function () {
        this.calculateWeekType();
        this.updateSchedule();
        this.updateDashboard(new Date());
        UI.updateStreakBadge();
    },

    calculateWeekType: function () {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const week = Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7);
        this.currentWeekType = (week % 2 !== 0) ? 'A' : 'B';
        UI.updateWeekBadge(this.currentWeekType);
    },

    updateSchedule: function () {
        if (!Data.state.settings || !Data.state.settings.days) return;
        const d = new Date().getDay();
        const conf = Data.state.settings.days[d] || { type: 'rest', gymTime: '14:30', fieldTime: '19:30' };

        const mt = (Data.state.user && Data.state.user.mealTimes) ? Data.state.user.mealTimes : { breakfast: '06:15', lunch: '12:00', dinner: '20:00' };

        let type = this.forceRest ? 'rest' : conf.type;
        UI.updateDayBadge(type.toUpperCase());

        let evs = [];
        const supps = Data.state.supplements || { enabled: false };
        const sport = Data.state.user.sport || 'Sport';

        // --- REST DAYS ---
        if (type === 'rest') {
            if (supps.enabled && Data.state.stack) {
                Data.state.stack.filter(s => s.timing === 'morning').forEach(s =>
                    evs.push({ time: '09:00', title: `${s.name} (${s.dose})`, type: 'supp' })
                );
            }
            evs.push({ time: mt.breakfast, title: 'Snídaně', type: 'food' });
            evs.push({ time: mt.lunch, title: 'Oběd', type: 'food' });
            evs.push({ time: mt.dinner, title: 'Večeře', type: 'food' });
        }
        // --- TRAINING DAYS ---
        else {
            const gT = conf.gymTime;
            const fT = conf.fieldTime;

            if (supps.enabled && Data.state.stack) {
                Data.state.stack.filter(s => s.timing === 'morning').forEach(s =>
                    evs.push({ time: '06:00', title: `${s.name} (${s.dose})`, type: 'supp' })
                );
            }
            evs.push({ time: mt.breakfast, title: 'Snídaně', type: 'food' });
            evs.push({ time: mt.lunch, title: 'Oběd', type: 'food' });
            evs.push({ time: mt.dinner, title: 'Večeře', type: 'food' });

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

            if (type === 'training' || type === 'double') {
                evs.push({ time: fT, title: sport.toUpperCase(), type: 'activity-high' });
            }

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

    updateDashboard: function (now) {
        UI.updateLiveTime(now);

        const mins = now.getHours() * 60 + now.getMinutes();
        const today = now.toISOString().split('T')[0];
        const done = Data.state.completed_tasks[today] || [];

        let f = -1;
        for (let i = 0; i < this.currentSchedule.length; i++) {
            const ev = this.currentSchedule[i];
            if (ev.time === '--:--') continue;

            const taskId = `${ev.time}|${ev.title}`;

            const [h, m] = ev.time.split(':').map(Number);
            const evMins = h * 60 + m;

            if (((evMins > mins) || (evMins <= mins && mins - evMins < 60)) && !done.includes(taskId)) {
                f = i;
                break;
            }
        }

        this.nextIdx = f;
        if (f !== -1) UI.renderActionCard(f, this.currentSchedule[f], mins, now);
        else UI.renderActionCard(-1, null, mins, now);
    },

    checkNotifications: function (now) {
        // Guard: prostředí bez Notification API (starší WebView, iframe bez oprávnění) by jinak vyhodilo ReferenceError a spadl by celý interval.
        if (typeof Notification === 'undefined' || Notification.permission !== "granted") return;

        const todayStr = now.toDateString();
        if (this.lastCheckDate !== todayStr) {
            this.notifiedEvents = [];
            this.lastCheckDate = todayStr;
        }

        const currentMins = now.getHours() * 60 + now.getMinutes();

        this.currentSchedule.forEach((ev, i) => {
            if (ev.time === '--:--') return;

            const [h, m] = ev.time.split(':').map(Number);
            const eventMins = h * 60 + m;
            const diff = eventMins - currentMins;

            if (diff <= 10 && diff > 8 && !this.notifiedEvents.includes(i)) {

                this.notifiedEvents.push(i);

                let body = `Za 10 minut: ${ev.title}`;
                if (ev.type === 'food') body = `🍽️ Nezapomeň se najíst: ${ev.title}`;
                if (ev.type === 'activity') body = `🏋️ Připrav se! Trénink za 10 min.`;
                if (ev.type === 'supp') body = `💊 Čas na suplementy: ${ev.title}`;

                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(function (registration) {
                        registration.showNotification("Zelix Reminder", {
                            body: body,
                            icon: "icon-192.png",
                            vibrate: [200, 100, 200],
                            tag: `zelix-evt-${i}`,
                            renotify: true
                        }).catch(() => { /* notifikace tiše selhala, appka dál běží */ });
                    });
                } else {
                    try { new Notification("Zelix Reminder", { body: body, icon: "icon-192.png" }); } catch (e) { /* noop */ }
                }
            }
        });
    },

    addMin: function (t, m) {
        if (!t) return "--:--";
        const [hh, mm] = t.split(':').map(Number);
        const d = new Date(); d.setHours(hh); d.setMinutes(mm + m);
        return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    },

    toggleForceRest: function () {
        const today = new Date().toISOString().split('T')[0];

        if (this.forceRest) {
            this.forceRest = false;
            Data.state.forceRest = null;
        } else {
            this.forceRest = true;
            Data.state.forceRest = today;
        }

        Data.saveDB();
        UI.toggleForceRestBtn(this.forceRest);
        this.update();
    },

    confirmAction: function () {
        UI.vibrate(80);
        const t = new Date().toISOString().split('T')[0];
        if (!Data.state.completed_tasks[t]) Data.state.completed_tasks[t] = [];

        const ev = this.currentSchedule[this.nextIdx];
        if (ev) {
            const taskId = `${ev.time}|${ev.title}`;
            if (!Data.state.completed_tasks[t].includes(taskId)) {
                Data.state.completed_tasks[t].push(taskId);
            }
            Data.saveDB();
            this.update();
        }
    },

    toggleTask: function (i) {
        UI.vibrate(20);
        const t = new Date().toISOString().split('T')[0];
        if (!Data.state.completed_tasks[t]) Data.state.completed_tasks[t] = [];

        const ev = this.currentSchedule[i];
        if (!ev) return;

        const taskId = `${ev.time}|${ev.title}`;
        const idx = Data.state.completed_tasks[t].indexOf(taskId);

        if (idx === -1) Data.state.completed_tasks[t].push(taskId);
        else Data.state.completed_tasks[t].splice(idx, 1);

        Data.saveDB();
        this.update();
    },

    setRPE: function (ex, rpe, i, btn) {
        UI.vibrate(30);
        this.tempActiveRPEs[ex] = rpe;
        const parent = btn.parentElement;
        Array.from(parent.children).forEach(b => {
            b.classList.remove('selected-easy', 'selected-medium', 'selected-hard');
        });
        btn.classList.add(`selected-${rpe}`);
        this.saveWorkoutDraft();
        // Po zaznamenání série automaticky nastartuj odpočinkový časovač -
        // přesně tolik, kolik odpovídá aktuální tréninkové strategii (cíli).
        this.startRestTimer(Data.getRestSeconds());
    },

    // --- REST TIMER ---
    startRestTimer: function (seconds) {
        if (this.restTimer.handle) clearInterval(this.restTimer.handle);
        this.restTimer.total = seconds;
        this.restTimer.remaining = seconds;
        this.restTimer.running = true;
        UI.renderRestTimer(this.restTimer);

        this.restTimer.handle = setInterval(() => {
            this.restTimer.remaining--;
            if (this.restTimer.remaining <= 0) {
                clearInterval(this.restTimer.handle);
                this.restTimer.handle = null;
                this.restTimer.running = false;
                UI.vibrate([150, 80, 150, 80, 250]);
                UI.renderRestTimer(this.restTimer, true);
                return;
            }
            UI.renderRestTimer(this.restTimer);
        }, 1000);
    },

    adjustRestTimer: function (deltaSeconds) {
        if (!this.restTimer.total) return;
        this.restTimer.remaining = Math.max(0, this.restTimer.remaining + deltaSeconds);
        this.restTimer.total = Math.max(this.restTimer.total, this.restTimer.remaining);
        UI.renderRestTimer(this.restTimer);
        UI.vibrate(15);
    },

    stopRestTimer: function () {
        if (this.restTimer.handle) clearInterval(this.restTimer.handle);
        this.restTimer.handle = null;
        this.restTimer.running = false;
        this.restTimer.remaining = 0;
        this.restTimer.total = 0;
        UI.renderRestTimer(this.restTimer);
    },

    // Workout Logic
    checkWorkoutEntry: function () {
        if (this.forceRest) {
            UI.openAlertModal("Režim Volna", "Máš zapnutý nucený odpočinek. Vypni ho tlačítkem 'VOLNO', pokud chceš cvičit.");
            return;
        }

        const todayStr = new Date().toISOString().split('T')[0];

        if (Data.state.workout_history.some(h => h.date === todayStr)) {
            UI.openDuplicateModal();
            return;
        }

        const todayIdx = new Date().getDay();
        const prevIdx = (todayIdx + 6) % 7;

        const d = new Date(); d.setDate(d.getDate() - 1);
        const prevDateStr = d.toISOString().split('T')[0];

        const prevSettings = (Data.state.settings && Data.state.settings.days) ? Data.state.settings.days[prevIdx] : null;

        if (prevSettings && (prevSettings.type === 'gym' || prevSettings.type === 'double') &&
            !Data.state.workout_history.some(h => h.date === prevDateStr)) {

            const missedWorkout = (Data.state.customWorkouts[this.currentWeekType] || {})[prevIdx];
            const missedTitle = Utils.escapeHtml(missedWorkout ? missedWorkout.title : "Včerejší trénink");

            UI.openConfirmModal(
                "Zameškaný trénink",
                `Včera (${prevDateStr.split('-').reverse().join('.')}) jsi měl v plánu <strong>${missedTitle}</strong>, ale záznam chybí.<br><br>Chceš to dohnat dnes?`,
                () => {
                    this.forceOpenWorkout(prevIdx);
                },
                () => {
                    this.forceOpenWorkout();
                }
            );
            return;
        }

        this.forceOpenWorkout();
    },

    forceOpenWorkout: function (overrideDayIdx = null) {
        UI.closeDuplicateModal();
        if (!this.currentWeekType) this.calculateWeekType();

        this.activeWorkoutDayIdx = overrideDayIdx !== null ? overrideDayIdx : new Date().getDay();

        const w = (Data.state.customWorkouts[this.currentWeekType] || {})[this.activeWorkoutDayIdx];

        if (!w || !Array.isArray(w.exercises)) {
            UI.openAlertModal("Chyba", "Pro tento den není definován žádný trénink. Nastav ho v Editoru cviků.");
            return;
        }

        this.tempActiveRPEs = {};
        UI.openWorkoutModal(w, Data.state.exercise_stats, Data.state.workout_history);
    },

    saveWorkoutDraft: function () {
        if (!this.currentSessionExercises || this.currentSessionExercises.length === 0) return;
        const draft = {};
        this.currentSessionExercises.forEach((ex, i) => {
            const kgEl = document.getElementById(`kg-${i}`);
            const repsEl = document.getElementById(`reps-${i}`);
            const setsEl = document.getElementById(`sets-${i}`);
            if (!kgEl || !repsEl || !setsEl) return;
            const kg = kgEl.value;
            const reps = repsEl.value;
            const sets = setsEl.value;
            const rpe = this.tempActiveRPEs[ex] || null;
            if (kg || reps || sets || rpe) {
                draft[ex] = { kg, reps, sets, rpe };
            }
        });
        const noteEl = document.getElementById('workout-note');
        const note = noteEl ? noteEl.value : '';
        if (note) draft._note = note;
        try {
            localStorage.setItem('ZELIX_WORKOUT_DRAFT', JSON.stringify(draft));
        } catch (e) {
            console.warn('Zelix: Draft se nepodařilo uložit (plné úložiště?)', e);
        }
    },

    handleInput: function (i) {
        this.saveWorkoutDraft();
        this.update1RM(i);
    },

    update1RM: function (i) {
        const kgInput = document.getElementById(`kg-${i}`);
        const repsInput = document.getElementById(`reps-${i}`);
        const el = document.getElementById(`orm-${i}`);
        if (!kgInput || !repsInput || !el) return;

        const kg = parseFloat(kgInput.value) || 0;
        const reps = parseFloat(repsInput.value) || 0;

        if (kg > 0 && reps > 0) {
            const oneRm = Math.round(kg * (1 + reps / 30));
            if (reps > 1) {
                el.innerText = `Est. 1RM: ${oneRm}kg`;
            } else {
                el.innerText = '';
            }
        } else {
            el.innerText = '';
        }
    },

    saveBodyweight: function () {
        const val = parseFloat(document.getElementById('new-bodyweight').value);
        if (!val || val <= 0 || val > 400) {
            UI.openAlertModal('Neplatná hodnota', 'Zadej reálnou tělesnou váhu v rozmezí 1–400 kg.');
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        if (!Data.state.bodyweight_history) Data.state.bodyweight_history = [];
        Data.state.bodyweight_history = Data.state.bodyweight_history.filter(x => x.date !== today);
        Data.state.bodyweight_history.push({ date: today, kg: val });
        Data.state.bodyweight_history.sort((a, b) => new Date(a.date) - new Date(b.date));
        Data.saveDB();
        UI.closeWeightModal();
        const chartSel = document.getElementById('chart-select');
        if (chartSel && chartSel.value === 'Bodyweight') {
            UI.updateChart('Bodyweight');
        }
    },

    clearWorkoutDraft: function () {
        localStorage.removeItem('ZELIX_WORKOUT_DRAFT');
        this.tempActiveRPEs = {};
    },

    finishWorkout: function () {
        const d = this.activeWorkoutDayIdx !== null ? this.activeWorkoutDayIdx : new Date().getDay();
        const w = (Data.state.customWorkouts[this.currentWeekType] || {})[d];
        if (!w || !Array.isArray(w.exercises)) {
            UI.openAlertModal("Chyba", "Trénink se nepodařilo najít, nebyl uložen. Zkus otevřít GYM znovu.");
            return;
        }
        const t = new Date().toISOString().split('T')[0];
        const l = [];
        const newPRs = [];
        const noteEl = document.getElementById('workout-note');
        const noteVal = noteEl ? noteEl.value.trim().slice(0, 500) : '';

        w.exercises.forEach((ex, i) => {
            const kgEl = document.getElementById(`kg-${i}`);
            const repsEl = document.getElementById(`reps-${i}`);
            const setsEl = document.getElementById(`sets-${i}`);
            const kg = kgEl ? (parseFloat(kgEl.value) || 0) : 0;
            const r = repsEl ? (parseFloat(repsEl.value) || 0) : 0;
            const s = setsEl ? (parseFloat(setsEl.value) || 0) : 0;
            const isNoWeight = Data.isNoWeight(ex);

            if (r > 0) {
                const currentGoal = Data.state.user.goal || 'hypertrophy';
                const strategy = Data.strategies[currentGoal] || { reps: 10 };
                const targetReps = strategy.reps;

                const extraRepsNeeded = Math.max(1, Math.round(targetReps * 0.2));
                const progressionThreshold = targetReps + extraRepsNeeded;

                let nextKg = kg;
                let nextReps = r;
                const rpe = this.tempActiveRPEs[ex] || 'medium';

                if (!isNoWeight) {
                    if (rpe === 'easy') {
                        if (r >= progressionThreshold) {
                            nextKg += 2.5;
                            nextReps = targetReps;
                        } else {
                            nextKg = kg;
                            nextReps = r + 1;
                        }
                    }
                    else if (rpe === 'medium') {
                        nextKg = kg;
                        nextReps = r;
                    }
                    else if (rpe === 'hard') {
                        nextKg = kg;
                        nextReps = Math.max(r - 1, targetReps - extraRepsNeeded);
                    }

                    nextKg = Math.ceil(nextKg / 2.5) * 2.5;
                }

                // NOVÝ OSOBNÍ REKORD? Porovnáme proti dosavadnímu maximu napříč celou historií (ne jen exercise_stats,
                // protože ten se u PR pokusů (r<=2) nepřepisuje - viz isPR níže).
                if (kg > 0 && !isNoWeight) {
                    let priorMax = 0;
                    Data.state.workout_history.forEach(sess => {
                        sess.logs.forEach(lg => { if (lg.ex === ex && lg.kg > priorMax) priorMax = lg.kg; });
                    });
                    if (kg > priorMax && priorMax > 0) newPRs.push({ ex, kg });
                }

                l.push({ ex: ex, kg: kg, reps: r, sets: s, rpe: rpe });

                const isPR = r <= 2 || (w.title && w.title.toUpperCase().includes("PR"));

                if (!isPR) {
                    Data.state.exercise_stats[ex] = { weight: nextKg, reps: nextReps, sets: s, rpe: rpe };
                }
            }
        });

        if (l.length > 0) {
            UI.vibrate([100, 50, 100]);
            Data.state.workout_history.push({ date: t, title: w.title, logs: l, note: noteVal });
            Data.saveDB();
            this.clearWorkoutDraft();
            this.stopRestTimer();
            UI.closeWorkoutModal();
            UI.populateChartSelect();
            UI.updateChart(l[0].ex);
            this.update();
            UI.updateStreakBadge();

            if (newPRs.length > 0) {
                const label = newPRs.map(p => `${Utils.escapeHtml(p.ex)} ${p.kg}kg`).join(', ');
                UI.showToast(`🏆 Nový rekord! ${label}`, 'success', 5000);
            } else {
                UI.showToast('Trénink uložen 💾', 'success');
            }
        } else {
            UI.vibrate([50, 50, 50, 50, 50]);
            UI.openAlertModal("Prázdný Trénink", "Musíš vyplnit alespoň jednu sérii u jednoho cviku.");
        }
    },

    checkBackupFreshness: function () {
        if (!Data.state.lastBackupDate) return;

        const last = new Date(Data.state.lastBackupDate);
        const now = new Date();

        const diffTime = Math.abs(now - last);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 7) {
            UI.openConfirmModal(
                "Bezpečnostní Upozornění",
                `Tvá data nebyla zálohována již <span class="text-primary font-bold">${diffDays} dní</span>.<br><br>Chceš stáhnout zálohu nyní?`,
                () => { Data.exportData(); },
                () => { }
            );
        }
    },

    saveEntryEdit: function () {
        if (this.activeEditSessionIdx === null) return;
        const kg = parseFloat(document.getElementById('mgr-kg').value) || 0;
        const r = parseFloat(document.getElementById('mgr-reps').value) || 0;
        const s = parseFloat(document.getElementById('mgr-sets').value) || 0;
        const rp = document.getElementById('mgr-rpe-cont').dataset.selected;

        const session = Data.state.workout_history[this.activeEditSessionIdx];
        if (!session || !session.logs[this.activeEditLogIdx]) return;
        const l = session.logs[this.activeEditLogIdx];
        l.kg = kg; l.reps = r; l.sets = s; l.rpe = rp;

        const ex = l.ex;
        Data.state.exercise_stats[ex] = { weight: kg, reps: r, sets: s, rpe: rp };

        Data.saveDB();
        UI.closeEntryManager();
        UI.openHistoryModal();
        UI.populateChartSelect();
        UI.updateChart(ex);
    },

    deleteEntry: function () {
        if (this.activeEditSessionIdx === null) return;
        const session = Data.state.workout_history[this.activeEditSessionIdx];
        if (!session) return;
        session.logs.splice(this.activeEditLogIdx, 1);
        if (session.logs.length === 0) {
            Data.state.workout_history.splice(this.activeEditSessionIdx, 1);
        }
        Data.saveDB();
        UI.closeEntryManager();
        UI.openHistoryModal();
        this.update();
    },

    executeSessionDelete: function () {
        if (this.activeEditSessionIdx === null) return;
        const session = Data.state.workout_history[this.activeEditSessionIdx];
        if (!session) return;
        const dateToRemove = session.date;
        Data.state.workout_history.splice(this.activeEditSessionIdx, 1);
        if (Data.state.completed_tasks[dateToRemove]) {
            delete Data.state.completed_tasks[dateToRemove];
        }
        Data.saveDB();
        UI.closeSessionDeleteModal();
        UI.openHistoryModal();
        this.update();
    }
};
