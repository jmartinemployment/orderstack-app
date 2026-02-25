# E2E Test Blockers

Blocked Playwright E2E tests that cannot run due to missing backend endpoints or infrastructure.

## Missing Backend Endpoints

| Endpoint | Impact | Test File |
|----------|--------|-----------|
| `GET /team-members` | Cannot test POS login or time clock features | `clock-in-out.e2e.ts` |
| `GET /break-types` | Cannot test clock in/out with break flow | `clock-in-out.e2e.ts` |

## Missing Infrastructure

| Dependency | Impact | Test File |
|------------|--------|-----------|
| `STRIPE_SECRET_KEY` not set | Cannot test card payment via Stripe Elements | `payment-flow.e2e.ts` |
| No payment processor configured | Cannot test split tender payment | `payment-flow.e2e.ts` |
| No printer device registered | Cannot test CloudPRNT receipt printing | `receipt-printing.e2e.ts` |

## Menu Data Gap

The POS "Appetizers" category shows "No items found" when creating a new order on an available table. This causes 3 payment flow tests to skip because they cannot add items to an order. Either seed menu items for the test restaurant or ensure the default category has items.

| Test | Skip Reason |
|------|-------------|
| Payment: order total in POS check panel | No menu items in active category |
| Payment: pay/close button when order has items | No menu items in active category |
| Payment: cash payment flow | No menu items in active category |
