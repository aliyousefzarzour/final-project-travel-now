'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AUTH_JS_PATH = path.resolve(__dirname, '..', 'assets', 'js', 'auth.js');

test('login diagnostics do not log response data, user records, or auth tokens', () => {
    const source = fs.readFileSync(AUTH_JS_PATH, 'utf8');
    const start = source.indexOf('async function handleLogin(');
    const nextSection = source.indexOf('// ===================', start + 1);

    assert.notEqual(start, -1, 'handleLogin should exist');
    assert.notEqual(nextSection, -1, 'handleLogin should end before the next section');

    const loginHandler = source.slice(start, nextSection);
    assert.match(loginHandler, /console\.log\('Login response status:',\s*res\.status\)/);
    assert.doesNotMatch(
        loginHandler,
        /console\.(?:log|info|debug)\s*\([^;]*(?:\bdata\b|Storage\.getToken|travelnow-user)/s
    );
});
