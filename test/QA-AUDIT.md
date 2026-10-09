# TravelNow QA audit

**Status:** Partial, evidence-based audit; not a full application certification.
**Audit date:** 2026-10-09
**Environment:** Local static site at `http://localhost:8000`, local Express API at `http://localhost:5000`, browser-driven checks and Node test runner. No real tourist/company/admin credentials or OTP deliveries were used.

## Summary

| Measure | Result |
|---|---:|
| Candidate HTML routes discovered | 33 |
| Page routes actually loaded in browser | 33 |
| Routes requiring login that redirected to login | Observed during unauthenticated sweep |
| Independent responsive viewports requested | 12 widths, 320–2560 px |
| Responsive pages checked | 6 public pages and 3 dashboard role variants (108 page/width combinations) |
| Focused test cases run in the Paymob continuation | 30 passed, 0 failed (24 backend, 6 frontend) |
| Previously recorded tests | Payment-preservation 19/19; backend API/auth OTP 7/7 (not repeated here) |
| Confirmed vulnerabilities requiring remediation | 0 currently; the prior high-priority payment integrity issue is fixed |
| Defects fixed in the recorded continuations | OTP input filtering/paste/accessibility, external CSS background failure, and payment confirmation integrity |
| OTP delivery/expiry/resend backend cases | Blocked/not executed |
| Real credential role workflows and Paymob sandbox checkout | Blocked/not executed |

The counts reflect only the described executions. A loaded route or source inspection is not counted as a functional test of every control on that page. The earlier payment-preservation and backend API/auth OTP results remain recorded and were not repeated. The Paymob continuation ran the full backend test directory and the focused frontend regression files listed below.

## Evidence and report files

- [QA-AUDIT.md](./QA-AUDIT.md) — this report.
- [evidence/](./evidence/) — reserved for evidence captures. A login-page screenshot was captured in the browser session, but no screenshot file was saved in this directory; browser observations are recorded below.
- Focused executable checks: [tests/auth-console-privacy.test.js](../tests/auth-console-privacy.test.js) and [tests/otp-input.test.js](../tests/otp-input.test.js).

## Route and UI coverage

- A prior browser sweep discovered and loaded 33 candidate HTML routes. Login-protected pages redirected to login without a session.
- Public home carousel next interaction changed the featured destination from Pyramids of Giza to Luxor Temple.
- Leaflet map search, historical category filtering, place selection/details card, 51 markers, and one stable capture of 40/40 loaded map tiles were exercised.
- Six public pages and tourist/company/admin dashboard variants were checked at widths 320, 360, 375, 390, 430, 600, 768, 1024, 1280, 1366, 1920, and 2560 px. No horizontal overflow was reported by the browser checks. This does not constitute a full visual, height, keyboard, or control-by-control responsive audit.
- Tourist/company/admin path redirects were checked with mocked frontend login responses. Real account authentication and role authorization through a live authenticated browser session were not established.
- The broad route sweep did not exhaustively activate every modal, form, menu, dropdown, button, accordion, and collapse component.

## Continuation validation

Command:

```text
node --test tests/auth-console-privacy.test.js tests/otp-input.test.js
```

Result: **3 passed, 0 failed**. The two OTP checks validate the expected sanitization, paste-handler, autocomplete, and accessible-label behavior in both OTP pages; the privacy check verifies login diagnostics do not expose auth response data.

Browser interactions on both OTP pages verified:

- Pasting `123456` / `654321` into the first input distributes all six digits across the fields.
- Filling the first box with `A` leaves its value empty.
- All six boxes expose accessible labels.
- Verify remained pending because network submission was deliberately stubbed; no OTP was sent or verified.

The CSS background edit was confirmed in source and the login page loaded. The sampled pseudo-element reported no image background. A final visual comparison/screenshot and a complete failed-network sweep after those edits were not captured.

## Paymob sandbox integration continuation

The client-confirmation vulnerability is fixed in the active backend. `POST /api/payments/confirm` now rejects client-submitted payment evidence; booking creation/update no longer permits client-controlled paid status or amount. Checkout initialization is restricted to the authenticated booking owner, recomputes the payable amount from server-side data, and refuses to start unless explicit sandbox configuration is valid. Payment success requires a Paymob transaction callback with a valid HMAC, matching configured integration, server-created order and attempt reference, amount, and currency. Successful payment and booking transitions are atomic; duplicate verified callbacks are idempotent. The active payment page polls server-owned state and does not treat the browser return URL as proof of success.

Validation executed:

```text
cd backend
node --test --test-force-exit test/*.test.js
```

Result after updating the intention response handling: **24 passed, 0 failed**. This includes mocked Paymob intention and callback cases, authorization, forged confirmation, amount/currency mismatch, failed/voided payment, duplicate callback, and cancelled booking status. The intention mock now follows Paymob's documented `intention_order_id` response attribute.

```text
node --test tests/paymob-frontend.test.js tests/auth-console-privacy.test.js tests/otp-input.test.js
```

Result: **6 passed, 0 failed**. The Paymob-specific frontend checks verify hosted checkout redirection, server-driven status display, no card fields/client confirmation, duplicate-page forwarding, and proposal checkout identifiers.

One real Paymob **sandbox intention** request was sent with non-sensitive test billing data and the configured test integration. Paymob returned an intention ID and client secret, and the Hosted Checkout URL could be constructed. The one-time client secret and checkout URL were not printed; the checkout page was not opened, no card data was entered, and no payment was submitted. This was an isolated provider probe, not an authenticated booking checkout, and it produced no verified payment or callback.

