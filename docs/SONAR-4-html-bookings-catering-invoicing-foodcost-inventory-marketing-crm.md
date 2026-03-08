Fix all open SonarCloud HTML accessibility issues in the orderstack-app project for ONLY these feature directories. Do NOT touch any .ts, .scss, or .html files outside these directories:

  features/bookings/ (booking-manager, booking-widget)
  features/catering/ (all subdirs: catering-job-detail, catering-event-form, catering-delivery, catering-dashboard, catering-packages, catering-calendar, catering-proposal, catering-guest-portal, catering-milestones, catering-revenue-report, catering-beo, catering-deferred-report, catering-lead-form, catering-prep-list, catering-reports)
  features/invoicing/
  features/food-cost/
  features/inventory/
  features/marketing/
  features/crm/

Approximate issue count: 289 across these directories.

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

Web:S6807 — Interactive elements must be nested correctly.
  Do not nest interactive elements (e.g., button inside a, button inside button). Restructure the DOM to avoid nesting.

For each file: read the full HTML template, identify every SonarCloud violation, and fix all of them in one rewrite. Do not change component logic or styles. Run ng build after all fixes to verify compilation. Use git add -A and commit with message: fix(a11y): resolve HTML accessibility issues in bookings, catering, invoicing, food-cost, inventory, marketing, crm — then push.
