const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load-app');

const { Utils } = loadApp(['utils.js']);

test('escapeHtml neutralizes the five XSS-relevant characters', () => {
    assert.equal(
        Utils.escapeHtml(`<img src=x onerror="alert('xss')">`),
        '&lt;img src=x onerror=&quot;alert(&#039;xss&#039;)&quot;&gt;'
    );
});

test('escapeHtml tolerates null/undefined (common for optional fields like notes)', () => {
    assert.equal(Utils.escapeHtml(null), '');
    assert.equal(Utils.escapeHtml(undefined), '');
});

test('escapeHtml coerces non-strings (e.g. numbers) instead of throwing', () => {
    assert.equal(Utils.escapeHtml(42), '42');
});

test('clamp keeps values within [min, max]', () => {
    assert.equal(Utils.clamp(5, 0, 10), 5);
    assert.equal(Utils.clamp(-5, 0, 10), 0);
    assert.equal(Utils.clamp(50, 0, 10), 10);
});

test('formatDate converts an ISO date to cs-CZ dd.mm.yyyy', () => {
    assert.equal(Utils.formatDate('2026-03-05'), '05.03.2026');
    assert.equal(Utils.formatDate('2026-03-05T10:00:00.000Z'), '05.03.2026');
});

test('formatDate falls back on an empty/missing date', () => {
    assert.equal(Utils.formatDate(''), '--.--.----');
    assert.equal(Utils.formatDate(null), '--.--.----');
});

test('safeParse returns the parsed value for valid JSON', () => {
    // compared via JSON round-trip, not assert.deepEqual: the parsed object
    // was created inside the vm sandbox realm, so it has a different
    // Object.prototype than a literal written in this test file, which
    // deepStrictEqual (what assert/strict aliases deepEqual to) rejects.
    assert.equal(JSON.stringify(Utils.safeParse('{"a":1}', null)), JSON.stringify({ a: 1 }));
});

test('safeParse returns the fallback instead of throwing on invalid JSON', () => {
    assert.equal(Utils.safeParse('{not json', 'fallback'), 'fallback');
});

test('safeParse returns the fallback for a JSON literal null (ambiguous "no data")', () => {
    assert.equal(Utils.safeParse('null', 'fallback'), 'fallback');
});
