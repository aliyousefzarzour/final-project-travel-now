# Implementation Plan

## Overview

هذه المهام تُصلح الـ bug في `pages/payment.html` حيث لا يُستدعى `POST /api/payments/confirm` بعد نجاح الـ booking، مما يجعل جدول الـ Payments في لوحة الأدمن فارغاً دائماً. المنهجية تتبع نمط الاستكشاف أولاً (Explore → Preserve → Implement → Validate).

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3.1", "3.2"] },
    { "wave": 4, "tasks": ["3.3"] },
    { "wave": 5, "tasks": ["3.4", "3.5"] },
    { "wave": 6, "tasks": ["4"] }
  ]
}
```

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Payment Confirm API Never Called
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate that `POST /api/payments/confirm` is never called after a successful booking
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — any completed payment form submission (regular offer flow OR proposal flow) where `POST /api/bookings` succeeds
  - Test: open `pages/payment.html`, fill card data, submit → intercept/spy on `fetch` calls → assert that `fetch` was called with a URL matching `../api/payments/confirm` (from Bug Condition in design: `isBugCondition(submission)` where `submission.callsBookingAPI = true AND submission.callsPaymentConfirmAPI = false`)
  - The assertion should match Expected Behavior (Property 1 in design): after successful booking, `POST /api/payments/confirm` SHALL be called with `{ paymentIntentId, bookingId, cardBrand, cardLast4, amount }`
  - Run test on **UNFIXED** code
  - **EXPECTED OUTCOME**: Test FAILS — no call to `../api/payments/confirm` is made (proves the bug exists)
  - Document counterexamples found (e.g., "After booking creation, fetch log shows only POST /api/bookings — no payment confirm call at all")
  - Mark task complete when test is written, run, and the failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Booking Flow and Demo Mode Unaffected
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on **UNFIXED** code:
    - Observe: completing payment → "BOOKING CONFIRMED!" modal appears and `window.location.href` redirects to `bookings.html`
    - Observe: when `POST /api/payments/confirm` mock throws a network error → booking modal still appears (because the call doesn't exist yet — simulate what will happen after fix by mocking it to reject)
    - Observe: when backend is fully down (demo mode) → success message appears without crash
  - Write property-based test: for all payment submissions (regardless of `POST /api/payments/confirm` outcome), the booking modal SHALL be shown and redirect to `bookings.html` shall occur (from Preservation Requirements in design: 3.1, 3.2, 3.3)
  - Property covers: `cardBrand` derivation is correct for all first-digit values (4→visa, 5→mastercard, 6→meeza, other→unknown), and `cardLast4` is always the last 4 digits of any card number
  - Verify tests **PASS on UNFIXED code** (baseline confirmed)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix: Add payment confirm call after successful booking in `pages/payment.html`

  - [x] 3.1 Extract card metadata before the booking API call
    - In the `submit` event handler, after card number validation (`cardNum.length < 13` check) and before `fetch('../api/bookings', ...)`, add:
      ```js
      const cardLast4 = cardNum.slice(-4);
      const firstDigit = cardNum[0];
      const cardBrand = firstDigit === '4' ? 'visa'
                      : firstDigit === '5' ? 'mastercard'
                      : firstDigit === '6' ? 'meeza'
                      : 'unknown';
      const transactionId = 'pi_demo_' + Date.now();
      ```
    - _Bug_Condition: isBugCondition(submission) where submission.callsPaymentConfirmAPI = false AND submission.callsBookingAPI = true_
    - _Expected_Behavior: cardLast4 = last 4 digits of cardNum; cardBrand derived from first digit; transactionId = 'pi_demo_' + Date.now()_
    - _Requirements: 2.1_

  - [x] 3.2 Extract bookingId from the booking API response
    - Inside the `.then(async response => { ... })` callback of `fetch('../api/bookings', ...)`, after `const data = await response.json()` and the `if (!response.ok)` check, add:
      ```js
      const bookingId = data.booking?._id || data.bookingId || null;
      ```
    - _Bug_Condition: bookingId was never captured in original code_
    - _Expected_Behavior: bookingId extracted from data.booking?._id or data.bookingId as per design spec_
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Add fire-and-forget `POST /api/payments/confirm` call after booking succeeds
    - Immediately after extracting `bookingId` (before the proposal post-close call and before building the receipt HTML), add:
      ```js
      fetch('../api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
              paymentIntentId: transactionId,
              bookingId,
              cardBrand,
              cardLast4,
              amount: total
          })
      }).catch(() => {}); // non-fatal: booking already confirmed
      ```
    - The call is **non-blocking** — no `await`, no `return`, no error propagation
    - `.catch(() => {})` ensures network/server errors are swallowed silently
    - The booking flow (receipt modal + redirect) continues immediately after regardless of payment confirm outcome
    - _Bug_Condition: isBugCondition(submission) — original code has no such call_
    - _Expected_Behavior: POST /api/payments/confirm is called with { paymentIntentId: transactionId, bookingId, cardBrand, cardLast4, amount: total } — Payment document saved in DB with status 'succeeded'_
    - _Preservation: booking flow (modal + redirect) is never blocked; demo mode still works; network failure of this call is silently caught_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Payment Confirm API Called After Booking
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 asserts that `fetch` is called with `../api/payments/confirm` after a successful booking
    - When this test passes, it confirms the expected behavior is satisfied (payment document will be saved in DB)
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — `POST /api/payments/confirm` is now called)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Booking Flow and Demo Mode Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — "BOOKING CONFIRMED!" modal still shows, redirect still fires, demo mode still works, network failure of payment confirm does not block booking)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass; ask the user if any questions arise
  - Manually verify the full end-to-end flow: open `pages/payment.html`, complete a payment → check that "BOOKING CONFIRMED!" modal appears AND that `POST /api/payments/confirm` appears in the browser Network tab
  - Open `admin/admin.html` → Payments section → verify payments are now listed with correct Transaction ID, Customer, Card, Amount, Status, Date
  - Verify that no other admin sections (Users, Bookings, Companies, Reviews, etc.) are affected

## Notes

- لا تُعدِّل `admin/admin.html` — الكود الحالي صحيح ويعمل
- الـ payment confirm call يجب أن يكون **non-blocking** دائماً (بدون `await`)
- `.catch(() => {})` إلزامي لمنع أي خطأ من إيقاف الـ booking flow
- في demo mode (backend غير متاح)، كلا الـ API calls ستفشل — هذا سلوك صحيح ومتوقع
- متغيرات `cardLast4`، `cardBrand`، `transactionId` تُعرَّف قبل `fetch('../api/bookings', ...)` حتى تكون متاحة داخل الـ `.then()` callback
