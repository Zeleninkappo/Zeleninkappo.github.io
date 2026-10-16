const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load-app');

function freshData() {
    // Fresh sandbox per test so Data.state mutations (saveDB, generateProgram, ...)
    // never leak between tests.
    return loadApp(['config.js', 'utils.js', 'data.js']).Data;
}

// Mirrors exactly how Data.getStreak() derives "today"/"N days ago" date
// strings (local midnight -> toISOString), so streak fixtures line up with
// the function under test regardless of the machine's timezone.
function dateStrDaysAgo(n) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
}

function allDaysTraining() {
    const days = {};
    for (let i = 0; i < 7; i++) days[i] = { type: 'gym', gymTime: '17:00' };
    return days;
}

describe('Data.isNoWeight', () => {
    test('recognizes built-in bodyweight exercises', () => {
        const Data = freshData();
        assert.equal(Data.isNoWeight('Pull Ups'), true);
        assert.equal(Data.isNoWeight('Plank'), true);
    });

    test('recognizes user-added no-weight exercises', () => {
        const Data = freshData();
        Data.state.userNoWeight = ['Pistol Squat'];
        assert.equal(Data.isNoWeight('Pistol Squat'), true);
    });

    test('returns false for a normal weighted exercise', () => {
        const Data = freshData();
        assert.equal(Data.isNoWeight('Bench Press'), false);
    });
});

describe('Data.getRestSeconds', () => {
    test('maps each training goal to its rest duration', () => {
        const Data = freshData();
        Data.state.user.goal = 'strength';
        assert.equal(Data.getRestSeconds(), 210);
        Data.state.user.goal = 'hypertrophy';
        assert.equal(Data.getRestSeconds(), 90);
        Data.state.user.goal = 'endurance';
        assert.equal(Data.getRestSeconds(), 45);
        Data.state.user.goal = 'explosive';
        assert.equal(Data.getRestSeconds(), 120);
    });

    test('falls back to 90s for an unknown/missing goal', () => {
        const Data = freshData();
        Data.state.user.goal = 'does-not-exist';
        assert.equal(Data.getRestSeconds(), 90);
    });
});

describe('Data.getStreak', () => {
    test('counts 0 with no workout history', () => {
        const Data = freshData();
        Data.state.settings.days = allDaysTraining();
        // field-by-field, not assert.deepEqual: the returned object was
        // created inside the vm sandbox realm (different Object.prototype).
        const streak = Data.getStreak();
        assert.equal(streak.current, 0);
        assert.equal(streak.best, 0);
    });

    test('counts consecutive trained days up to (and including) today', () => {
        const Data = freshData();
        Data.state.settings.days = allDaysTraining();
        Data.state.workout_history = [0, 1, 2].map(n => ({ date: dateStrDaysAgo(n), logs: [] }));
        const streak = Data.getStreak();
        assert.equal(streak.current, 3);
    });

    test('does not break the streak just because today has not been trained yet', () => {
        const Data = freshData();
        Data.state.settings.days = allDaysTraining();
        // trained yesterday/day-before, nothing logged yet for today
        Data.state.workout_history = [1, 2, 3].map(n => ({ date: dateStrDaysAgo(n), logs: [] }));
        const streak = Data.getStreak();
        assert.equal(streak.current, 3);
    });

    test('a missed training day resets the current streak', () => {
        const Data = freshData();
        Data.state.settings.days = allDaysTraining();
        // trained today, but a gap at day 2 breaks the chain before day 3
        Data.state.workout_history = [0, 1, 3].map(n => ({ date: dateStrDaysAgo(n), logs: [] }));
        const streak = Data.getStreak();
        assert.equal(streak.current, 2);
    });

    test('best streak tracks the longest historical run, even after it ended', () => {
        const Data = freshData();
        Data.state.settings.days = allDaysTraining();
        // a 4-day run far in the past, then a gap, then today only (current streak = 1)
        Data.state.workout_history = [0, 20, 21, 22, 23].map(n => ({ date: dateStrDaysAgo(n), logs: [] }));
        const streak = Data.getStreak();
        assert.equal(streak.current, 1);
        assert.equal(streak.best, 4);
    });
});