The initial probe checked the undocumented `order.id` response shape and did not observe that field. Checking the current official Create Intention documentation showed the documented numeric response attribute is `intention_order_id`. The backend was corrected to persist that provider order ID and its mocked regression test now uses the documented response shape. No second provider request was made after the correction, so the corrected application controller has not yet been verified against a fresh live response. The public callback URL answered an unsigned probe with HTTP 401, as expected. The mock tests do not establish real callback delivery or a completed hosted checkout.

An attempted inline-script syntax-check command failed due to PowerShell/JavaScript regex quoting in the check command itself. It is not counted as a source syntax failure; the page JavaScript did execute for the browser input checks.

## Findings

### FIXED — payment confirmation trusted caller-supplied intent identifiers and amounts

- **Historical area:** `backend/controllers/paymentController.js` payment confirmation; `pages/payment.html`.
- **Reproducibility:** A local in-memory stub invocation of `confirmPayment` with a fabricated payment-intent ID returned success, recorded payment as succeeded, and marked the booking confirmed. No database write or real Stripe charge was made.
- **Historical evidence:** Confirmation did not verify a provider transaction; caller-supplied amount and `paymentIntentId` were trusted. The old checkout page could submit a fabricated `pi_demo_<timestamp>`.
- **Impact before the fix:** A caller could mark an unpaid booking as paid/confirmed.
- **Resolution:** The legacy confirmation endpoint returns HTTP 410. Booking state and prices are server-managed. The active Paymob sandbox flow binds each attempt to the owned booking, verifies Paymob's signed callback and transaction/order amount and currency, then atomically updates payment and booking. Mocked regression coverage is in `backend/test/paymob.test.js` and `backend/test/api.test.js`.
- **Remaining limitation:** Sandbox configuration is now present and the public callback route is reachable, but no authenticated booking checkout, hosted checkout interaction, or valid Paymob transaction callback has been completed. Do not enable production payments.

### FIXED — OTP fields accepted nondigits and did not distribute pasted codes

The reset-password and company-email-verification inputs now restrict values to digits, distribute a pasted six-digit code across the fields, and include accessible labels plus one-time-code autocomplete. Regression checks and browser interaction passed as described above. Server-side OTP validation remains unverified.

### FIXED — external CSS background image returned 404

The external Unsplash background was removed/replaced by local CSS gradients in auth and page-header styles. The failure was observed before the change; browser/network evidence after the change was incomplete.

### Existing issue — local landing video emits aborted requests in the login browser session

The browser recorded repeated `ERR_ABORTED` events for `components/imges/Let_s Go - Egypt _ A Beautiful Destinations Original (1).mp4` while navigating to login. The file exists and returns HTTP 200 (`video/mp4`, 12,335,073 bytes) from the local server. The observed aborted events may be caused by page navigation interrupting video loading; they do not establish a broken asset.

### Other observations (not confirmed as defects)

- Unauthenticated API requests returned 401 as expected. Public API reads observed: health 200, attractions 51, companies 3, offers 2.
- Additional unauthenticated probes: `/api/bookings`, `/api/payments`, and `/api/admin/analytics` returned 401; `/api/users` and `/api/otp` returned 404. These are path probes, not a complete endpoint inventory.
- `/api/reviews` returned 404; reviews appear to use nested routes. The route inventory was not exhaustively checked.
- Company profile requested `/api/companies/demo`, then displayed seeded/demo content. The fallback rendered, but the route and data consistency were not fully investigated.
- Browser reported a Swiper loop warning during the route sweep.
- Map uses Leaflet/OpenStreetMap tiles. Google directions/images appear as outbound links, not configured integrated APIs. No geolocation implementation was verified.

## `TravelNow1/` duplicate and deployment

The duplicate contains 59 files and is mentioned in the root and duplicate READMEs. A bounded search found no references in `.github` workflows, `vercel.json`, or `render.yaml`. The GitHub Pages workflow publishes the repository root (`path: .`), so the duplicate appears included in Pages output; it is not the configured Vercel/Render backend entrypoint. The duplicate was not deleted or changed as part of this continuation. Its payment page had previously been aligned with the root page, but duplicate parity has not been comprehensively verified.

## Blocked / not executed

- Real tourist, company, and admin sign-in and complete role-specific workflows: no configured safe test accounts were provided.
- OTP email/WhatsApp delivery, expiry, invalid attempts, resend throttling, and server verification: not triggered to avoid external side effects without authorization.
- Paymob sandbox hosted checkout and real callback delivery: not run because sandbox credentials and a publicly reachable HTTPS callback endpoint are not configured. No real or sandbox payment request was made.
- Complete API endpoint, database consistency, session expiry/revocation, validation fuzzing, and cross-role authorization matrix.
- Full accessibility audit, keyboard-only navigation, screen-reader checks, performance profiling, all interactive controls, exhaustive network/link/image audit, and all responsive heights/intermediate widths.
- Geolocation/routing provider behavior and live external API response validation.

## Recommended next steps

1. Configure Paymob Test-mode keys, card integration ID, HMAC secret, and HTTPS callback/return URLs locally; then execute a controlled sandbox checkout with official test credentials and verify the signed server callback.
2. Provide isolated test accounts and authorize controlled OTP delivery to execute end-to-end role and OTP workflows.
3. Expand interaction coverage by page/control with saved screenshots and browser console/network exports.
4. Run a complete endpoint/authorization and responsive/accessibility matrix in a controlled test environment.
