'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootPayment = path.resolve(__dirname, '..', 'pages', 'payment.html');
const duplicatePayment = path.resolve(__dirname, '..', 'TravelNow1', 'pages', 'payment.html');
const postsPage = path.resolve(__dirname, '..', 'pages', 'posts.html');

test('active checkout redirects card entry to Paymob and renders server-owned payment states', () => {
    const source = fs.readFileSync(rootPayment, 'utf8');
    assert.match(source, /TEST MODE/);
    assert.match(source, /checkout\.checkoutUrl/);
    assert.match(source, /api\/payments\/booking\//);
    assert.match(source, /cancel-booking/);
    assert.match(source, /api\/bookings\/.*\/cancel/);
    for (const status of ['pending', 'succeeded', 'failed', 'cancelled']) {
        assert.ok(source.includes(`${status}:`), `missing ${status} UI state`);
    }
    assert.doesNotMatch(source, /name="(?:cardNumber|cvv|expiry)"/i);
    assert.doesNotMatch(source, /api\/payments\/confirm|pi_demo_/);
    assert.doesNotMatch(source, /params\.get\(['"]success['"]\)/);

    for (const [index, match] of [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].entries()) {
        if (match[1].trim()) new vm.Script(match[1], { filename: `${rootPayment}:inline-${index}` });
    }
});

test('stale duplicate payment page forwards to the active secure checkout without collecting card data', () => {
    const source = fs.readFileSync(duplicatePayment, 'utf8');
    assert.match(source, /location\.replace/);
    assert.match(source, /destination\.search = location\.search/);
    assert.doesNotMatch(source, /cardNumber|name="cvv"|payments\/confirm|pi_demo_/i);
});

test('proposal checkout URL carries identifiers only, not client-supplied price evidence', () => {
    const source = fs.readFileSync(postsPage, 'utf8');
    assert.match(source, /new URLSearchParams\(\{\s*postId,\s*proposalId\s*\}\)/);
    assert.doesNotMatch(source, /price:\s*data\.proposal\.price/);
});
