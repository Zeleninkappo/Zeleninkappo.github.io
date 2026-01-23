/* =========================================
   MODULE: UI (DOM, Charts, Modals)
   ========================================= */

const UI = {
    chartInst: null,

    init: function() {
        document.title = `${APP_NAME} v${APP_VERSION}`;
        const verEl = document.getElementById('app-version-label');
        if(verEl) verEl.innerText = `${APP_NAME} v${APP_VERSION}`;

        this.applyTheme();
        this.populateChartSelect();
        this.updateUserGreeting();
    },

    applyTheme: function() {
        const html = document.documentElement;
        const theme = (Data.state.settings && Data.state.settings.theme) ? Data.state.settings.theme : 'dark';
        const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) html.classList.add('dark'); else html.classList.remove('dark');
        this.updateThemeButtons();
    },

	requestNotifications: function() {
        if (!("Notification" in window)) {
            alert("Tvůj prohlížeč nepodporuje notifikace.");
            return;
        }
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                const btn = document.getElementById('btn-notify-req');
                if(btn) { btn.innerText = "AKTIVNÍ ✓"; btn.disabled = true; btn.classList.add('text-green-500'); }
                // Pošleme testovací
                new Notification("Zelix: Notifikace aktivní!", { body: "Teď už nic nezmeškáš.", icon: "icon-192.png" });
            }
        });
    },

    updateThemeButtons: function() {
        ['light', 'dark', 'auto'].forEach(m => {
            const btn = document.getElementById(`theme-${m}`);
            if(!btn) return;
            const active = Data.state.settings.theme === m;
            if(active) {
                btn.classList.add('ring-2', 'ring-primary', 'border-primary');
            } else {
                btn.classList.remove('ring-2', 'ring-primary', 'border-primary');
            }
        });
    },

    updateUserGreeting: function() {
        const el = document.getElementById('user-greeting');
        if(el && Data.state.user) el.innerText = `Čau, ${Data.state.user.name}`;
    },

    updateWeekBadge: function(week) {
        const el = document.getElementById('week-badge');
        if(el) el.innerText = `TÝDEN: ${week}`;
    },

    updateDayBadge: function(text) {
        const el = document.getElementById('day-badge');
        if(el) el.innerText = text;
    },

    updateLiveTime: function(now) {
        const timeEl = document.getElementById('live-time');
        const dateEl = document.getElementById('live-date');
        if (timeEl) timeEl.innerText = now.toLocaleTimeString('cs-CZ', {hour:'2-digit', minute:'2-digit'});
        if (dateEl) {
            const days = ['NEDĚLE', 'PONDĚLÍ', 'ÚTERÝ', 'STŘEDA', 'ČTVRTEK', 'PÁTEK', 'SOBOTA'];
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            dateEl.innerText = `${days[now.getDay()]} ${day}.${month}.${now.getFullYear()}`;
        }
    },

    renderTimeline: function(evs) {
        const c = document.getElementById('timeline-list');
        if(!c) return;
        c.innerHTML = '';
        const today = new Date().toISOString().split('T')[0];
        const done = Data.state.completed_tasks[today] || [];
        
        evs.forEach((ev, i) => {
            const isDone = done.includes(i);
            const check = isDone ? '<span class="text-green-500 font-bold">✓</span>' : `<span class="w-1.5 h-1.5 rounded-full ${ev.type==='urgent'?'bg-red-500 animate-pulse':'bg-stone-400 dark:bg-stone-600'}"></span>`;
            c.innerHTML += `
                <div onclick="Logic.toggleTask(${i})" class="flex items-center gap-3 text-sm p-1 rounded transition-colors cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/50">
                    <span class="font-mono text-[10px] text-stone-500 w-10 text-right ${isDone ? 'opacity-30' : ''}">${ev.time}</span>
                    <div class="flex items-center justify-center w-4 h-4">${check}</div>
                    <span class="${isDone ? 'text-stone-400 dark:text-stone-600 line-through decoration-stone-300' : 'font-bold text-stone-700 dark:text-stone-200'} truncate uppercase text-[11px] select-none">${ev.title}</span>
                </div>`;
        });
    },

    renderActionCard: function(f, ev, mins, now) {
        const card = document.getElementById('action-card');
        const btn = document.getElementById('btn-confirm');
        const title = document.getElementById('next-title');

        if (!card || !title) return;

        if (f === -1) {
            title.innerText = "VŠE SPLNĚNO";
            document.getElementById('next-time').innerText = "--:--";
            document.getElementById('countdown').innerText = "😴";
            btn.classList.add('hidden');
            card.classList.add('opacity-50');
            return;
        }

        btn.classList.remove('hidden');
        card.classList.remove('opacity-50');
        
        title.innerText = ev.title;
        document.getElementById('next-time').innerText = ev.time;
        
        const [h, m] = ev.time.split(':').map(Number);
        const diff = (h * 60 + m) * 60 - (mins * 60 + now.getSeconds());
        
        if (diff < 0) {
            document.getElementById('countdown').innerText = "TEĎ";
            card.classList.add('border-red-500', 'urgent-pulse');
            card.classList.remove('border-stone-300', 'dark:border-stone-600');
        } else {
            const mm = Math.floor((diff % 3600) / 60);
            document.getElementById('countdown').innerText = `-${Math.floor(diff / 3600)}:${mm < 10 ? '0' + mm : mm}`;
            card.classList.remove('border-red-500', 'urgent-pulse');
            card.classList.add('border-stone-300', 'dark:border-stone-600');
        }
    },

    toggleForceRestBtn: function(isActive) {
        const btn = document.getElementById('btn-force-rest');
        if (isActive) {
            btn.classList.remove('bg-stone-200', 'dark:bg-stone-900', 'text-stone-600');
            btn.classList.add('bg-green-600', 'text-white');
        } else {
            btn.classList.add('bg-stone-200', 'dark:bg-stone-900', 'text-stone-600');
            btn.classList.remove('bg-green-600', 'text-white');
        }
    },

    // --- MODALS ---
    openSetupModal: function(tab) {
        this.switchTab(tab);
        this.populateScheduleInputs();
        if(Data.state.user) {
            const name = document.getElementById('setup-name'); if(name) name.value = Data.state.user.name || '';
            const sport = document.getElementById('setup-sport'); if(sport) sport.value = Data.state.user.sport || '';
			const mt = (Data.state.user && Data.state.user.mealTimes) ? Data.state.user.mealTimes : { breakfast: '06:15', lunch: '12:00', dinner: '20:00' };
    		const tB = document.getElementById('setup-time-breakfast');if(tB) tB.value = mt.breakfast;
    		const tL = document.getElementById('setup-time-lunch');if(tL) tL.value = mt.lunch;
    		const tD = document.getElementById('setup-time-dinner');if(tD) tD.value = mt.dinner;
        }
        if(Data.state.supplements) {
            document.getElementById('setup-supps-enabled').checked = Data.state.supplements.enabled;
        }
        this.toggleSuppInputs();
        this.renderStackEditor();
        this.renderExerciseEditor();
        document.getElementById('setup-modal').classList.add('active');
    },

    closeSetupModal: function() { document.getElementById('setup-modal').classList.remove('active'); },

	openWeightModal: function() {
        document.getElementById('new-bodyweight').value = '';
        document.getElementById('weight-modal').classList.add('active');
        // Auto-focus na input
        setTimeout(() => document.getElementById('new-bodyweight').focus(), 100);
    },
	
    closeWeightModal: function() { document.getElementById('weight-modal').classList.remove('active'); },

	
    switchTab: function(t) {
        ['system', 'user', 'supps', 'exercises'].forEach(x => {
            document.getElementById(`tab-content-${x}`).classList.add('hidden');
            document.getElementById(`tab-btn-${x}`).classList.remove('active');
        });
        document.getElementById(`tab-content-${t}`).classList.remove('hidden');
        document.getElementById(`tab-btn-${t}`).classList.add('active');
    },

    populateScheduleInputs: function() {
        const c = document.getElementById('setup-days-container');
        if (!c) return;
        const dN = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
        let ex = (Data.state.settings && Data.state.settings.days) ? Data.state.settings.days : {};
        c.innerHTML = dN.map((n, i) => {
            const d = ex[i] || { type: 'rest', gymTime: '14:30', fieldTime: '19:30' };
            return `<div class="grid grid-cols-12 gap-2 items-center bg-stone-100 dark:bg-stone-900/50 p-2 rounded border border-stone-200 dark:border-stone-800"><div class="col-span-3 text-[10px] font-black opacity-60 uppercase dark:text-stone-400">${n}</div><div class="col-span-4"><select id="s-type-${i}" class="z-select" onchange="UI.toggleTimeInputs(${i})"><option value="rest" ${d.type==='rest'?'selected':''}>Volno</option><option value="gym" ${d.type==='gym'?'selected':''}>Gym</option><option value="training" ${d.type==='training'?'selected':''}>Sport</option><option value="double" ${d.type==='double'?'selected':''}>Double</option></select></div><div class="col-span-5 flex gap-1"><input type="time" id="s-gym-${i}" value="${d.gymTime}" class="z-input ${d.type==='rest'||d.type==='training'?'opacity-20':''}" title="Gym"><input type="time" id="s-field-${i}" value="${d.fieldTime}" class="z-input ${d.type!=='double'&&d.type!=='training'?'opacity-20':''}" title="Sport"></div></div>`;
        }).join('');
    },

    toggleTimeInputs: function(i) {
        const t = document.getElementById(`s-type-${i}`).value;
        document.getElementById(`s-gym-${i}`).classList.toggle('opacity-20', t === 'rest' || t === 'training');
        document.getElementById(`s-field-${i}`).classList.toggle('opacity-20', t !== 'double' && t !== 'training');
    },

    toggleSuppInputs: function() {
        const en = document.getElementById('setup-supps-enabled').checked;
        const c = document.getElementById('supps-inputs');
        if(c) {
            if (en) c.classList.remove('opacity-30', 'pointer-events-none');
            else c.classList.add('opacity-30', 'pointer-events-none');
        }
    },

    // --- STACK EDITOR ---
    renderStackEditor: function() {
        const list = document.getElementById('supp-stack-list');
        list.innerHTML = '';
        if (!Data.state.stack || Data.state.stack.length === 0) {
            list.innerHTML = '<div class="text-xs text-stone-500 text-center p-2">Prázdno.</div>';
            return;
        }
        Data.state.stack.forEach((s, i) => {
            list.innerHTML += `<div class="supp-item"><div class="flex flex-col"><span class="text-xs font-bold text-stone-700 dark:text-stone-300">${s.name} <span class="text-stone-500">${s.dose}</span></span><div class="flex gap-2 text-[9px] text-stone-500 uppercase"><span>${s.timing}</span><span>•</span><span>${s.freq}</span></div></div><button onclick="UI.removeStackItem(${i})" class="text-red-500 hover:text-red-700 px-2">✖</button></div>`;
        });
    },

    addSupplement: function() {
        const n = document.getElementById('new-supp-name').value;
        if (n) {
            if (!Data.state.stack) Data.state.stack = [];
            Data.state.stack.push({
                id: crypto.randomUUID(),
                name: n,
                dose: document.getElementById('new-supp-dose').value,
                timing: document.getElementById('new-supp-timing').value,
                freq: document.getElementById('new-supp-freq').value
            });
            document.getElementById('new-supp-name').value = '';
            this.renderStackEditor();
        }
    },

    removeStackItem: function(i) {
        Data.state.stack.splice(i, 1);
        this.renderStackEditor();
    },

    // --- EXERCISE EDITOR ---
    renderExerciseEditor: function() {
        const w = document.getElementById('edit-ex-week').value;
        const d = document.getElementById('edit-ex-day').value;
        const list = document.getElementById('exercises-list');
        const wk = Data.state.customWorkouts[w][d];
        list.innerHTML = '';
        wk.exercises.forEach((ex, i) => {
            list.innerHTML += `<div class="ex-item"><span class="text-xs font-bold text-stone-700 dark:text-stone-300 w-full">${i+1}. ${ex}</span><div class="flex gap-1"><button onclick="UI.moveExercise('${w}','${d}',${i},-1)" class="text-stone-400 hover:text-white px-1">▲</button><button onclick="UI.moveExercise('${w}','${d}',${i},1)" class="text-stone-400 hover:text-white px-1">▼</button><button onclick="UI.removeExercise('${w}','${d}',${i})" class="text-red-500 hover:text-red-300 px-1 ml-2">✖</button></div></div>`;
        });
    },

    addExercise: function() {
    const w = document.getElementById('edit-ex-week').value;
    const d = document.getElementById('edit-ex-day').value;
    const nInput = document.getElementById('new-ex-name');
    const nwInput = document.getElementById('new-ex-noweight'); // Checkbox

    const n = nInput.value.trim();
    if (n) {
        // Přidáme cvik do rozvrhu
        Data.state.customWorkouts[w][d].exercises.push(n);

        // Pokud je zaškrtnuto "Bez váhy", uložíme si to do DB
        if (nwInput.checked) {
            if (!Data.state.userNoWeight) Data.state.userNoWeight = [];
            Data.state.userNoWeight.push(n);
        }

        // Reset formuláře
        nInput.value = '';
        nwInput.checked = false; // Odškrtnout pro příště
        Data.saveDB(); // Uložit změny hned
        this.renderExerciseEditor();
    }
},
    
    removeExercise: function(w, d, i) { Data.state.customWorkouts[w][d].exercises.splice(i, 1); this.renderExerciseEditor(); },
    moveExercise: function(w, d, i, dir) {
        const arr = Data.state.customWorkouts[w][d].exercises;
        if (i + dir < 0 || i + dir >= arr.length) return;
        [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
        this.renderExerciseEditor();
    },

    // --- WORKOUT MODAL ---
   openWorkoutModal: function(w, stats, history) {
        const c = document.getElementById('modal-exercises');
        c.innerHTML = '';
        document.getElementById('modal-title').innerText = w.title;

        Logic.currentSessionExercises = w.exercises;

        const rawDraft = localStorage.getItem('ZELIX_WORKOUT_DRAFT');
        const draft = rawDraft ? JSON.parse(rawDraft) : {};

        w.exercises.forEach((ex, i) => {
            const st = stats[ex] || { weight: 0, reps: 8, sets: 4 };
            
            // Historie
            const rev = [...history].reverse();
            let ll = null;
            for (let s of rev) {
                const l = s.logs.find(x => x.ex === ex);
                if (l) { ll = l; break; }
            }
            let pl = ll ? (ll.kg > 0 ? `${ll.sets}x${ll.reps}x${ll.kg}kg` : `${ll.sets}x${ll.reps} (Vl.)`) : "První záznam";

            // Rozhodování: Draft vs Historie
            let valKg = st.weight || '';
            let valReps = st.reps;
            let valSets = st.sets;
            let activeRPE = null;

            if (draft[ex]) {
                valKg = draft[ex].kg;
                valReps = draft[ex].reps;
                valSets = draft[ex].sets;
                activeRPE = draft[ex].rpe;
                if (activeRPE) Logic.tempActiveRPEs[ex] = activeRPE;
            }

            // Předvýpočet 1RM pro zobrazení
            let initialOrm = '';
            if (valKg > 0 && valReps > 1) {
                const ormCalc = Math.round(valKg * (1 + valReps/30));
                initialOrm = `Est. 1RM: ${ormCalc}kg`;
            }

            // Generování HTML
            // ZMĚNA: oninput volá Logic.handleInput(${i})
            let wIn = Data.isNoWeight(ex) ? 
                `<div class="input-disabled">VLASTNÍ</div><input type="hidden" id="kg-${i}" value="0">` :
                `<input type="number" id="kg-${i}" class="z-input" placeholder="kg" value="${valKg}" oninput="Logic.handleInput(${i})">`;
            
            const searchLink = `https://www.google.com/search?q=${encodeURIComponent(ex + ' cvik technika')}`;
            const rpeClass = (r) => activeRPE === r ? `selected-${r}` : '';

            // ZMĚNA: Přidán div s id="orm-${i}"
            c.innerHTML += `
            <div class="bg-stone-100 dark:bg-stone-900 p-3 rounded border border-stone-200 dark:border-stone-800 shadow-sm relative">
                <div class="flex justify-between mb-2 items-center">
                    <div class="flex items-center">
                        <span class="font-bold text-primary text-xs uppercase">${ex}</span>
                        <a href="${searchLink}" target="_blank" class="help-btn" title="Technika">?</a>
                    </div>
                    <span class="text-[9px] opacity-40 uppercase font-mono">Minule: ${pl}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 mb-2">
                    ${wIn}
                    <input type="number" id="reps-${i}" class="z-input" placeholder="reps" value="${valReps}" oninput="Logic.handleInput(${i})">
                    <input type="number" id="sets-${i}" class="z-input" placeholder="sets" value="${valSets}" oninput="Logic.handleInput(${i})">
                </div>
                <div class="flex justify-between items-center mt-2">
                    <div class="flex gap-1 flex-1 mr-4" id="rpe-cont-${i}">
                        <button onclick="Logic.setRPE('${ex}','easy',${i},this)" class="rpe-btn flex-1 ${rpeClass('easy')}">EASY</button>
                        <button onclick="Logic.setRPE('${ex}','medium',${i},this)" class="rpe-btn flex-1 ${rpeClass('medium')}">OK</button>
                        <button onclick="Logic.setRPE('${ex}','hard',${i},this)" class="rpe-btn flex-1 ${rpeClass('hard')}">HARD</button>
                    </div>
                    <div id="orm-${i}" class="text-[10px] text-stone-400 font-mono font-bold whitespace-nowrap min-w-[60px] text-right">${initialOrm}</div>
                </div>
            </div>`;
        });
        
        // Načtení poznámky
        const noteInput = document.getElementById('workout-note');
        if (noteInput) {
            noteInput.value = (draft && draft._note) ? draft._note : '';
        }
        
        document.getElementById('workout-modal').classList.add('active');
    },

    closeWorkoutModal: function() { document.getElementById('workout-modal').classList.remove('active'); },
    openDuplicateModal: function() { document.getElementById('duplicate-modal').classList.add('active'); },
    closeDuplicateModal: function() { document.getElementById('duplicate-modal').classList.remove('active'); },

    // --- HISTORY MODAL ---
    // --- HISTORY MODAL ---
    openHistoryModal: function() {
        const cont = document.getElementById('history-content');
        cont.innerHTML = '';
        
        const allLogs = [];
        Data.state.workout_history.forEach((sess, sIdx) => {
            sess.logs.forEach((log, lIdx) => {
                allLogs.push({ ...log, date: sess.date, sIdx, lIdx });
            });
        });

        const exs = [...new Set(allLogs.map(l => l.ex))].sort();

        if (exs.length === 0) {
            cont.innerHTML = `<div class="p-8 text-center text-stone-500">Zatím žádná historie.</div>`;
        } else {
            exs.forEach(ex => {
                const h = allLogs.filter(l => l.ex === ex).sort((a, b) => new Date(b.date) - new Date(a.date));
                
                // ZDE BYLA CHYBA - logika poznámky musí být uvnitř map()
                const rows = h.map(r => {
                    const w = r.kg > 0 ? `${r.kg}kg` : '<span class="opacity-50 text-[9px]">VLASTNÍ</span>';
                    const dFormatted = r.date.split('T')[0].split('-').reverse().join('.');
                    
                    // 1. Zjistíme poznámku (teď už známe 'r')
                    const sessionNote = Data.state.workout_history[r.sIdx].note || '';
                    const noteHtml = sessionNote ? `<div class="col-span-4 text-[9px] text-stone-400 italic mt-1 border-t border-stone-100 dark:border-stone-800 pt-1">📝 ${sessionNote}</div>` : '';

                    // 2. Vrátíme řádek i s poznámkou
                    return `
                    <div onclick="UI.openEntryManager('${ex}',${r.sIdx},${r.lIdx})" class="grid grid-cols-4 gap-2 text-xs py-3 border-b border-stone-200 dark:border-stone-800 last:border-0 text-stone-600 dark:text-stone-400 cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                        <div class="col-span-1 font-mono opacity-70">${dFormatted}</div>
                        <div class="col-span-1 font-bold text-stone-900 dark:text-white">${w}</div>
                        <div class="col-span-1">${r.sets} x ${r.reps}</div>
                        <div class="col-span-1 text-right uppercase text-[9px] font-bold ${r.rpe==='easy'?'text-green-500':r.rpe==='hard'?'text-red-500':'text-yellow-500'}">${r.rpe||'-'}</div>
                        ${noteHtml}
                    </div>`;
                }).join('');

                cont.innerHTML += `
                    <div class="bg-white dark:bg-panel mb-2">
                        <details class="group">
                            <summary class="flex justify-between items-center p-4 cursor-pointer list-none bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors border-b border-stone-200 dark:border-stone-800">
                                <span class="font-bold text-sm text-stone-800 dark:text-stone-200 uppercase">${ex}</span>
                                <span class="text-xs text-stone-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div class="px-4 pb-2 bg-stone-50 dark:bg-stone-950/30">
                                <div class="grid grid-cols-4 gap-2 text-[9px] font-bold text-stone-400 uppercase py-2 border-b border-stone-200 dark:border-stone-800">
                                    <div>Datum</div><div>Váha</div><div>Série</div><div class="text-right">RPE</div>
                                </div>
                                ${rows}
                            </div>
                        </details>
                    </div>`;
            });
        }
        document.getElementById('history-modal').classList.add('active');
    },

    closeHistoryModal: function() { document.getElementById('history-modal').classList.remove('active'); },

    // --- ENTRY MANAGER ---
    openEntryManager: function(ex, sIdx, lIdx) {
        Logic.activeEditSessionIdx = sIdx;
        Logic.activeEditLogIdx = lIdx;
        
        const session = Data.state.workout_history[sIdx];
        const log = session.logs[lIdx];

        document.getElementById('mgr-title').innerText = ex;
        document.getElementById('mgr-kg').value = log.kg;
        document.getElementById('mgr-reps').value = log.reps;
        document.getElementById('mgr-sets').value = log.sets;
        
        this.setMgrRPE(log.rpe || 'medium');
        document.getElementById('entry-manager-modal').classList.add('active');
    },

    closeEntryManager: function() { document.getElementById('entry-manager-modal').classList.remove('active'); },
    
    setMgrRPE: function(rpe, btn) {
        const cont = document.getElementById('mgr-rpe-cont');
        Array.from(cont.children).forEach(b => b.classList.remove('selected-easy','selected-medium','selected-hard'));
        const target = btn || Array.from(cont.children).find(b => b.innerText.toLowerCase() === (rpe==='medium'?'ok':rpe));
        if(target) target.classList.add(`selected-${rpe}`);
        cont.dataset.selected = rpe;
    },

	openSessionDeleteModal: function() {
        // 1. Zavřeme editor
        this.closeEntryManager();

        // 2. Najdeme varovné okno
        const modal = document.getElementById('session-delete-modal');
        
        // 3. Vypíšeme datum (bereme ho z Logic, kde je uložený index aktuálně editovaného tréninku)
        // Používáme Logic.activeEditSessionIdx, který se nastavil při otevření editoru
        const sessionIdx = Logic.activeEditSessionIdx;
        if (sessionIdx !== null && Data.state.workout_history[sessionIdx]) {
            const dateStr = Data.state.workout_history[sessionIdx].date;
            // Použijeme tvou existující pomocnou funkci formatDateCZ z logic.js (nebo ji přesuň do UI/Data, pokud je nedostupná)
            // Pro jistotu zde použijeme přímý formát, pokud helper není v UI scope:
            const d = new Date(dateStr);
            const formattedDate = `${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}`;
            
            const dateEl = document.getElementById('del-session-date');
            if (dateEl) dateEl.innerText = formattedDate;
        }

        // 4. Zobrazíme okno
        modal.classList.add('active');
    },
    // --- DELETE CONFIRM ---
    confirmDeleteSession: function() {
        this.closeEntryManager();
        document.getElementById('session-delete-modal').classList.add('active');
    },
    closeSessionDeleteModal: function() { document.getElementById('session-delete-modal').classList.remove('active'); },
    
    openWipeModal: function() { document.getElementById('wipe-modal').classList.add('active'); },
    closeWipeModal: function() { document.getElementById('wipe-modal').classList.remove('active'); },

    // --- CHART ---
    populateChartSelect: function() {
        const s = document.getElementById('chart-select');
        const c = s.value;
        const ex = new Set();
        if (Data.state.workout_history) Data.state.workout_history.forEach(x => x.logs.forEach(l => ex.add(l.ex)));
        
        s.innerHTML = '';
        
        // 1. Přidáme možnost Tělesná váha
        const bwOpt = document.createElement('option');
        bwOpt.value = 'Bodyweight';
        bwOpt.text = '⚖️ Tělesná váha';
        s.appendChild(bwOpt);

        Array.from(ex).sort().forEach(e => {
            const o = document.createElement('option');
            o.value = e; o.text = e; s.appendChild(o);
        });

        if (c === 'Bodyweight') s.value = 'Bodyweight';
        else if (Array.from(ex).includes(c)) s.value = c;
        else if (ex.size > 0) this.updateChart('Bodyweight'); // Default na váhu nebo první cvik
    },

    updateChart: function(exName) {
        const ctx = document.getElementById('progressChart').getContext('2d');
        const tC = document.documentElement.classList.contains('dark') ? '#a8a29e' : '#57534e';
        const gC = document.documentElement.classList.contains('dark') ? '#292524' : '#e5e7eb';
        
        let labels = [], d1 = [], d2 = [], label1 = '', label2 = '', showY1 = false;

        // --- MÓD: TĚLESNÁ VÁHA ---
        if (exName === 'Bodyweight') {
            const h = Data.state.bodyweight_history || [];
            labels = h.map(x => x.date.split('T')[0].split('-').reverse().join('.'));
            d1 = h.map(x => x.kg);
            label1 = 'Váha (kg)';
            // (Volitelně: d2 by mohl být průměr, ale nechme to jednoduché)
        } 
        // --- MÓD: CVIKY ---
        else {
            const h = Data.state.workout_history.filter(x => x.logs.some(l => l.ex === exName));
            labels = h.map(x => x.date.split('T')[0].split('-').reverse().join('.'));
            d1 = h.map(x => { const l=x.logs.find(y=>y.ex===exName); return l?l.kg:0; });
            d2 = h.map(x => { const l=x.logs.find(y=>y.ex===exName); return l?(l.sets*l.reps):0; });
            label1 = 'Váha (kg)';
            label2 = 'Objem (reps)';
            showY1 = true;
        }

        if (this.chartInst) this.chartInst.destroy();

        const datasets = [{
            label: label1, data: d1, type: 'line',
            borderColor: '#DC2626', backgroundColor: '#DC2626',
            yAxisID: 'y', tension: 0.3, borderWidth: 2, pointRadius: 3
        }];

        if (showY1 && d2.length > 0) {
            datasets.push({
                label: label2, data: d2,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#292524' : '#d6d3d1',
                yAxisID: 'y1', barThickness: 10, borderRadius: 4, type: 'bar'
            });
        }

        this.chartInst = new Chart(ctx, {
            data: { labels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: true, labels: { color: tC, font: { size: 10 }, boxWidth: 8 } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: tC, font: { size: 10 } } },
                    y: { type: 'linear', display: true, position: 'left', grid: { color: gC }, ticks: { color: '#DC2626', font: { size: 10 } } },
                    y1: { type: 'linear', display: showY1, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: tC, font: { size: 10 } } }
                }
            }
        });
    }
};

// Initial Call
window.onload = function() {
    Data.init();

};







