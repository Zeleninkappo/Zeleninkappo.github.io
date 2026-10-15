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

    nextOnboardingStep: function (targetStep) {
        if (targetStep === 2) {
            const name = document.getElementById('ob-name').value.trim();
            if (!name) { UI.vibrate([50, 50]); return; }
            Data.state.user.name = name.slice(0, 40);
        }

        const progress = (targetStep / 4) * 100;
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

        setTimeout(() => {
            this.openSuccessModal(
                `Vítej v týmu, ${Utils.escapeHtml(Data.state.user.name)}`,
                `Režim: <span class="text-primary font-black">${Utils.escapeHtml(goal.toUpperCase())}</span><br><br>Tvůj tréninkový plán byl vygenerován a kalibrován podle zadaných dat.<br><br>Hodně štěstí.`
            );
        }, 500);
    },

    openRegenWizard: function () {
        UI.closeSetupModal();
        const modal = document.getElementById('onboarding-modal');

        document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));

        const step2 = document.getElementById('ob-step-2');
        step2.classList.remove('hidden', 'opacity-0', 'translate-x-10');

        document.getElementById('ob-progress').style.width = '50%';

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
