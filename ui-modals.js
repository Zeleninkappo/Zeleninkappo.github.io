/* =========================================
   MODULE: UI - GENERIC MODALS (setup tabs, confirm/alert, weight, wipe, success)
   ========================================= */

Object.assign(UI, {
    // --- MODALS ---
    openSetupModal: function (tab) {
        this.switchTab(tab);
        this.populateScheduleInputs();
        if (Data.state.user) {
            const name = document.getElementById('setup-name'); if (name) name.value = Data.state.user.name || '';
            const sport = document.getElementById('setup-sport'); if (sport) sport.value = Data.state.user.sport || '';
            const mt = (Data.state.user && Data.state.user.mealTimes) ? Data.state.user.mealTimes : { breakfast: '06:15', lunch: '12:00', dinner: '20:00' };
            const tB = document.getElementById('setup-time-breakfast'); if (tB) tB.value = mt.breakfast;
            const tL = document.getElementById('setup-time-lunch'); if (tL) tL.value = mt.lunch;
            const tD = document.getElementById('setup-time-dinner'); if (tD) tD.value = mt.dinner;
        }
        if (Data.state.supplements) {
            document.getElementById('setup-supps-enabled').checked = Data.state.supplements.enabled;
        }
        if (Data.state.settings) {
            const ormFormulaEl = document.getElementById('setup-onerm-formula');
            if (ormFormulaEl) ormFormulaEl.value = Data.state.settings.oneRmFormula || 'epley';
            const plateIncEl = document.getElementById('setup-plate-increment');
            if (plateIncEl) plateIncEl.value = Data.state.settings.plateIncrement || 2.5;
        }
        this.toggleSuppInputs();
        this.renderStackEditor();
        this.renderExerciseEditor();
        this.renderStorageUsage();
        document.getElementById('setup-modal').classList.add('active');
    },

    closeSetupModal: function () { document.getElementById('setup-modal').classList.remove('active'); },

    openWeightModal: function () {
        document.getElementById('new-bodyweight').value = '';
        document.getElementById('weight-modal').classList.add('active');
        setTimeout(() => document.getElementById('new-bodyweight').focus(), 100);
    },

    closeWeightModal: function () { document.getElementById('weight-modal').classList.remove('active'); },

    openConfirmModal: function (title, msg, onConfirm, onCancel) {
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-msg').innerHTML = msg;

        const btnYes = document.getElementById('confirm-btn-yes');
        const newBtnYes = btnYes.cloneNode(true);
        btnYes.parentNode.replaceChild(newBtnYes, btnYes);

        newBtnYes.onclick = () => {
            if (onConfirm) onConfirm();
            this.closeConfirmModal();
        };

        const btnNo = newBtnYes.previousElementSibling;
        const newBtnNo = btnNo.cloneNode(true);
        btnNo.parentNode.replaceChild(newBtnNo, btnNo);

        newBtnNo.onclick = () => {
            if (onCancel) onCancel();
            this.closeConfirmModal();
        };

        const modal = document.getElementById('confirm-modal');
        const content = document.getElementById('confirm-modal-content');
        modal.classList.add('active');
        setTimeout(() => content.classList.remove('scale-95'), 10);
        content.classList.add('scale-100');
        this.vibrate(20);
        setTimeout(() => newBtnNo.focus(), 50); // focus na bezpečnou volbu (Zrušit)
    },

    closeConfirmModal: function () {
        const modal = document.getElementById('confirm-modal');
        const content = document.getElementById('confirm-modal-content');
        content.classList.remove('scale-100'); content.classList.add('scale-95');
        setTimeout(() => modal.classList.remove('active'), 150);
    },

    openAlertModal: function (title, msg) {
        document.getElementById('alert-title').innerText = title;
        document.getElementById('alert-msg').innerHTML = msg;
        const modal = document.getElementById('alert-modal');
        const content = document.getElementById('alert-modal-content');
        modal.classList.add('active');
        setTimeout(() => content.classList.remove('scale-95'), 10);
        content.classList.add('scale-100');
        this.vibrate(50);
    },

    closeAlertModal: function () {
        const modal = document.getElementById('alert-modal');
        const content = document.getElementById('alert-modal-content');
        content.classList.remove('scale-100'); content.classList.add('scale-95');
        setTimeout(() => modal.classList.remove('active'), 150);
    },

    switchTab: function (t) {
        ['system', 'user', 'supps', 'exercises'].forEach(x => {
            document.getElementById(`tab-content-${x}`).classList.add('hidden');
            document.getElementById(`tab-btn-${x}`).classList.remove('active');
        });
        document.getElementById(`tab-content-${t}`).classList.remove('hidden');
        document.getElementById(`tab-btn-${t}`).classList.add('active');
    },

    openDuplicateModal: function () { document.getElementById('duplicate-modal').classList.add('active'); },

    closeDuplicateModal: function () { document.getElementById('duplicate-modal').classList.remove('active'); },

    openHelpModal: function () {
        const modal = document.getElementById('help-modal');
        const content = document.getElementById('help-content');
        modal.classList.add('active');
        content.innerHTML = '<p class="text-stone-400 text-center">Načítám manuál...</p>';

        fetch('README.md')
            .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
            })
            .then(text => {
                content.innerHTML = this.parseMarkdown(text);
            })
            .catch(() => {
                content.innerHTML = '<p class="text-red-500">Nepodařilo se načíst manuál offline. Zkontroluj připojení a otevři appku znovu, aby se README nacachovalo.</p>';
            });
    },

    closeHelpModal: function () {
        document.getElementById('help-modal').classList.remove('active');
    },

    openWipeModal: function () { document.getElementById('wipe-modal').classList.add('active'); },

    closeWipeModal: function () { document.getElementById('wipe-modal').classList.remove('active'); },

    // --- GENERIC SUCCESS MODAL ---
    openSuccessModal: function (title, msg) {
        document.getElementById('success-title').innerText = title;
        document.getElementById('success-msg').innerHTML = msg;

        const modal = document.getElementById('success-modal');
        const content = document.getElementById('success-modal-content');

        modal.classList.add('active');
        setTimeout(() => content.classList.remove('scale-95'), 50);
        content.classList.add('scale-100');

        this.vibrate([50, 50]);
    },

    closeSuccessModal: function () {
        const modal = document.getElementById('success-modal');
        const content = document.getElementById('success-modal-content');

        content.classList.remove('scale-100');
        content.classList.add('scale-95');

        setTimeout(() => modal.classList.remove('active'), 150);
    },
});
