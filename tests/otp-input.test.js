'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const OTP_PAGES = [
    path.resolve(__dirname, '..', 'pages', 'forgot-password.html'),
    path.resolve(__dirname, '..', 'pages', 'company-verify-email.html')
];

for (const pagePath of OTP_PAGES) {
    test(`${path.basename(pagePath)} sanitizes OTP input and distributes pasted codes`, () => {
        const source = fs.readFileSync(pagePath, 'utf8');

        assert.match(source, /d\.value\s*=\s*d\.value\.replace\(\/\\D\/g,\s*''\)\.slice\(-1\)/);
        assert.ok(source.includes("addEventListener('paste'"));
        assert.ok(source.includes('autocomplete="one-time-code"'));
        assert.equal((source.match(/aria-label="Digit \d of 6"/g) || []).length, 6);
    });
}
