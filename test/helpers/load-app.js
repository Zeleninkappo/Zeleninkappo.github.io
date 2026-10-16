// Zelix's app files are plain browser scripts (no module system - loaded via
// <script> tags, state lives in globals like `Data`/`Logic`/`Utils`/`UI`).
// To unit-test the pure logic inside them without a real browser, we run the
// source files in a vm sandbox with minimal localStorage/document stubs and
// read the resulting globals back off the sandbox.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

function createLocalStorage() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };
}

// Loads the given app files (relative to the repo root, in order) into a
// fresh sandbox and returns the sandbox object, so tests can read e.g.
// sandbox.Data, sandbox.Logic, sandbox.Utils.
function loadApp(files) {
    const sandbox = {
        console,
        localStorage: createLocalStorage(),
        navigator: { storage: undefined },
        document: {
            getElementById: () => null,
            createElement: () => ({ click() { }, style: {} }),
            addEventListener() { },
            querySelectorAll: () => [],
        },
    };
    sandbox.window = sandbox; // app scripts sometimes read `window.X` and sometimes bare `X`
    vm.createContext(sandbox);

    for (const file of files) {
        const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
        vm.runInContext(code, sandbox, { filename: file });
    }

    // Top-level `const`/`let` from a classic (non-module) script live in the
    // context's shared lexical environment, not as properties of the context
    // object itself - same as multiple <script> tags in a real page, where
    // `const Utils = {...}` is visible by bare name but not as `window.Utils`.
    // Promote the app's known globals onto the sandbox object so tests can
    // read them back as e.g. `loadApp([...]).Data`.
    const knownGlobals = ['APP_VERSION', 'APP_NAME', 'Utils', 'Data', 'Logic', 'UI'];
    const promote = knownGlobals
        .map(name => `if (typeof ${name} !== 'undefined') globalThis.${name} = ${name};`)
        .join('\n');
    vm.runInContext(promote, sandbox, { filename: '(promote-globals)' });

    return sandbox;
}

module.exports = { loadApp, createLocalStorage };
