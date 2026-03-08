Fix all open SonarCloud HTML accessibility issues in the orderstack-app project for ONLY these feature directories. Do NOT touch any .ts, .scss, or .html files in features/retail/, features/multi-location/, features/suppliers/, features/website/, features/bookings/, features/catering/, features/invoicing/, features/food-cost/, features/inventory/, features/marketing/, or features/crm/ — those are handled by other workloads.

Your scope (all remaining directories):

  features/pos/ (server-pos-terminal, cash-drawer, discount-modal, modifier-prompt, void-modal, manager-pin-prompt)
  features/orders/ (pending-orders, order-history)
  features/menu-mgmt/ (item-management, schedule-management, combo-management, modifier-management, category-management)
  features/table-mgmt/floor-plan/
  features/kds/
  features/settings/ (all subdirs: staff-management, gift-card-management, printer-settings, device-hub, device-management, rewards-management, payment-settings, account-billing, ai-settings, kitchen-orders, loyalty-settings, notification-settings, delivery-settings, station-settings, cancel-subscription)
  features/staff/ (staff-portal, staff-directory)
  features/labor/ (staff-scheduling)
  features/auth/ (login, pos-login, business-type-select, pair-device)
  features/analytics/ (menu-engineering-dashboard, sales-dashboard)
  features/reports/ (report-dashboard, close-of-day)
  features/online-ordering/ (online-order-portal, scan-to-pay, customer-portal)
  features/voice-ordering/
  features/sentiment/
  features/pricing/
  features/bar/
  features/monitoring/
  features/onboarding/
  features/home/
  features/kiosk/
  features/quick-service/
  features/register/
  features/reservations/
  shared/ (payment-terminal, bottom-navigation, clock-out, checkout, weight-scale)
  layouts/ (main-layout, auth-layout)

Approximate issue count: 286 across these directories.

The four rules you will encounter and how to fix each:

Web:S6853 — Elements must have accessible names.
  Every interactive element (button, input, select, a, etc.) must have a text label, aria-label, or aria-labelledby. For icon-only buttons, add aria-label describing the action. For inputs, associate a label element or add aria-label.

Web:S6819 — Use native button or input instead of role="button".
  Replace div/span/a elements that have role="button" with actual button elements. Preserve all (click) handlers and classes. If the element is an anchor with href, keep it as an anchor and remove role="button". If it has no href, convert to button.

Web:MouseEventWithoutKeyboardEquivalentCheck — Click handlers need keyboard equivalents.
  Every element with (click) that is NOT a native button or anchor must also have a keyboard handler. Add (keydown.enter)="sameMethod()" and tabindex="0" to make it keyboard-accessible. If the element should be a button, convert it to a button instead (preferred).

Web:S7927 — Accessible name must be part of the visible label.
  If an element has aria-label that does not contain the visible text, update aria-label to include the visible text or remove aria-label and let the visible text serve as the name.

Web:S6842 — Images must have alt text.
  Add alt="descriptive text" to img elements. Use alt="" for purely decorative images.

Web:S6840 — Use autocomplete attribute correctly.
  In features/auth/login/login.html line 129, fix the autocomplete attribute value.

Web:S5256 — Check and fix the element structure issue.

For each file: read the full HTML template, identify every SonarCloud violation, and fix all of them in one rewrite. Do not change component logic or styles. Run ng build after all fixes to verify compilation. Use git add -A and commit with message: fix(a11y): resolve HTML accessibility issues in pos, orders, menu, settings, staff, shared, and remaining features — then push.
