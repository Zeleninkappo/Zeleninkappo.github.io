/* =========================================
   MODULE: UI - WORKOUT (GYM log modal, rest timer)
   ========================================= */

Object.assign(UI, {
    // --- WORKOUT MODAL ---
    openWorkoutModal: function (w, stats, history) {
        const c = document.getElementById('modal-exercises');
        c.innerHTML = '';
        document.getElementById('modal-title').innerText = w.title; // innerText - bezpečné

        Logic.currentSessionExercises = w.exercises;

        const draft = Utils.safeParse(localStorage.getItem('ZELIX_WORKOUT_DRAFT'), {});

        w.exercises.forEach((ex, i) => {
            const exSafe = Utils.escapeHtml(ex);
            const st = stats[ex] || { weight: 0, reps: 8, sets: 4 };

            const rev = [...history].reverse();
            let ll = null;
            for (let s of rev) {
                const l = s.logs.find(x => x.ex === ex);
                if (l) { ll = l; break; }
            }
            let pl = ll ? (ll.kg > 0 ? `${ll.sets}x${ll.reps}x${ll.kg}kg` : `${ll.sets}x${ll.reps} (Vl.)`) : "První záznam";

            let maxKg = 0;
            history.forEach(sess => {
                const l = sess.logs.find(x => x.ex === ex);
                if (l && l.kg > maxKg) maxKg = l.kg;
            });
            const prBadge = maxKg > 0 ? `<span class="text-primary font-black ml-2" title="Tvůj rekord">🏆 ${maxKg}kg</span>` : '';

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

            let initialOrm = '';
            if (valKg > 0 && valReps > 1) {
                const ormCalc = Math.round(valKg * (1 + valReps / 30));
                initialOrm = `Est. 1RM: ${ormCalc}kg`;
            }

            let wIn = Data.isNoWeight(ex) ?
                `<div class="input-disabled">VLASTNÍ</div><input type="hidden" id="kg-${i}" value="0">` :
                `<input type="number" id="kg-${i}" inputmode="decimal" step="0.5" min="0" max="600" class="z-input" placeholder="kg" value="${valKg}" oninput="Logic.handleInput(${i})">`;

            const searchLink = `https://www.google.com/search?q=${encodeURIComponent(ex + ' cvik technika')}`;
            const rpeClass = (r) => activeRPE === r ? `selected-${r}` : '';

            c.innerHTML += `
            <div class="bg-stone-100 dark:bg-stone-900 p-3 rounded border border-stone-200 dark:border-stone-800 shadow-sm relative">
                <div class="flex justify-between mb-2 items-center">
                    <div class="flex items-center">
                        <span class="font-bold text-primary text-xs uppercase">${exSafe}</span>
                        <a href="${searchLink}" target="_blank" rel="noopener noreferrer" class="help-btn" title="Technika" aria-label="Vyhledat techniku cviku">?</a>
                    </div>
                    <div class="flex items-center">
                        <span class="text-[9px] opacity-40 uppercase font-mono">Minule: ${Utils.escapeHtml(pl)}</span>
                        ${prBadge}
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 mb-2">
                    ${wIn}
                    <input type="number" id="reps-${i}" inputmode="numeric" min="0" max="200" class="z-input" placeholder="reps" value="${valReps}" oninput="Logic.handleInput(${i})">
                    <input type="number" id="sets-${i}" inputmode="numeric" min="0" max="50" class="z-input" placeholder="sets" value="${valSets}" oninput="Logic.handleInput(${i})">
                </div>
                <div class="flex justify-between items-center mt-2">
                    <div class="flex gap-1 flex-1 mr-4" id="rpe-cont-${i}">
                        <button onclick="Logic.setRPE('${exSafe.replace(/'/g, "\\'")}','easy',${i},this)" class="rpe-btn flex-1 ${rpeClass('easy')}">EASY</button>
                        <button onclick="Logic.setRPE('${exSafe.replace(/'/g, "\\'")}','medium',${i},this)" class="rpe-btn flex-1 ${rpeClass('medium')}">OK</button>
                        <button onclick="Logic.setRPE('${exSafe.replace(/'/g, "\\'")}','hard',${i},this)" class="rpe-btn flex-1 ${rpeClass('hard')}">HARD</button>
                    </div>
                    <div id="orm-${i}" class="text-[10px] text-stone-400 font-mono font-bold whitespace-nowrap min-w-[60px] text-right">${initialOrm}</div>
                </div>
            </div>`;
        });

        const noteInput = document.getElementById('workout-note');
        if (noteInput) {
            noteInput.value = (draft && draft._note) ? draft._note : '';
        }

        document.getElementById('workout-modal').classList.add('active');
    },

    closeWorkoutModal: function () {
        document.getElementById('workout-modal').classList.remove('active');
        Logic.stopRestTimer();
    },

    // --- REST TIMER WIDGET (plovoucí lišta nad spodním okrajem během GYM módu) ---
    renderRestTimer: function (timer, finished) {
        const bar = document.getElementById('rest-timer-bar');
        if (!bar) return;
        if (!timer || timer.total === 0) {
            bar.classList.remove('active');
            return;
        }
        bar.classList.add('active');
        bar.classList.toggle('rest-timer-done', !!finished);
        const mm = Math.floor(Math.max(0, timer.remaining) / 60);
        const ss = Math.max(0, timer.remaining) % 60;
        const label = document.getElementById('rest-timer-label');
        if (label) label.innerText = finished ? 'ODPOČINEK HOTOV' : `${mm}:${ss < 10 ? '0' + ss : ss}`;
        const fill = document.getElementById('rest-timer-fill');
        if (fill) fill.style.width = `${Utils.clamp((timer.remaining / timer.total) * 100, 0, 100)}%`;
    },
});
