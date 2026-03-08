# BUG-30 — Retail Variations Back Button Missing aria-label

**Date:** 2026-03-08
**Severity:** Low — accessibility gap, single icon-only button
**Status:** Open
**Affected route:** `/app/retail/variations`

---

## Symptoms

The back button on Retail Variations contains only a left-arrow icon
`<i class="bi bi-arrow-left">` with no text or aria-label.

## Root Cause

```html
<button class="btn btn-ghost">
  <i class="bi bi-arrow-left"></i>
</button>
```

No `aria-label` attribute on the button.

---

## Claude Code Prompt

```
Fix BUG-30 in the OrderStack Angular frontend.

PROBLEM: /app/retail/variations has an icon-only back button without
aria-label.

FILE: src/app/features/retail/variation-editor/variation-editor.html
  (or whichever template renders the back button with bi-arrow-left)

FIX: Add aria-label="Go back" to the button:

  <button class="btn btn-ghost" aria-label="Go back">
    <i class="bi bi-arrow-left"></i>
  </button>

RULES:
- Follow all CLAUDE.md directives
- Run ng build after changes — must be zero errors
```
