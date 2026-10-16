/* =========================================
   MODULE: UI - REPORT (Analýza výkonu report modal, radar chart, markdown)
   ========================================= */

Object.assign(UI, {
    // --- REPORT MODAL ---
    openReportModal: function () {
        this.renderReport();
        document.getElementById('report-modal').classList.add('active');
        this.vibrate(30);
    },

    closeReportModal: function () {
        document.getElementById('report-modal').classList.remove('active');
    },

    renderReport: function () {
        const uName = document.getElementById('report-user-name');
        const uSport = document.getElementById('report-user-sport');
        const uGoal = document.getElementById('report-user-goal');
        const uWorkouts = document.getElementById('report-total-workouts');

        if (uName) uName.innerText = Data.state.user.name || '--';
        if (uSport) uSport.innerText = Data.state.user.sport || '--';
        if (uGoal) uGoal.innerText = Data.state.user.goal || '--';
        if (uWorkouts) uWorkouts.innerText = Data.state.workout_history ? Data.state.workout_history.length : 0;

        const weights = Data.state.bodyweight_history || [];
        if (weights.length > 0) {
            const latest = weights[weights.length - 1];
            document.getElementById('report-current-weight').innerHTML = `${latest.kg}<span class="text-sm text-stone-400 ml-1">kg</span>`;
            if (weights.length > 1) {
                const first = weights[0].kg;
                const diff = (latest.kg - first).toFixed(1);
                const el = document.getElementById('report-weight-delta');
                if (diff > 0) {
                    el.innerText = `+${diff} kg`;
                    el.className = 'text-[10px] font-bold px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50';
                } else {
                    el.innerText = `${diff} kg`;
                    el.className = 'text-[10px] font-bold px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/50';
                }
            }

            if (this.reportWeightChartInst) this.reportWeightChartInst.destroy();
            const ctxW = document.getElementById('reportWeightChart').getContext('2d');
            this.reportWeightChartInst = new Chart(ctxW, {
                type: 'line',
                data: {
                    labels: weights.map(w => Utils.formatDate(w.date)),
                    datasets: [{
                        data: weights.map(w => w.kg),
                        borderColor: '#DC2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        borderWidth: 2, fill: true, tension: 0.3, pointRadius: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: { x: { display: false }, y: { display: false, min: Math.min(...weights.map(w => w.kg)) - 2 } },
                    layout: { padding: 0 }
                }
            });
        }

        const stats = Data.state.exercise_stats || {};
        const trueMaxes = {};

        Object.keys(stats).forEach(ex => {
            if (!Data.isNoWeight(ex)) trueMaxes[ex] = stats[ex].weight || 0;
        });

        const history = Data.state.workout_history || [];
        history.forEach(w => {
            w.logs.forEach(l => {
                if (l.kg > 0 && !Data.isNoWeight(l.ex)) {
                    if (!trueMaxes[l.ex] || l.kg > trueMaxes[l.ex]) {
                        trueMaxes[l.ex] = l.kg;
                    }
                }
            });
        });

        const topLifts = Object.entries(trueMaxes)
            .map(([name, weight]) => ({ name, weight }))
            .sort((a, b) => b.weight - a.weight).slice(0, 6);

        const liftsContainer = document.getElementById('report-top-lifts');
        if (topLifts.length > 0) {
            liftsContainer.innerHTML = topLifts.map((lift, i) => `
                <div class="flex justify-between items-center p-2.5 bg-stone-50 dark:bg-stone-900/50 rounded border border-stone-200 dark:border-stone-800">
                    <div class="flex items-center gap-3">
                        <span class="text-stone-400 font-mono text-[9px]">#0${i + 1}</span>
                        <span class="font-bold text-stone-700 dark:text-stone-200 uppercase text-[11px] truncate max-w-[120px]">${Utils.escapeHtml(lift.name)}</span>
                    </div>
                    <span class="font-black text-primary text-sm whitespace-nowrap">${lift.weight} kg</span>
                </div>
            `).join('');
        } else {
            liftsContainer.innerHTML = `<div class="text-xs text-stone-500 text-center p-4">Zatím žádná data o váhách.</div>`;
        }

        const progressionMap = {};

        history.forEach(w => {
            w.logs.forEach(l => {
                if (l.kg <= 0 || Data.isNoWeight(l.ex)) return;
                if (!progressionMap[l.ex]) {
                    progressionMap[l.ex] = { start: l.kg, currentMax: l.kg, count: 1 };
                } else {
                    progressionMap[l.ex].count++;
                    if (l.kg > progressionMap[l.ex].currentMax) {
                        progressionMap[l.ex].currentMax = l.kg;
                    }
                }
            });
        });

        const progressionRows = Object.entries(progressionMap)
            .filter(([ex, data]) => data.count > 1)
            .sort((a, b) => (b[1].currentMax - b[1].start) - (a[1].currentMax - a[1].start));

        const tableContainer = document.getElementById('report-progression-table');
        if (progressionRows.length > 0) {
            tableContainer.innerHTML = progressionRows.map(([ex, data]) => {
                const diff = data.currentMax - data.start;
                const diffStr = diff > 0 ? `+${diff} kg` : (diff < 0 ? `${diff} kg` : '0 kg');
                const diffClass = diff > 0
                    ? 'text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/30'
                    : 'text-stone-500 bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700';

                return `
                <tr class="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                    <td class="px-4 py-2 font-bold text-stone-800 dark:text-stone-200 truncate max-w-[100px]">${Utils.escapeHtml(ex)}</td>
                    <td class="px-4 py-2 text-center text-stone-500 dark:text-stone-400 font-mono">${data.start}</td>
                    <td class="px-4 py-2 text-center text-stone-900 dark:text-white font-black">${data.currentMax}</td>
                    <td class="px-4 py-2 text-right">
                        <span class="px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${diffClass}">${diffStr}</span>
                    </td>
                </tr>`;
            }).join('');
        } else {
            tableContainer.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-xs text-stone-500">Málo dat pro výpočet progrese. Zaznamenej cvik vícekrát.</td></tr>`;
        }

        // --- RADAR GRAF - ZELIX SYMMETRY ENGINE ---
        let currentBW = 80;
        if (weights.length > 0) {
            currentBW = weights[weights.length - 1].kg;
        }

        const benchmarksBW = {
            'Hrudník': { exercises: ['Bench Press', 'Bench', 'Incline DB Press', 'Flyes'], mult100: 1.5 },
            'Ramena': { exercises: ['Military Press', 'Landmine Press', 'Front Raises'], mult100: 0.8 },
            'Nohy (Dřep)': { exercises: ['Squat', 'Hack Squat', 'Front Squat', 'Leg Press', 'Leg Extension', 'Calf Raise'], mult100: 2.0 },
            'Záda': { exercises: ['T-Bar Row', 'Lat Pulldown', 'Barbell Row', 'Face Pulls', 'Chin Ups'], mult100: 1.5 },
            'Zadní Řet.': { exercises: ['RDL (Romanian DL)', 'Deadlift', 'Leg Curl'], mult100: 2.2 },
            'Paže': { exercises: ['Biceps Curls', 'Skullcrushers'], mult100: 0.6 },
            'Střed Těla': { exercises: ['Russian Twists', 'Ab Wheel', 'Woodchoppers'], mult100: 0.3 }
        };

        const radarLabels = Object.keys(benchmarksBW);
        let baseScores = {};
        let alphaScore = 100;

        radarLabels.forEach(cat => {
            const b = benchmarksBW[cat];
            let highestBaseScore = 0;

            b.exercises.forEach(exName => {
                const userMax = trueMaxes[exName] || 0;

                if (userMax > 0) {
                    let adjustedMult = b.mult100;

                    if (exName === 'Leg Press') adjustedMult = 3.5;
                    if (exName === 'Lat Pulldown') adjustedMult = 1.2;
                    if (exName === 'Flyes') adjustedMult = 1.0;
                    if (exName === 'Front Raises') adjustedMult = 0.3;
                    if (exName === 'Leg Extension') adjustedMult = 1.3;
                    if (exName === 'Leg Curl') adjustedMult = 1.1;
                    if (exName === 'Calf Raise') adjustedMult = 1.8;
                    if (exName === 'Face Pulls') adjustedMult = 0.6;
                    if (exName === 'Russian Twists') adjustedMult = 0.25;

                    const targetWeight = currentBW * adjustedMult;
                    const rawScore = (userMax / targetWeight) * 100;

                    if (rawScore > highestBaseScore) highestBaseScore = rawScore;
                }
            });

            baseScores[cat] = highestBaseScore;
            if (highestBaseScore > alphaScore) alphaScore = highestBaseScore;
        });

        const radarData = [];
        let totalScore = 0;
        let catsWithData = 0;

        radarLabels.forEach(cat => {
            let finalScore = (baseScores[cat] / alphaScore) * 100;
            const finalCatScore = Math.min(99, Math.round(finalScore));

            radarData.push(finalCatScore);
            if (baseScores[cat] > 0) catsWithData++;
            totalScore += finalCatScore;
        });

        const overallEl = document.getElementById('report-overall-score');

        if (catsWithData > 0) {
            const overall = Math.round(totalScore / radarLabels.length);
            overallEl.innerText = overall;
        } else {
            overallEl.innerText = '--';
        }

        if (this.reportRadarChartInst) this.reportRadarChartInst.destroy();
        const ctxRadar = document.getElementById('reportRadarChart').getContext('2d');

        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? '#292524' : '#e5e7eb';
        const labelColor = isDark ? '#a8a29e' : '#57534e';

        this.reportRadarChartInst = new Chart(ctxRadar, {
            type: 'radar',
            data: {
                labels: radarLabels,
                datasets: [{
                    label: 'Silový Index',
                    data: radarData,
                    backgroundColor: 'rgba(220, 38, 38, 0.25)',
                    borderColor: '#DC2626',
                    pointBackgroundColor: '#DC2626',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#DC2626',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: gridColor },
                        grid: { color: gridColor },
                        pointLabels: { color: labelColor, font: { size: 9, family: 'Inter', weight: 'bold' } },
                        ticks: { display: false, min: 0, max: 100, stepSize: 25 }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => ` Skóre: ${ctx.raw} / 100` } }
                }
            }
        });
    },

    parseMarkdown: function (text) {
        // Poznámka: README.md je vlastní obsah appky (ne uživatelský vstup), přesto
        // escapujeme HTML entity PŘED aplikací markdown syntaxe, aby se předešlo
        // jakémukoliv HTML injection, pokud by soubor byl v budoucnu upraven.
        let safe = Utils.escapeHtml(text);
        let html = safe
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/^# (.*$)/gim, '<h1 class="text-xl font-black text-primary uppercase mb-2 mt-4">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-stone-900 dark:text-white uppercase mb-2 mt-4 border-b border-stone-200 dark:border-stone-800 pb-1">$1</h2>')
            .replace(/^### (.*$)/gim, '<h3 class="text-md font-bold text-stone-800 dark:text-stone-200 uppercase mb-1 mt-3">$1</h3>')
            .replace(/\*\*(.*)\*\*/gim, '<strong class="text-stone-900 dark:text-white">$1</strong>')
            .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc marker:text-primary">$1</li>')
            .replace(/^&gt; (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 italic opacity-80 my-2">$1</blockquote>')
            .replace(/^---/gim, '<hr class="my-4 border-stone-200 dark:border-stone-800">')
            .replace(/\n/gim, '<br>');
        return html;
    },
});
