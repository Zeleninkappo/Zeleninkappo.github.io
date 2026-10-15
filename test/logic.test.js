const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load-app');

const { Logic } = loadApp(['config.js', 'utils.js', 'data.js', 'logic.js']);

describe('Logic.calc1RM (Epley formula)', () => {
    test('returns 0 when kg or reps is missing/zero', () => {
        assert.equal(Logic.calc1RM(0, 5), 0);
        assert.equal(Logic.calc1RM(100, 0), 0);
    });

    test('applies the formula even at reps=1 (UI decides whether to display it)', () => {
        // 100 * (1 + 1/30) = 103.33... -> rounds to 103. Deliberately not
        // clamped to kg itself - the original app only hides the *display*
        // at reps<=1, it never special-cased the math.
        assert.equal(Logic.calc1RM(100, 1), 103);
    });

    test('matches the Epley formula kg * (1 + reps/30)', () => {
        // 100kg x 5 reps -> 100 * (1 + 5/30) = 116.666... -> rounds to 117
        assert.equal(Logic.calc1RM(100, 5), 117);
        // 80kg x 10 reps -> 80 * (1 + 10/30) = 106.666... -> rounds to 107
        assert.equal(Logic.calc1RM(80, 10), 107);
    });
});

describe('Logic.calcProgression (RPE autoregulation)', () => {
    const targetReps = 10; // hypertrophy strategy default

    test('calisthenics/no-weight exercises are never auto-progressed', () => {
        const { nextKg, nextReps } = Logic.calcProgression(0, 12, 'easy', targetReps, true);
        assert.equal(nextKg, 0);
        assert.equal(nextReps, 12);
    });

    test('EASY past the progression threshold adds 2.5kg and resets to target reps', () => {
        // threshold = targetReps + max(1, round(targetReps*0.2)) = 10 + 2 = 12
        const { nextKg, nextReps } = Logic.calcProgression(50, 12, 'easy', targetReps, false);
        assert.equal(nextKg, 52.5);
        assert.equal(nextReps, 10);
    });

    test('EASY but below threshold keeps the weight and adds one rep instead', () => {
        const { nextKg, nextReps } = Logic.calcProgression(50, 11, 'easy', targetReps, false);
        assert.equal(nextKg, 50);
        assert.equal(nextReps, 12);
    });

    test('OK (medium) keeps weight and reps unchanged', () => {
        const { nextKg, nextReps } = Logic.calcProgression(50, 10, 'medium', targetReps, false);
        assert.equal(nextKg, 50);
        assert.equal(nextReps, 10);
    });

    test('HARD keeps the weight and backs reps off by one, floored at targetReps - extraRepsNeeded', () => {
        const { nextKg, nextReps } = Logic.calcProgression(50, 10, 'hard', targetReps, false);
        assert.equal(nextKg, 50);
        assert.equal(nextReps, 9);
    });

    test('HARD never drops reps below the strategy floor even on repeated failure', () => {
        // floor = targetReps - extraRepsNeeded = 10 - 2 = 8
        const { nextReps } = Logic.calcProgression(50, 8, 'hard', targetReps, false);
        assert.equal(nextReps, 8);
    });

    test('nextKg is always rounded up to the nearest 2.5kg plate increment', () => {
        const { nextKg } = Logic.calcProgression(51, 10, 'medium', targetReps, false);
        assert.equal(nextKg, 52.5);
    });
});
