/* =========================================
   MODULE: UI - CORE (app shell, dashboard, theme, toasts, chart)
   ========================================= */

const UI = {
    chartInst: null,
    reportWeightChartInst: null,
    reportRadarChartInst: null,

    init: function () {
        document.title = `${APP_NAME} v${APP_VERSION}`;
        const verEl = document.getElementById('app-version-label');
        if (verEl) verEl.innerText = `${APP_NAME} v${APP_VERSION}`;

        this.applyTheme();
        this.populateChartSelect();
        this.updateUserGreeting();
        this.updateStreakBadge();
        this.checkNotificationStatus();
        this.bindGlobalKeys();
        this.bindSystemThemeListener();
        this.bindInstallPrompt();

        setTimeout(() => this.checkFirstRun(), 500);
    },

    // Escape na klávesu zavře poslední otevřený modál - drobné, ale znatelné UX zlepšení
    bindGlobalKeys: function () {
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const openModals = Array.from(document.querySelectorAll('.modal.active'));
            if (openModals.length === 0) return;
            const top = openModals[openModals.length - 1];
            if (top.id === 'setup-modal') this.closeSetupModal();
            else if (top.id === 'workout-modal') this.closeWorkoutModal();
            else if (top.id === 'history-modal') this.closeHistoryModal();
            else if (top.id === 'help-modal') this.closeHelpModal();
            else if (top.id === 'report-modal') this.closeReportModal();
            else if (top.id === 'weight-modal') this.closeWeightModal();
            else if (top.id === 'entry-manager-modal') this.closeEntryManager();
            else if (top.id === 'confirm-modal') this.closeConfirmModal();
            else if (top.id === 'alert-modal') this.closeAlertModal();
        });
    },

    // Pokud je motiv 'auto', appka teď reaguje na živou změnu systémového dark/light modu
    // (dřív se přepočítalo jen při reloadu appky).
    bindSystemThemeListener: function () {
        if (!window.matchMedia) return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => { if (Data.state.settings.theme === 'auto') this.applyTheme(); };
        if (mq.addEventListener) mq.addEventListener('change', handler);
        else if (mq.addListener) mq.addListener(handler); // starší WebView na S24 sérii apod.
    },

    // Zachytí nativní 'Přidat na plochu' prompt prohlížeče a nabídne vlastní tlačítko
    // v Nastavení (Chrome jinak nabídku zobrazí jen jednou svým vlastním UI).
    bindInstallPrompt: function () {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window.__zelixInstallPrompt = e;
            const btn = document.getElementById('btn-install-app');
            if (btn) btn.classList.remove('hidden');
        });
        window.addEventListener('appinstalled', () => {
            window.__zelixInstallPrompt = null;
            const btn = document.getElementById('btn-install-app');
            if (btn) btn.classList.add('hidden');
            this.showToast('Zelix nainstalován na plochu 🚀', 'success');
        });
    },

    checkFirstRun: function () {
        if (!Data.state.user || !Data.state.user.name || Data.state.user.name === 'Sportovec') {
            const modal = document.getElementById('onboarding-modal');
            if (modal) modal.classList.add('active');
        }
    },

    vibrate: function (pattern) {
        if ("vibrate" in navigator) {
            try { navigator.vibrate(pattern); } catch (e) { /* vibrace blokována - nevadí */ }
        }
    },

    applyTheme: function () {
        const html = document.documentElement;
        const theme = (Data.state.settings && Data.state.settings.theme) ? Data.state.settings.theme : 'auto';
        const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) html.classList.add('dark'); else html.classList.remove('dark');
        this.updateThemeButtons();
    },

    requestNotifications: function () {
        if (!("Notification" in window)) {
            this.openAlertModal('Nepodporováno', 'Tvůj prohlížeč nepodporuje notifikace.');
            return;
        }
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                const btn = document.getElementById('btn-notify-req');
                if (btn) { btn.innerText = "AKTIVNÍ ✓"; btn.disabled = true; btn.classList.add('text-green-500'); }

                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(function (registration) {
                        registration.showNotification("Zelix: Notifikace aktivní!", {
                            body: "Teď už nic nezmeškáš.",
                            icon: "icon-192.png",
                            vibrate: [200, 100, 200]
                        }).catch(() => { });
                    });
                } else {
                    try { new Notification("Zelix: Notifikace aktivní!", { body: "Teď už nic nezmeškáš.", icon: "icon-192.png" }); } catch (e) { }
                }
            }
            this.checkNotificationStatus();
        });
    },

    checkNotificationStatus: function () {
        const btn = document.getElementById('btn-notify-req');
        if (!btn || !("Notification" in window)) return;

        if (Notification.permission === "granted") {
            btn.innerText = "AKTIVNÍ ✓";
            btn.disabled = true;
            btn.classList.add('text-green-500', 'cursor-default');
            btn.classList.remove('hover:bg-primary', 'hover:text-white');
        } else if (Notification.permission === "denied") {
            btn.innerText = "ZAKÁZÁNO 🚫";
            btn.classList.add('text-red-500');
        }
    },

    updateThemeButtons: function () {
        ['light', 'dark', 'auto'].forEach(m => {
            const btn = document.getElementById(`theme-${m}`);
            if (!btn) return;
            const active = Data.state.settings.theme === m;
            if (active) {
                btn.classList.add('ring-2', 'ring-primary', 'border-primary');
            } else {
                btn.classList.remove('ring-2', 'ring-primary', 'border-primary');
            }
        });
    },

    updateUserGreeting: function () {
        const el = document.getElementById('user-greeting');
        if (el && Data.state.user) el.innerText = `Čau, ${Data.state.user.name}`; // innerText = bezpečné, žádné HTML parsování
    },

    updateWeekBadge: function (week) {
        const el = document.getElementById('week-badge');
        if (el) el.innerText = `TÝDEN: ${week}`;
    },

    updateDayBadge: function (text) {
        const el = document.getElementById('day-badge');
        if (el) el.innerText = text;
    },

    updateStreakBadge: function () {
        const el = document.getElementById('streak-badge');
        if (!el) return;
        const s = Data.getStreak();
        if (s.current > 0) {
            el.classList.remove('hidden');
            el.innerText = `🔥 ${s.current}`;
            el.title = `Aktuální série: ${s.current} tréninkových dnů v řadě. Nejlepší: ${s.best}.`;
        } else {
            el.classList.add('hidden');
        }
    },

    // --- GENERICKÝ TOAST (rychlá nerušivá zpětná vazba, alternativa k Alert modálu) ---
    _toastTimeout: null,

    showToast: function (msg, type, duration) {
        const el = document.getElementById('zelix-toast');
        if (!el) return;
        clearTimeout(this._toastTimeout);
        el.innerText = msg;
        el.className = `zelix-toast active toast-${type || 'info'}`;
        this._toastTimeout = setTimeout(() => { el.classList.remove('active'); }, duration || 2600);
    },

    updateLiveTime: function (now) {
        const timeEl = document.getElementById('live-time');
        const dateEl = document.getElementById('live-date');
        if (timeEl) timeEl.innerText = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        if (dateEl) {
            const days = ['NEDĚLE', 'PONDĚLÍ', 'ÚTERÝ', 'STŘEDA', 'ČTVRTEK', 'PÁTEK', 'SOBOTA'];
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            dateEl.innerText = `${days[now.getDay()]} ${day}.${month}.${now.getFullYear()}`;
        }
    },

    renderTimeline: function (evs) {
        const c = document.getElementById('timeline-list');
        if (!c) return;
        c.innerHTML = '';
        const today = new Date().toISOString().split('T')[0];
        const done = Data.state.completed_tasks[today] || [];

        evs.forEach((ev, i) => {
            const taskId = `${ev.time}|${ev.title}`;
            const isDone = done.includes(taskId);

            const check = isDone ? '<span class="text-green-500 font-bold">✓</span>' : `<span class="w-1.5 h-1.5 rounded-full ${ev.type === 'urgent' ? 'bg-red-500 animate-pulse' : 'bg-stone-400 dark:bg-stone-600'}"></span>`;

            c.innerHTML += `
                <div onclick="Logic.toggleTask(${i})" class="flex items-center gap-3 text-sm p-1 rounded transition-colors cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/50">
                    <span class="font-mono text-[10px] text-stone-500 w-10 text-right ${isDone ? 'opacity-30' : ''}">${Utils.escapeHtml(ev.time)}</span>
                    <div class="flex items-center justify-center w-4 h-4">${check}</div>
                    <span class="${isDone ? 'text-stone-400 dark:text-stone-600 line-through decoration-stone-300' : 'font-bold text-stone-700 dark:text-stone-200'} truncate uppercase text-[11px] select-none">${Utils.escapeHtml(ev.title)}</span>
                </div>`;
        });
    },

    renderActionCard: function (f, ev, mins, now) {
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

        title.innerText = ev.title; // innerText - bezpečné
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

    toggleForceRestBtn: function (isActive) {
        const btn = document.getElementById('btn-force-rest');
        if (isActive) {
            btn.classList.remove('bg-stone-200', 'dark:bg-stone-900', 'text-stone-600');
            btn.classList.add('bg-green-600', 'text-white');
        } else {
            btn.classList.add('bg-stone-200', 'dark:bg-stone-900', 'text-stone-600');
            btn.classList.remove('bg-green-600', 'text-white');
        }
    },

    // --- STORAGE USAGE (Nastavení -> Systém) ---
    renderStorageUsage: async function () {
        const el = document.getElementById('storage-usage-label');
        if (!el) return;
        el.innerText = 'Počítám...';
        const est = await Utils.getStorageEstimate();
        if (est && typeof est.usage === 'number' && typeof est.quota === 'number' && est.quota > 0) {
            const pct = ((est.usage / est.quota) * 100).toFixed(1);
            el.innerText = `${Utils.formatBytes(est.usage)} / ${Utils.formatBytes(est.quota)} (${pct}%)`;
        } else {
            el.innerText = 'Nedostupné v tomto prohlížeči';
        }
    },

    // --- PWA: Instalace na plochu ---
    installApp: function () {
        const prompt = window.__zelixInstallPrompt;
        if (!prompt) return;
        prompt.prompt();
        prompt.userChoice.finally(() => {
            window.__zelixInstallPrompt = null;
            const btn = document.getElementById('btn-install-app');
            if (btn) btn.classList.add('hidden');
        });
    },

    // --- PWA: Toast s upozorněním na novou verzi ---
    showUpdateToast: function (registration) {
        const el = document.getElementById('update-toast');
        if (!el) return;
        el.classList.add('active');
        const btn = document.getElementById('update-toast-btn');
        if (btn) {
            btn.onclick = () => {
                if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                el.classList.remove('active');
            };
        }
    },

    // --- CHART ---
    populateChartSelect: function () {
        const s = document.getElementById('chart-select');
        const c = s.value;
        const ex = new Set();
        if (Data.state.workout_history) Data.state.workout_history.forEach(x => x.logs.forEach(l => ex.add(l.ex)));

        s.innerHTML = '';

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
        else if (ex.size > 0) this.updateChart('Bodyweight');
    },

    updateChart: function (exName) {
        const ctx = document.getElementById('progressChart').getContext('2d');
        const tC = document.documentElement.classList.contains('dark') ? '#a8a29e' : '#57534e';
        const gC = document.documentElement.classList.contains('dark') ? '#292524' : '#e5e7eb';

        let labels = [], d1 = [], d2 = [], label1 = '', label2 = '', showY1 = false;

        if (exName === 'Bodyweight') {
            const h = Data.state.bodyweight_history || [];
            labels = h.map(x => Utils.formatDate(x.date));
            d1 = h.map(x => x.kg);
            label1 = 'Váha (kg)';
        }
        else {
            const h = Data.state.workout_history.filter(x => x.logs.some(l => l.ex === exName));
            labels = h.map(x => Utils.formatDate(x.date));
            d1 = h.map(x => { const l = x.logs.find(y => y.ex === exName); return l ? l.kg : 0; });
            d2 = h.map(x => { const l = x.logs.find(y => y.ex === exName); return l ? (l.sets * l.reps) : 0; });
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
