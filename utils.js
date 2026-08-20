/* =========================================
   MODULE: UTILS (Sdílené helpery)
   Bezpečnost, formátování, výkon.
   Načítá se JAKO PRVNÍ ze všech vlastních modulů.
   ========================================= */

const Utils = {
    /**
     * Escapuje HTML entity - POVINNÉ pro každý string, který pochází
     * od uživatele (název cviku, suplementu, poznámka, jméno...) a
     * vkládá se přes innerHTML. Zabraňuje Stored XSS (např. přes Import
     * upraveného JSON souboru nebo zadání "<img src=x onerror=...>" jako
     * název cviku).
     */
    escapeHtml: function (str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    debounce: function (fn, delay) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    clamp: function (n, min, max) {
        return Math.min(Math.max(n, min), max);
    },

    formatDate: function (dateStr) {
        if (!dateStr) return '--.--.----';
        return dateStr.split('T')[0].split('-').reverse().join('.');
    },

    // Bezpečné parsování JSON - nikdy nevyhodí výjimku, vrátí fallback
    safeParse: function (str, fallback) {
        try {
            const v = JSON.parse(str);
            return v === null || v === undefined ? fallback : v;
        } catch (e) {
            return fallback;
        }
    },

    formatBytes: function (bytes) {
        if (bytes === null || bytes === undefined || isNaN(bytes)) return '--';
        const mb = bytes / (1024 * 1024);
        return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(2)} MB`;
    },

    // Odhad využitého úložiště (Storage API) - graceful fallback na starších prohlížečích
    getStorageEstimate: async function () {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                return await navigator.storage.estimate();
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    // UUID fallback pro prohlížeče/kontexty bez crypto.randomUUID (starší WebView)
    uuid: function () {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
};
