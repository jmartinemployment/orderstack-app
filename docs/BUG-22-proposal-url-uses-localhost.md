# BUG-22 — Proposal URL Uses localhost Instead of Production Domain

**Date:** 2026-03-08
**Severity:** High — proposal links sent to clients are broken in production
**Status:** Open
**Affected route:** `/app/catering/job/:id` → Send Proposal → green banner URL

---

## Symptoms

After clicking "Send Proposal", a green success banner appears with:
  "Proposal ready: http://localhost:4200/catering/proposal/[uuid]"

The URL uses `localhost:4200` — which is the dev server address. In production
this would generate a link that clients cannot access.

## Root Cause

The component that constructs the proposal URL is using `window.location.origin`
or a hardcoded `http://localhost:4200` instead of reading from the environment
config (`environment.ts` / `environment.prod.ts`).

---

## Claude Code Prompt

```
Fix BUG-22 in the OrderStack Angular frontend.

PROBLEM: After sending a proposal, the success banner displays the proposal
URL as "http://localhost:4200/catering/proposal/[uuid]". In production this
creates broken links for clients. The URL must use the configured app base URL
from the environment.

Find where the proposal URL is constructed after a successful proposal send.
Likely in:
  src/app/features/catering/catering-job-detail/ (main component)
  src/environments/environment.ts
  src/environments/environment.prod.ts

FIX:
1. In environment.ts add:
     appBaseUrl: 'http://localhost:4200'

2. In environment.prod.ts add:
     appBaseUrl: 'https://www.getorderstack.com'

3. In the component that builds the proposal URL, replace any hardcoded
   origin with the environment value:
     import { environment } from '@environments/environment';
     ...
     const proposalUrl = `${environment.appBaseUrl}/catering/proposal/${proposalId}`;

4. If window.location.origin is being used, replace it with environment.appBaseUrl.

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
