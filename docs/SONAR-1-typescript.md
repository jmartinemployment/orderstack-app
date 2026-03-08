Fix all open SonarCloud TypeScript issues in the orderstack-app project. There are 129 issues across approximately 30 .ts files. Do NOT touch any .html or .scss files in this workload.

Here are the rules and affected files. Fix every instance in each file:

S1128 — Remove unused imports (22 issues):
  settings/device-hub/device-hub.ts, settings/device-management/device-management.ts,
  settings/notification-settings/notification-settings.ts, settings/payment-settings/payment-settings.ts,
  staff/staff-portal/staff-portal.ts, table-mgmt/floor-plan/floor-plan.ts,
  website/pages/integrations/integrations.component.ts, website/services/blog.service.ts,
  website/shared/case-study-card.component.ts, website/shared/testimonial-section.component.ts,
  services/booking.ts, services/customer.ts, services/order.ts, services/report.ts,
  services/retail-checkout.ts, services/retail-ecommerce.ts, services/retail-inventory.ts,
  services/vendor.ts, shared/clock-out/clock-out.ts

S4325 — Remove unnecessary type assertions (13 issues):
  settings/printer-settings/printer-settings.ts, staff/staff-portal/staff-portal.ts,
  website/services/seo-meta.service.ts, services/analytics.ts,
  shared/clock-out/clock-out.ts, shared/payment-terminal/payment-terminal.ts

S7735 — Prefer positive condition first in if/else (6 issues):
  settings/kitchen-orders/kitchen-orders.ts, services/customer.ts,
  services/order.ts, services/providers/zettle-reader-provider.ts

S7778 — Combine multiple consecutive push() calls (9 issues):
  layouts/main-layout.component.ts

S7764 — Use template literals instead of string concatenation (6 issues):
  website/shared/exit-intent-popup.component.ts, services/payment-connect.ts,
  services/pwa-install.ts

S1301 — switch with only one case, use if instead (6 issues):
  settings/printer-settings/printer-settings.ts

S3863 — Remove duplicate union type members (3 issues):
  table-mgmt/floor-plan/floor-plan.ts, models/cart.model.ts

S1874 — Replace deprecated API usage (4 issues):
  auth/pair-device/pair-device.ts, onboarding/device-setup/device-setup.ts,
  orders/pending-orders/pending-orders.ts, services/device.ts

S3358 — Simplify nested ternary operators (2 issues):
  layouts/main-layout.component.ts, services/order.ts

S1854 — Remove useless variable assignments (3 issues):
  services/delivery.ts, services/payment-connect.ts, shared/weight-scale/weight-scale.ts

S2933 — Add readonly to never-reassigned private members (2 issues):
  layouts/auth-layout.component.ts, services/delivery.ts

S7749 — Simplify boolean expressions (3 issues):
  orders/pending-orders/pending-orders.ts

S7758 — Use nullish coalescing (2 issues):
  settings/staff-management/staff-management.ts, shared/clock-out/clock-out.ts

S6582 — Use optional chaining (2 issues):
  services/order.ts, services/providers/zettle-reader-provider.ts

S2486 — Add comments to empty catch blocks (2 issues):
  services/retail-checkout.ts

S7748 — Remove zero fractions from number literals (2 issues):
  models/cash-drawer.model.ts, models/platform.model.ts

S7747 — Simplify expressions (2 issues):
  services/restaurant-settings.ts

Single-instance rules (1 each):
  S1871 (duplicate branch) — services/order.ts
  S3923 (all branches identical) — services/order.ts
  S4323 (type alias for single type) — orders/pending-orders/pending-orders.ts
  S4624 (nested template literal) — services/delivery.ts
  S6564 (unnecessary method) — models/catering.model.ts
  S6606 (nullish coalescing) — services/delivery.ts
  S107 (too many parameters) — if applicable
  S7780 (use .at(-1)) — website/shared/testimonial-card.component.ts
  S7785 (top-level await) — skip if in main entry file
  S7762 — check context
  S2699 (test without assertion) — services/labor-bug32.spec.ts
  S1135 (TODO comments) — website/ components (3 files) — review if actionable or leave
  S4043 (use .includes()) — check context
  S6551 (object stringification) — check context

For each file: read the file first, understand the context, then fix all SonarCloud issues in that file in a single rewrite. Do not touch HTML or SCSS. Run npm test after all fixes to verify nothing breaks. Use git add -A and commit with message: fix(sonar): resolve 129 TypeScript code quality issues across 30 files — then push.
