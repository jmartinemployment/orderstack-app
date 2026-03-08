# BUG-20 — Sidebar Footer Shows "jeff / 123 main" Instead of Merchant Name/Address

**Date:** 2026-03-08
**Severity:** Low — cosmetic; placeholder/test data visible in production UI
**Status:** Open
**Affected:** Sidebar footer — all routes

---

## Symptoms

The bottom of the left sidebar shows:
  🏪 jeff
     123 main

"jeff" and "123 main" are test/placeholder values for the merchant business
name and address. The actual merchant account (owner@taipa.com) should display
its real business name and address.

## Root Cause

The sidebar component either:
1. Has hardcoded fallback strings ("jeff", "123 main") when the merchant
   profile fields are null/empty, OR
2. Is reading from the wrong field on the merchant object (e.g., using the
   owner's first name instead of the business name)

---

## Claude Code Prompt

```
Fix BUG-20 in the OrderStack Angular frontend.

PROBLEM: The sidebar footer displays "jeff" and "123 main" as the merchant
business name and address. These appear to be test/placeholder values.
The sidebar should display the actual merchant business name and a formatted
address, or graceful empty states if data is missing.

Find the sidebar/nav component:
  src/app/layout/ (look for sidebar, nav, or shell component)
  or src/app/shared/components/ (look for sidebar component)

FIX:
1. Identify which merchant fields are being displayed. Should be:
     merchant.businessName (not merchant.ownerName or merchant.firstName)
     merchant.address (formatted: city, state OR street address)

2. If the sidebar is showing owner name instead of business name, correct
   the field reference.

3. Add a safe fallback — if businessName is null/empty show "My Restaurant"
   or omit the name entirely rather than showing a raw test value.

4. If address is null/empty, omit the address line rather than showing
   "123 main" or similar placeholder.

Template pattern:
  <span class="merchant-name">{{ merchant()?.businessName || 'My Restaurant' }}</span>
  @if (merchant()?.city) {
    <span class="merchant-location">{{ merchant()?.city }}, {{ merchant()?.state }}</span>
  }

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
