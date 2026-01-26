/* =========================================
   MODULE: LOGIC (Calculations & Processing)
   ========================================= */

const Logic = {
    currentWeekType: 'A',
    currentSessionExercises: [],
    currentSchedule: [],
    forceRest: false,
    nextIdx: 0,
    tempActiveRPEs: {},
    activeEditSessionIdx: null,
    activeEditLogIdx: null,
    
    // NOVÉ: Pamatujeme si seznam ID událostí, které jsme dnes už oznámili
    notifiedEvents: [], 
    lastCheckDate: null,

    init: function() {
        this.calculateWeekType();
        this.startLoop();
    },

    startLoop: function() {
        this.update();
        // Kontrola každých 5 sekund (šetří baterii víc než 1s, ale stále dost přesné)
        setInterval(() => {
            const now = new Date();
            this.updateDashboard(now);
            this.checkNotifications(now); 
        }, 5000);
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
            const evMins = h * 60 + m;
            
            // Logika pro "Následuje": Zobrazujeme to, co je v budoucnu, nebo co probíhá max 60 min
            if (((evMins > mins) || (evMins <= mins && mins - evMins < 60)) && !done.includes(i)) {
                f = i;
                break;
            }
        }
        
        this.nextIdx = f;
        if(f !== -1) UI.renderActionCard(f, this.currentSchedule[f], mins, now);
        else UI.renderActionCard(-1, null, mins, now);
    },

    checkNotifications: function(now) {
        if (Notification.permission !== "granted") return;

        // Reset pole notifikací, pokud je nový den
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

            // Upozornit v rozmezí 10 až 9 minut předem (pro jistotu, kdyby loop přeskočil sekundu)
            // A ZÁROVEŇ pokud jsme tuto událost (index i) dnes ještě neohlásili
            if (diff <= 10 && diff > 8 && !this.notifiedEvents.includes(i)) {
                
                this.notifiedEvents.push(i); // Přidáme do seznamu ohlášených
                
                let body = `Za 10 minut: ${ev.title}`;
                if (ev.type === 'food') body = `🍽️ Nezapomeň se najíst: ${ev.title}`;
                if (ev.type === 'activity') body = `🏋️ Připrav se! Trénink za 10 min.`;
                if (ev.type === 'supp') body = `💊 Čas na suplementy: ${ev.title}`;

                // Odeslání přes Service Worker
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(function(registration) {
                        registration.showNotification("Zelix Reminder", {
                            body: body,
                            icon: "icon-192.png",
                            vibrate: [200, 100, 200],
                            tag: `zelix-evt-${i}`, // Unikátní tag pro každou událost
                            renotify: true
                        });
                    });
                } else {
                    new Notification("Zelix Reminder", { body: body, icon: "icon-192.png" });
                }
            }
        });
    },

    addMin: function(t, m) {
        if(!t) return "--:--";
        const [hh, mm] = t.split