describe('Data.isExerciseAllowed', () => {
    test('allows a custom/unknown exercise name (fail open - Tuning exercises have no metadata)', () => {
        const Data = freshData();
        assert.equal(Data.isExerciseAllowed('Nějaký vlastní cvik', ['dumbbell'], ['knee']), true);
    });

    test('blocks an exercise whose required equipment is not in the allowed list', () => {
        const Data = freshData();
        assert.equal(Data.isExerciseAllowed('Bench Press', ['dumbbell'], []), false); // Bench Press needs barbell
        assert.equal(Data.isExerciseAllowed('Bench Press', ['barbell'], []), true);
    });

    test('an empty equipment list means "no equipment restriction"', () => {
        const Data = freshData();
        assert.equal(Data.isExerciseAllowed('Bench Press', [], []), true);
    });

    test('blocks an exercise whose risk joints intersect the injury list', () => {
        const Data = freshData();
        assert.equal(Data.isExerciseAllowed('Squat', Data.ALL_EQUIPMENT, ['knee']), false);
        assert.equal(Data.isExerciseAllowed('Squat', Data.ALL_EQUIPMENT, ['wrist']), true);
    });

    test('an empty injuries list means "no exclusions"', () => {
        const Data = freshData();
        assert.equal(Data.isExerciseAllowed('Squat', Data.ALL_EQUIPMENT, []), true);
    });
});

describe('Data.buildSession respects equipment/injury constraints', () => {
    test('with only cable equipment, the core slot always picks the one cable exercise (Woodchoppers)', () => {
        const Data = freshData();
        Data.state.user.equipment = ['cable'];
        Data.state.user.injuries = [];
        const strat = Data.strategies.hypertrophy;
        // FB_A picks legs_squat, push_compound, pull_compound, legs_hinge, core (index 4)
        for (let i = 0; i < 15; i++) {
            const session = Data.buildSession('FB_A', 'A', strat);
            assert.equal(session[4], 'Woodchoppers');
        }
    });

    test('excluding the shoulder joint narrows pull_iso to the two elbow-only exercises', () => {
        const Data = freshData();
        Data.state.user.equipment = Data.ALL_EQUIPMENT;
        Data.state.user.injuries = ['shoulder'];
        const strat = Data.strategies.hypertrophy;
        // UPPER_A picks push_compound, pull_compound, push_iso, pull_iso (index 3), core
        for (let i = 0; i < 15; i++) {
            const session = Data.buildSession('UPPER_A', 'A', strat);
            assert.ok(['Biceps Curls', 'Hammer Curls'].includes(session[3]), `unexpected pull_iso pick: ${session[3]}`);
        }
    });

    test('an equipment choice with zero matches in a category falls back to the full category rather than returning nothing', () => {
        const Data = freshData();
        Data.state.user.equipment = ['cable']; // legs_squat has no cable exercises at all
        Data.state.user.injuries = [];
        const strat = Data.strategies.hypertrophy;
        const session = Data.buildSession('FB_A', 'A', strat);
        assert.ok(session[0], 'legs_squat slot should never be empty/undefined');
    });
});

describe('Data.generateProgram', () => {
    for (const daysCount of [3, 4, 5]) {
        test(`${daysCount}x/week schedule assigns exactly ${daysCount} training days`, () => {
            const Data = freshData();
            const schedule = Data.generateProgram('hypertrophy', daysCount);
            assert.equal(Object.keys(schedule).length, daysCount);
        });
    }

    test('every generated exercise comes from the known exercise library', () => {
        const Data = freshData();
        const allLibraryExercises = new Set(Object.values(Data.library).flat());
        const schedule = Data.generateProgram('strength', 4);

        for (const dayIndex of Object.keys(schedule)) {
            for (const week of ['A', 'B']) {
                const session = Data.state.customWorkouts[week][dayIndex];
                assert.ok(session, `missing ${week}/${dayIndex} session`);
                assert.ok(session.exercises.length > 0);
                for (const ex of session.exercises) {
                    assert.ok(
                        allLibraryExercises.has(ex),
                        `"${ex}" is not in any known exercise category`
                    );
                }
            }
        }
    });

    test('persists the generated plan into Data.state.customWorkouts', () => {
        const Data = freshData();
        Data.generateProgram('endurance', 3);
        assert.ok(Data.state.customWorkouts.A);
        assert.ok(Data.state.customWorkouts.B);
    });
});
