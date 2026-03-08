Fix all 67 open SonarCloud CSS contrast issues (rule css:S7924) in the orderstack-app project. Every single issue is the same: "Text does not meet the minimal contrast requirement with its background." Do NOT touch any .html or .ts files in this workload.

Affected SCSS files and issue counts:

  combo-management/combo-management.scss (7)
  pos/cash-drawer/cash-drawer.scss (5)
  bookings/booking-manager/booking-manager.scss (4)
  menu-mgmt/schedule-management/schedule-management.scss (4)
  settings/rewards-management/rewards-management.scss (4)
  analytics/menu-engineering-dashboard/menu-engineering-dashboard.scss (3)
  bar/bar-terminal/bar-terminal.scss (3)
  multi-location/multi-location-dashboard/multi-location-dashboard.scss (3)
  reports/report-dashboard/report-dashboard.scss (3)
  settings/account-billing/account-billing.scss (3)
  settings/payment-settings/payment-settings.scss (3)
  auth/login/login.scss (2)
  monitoring/monitoring-agent/monitoring-agent.scss (2)
  pos/server-pos-terminal/server-pos-terminal.scss (2)
  sentiment/sentiment-dashboard/sentiment-dashboard.scss (2)
  settings/device-hub/device-hub.scss (2)
  suppliers/supplier-management.scss (2)
  catering/catering-revenue-report/catering-revenue-report.component.scss (1)
  kiosk/kiosk-terminal/kiosk-terminal.scss (1)
  pos/discount-modal/discount-modal.scss (1)
  pos/manager-pin-prompt/manager-pin-prompt.scss (1)
  pricing/dynamic-pricing/dynamic-pricing.scss (1)
  quick-service/quick-service-terminal/quick-service-terminal.scss (1)
  register/register-terminal/register-terminal.scss (1)
  reports/close-of-day/close-of-day.scss (1)
  reports/report-builder/report-builder.scss (1)
  retail/vendor-management/vendor-management.scss (1)
  voice-ordering/voice-order/voice-order.scss (1)
  waste/waste-tracker/waste-tracker.scss (1)
  shared/weight-scale/weight-scale.scss (1)

The fix for every issue: find the color declaration at the flagged line and adjust it to meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text). The app uses a Square-inspired design language, so keep colors clean and professional. Check the background color context and increase contrast by darkening light-on-light text or lightening dark-on-dark text. If the colors are defined as design tokens or CSS custom properties in styles.scss, fix them at the source. If they are component-local, fix in the component SCSS.

For each file: read the file, find the flagged lines, determine the background context, adjust the color to meet WCAG AA. Run ng build after all fixes to verify compilation. Use git add -A and commit with message: fix(a11y): resolve 67 CSS contrast issues across 30 SCSS files — then push.
