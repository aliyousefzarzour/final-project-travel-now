/**
 * Bug Condition Exploration Test — Property 1
 * ============================================
 * Validates: Requirements 1.1, 1.2, 1.3
 *
 * GOAL: Prove the bug exists in `pages/payment.html`.
 *
 * The bug condition (isBugCondition) is:
 *   submission.callsBookingAPI      = true   ← POST /api/bookings IS called
 *   submission.callsPaymentConfirmAPI = false ← POST /api/payments/confirm is NOT called
 *
 * This test asserts the EXPECTED / CORRECT behavior:
 *   "pages/payment.html MUST contain a fetch call to api/payments/confirm"
 *
 * Because the current code does NOT have that call, this test is EXPECTED TO FAIL
 * on unfixed code — the failure IS the proof of the bug.
 *
 * DO NOT fix the code or the test when it fails.
 * Counterexamples found here will be documented below once the test runs.
 */

'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('node:fs');
const path     = require('node:path');

// ── Path to the file under investigation ──────────────────────────────────────
const PAYMENT_HTML_PATH = path.resolve(__dirname, '..', 'pages', 'payment.html');

// ── Helper: read the source file ──────────────────────────────────────────────
function readPaymentHtml() {
    return fs.readFileSync(PAYMENT_HTML_PATH, 'utf8');
}

// ── Helper: extract all fetch() call URLs from the source ─────────────────────
function extractFetchUrls(source) {
    const urls = [];
    // Matches: fetch('...') or fetch("...") or fetch(`...`)
    const fetchRegex = /fetch\(\s*[`'"](.*?)[`'"]/g;
    let match;
    while ((match = fetchRegex.exec(source)) !== null) {
        urls.push(match[1]);
    }
    return urls;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — Static source inspection
// Asserts that the submit handler contains a call to api/payments/confirm.
// EXPECTED TO FAIL on unfixed code (proves bug condition is met).
// ─────────────────────────────────────────────────────────────────────────────
test('Property 1 — Bug Condition: pages/payment.html must call POST /api/payments/confirm after booking', () => {
    const source = readPaymentHtml();

    // ── Verify the booking call IS present (confirms we're testing the right file)
    const hasBookingCall = source.includes('../api/bookings') || source.includes('/api/bookings');
    assert.ok(
        hasBookingCall,
        'PRECONDITION: expected pages/payment.html to contain a fetch call to /api/bookings — ' +
        'file may be wrong or path may have changed'
    );

    // ── The actual bug condition assertion ────────────────────────────────────
    // This MUST fail on unfixed code.
    // When it fails, it proves isBugCondition(submission) = true:
    //   callsBookingAPI = true, callsPaymentConfirmAPI = false
    const hasPaymentConfirmCall =
        source.includes('api/payments/confirm') ||
        source.includes('../api/payments/confirm') ||
        source.includes('/api/payments/confirm');

    assert.ok(
        hasPaymentConfirmCall,
        'BUG DETECTED — pages/payment.html does NOT contain any fetch call to ' +
        'api/payments/confirm.\n\n' +
        'Counterexample found:\n' +
        '  - POST /api/bookings is called (booking is created)\n' +
        '  - POST /api/payments/confirm is NEVER called (Payment collection stays empty)\n' +
        '  - Admin panel shows "No payments found" despite bookings existing\n\n' +
        'This failure confirms isBugCondition(submission) = true:\n' +
        '  submission.callsBookingAPI        = true\n' +
        '  submission.callsPaymentConfirmAPI = false'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — Enumerate all fetch() calls (diagnostic / documentation)
// Always passes — documents what IS in the file so the counterexample is clear.
// ─────────────────────────────────────────────────────────────────────────────
test('Diagnostic — enumerate all fetch() URLs found in pages/payment.html', () => {
    const source = readPaymentHtml();
    const urls   = extractFetchUrls(source);

    console.log('\n=== Fetch calls found in pages/payment.html ===');
    if (urls.length === 0) {
        console.log('  (none detected by regex)');
    } else {
        urls.forEach((url, i) => console.log(`  [${i + 1}] ${url}`));
    }

    const hasConfirm = urls.some(u => u.includes('payments/confirm'));
    console.log('\n=== Bug Condition Summary ===');
    console.log('  POST /api/bookings present:         ', urls.some(u => u.includes('api/bookings')));
    console.log('  POST /api/payments/confirm present: ', hasConfirm);
    console.log('  isBugCondition(submission):         ', !hasConfirm);
    console.log('');

    // This test always passes — it's purely diagnostic / counterexample documentation
    assert.ok(true, 'Diagnostic test always passes');
});
