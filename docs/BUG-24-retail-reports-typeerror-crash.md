# BUG-24 — Retail Reports TypeError Crash on Length of Undefined

**Date:** 2026-03-08
**Severity:** High — runtime crash visible in console, may show broken UI
**Status:** Open
**Affected route:** `/app/retail/reports`

---

## Symptoms

Navigating to Retail Reports shows a console error:
  `TypeError: Cannot read properties of undefined (reading 'length')`
  at `RetailReports_Conditional_44_Conditional_0_Template`

## Root Cause

The template accesses `.length` on `report` properties that may be `undefined`:
- `report.salesByPaymentMethod.length`
- `report.salesByItem.length`
- `report.salesByCategory.length`
- `vendor.topItems.length`

When the API returns a report object without these array properties (or returns
null/undefined for them), the template crashes.

---

## Claude Code Prompt

```
Fix BUG-24 in the OrderStack Angular frontend.

PROBLEM: /app/retail/reports crashes with TypeError: Cannot read properties
of undefined (reading 'length'). The template accesses .length on report
properties that may be undefined.

FILE: src/app/features/retail/reports/retail-reports.html

FIX: Add optional chaining to all .length checks on report sub-properties:

  WRONG:  @if (report.salesByPaymentMethod.length > 0)
  RIGHT:  @if ((report.salesByPaymentMethod?.length ?? 0) > 0)

Apply this fix to ALL occurrences:
  - report.salesByPaymentMethod?.length
  - report.salesByItem?.length
  - report.salesByCategory?.length
  - vendor.topItems?.length

Also check the RetailSalesReport model and ensure arrays default to []
instead of undefined.

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
