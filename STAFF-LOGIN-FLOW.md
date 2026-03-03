# Staff Login Flow

## Two-Stage Authentication

### Stage 1: Owner/Manager Login (email + password)

The standard `login` component at `/login` — email and password auth via `AuthService`. After login, if the account has multiple restaurants, the user hits `/select-restaurant` to pick one. This establishes the **account session**.

### Stage 2: POS PIN Login (`os-pos-login` component)

After the account session is established, staff land on the POS login screen. This is the **shift-level** login.

**Flow:**

1. **"Who's Working?" grid** (`state: 'idle'`) — Shows avatar cards for all active team members (excluding owners). Loaded from `StaffManagementService.loadTeamMembers()`. If no team members exist in the API, it falls back to the owner from `localStorage` onboarding data.

2. **Passcode entry** (`state: 'entering-passcode'`) — Staff taps their name, enters a numeric PIN on a keypad. PIN length is dynamic (based on the member's stored `passcode.length`, defaults to 4). Auto-submits when all digits are entered.

3. **Validation** — Calls `laborService.posLogin(passcode)`. On failure: shows remaining attempts, locks out for 30s after 5 failed attempts. On success, checks if the staff member is already clocked in:
   - **Already clocked in** → fetches their active timecard, skips to step 5
   - **Not clocked in** → moves to clock-in prompt

4. **Clock-in prompt** (`state: 'clock-in-prompt'`) — Shows "You're not clocked in yet" with options:
   - **Job selection** — if the member has multiple jobs (e.g., Server + Bartender), they pick which role for this shift
   - **Schedule enforcement** — if enabled in settings, checks the member has a scheduled shift today (with configurable grace minutes). If blocked, a manager can override with their own PIN.
   - **"Clock In & Start"** — clocks in via `laborService.clockInWithJob()`
   - **"Skip"** — proceeds without clocking in

5. **Authenticated** (`state: 'authenticated'`) — Emits `teamMemberAuthenticated` event and **routes to the correct terminal** based on this priority:
   - **Device type** first (KDS → `/kds`, Kiosk → `/kiosk`, Printer → `/administration`)
   - **Job title** second (bartender → `/bar`, server/host → `/floor-plan`, cashier → `/pos`)
   - **POS mode** last (full_service → `/floor-plan`, quick_service → `/pos`, bar → `/bar`, etc.)

### Post-Authentication Features

Once authenticated, the component shows a persistent bar with:
- **Break management** — start/end breaks from configured break types
- **Clock out** — modal with shift summary (hours, breaks, estimated pay, tip declaration for tip-eligible roles)
- **Job switching** — for multi-job staff, closes current timecard and opens a new one under the other role
- **Switch user** — resets everything back to the avatar grid
- **Inactivity timeout** — auto-switches to the grid after 5 minutes of no interaction
- **Auto clock-out** — configurable timer based on shift end or business day cutoff

## Key Files

| File | Purpose |
|------|---------|
| `src/app/features/auth/login/login.ts` | Stage 1: email/password login |
| `src/app/features/auth/restaurant-select/restaurant-select.ts` | Multi-restaurant picker |
| `src/app/features/auth/pos-login/pos-login.ts` | Stage 2: PIN login, clock-in, routing |
| `src/app/services/labor.ts` | `posLogin()`, `clockInWithJob()`, timecard APIs |
| `src/app/services/staff-management.ts` | `loadTeamMembers()` |
| `src/app/services/device.ts` | Device type detection for routing |
| `src/app/services/platform.ts` | POS mode detection for routing |
| `src/app/services/restaurant-settings.ts` | Timeclock settings (schedule enforcement, auto clock-out) |

## Routing Priority (post-login)

```
1. Device type (hardware pairing)
   kds       → /kds
   kiosk     → /kiosk
   printer   → /administration
   register  → (fall through)
   terminal  → (fall through)

2. Job title (staff role)
   bartender, barback     → /bar
   server, waiter, host   → /floor-plan
   cashier                → /pos

3. POS mode (restaurant config)
   full_service   → /floor-plan
   quick_service  → /pos
   bar            → /bar
   bookings       → /bookings-terminal
   services       → /invoicing
   (default)      → /orders
```

## Security

- **5 failed PIN attempts** → 30-second lockout
- **Inactivity timeout** → 5 minutes, returns to avatar grid
- **Schedule enforcement** (optional) — blocks clock-in if no shift scheduled, with configurable grace period and manager override
