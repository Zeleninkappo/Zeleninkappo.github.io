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

    test('defaults to Epley when no formula is given (backward compatible)', () => {
        assert.equal(Logic.calc1RM(100, 5), Logic.calc1RM(100, 5, 'epley'));
    });
});

describe('Logic.calc1RM (Brzycki formula)', () => {
    test('matches kg * 36 / (37 - reps)', () => {
        assert.equal(Logic.calc1RM(100, 5, 'brzycki'), 113);
        assert.equal(Logic.calc1RM(80, 10, 'brzycki'), 107);
    });

    test('returns 0 at reps >= 37 instead of dividing by zero/negative', () => {
        assert.equal(Logic.calc1RM(100, 37, 'brzycki'), 0);
        assert.equal(Logic.calc1RM(100, 40, 'brzycki'), 0);
    });
});

describe('Logic.calc1RM (Lombardi formula)', () => {
    test('matches kg * reps^0.10', () => {
        assert.equal(Logic.calc1RM(100, 5, 'lombardi'), 117);
        assert.equal(Logic.calc1RM(80, 10, 'lombardi'), 101);
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

    test('nextKg is always rounded up to the nearest 2.5kg plate increment by default', () => {
        const { nextKg } = Logic.calcProgression(51, 10, 'medium', targetReps, false);
        assert.equal(nextKg, 52.5);
    });

    test('a custom plate increment (opts.increment) is used for both the jump size and rounding', () => {
        const threshold = 12; // targetReps(10) + max(1, round(10*0.2))
        const easy = Logic.calcProgression(50, threshold, 'easy', targetReps, false, { increment: 1.25 });
        assert.equal(easy.nextKg, 51.25);

        const rounding = Logic.calcProgression(51, 10, 'medium', targetReps, false, { increment: 5 });
        assert.equal(rounding.nextKg, 55);
    });

    test('consecutiveHard resets to 0 on EASY or OK, even if it was building up', () => {
        const easy = Logic.calcProgression(50, 12, 'easy', targetReps, false, { consecutiveHard: 2 });
        assert.equal(easy.consecutiveHard, 0);
        const medium = Logic.calcProgression(50, 10, 'medium', targetReps, false, { consecutiveHard: 2 });
        assert.equal(medium.consecutiveHard, 0);
    });

    test('HARD increments consecutiveHard without triggering a deload below the threshold', () => {
        const { nextKg, consecutiveHard, deload } = Logic.calcProgression(50, 10, 'hard', targetReps, false, { consecutiveHard: 1 });
        assert.equal(consecutiveHard, 2);
        assert.equal(deload, false);
        assert.equal(nextKg, 50); // still just the normal HARD hold, no deload yet
    });

    test('3 consecutive HARD results trigger a 10% deload and reset reps/counter', () => {
        const { nextKg, nextReps, consecutiveHard, deload } = Logic.calcProgression(100, 10, 'hard', targetReps, false, { consecutiveHard: 2 });
        assert.equal(deload, true);
        assert.equal(nextKg, 90); // 100 * 0.9 = 90, already a 2.5kg multiple
        assert.equal(nextReps, targetReps);
        assert.equal(consecutiveHard, 0);
    });

    test('a deload at bodyweight-adjacent loads still rounds to the plate increment', () => {
        const { nextKg } = Logic.calcProgression(51, 10, 'hard', targetReps, false, { consecutiveHard: 2 });
        // 51 * 0.9 = 45.9 -> rounds up to the next 2.5kg increment = 47.5
        assert.equal(nextKg, 47.5);
    });

    test('isNoWeight exercises never trigger a deload (weight is never touched)', () => {
        const { nextKg, deload, consecutiveHard } = Logic.calcProgression(0, 5, 'hard', targetReps, true, { consecutiveHard: 2 });
        assert.equal(deload, false);
        assert.equal(nextKg, 0);
        assert.equal(consecutiveHard, 0); // isNoWeight path never updates the counter
    });
});
