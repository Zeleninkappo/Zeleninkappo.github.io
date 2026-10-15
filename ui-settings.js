/* =========================================
   MODULE: UI - SETTINGS (schedule, supplement stack, exercise editor)
   ========================================= */

Object.assign(UI, {
    populateScheduleInputs: function () {
        const c = document.getElementById('setup-days-container');
        if (!c) return;
        const dN = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
        let ex = (Data.state.settings && Data.state.settings.days) ? Data.state.settings.days : {};

        c.innerHTML = dN.map((n, i) => {
            const d = ex[i] || { type: 'rest', gymTime: '14:30', fieldTime: '19:30' };

            const showGym = (d.type === 'gym' || d.type === 'double');
            const showField = (d.type === 'training' || d.type === 'double');
            const isRest = (d.type === 'rest');

            return `
            <div class="grid grid-cols-12 gap-1 items-center bg-stone-100 dark:bg-stone-900/50 p-2 rounded border border-stone-200 dark:border-stone-800">
                <div class="col-span-3 text-[10px] font-black opacity-60 uppercase dark:text-stone-400 truncate pr-1">${n}</div>

                <div class="col-span-5">
                    <select id="s-type-${i}" class="z-select !py-1 text-[10px] font-bold" onchange="UI.toggleTimeInputs(${i})">
                        <option value="rest" ${d.type === 'rest' ? 'selected' : ''}>Volno</option>
                        <option value="gym" ${d.type === 'gym' ? 'selected' : ''}>Gym</option>
                        <option value="training" ${d.type === 'training' ? 'selected' : ''}>Sport</option>
                        <option value="double" ${d.type === 'double' ? 'selected' : ''}>Double</option>
                    </select>
                </div>

                <div class="col-span-4 flex flex-col gap-1 justify-center h-full min-h-[24px]">
                    <input type="time" id="s-gym-${i}" value="${d.gymTime}" class="z-input !py-0.5 !px-1 text-[10px] text-center h-6 ${!showGym ? 'hidden' : ''}" title="Gym">
                    <input type="time" id="s-field-${i}" value="${d.fieldTime}" class="z-input !py-0.5 !px-1 text-[10px] text-center h-6 ${!showField ? 'hidden' : ''}" title="Sport">
                    <div id="s-rest-${i}" class="text-center text-stone-300 dark:text-stone-700 text-[10px] ${!isRest ? 'hidden' : ''}">—</div>
                </div>
            </div>`;
        }).join('');
    },

    toggleTimeInputs: function (i) {
        const t = document.getElementById(`s-type-${i}`).value;
        const gymIn = document.getElementById(`s-gym-${i}`);
        const fieldIn = document.getElementById(`s-field-${i}`);
        const restPh = document.getElementById(`s-rest-${i}`);

        gymIn.classList.add('hidden');
        fieldIn.classList.add('hidden');
        restPh.classList.add('hidden');

        if (t === 'rest') {
            restPh.classList.remove('hidden');
        } else if (t === 'gym') {
            gymIn.classList.remove('hidden');
        } else if (t === 'training') {
            fieldIn.classList.remove('hidden');
        } else if (t === 'double') {
            gymIn.classList.remove('hidden');
            fieldIn.classList.remove('hidden');
        }
    },

    toggleSuppInputs: function () {
        const en = document.getElementById('setup-supps-enabled').checked;
        const c = document.getElementById('supps-inputs');
        if (c) {
            if (en) c.classList.remove('opacity-30', 'pointer-events-none');
            else c.classList.add('opacity-30', 'pointer-events-none');
        }
    },

    // --- STACK EDITOR ---
    renderStackEditor: function () {
        const list = document.getElementById('supp-stack-list');
        list.innerHTML = '';
        if (!Data.state.stack || Data.state.stack.length === 0) {
            list.innerHTML = '<div class="text-xs text-stone-500 text-center p-2">Prázdno.</div>';
            return;
        }
        Data.state.stack.forEach((s, i) => {
            list.innerHTML += `<div class="supp-item"><div class="flex flex-col"><span class="text-xs font-bold text-stone-700 dark:text-stone-300">${Utils.escapeHtml(s.name)} <span class="text-stone-500">${Utils.escapeHtml(s.dose)}</span></span><div class="flex gap-2 text-[9px] text-stone-500 uppercase"><span>${Utils.escapeHtml(s.timing)}</span><span>•</span><span>${Utils.escapeHtml(s.freq)}</span></div></div><button onclick="UI.removeStackItem(${i})" aria-label="Smazat suplement" class="text-red-500 hover:text-red-700 px-2">✖</button></div>`;
        });
    },

    addSupplement: function () {
        const nInput = document.getElementById('new-supp-name');
        const n = nInput.value.trim().slice(0, 60);
        if (n) {
            if (!Data.state.stack) Data.state.stack = [];
            Data.state.stack.push({
                id: Utils.uuid(),
                name: n,
                dose: document.getElementById('new-supp-dose').value.trim().slice(0, 30),
                timing: document.getElementById('new-supp-timing').value,
                freq: document.getElementById('new-supp-freq').value
            });
            nInput.value = '';
            this.renderStackEditor();
            Data.saveDB();
        }
    },

    removeStackItem: function (i) {
        Data.state.stack.splice(i, 1);
        this.renderStackEditor();
        Data.saveDB();
    },

    // --- EXERCISE EDITOR ---
    renderExerciseEditor: function () {
        const w = document.getElementById('edit-ex-week').value;
        const d = document.getElementById('edit-ex-day').value;
        const list = document.getElementById('exercises-list');

        if (!Data.state.customWorkouts) Data.state.customWorkouts = { A: {}, B: {} };
        if (!Data.state.customWorkouts[w]) Data.state.customWorkouts[w] = {};
        if (!Data.state.customWorkouts[w][d]) Data.state.customWorkouts[w][d] = { exercises: [], title: `Custom ${w}-${d}` };

        const wk = Data.state.customWorkouts[w][d];
        list.innerHTML = '';

        const currentTitle = Utils.escapeHtml(wk.title || '');
        list.innerHTML += `
            <div class="mb-4 bg-white dark:bg-stone-800/50 p-2 rounded border border-stone-200 dark:border-stone-700 shadow-sm">
                <label class="text-[9px] font-bold text-stone-400 uppercase ml-1 block mb-1" for="wk-title-input">Název dne</label>
                <div class="relative">
                    <input id="wk-title-input" type="text" value="${currentTitle}" maxlength="40"
                        class="z-input font-black text-stone-800 dark:text-white border-transparent bg-transparent focus:bg-white dark:focus:bg-stone-900 focus:border-primary !p-1 text-lg"
                        onchange="UI.updateWorkoutTitle('${w}', '${d}', this.value)"
                        placeholder="Pojmenuj svůj trénink...">
                    <span class="absolute right-2 top-2 text-stone-400 text-xs">✎</span>
                </div>
            </div>
        `;

        if (wk.exercises.length === 0) {
            list.innerHTML += '<div class="text-xs text-stone-500 text-center p-4 italic opacity-60">Žádné cviky. Přidej ručně nebo vygeneruj.</div>';
        } else {
            wk.exercises.forEach((ex, i) => {
                const exSafe = Utils.escapeHtml(ex);
                list.innerHTML += `<div class="ex-item"><span class="text-xs font-bold text-stone-700 dark:text-stone-300 w-full">${i + 1}. ${exSafe}</span><div class="flex gap-1"><button onclick="UI.moveExercise('${w}','${d}',${i},-1)" aria-label="Posunout nahoru" class="text-stone-400 hover:text-white px-1">▲</button><button onclick="UI.moveExercise('${w}','${d}',${i},1)" aria-label="Posunout dolů" class="text-stone-400 hover:text-white px-1">▼</button><button onclick="UI.removeExercise('${w}','${d}',${i})" aria-label="Smazat cvik" class="text-red-500 hover:text-red-300 px-1 ml-2">✖</button></div></div>`;
            });
        }

        const genBar = document.createElement('div');
        genBar.className = "mt-4 pt-4 border-t border-stone-200 dark:border-stone-800 flex gap-2 items-center";
        genBar.innerHTML = `
            <select id="quick-gen-type" class="z-select text-[10px] font-bold uppercase !py-2">
                <option value="FB_A">Full Body A</option>
                <option value="FB_B">Full Body B</option>
                <option value="UPPER_A">Upper (Vršek)</option>
                <option value="LOWER_A">Lower (Spodek)</option>
                <option value="PUSH">Push (Tlaky)</option>
                <option value="PULL">Pull (Tahy)</option>
                <option value="LEGS">Legs (Nohy)</option>
                <option value="explosive">Výbušnost</option>
                <option value="PR_TEST">🏆 PR Test (SBD)</option>
            </select>
            <button onclick="UI.quickGenerateDay()" class="bg-stone-200 dark:bg-stone-800 hover:bg-primary hover:text-white text-stone-600 dark:text-stone-400 font-bold text-[10px] py-2 px-3 rounded uppercase transition-colors whitespace-nowrap">🎲 Generovat</button>
        `;
        list.appendChild(genBar);
    },

    updateWorkoutTitle: function (w, d, val) {
        if (!Data.state.customWorkouts[w] || !Data.state.customWorkouts[w][d]) return;

        Data.state.customWorkouts[w][d].title = (val.trim() || `Custom ${w}-${d}`).slice(0, 40);
        Data.saveDB();

        this.vibrate(20);
        Logic.update();
    },

    addExercise: function () {
        const w = document.getElementById('edit-ex-week').value;
        const d = document.getElementById('edit-ex-day').value;
        const nInput = document.getElementById('new-ex-name');
        const nwInput = document.getElementById('new-ex-noweight');

        const n = nInput.value.trim().slice(0, 60);
        if (n) {
            if (!Data.state.customWorkouts[w][d]) {
                Data.state.customWorkouts[w][d] = { exercises: [], title: `Custom ${w}-${d}` };
            }

            Data.state.customWorkouts[w][d].exercises.push(n);

            if (nwInput.checked) {
                if (!Data.state.userNoWeight) Data.state.userNoWeight = [];
                Data.state.userNoWeight.push(n);
            }

            nInput.value = '';
            nwInput.checked = false;
            Data.saveDB();
            this.renderExerciseEditor();
        }
    },

    removeExercise: function (w, d, i) {
        Data.state.customWorkouts[w][d].exercises.splice(i, 1);
        Data.saveDB();
        this.renderExerciseEditor();
    },

    moveExercise: function (w, d, i, dir) {
        const arr = Data.state.customWorkouts[w][d].exercises;
        if (i + dir < 0 || i + dir >= arr.length) return;
        [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
        Data.saveDB();
        this.renderExerciseEditor();
    },
});
