# Session Notes — March 5, 2026

## Completed
- **FEATURE-02** (Catering Module) — fully built and deployed
  - Prisma models, backend API (7 endpoints), Angular service, 4 UI components
  - BUG: businessCategory not persisting (see BUG-34 below)

- **BUG-33** (Setup wizard "Go To Dashboard" 404) — root cause fixed
  - selectMerchant() now adds merchant to _merchants
  - buildProfileFromPayload() now runs after selectMerchant()
  - persistCurrentProfile() added to PlatformService

- **UX-01** (Wizard overhaul) — reduced to 3 steps
  - Step 1: Business basics, Step 2: Business type, Step 3: Done
  - All removed steps preserved in code, accessible later via Settings
  - Skip link added to every step
  - Wizard step persisted to localStorage for resume on reload

- **Onboarding guard removed** — authenticated users go straight to
  /app/administration, no redirects to /setup

- **BUG-34** (Catering sidebar not showing) — fixed
  - businessCategory now persists through wizard → backend → profile
  - Catering appears in sidebar for "Caterer" business type
  - Confirmed working: "Jays Catering Number 3" account shows Catering in sidebar

## Open Bugs

### BUG-35 — Catering API calls fire with /merchant/undefined/
**Status:** Fix attempted but not working in production

**Evidence:**
  GET /api/merchant/undefined/catering/events
  GET /api/merchant/undefined/catering/capacity

**What was tried:**
- Added effect() in CateringService constructor watching selectedMerchantId
- Removed direct loadEvents() calls from ngOnInit
- Guards added to write methods

**Why it's still broken:**
- selectedMerchantId() signal is undefined when effect fires on init
- Signal doesn't update after auth resolves — effect never re-runs
- Root cause: selectedMerchantId may not be a reactive Angular signal,
  or auth state resolves after the effect's first run

**Next fix to try:**
- Check if AuthService.selectedMerchantId() is actually a proper signal
- Use toObservable() instead of effect() to watch for changes
- OR: have dashboard delay loadEvents() with a takeUntilDestroyed +
  filter(Boolean) on the merchantId observable

### BUG-36 — JWT expiry not enforced on frontend — users never forced to re-login
**Status:** Not started

**Evidence:**
- auth_token persists in localStorage indefinitely
- loadFromStorage() in src/app/services/auth.ts restores session without checking JWT exp claim
- authGuard in src/app/guards/auth.guard.ts only checks isAuthenticated() — presence only, never expiry
- Backend issues 7-day JWTs (JWT_EXPIRES_IN = '7d' in src/services/auth.service.ts)
- selected_merchant_id written as string "undefined" — stale value never cleared on expired session restore

**Fix:**
- Add isTokenExpired(token?: string): boolean to AuthService — decode JWT exp claim, no npm packages
- In loadFromStorage(), check expiry before setting any signals — if expired call clearStorage() and return
- In authGuard, after isAuthenticated() returns true, check isTokenExpired() — if true call handleSessionExpired() and return false

### BUG-32 — Setup wizard plan step shows Stripe instead of PayPal
**Status:** Logged, not started

### BUG-34 (partial) — Zod .errors vs .issues
**Status:** Fixed on backend (catering.routes.ts)

### filteredMembers toLowerCase() undefined
**Status:** Logged, not started
- `filteredMembers` computed calling `.toLowerCase()` on undefined team member name
- Fix: add `?.toLowerCase() ?? ''` null safety guard

### app/floor-plan and app/staff routes missing
**Status:** Logged, not started (NG04002 errors in console)

## Catering Test Account
- Business: Jays Catering Number 3
- User: Jason3
- merchantId: 9d7562ca-c5df-4b37-a26d-4fff7532c766 (old account, businessCategory missing)
- New account created today has businessCategory = 'Caterer' correctly

## Next Session
1. Fix BUG-35 (catering merchantId timing)
2. Verify event creates and appears in Upcoming tab
3. Fix filteredMembers toLowerCase() crash
4. Fix app/floor-plan and app/staff missing routes
5. BUG-32 — Stripe → PayPal on plan step
