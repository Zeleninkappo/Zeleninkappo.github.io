/* =========================================
   MODULE: UI - HISTORY (Log modal, entry manager, session delete)
   ========================================= */

Object.assign(UI, {
    // --- HISTORY MODAL ---
    openHistoryModal: function () {
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
                const exSafe = Utils.escapeHtml(ex);
                const h = allLogs.filter(l => l.ex === ex).sort((a, b) => new Date(b.date) - new Date(a.date));

                const rows = h.map(r => {
                    const w = r.kg > 0 ? `${r.kg}kg` : '<span class="opacity-50 text-[9px]">VLASTNÍ</span>';
                    const dFormatted = Utils.formatDate(r.date);

                    const sessionNote = (Data.state.workout_history[r.sIdx] && Data.state.workout_history[r.sIdx].note) || '';
                    const noteHtml = sessionNote ? `<div class="col-span-4 text-[9px] text-stone-400 italic mt-1 border-t border-stone-100 dark:border-stone-800 pt-1">📝 ${Utils.escapeHtml(sessionNote)}</div>` : '';

                    return `
                    <div onclick="UI.openEntryManager('${exSafe.replace(/'/g, "\\'")}',${r.sIdx},${r.lIdx})" class="grid grid-cols-4 gap-2 text-xs py-3 border-b border-stone-200 dark:border-stone-800 last:border-0 text-stone-600 dark:text-stone-400 cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                        <div class="col-span-1 font-mono opacity-70">${dFormatted}</div>
                        <div class="col-span-1 font-bold text-stone-900 dark:text-white">${w}</div>
                        <div class="col-span-1">${r.sets} x ${r.reps}</div>
                        <div class="col-span-1 text-right uppercase text-[9px] font-bold ${r.rpe === 'easy' ? 'text-green-500' : r.rpe === 'hard' ? 'text-red-500' : 'text-yellow-500'}">${Utils.escapeHtml(r.rpe || '-')}</div>
                        ${noteHtml}
                    </div>`;
                }).join('');

                cont.innerHTML += `
                    <div class="bg-white dark:bg-panel mb-2">
                        <details class="group">
                            <summary class="flex justify-between items-center p-4 cursor-pointer list-none bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors border-b border-stone-200 dark:border-stone-800">
                                <span class="font-bold text-sm text-stone-800 dark:text-stone-200 uppercase">${exSafe}</span>
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

    closeHistoryModal: function () { document.getElementById('history-modal').classList.remove('active'); },

    // --- ENTRY MANAGER ---
    openEntryManager: function (ex, sIdx, lIdx) {
        Logic.activeEditSessionIdx = sIdx;
        Logic.activeEditLogIdx = lIdx;

        const session = Data.state.workout_history[sIdx];
        if (!session || !session.logs[lIdx]) return;
        const log = session.logs[lIdx];

        document.getElementById('mgr-title').innerText = ex; // innerText - bezpečné
        document.getElementById('mgr-kg').value = log.kg;
        document.getElementById('mgr-reps').value = log.reps;
        document.getElementById('mgr-sets').value = log.sets;

        this.setMgrRPE(log.rpe || 'medium');
        document.getElementById('entry-manager-modal').classList.add('active');
    },

    closeEntryManager: function () { document.getElementById('entry-manager-modal').classList.remove('active'); },

    setMgrRPE: function (rpe, btn) {
        const cont = document.getElementById('mgr-rpe-cont');
        Array.from(cont.children).forEach(b => b.classList.remove('selected-easy', 'selected-medium', 'selected-hard'));
        const target = btn || Array.from(cont.children).find(b => b.innerText.toLowerCase() === (rpe === 'medium' ? 'ok' : rpe));
        if (target) target.classList.add(`selected-${rpe}`);
        cont.dataset.selected = rpe;
    },

    openSessionDeleteModal: function () {
        this.closeEntryManager();
        const modal = document.getElementById('session-delete-modal');
        const sessionIdx = Logic.activeEditSessionIdx;
        if (sessionIdx !== null && Data.state.workout_history[sessionIdx]) {
            const dateStr = Data.state.workout_history[sessionIdx].date;
            const d = new Date(dateStr);
            const formattedDate = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
            const dateEl = document.getElementById('del-session-date');
            if (dateEl) dateEl.innerText = formattedDate;
        }
        modal.classList.add('active');
    },

    confirmDeleteSession: function () {
        this.closeEntryManager();
        document.getElementById('session-delete-modal').classList.add('active');
    },

    closeSessionDeleteModal: function () { document.getElementById('session-delete-modal').classList.remove('active'); },
});
