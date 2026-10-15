/* =========================================
   MODULE: UI - ONBOARDING (wizard + regen wizard)
   ========================================= */

Object.assign(UI, {
    selectGoal: function (goal, btn) {
        document.getElementById('ob-goal').value = goal;
        document.querySelectorAll('.goal-btn').forEach(b => {
            b.classList.remove('border-primary', 'ring-1', 'ring-primary');
            b.classList.add('border-stone-700');
        });
        btn.classList.remove('border-stone-700');
        btn.classList.add('border-primary', 'ring-1', 'ring-primary');
        UI.vibrate(20);
    },

    // Vícenásobný výběr (vybavení/omezení) - na rozdíl od selectGoal (jen
    // jedna volba) tu appka jen přepne .selected na kliknutém chipu, finální
    // výběr se čte přímo z DOM (querySelectorAll '.selected') v
    // finishOnboarding, žádný duplicitní JS stav.
    toggleChip: function (group, value, btn) {
        btn.classList.toggle('selected');
        UI.vibrate(15);
    },

    // Při vstupu do kroku vybavení/omezení appka přednastaví chipy podle
    // toho, co má uživatel už uložené (relevantní hlavně pro "Nový Plán"
    // regen wizard - nový uživatel má defaultně "mám všechno" = stejný stav,
    // jaký má HTML samo o sobě).
    populateChipsFromState: function () {
        const equipment = (Data.state.user && Array.isArray(Data.state.user.equipment) && Data.state.user.equipment.length > 0)
            ? Data.state.user.equipment : Data.ALL_EQUIPMENT;
        const injuries = (Data.state.user && Array.isArray(Data.state.user.injuries)) ? Data.state.user.injuries : [];
        document.querySelectorAll('#ob-equipment-chips .chip-btn').forEach(b => {
            b.classList.toggle('selected', equipment.includes(b.dataset.value));
        });
        document.querySelectorAll('#ob-injury-chips .chip-btn').forEach(b => {
            b.classList.toggle('selected', injuries.includes(b.dataset.value));
        });
    },

    nextOnboardingStep: function (targetStep) {
        if (targetStep === 2) {
            const name = document.getElementById('ob-name').value.trim();
            if (!name) { UI.vibrate([50, 50]); return; }
            Data.state.user.name = name.slice(0, 40);
        }
        if (targetStep === 3) {
            this.populateChipsFromState();
        }

        const progress = (targetStep / 5) * 100;
        document.getElementById('ob-progress').style.width = `${progress}%`;

        const current = document.querySelector('.step-content:not(.hidden)');
        const next = document.getElementById(`ob-step-${targetStep}`);

        if (current) {
            current.classList.add('opacity-0', '-translate-x-10');
            setTimeout(() => {
                current.classList.add('hidden');
                next.classList.remove('hidden');
                setTimeout(() => next.classList.remove('opacity-0', 'translate-x-10'), 50);
            }, 300);
        }
        UI.vibrate(20);
    },

    finishOnboarding: function (daysCount) {
        const goal = document.getElementById('ob-goal').value;
        const prBench = Utils.clamp(parseFloat(document.getElementById('ob-pr-bench').value) || 0, 0, 500);
        const prSquat = Utils.clamp(parseFloat(document.getElementById('ob-pr-squat').value) || 0, 0, 500);
        const prDL = Utils.clamp(parseFloat(document.getElementById('ob-pr-dl').value) || 0, 0, 500);
        const bodyweight = Utils.clamp(parseFloat(document.getElementById('ob-bodyweight').value) || 0, 0, 400);

        const equipment = Array.from(document.querySelectorAll('#ob-equipment-chips .chip-btn.selected')).map(b => b.dataset.value);
        const injuries = Array.from(document.querySelectorAll('#ob-injury-chips .chip-btn.selected')).map(b => b.dataset.value);
        Data.state.user.equipment = equipment.length > 0 ? equipment : [...Data.ALL_EQUIPMENT];
        Data.state.user.injuries = injuries;
        Data.state.user.level = Logic.estimateLevel(bodyweight, { bench: prBench, squat: prSquat, deadlift: prDL });

        const scheduleMap = Data.generateProgram(goal, daysCount);

        const days = {};
        for (let i = 0; i < 7; i++) {
            days[i] = { type: 'rest', gymTime: '14:30', fieldTime: '19:30' };
            if (scheduleMap[i]) {
                days[i].type = 'gym';
                days[i].gymTime = '17:00';
            }
        }

        if (!Data.state.settings) Data.state.settings = {};
        Data.state.settings.days = days;
        Data.state.user.goal = goal;

        if (bodyweight > 0) {
            const today = new Date().toISOString().split('T')[0];
            if (!Data.state.bodyweight_history) Data.state.bodyweight_history = [];
            Data.state.bodyweight_history = Data.state.bodyweight_history.filter(x => x.date !== today);
            Data.state.bodyweight_history.push({ date: today, kg: bodyweight });
        }

        if (prBench > 0 || prSquat > 0 || prDL > 0) {
            const prLog = [];
            const addPR = (exName, kg) => {
                prLog.push({ ex: exName, kg: kg, reps: 1, sets: 1, rpe: 'hard' });
                if (!Data.state.exercise_stats[exName]) Data.state.exercise_stats[exName] = {};
                Data.state.exercise_stats[exName].weight = kg;
            };

            if (prBench > 0) addPR("Bench Press", prBench);
            if (prSquat > 0) addPR("Squat", prSquat);
            if (prDL > 0) addPR("Deadlift", prDL);

            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);

            Data.state.workout_history.push({
                date: yesterday.toISOString().split('T')[0],
                title: "Kalibrace (Import)",
                logs: prLog,
                note: "Automatický import maximálek."
            });
        }

        Data.saveDB();

        document.getElementById('onboarding-modal').classList.remove('active');
        this.updateUserGreeting();
        Logic.update();

        UI.vibrate([100, 50, 100, 50, 200]);

        const levelLabels = { novice: 'Začátečník', intermediate: 'Pokročilý', advanced: 'Expert' };
        const levelLine = Data.state.user.level
            ? `<br>Odhadovaná úroveň: <span class="text-primary font-black">${levelLabels[Data.state.user.level]}</span> (podle toho appka doladila tempo progrese)`
            : '';

        setTimeout(() => {
            this.openSuccessModal(
                `Vítej v týmu, ${Utils.escapeHtml(Data.state.user.name)}`,
                `Režim: <span class="text-primary font-black">${Utils.escapeHtml(goal.toUpperCase())}</span>${levelLine}<br><br>Tvůj tréninkový plán byl vygenerován a kalibrován podle zadaných dat.<br><br>Hodně štěstí.`
            );
        }, 500);
    },

    openRegenWizard: function () {
        UI.closeSetupModal();
        const modal = document.getElementById('onboarding-modal');

        document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));

        const step2 = document.getElementById('ob-step-2');
        step2.classList.remove('hidden', 'opacity-0', 'translate-x-10');

        document.getElementById('ob-progress').style.width = '40%'; // krok 2 z 5

        modal.classList.add('active');
    },

    quickGenerateDay: function () {
        const w = document.getElementById('edit-ex-week').value;
        const d = document.getElementById('edit-ex-day').value;
        const type = document.getElementById('quick-gen-type').value;

        this.openConfirmModal(
            "Přepsat trénink?",
            `Tato akce nenávratně smaže aktuální cviky pro tento den a nahradí je šablonou <span class="text-primary font-bold">${Utils.escapeHtml(type)}</span>.`,
            () => {
                Data.regenerateDay(w, d, type);
                this.renderExerciseEditor();
                UI.vibrate([50, 50]);
            }
        );
    },
});
