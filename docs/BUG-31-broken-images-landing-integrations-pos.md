# BUG-31 — Broken Images on Landing, Integrations, POS, Kiosk, Register

**Date:** 2026-03-08
**Severity:** Low — cosmetic, demo data has no uploaded images
**Status:** Open
**Affected routes:** `/`, `/integrations`, `/pos`, `/kiosk`, `/register`, `/online-ordering`

---

## Symptoms

Playwright reports broken images:
- Landing page: 16 broken images
- Integrations page: 18 broken images
- POS Terminal: 6 broken images
- Kiosk: 6 broken images
- Register: 6 broken images
- Online Ordering: 38 broken images

## Root Cause

Two distinct causes:

### 1. Marketing pages (Landing, Integrations)
All static SVG logos in `src/assets/` exist and are correctly referenced.
The broken images are likely from **child components** that render `<img>`
tags with `[src]` bindings where the source is `null`, `undefined`, or empty
string. When Angular binds `[src]="null"`, the browser treats it as a
relative URL and loads `/null` which 404s.

Potential source: `CaseStudyCardComponent` has `imageUrl: null` for all 3
case studies — if it renders `<img [src]="caseStudy().imageUrl">` without
a null guard, it creates a broken image.

### 2. POS/Kiosk/Register/Online Ordering
Menu item images are API-driven (`imageUrl`, `thumbnailUrl` on MenuItem).
Demo data has `null` for all image URLs. Components render `<img>` tags
with these null values.

## Fix Pattern

For all `<img>` tags bound to potentially null values, either:
- Wrap in `@if (imageUrl)` to conditionally render
- Use a fallback: `[src]="imageUrl || 'assets/placeholder.svg'"`
- Use CSS background-image with a placeholder

---

## Claude Code Prompt

```
Fix BUG-31 in the OrderStack Angular frontend.

PROBLEM: Multiple pages show broken images because <img> tags are bound to
null/undefined src values from API data or config objects.

FILES TO CHECK (search for <img with [src] bindings):
  src/app/features/website/components/case-study-card/
  src/app/features/website/components/logo-carousel/
  src/app/features/pos/server-pos-terminal/ (menu item images)
  src/app/features/kiosk/kiosk-terminal/ (menu item images)
  src/app/features/online-ordering/online-order-portal/ (menu item images)

FIX: For every <img> tag with a potentially null [src]:
  - Wrap in @if guard: @if (item.imageUrl) { <img [src]="item.imageUrl"> }
  - OR use fallback placeholder
  - Do NOT render <img> tags with null/empty src

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- Run ng build after changes — must be zero errors
- Do not add any features not described above
```
