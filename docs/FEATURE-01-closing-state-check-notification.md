# FEATURE-01 — Table "Closing" State & Check Notification
## Claude Code Feature Prompt

---

## Overview

Add a 6th table state — **Closing** — that represents "check has been
presented to the patron." This state is system-triggered (not manually
selectable on the floor plan) and fires when a check is printed or sent.
The device that placed the order is notified simultaneously.

A manual fallback "Present Check" button exists on the order/check screen
for when the auto-trigger fails (printer offline, network issue, etc.).

---

## Table States (Complete Set)

| State | Color | Set By |
|-------|-------|--------|
| Available | 🟢 Green | System / Manual |
| Reserved | 🟡 Yellow | Manual |
| Occupied | 🔴 Red | Manual |
| Closing | 🟣 Purple | System (auto) / Manual fallback on order screen |
| Dirty | ⚫ Gray | Manual |
| Maintenance | 🔵 Blue | Manual |

---

## Device Capabilities

| Device | Change Table States | Closing Auto-Trigger | Closing Manual Fallback |
|--------|-------------------|---------------------|------------------------|
| POS | ✅ All states | ✅ | ✅ "Present Check" button |
| Register | ✅ All states | ✅ | ✅ "Present Check" button |
| Bar | ✅ All states | ✅ | ✅ "Present Check" button |
| Kiosk | ❌ No write | ❌ | ❌ |
| Kiosk (read) | ✅ Occupied only (read-only warning) | — | — |

---

## State Lifecycle

```
Available → Reserved → Occupied → [auto] Closing → Dirty → Available
Available → Occupied → [auto] Closing → Dirty → Available  (walk-in)
Any state → Maintenance  (manager override)
```

**Closing is NEVER a manual option in the floor plan state menu.**
It only appears as a visual state on the floor plan (purple) — not selectable.

---

## Auto-Trigger: Check Print / Send

When a check is printed or sent to the patron from any POS/Register/Bar
device:

1. Table status updates to **Closing** (purple) on the floor plan
2. The device that placed the order receives a notification:
   *"Check presented — Table [N]"*
3. Both happen simultaneously in the same transaction/event

### Implementation
- Hook into the existing check print/send event
- After successful print/send, PATCH the table status to `closing`
- Emit a notification to the originating device (use existing notification
  system if available, otherwise add a simple in-app alert)

---

## Manual Fallback: "Present Check" Button

On the order/check screen (not the floor plan), add a **"Present Check"**
button visible to POS/Register/Bar devices only.

- Appears after an order has items and a check exists
- Tapping it triggers the same dual action as the auto-trigger:
  1. Table → Closing (purple on floor plan)
  2. Originating device notified
- Button should be visually distinct (e.g. purple, matching Closing color)
- Once tapped (or auto-triggered), button changes to "Check Presented"
  (disabled/confirmation state) so it can't be double-fired

---

## Floor Plan Display

- Add `closing` to the table status enum/type
- Floor plan legend: add 🟣 Closing entry
- Table card renders purple background when status is `closing`
- Closing tables are NOT tappable for state change on the floor plan
  (they can still be tapped to view order details)
- Kiosk: if patron scans QR at a Closing table, show:
  *"This table's check has been presented. Please see your server."*

---

## Floor Plan Admin View (Sidebar)

The administrative floor plan view is for table layout and area assignment
only. Closing state is not relevant here — no changes needed to the admin view.

---

## State Persistence

- Table status must persist to the database (already the case for existing states)
- Closing status clears to Dirty when the party leaves (server marks Dirty
  manually, same as today)
- If a check is voided/cancelled after Closing was set, revert table to
  Occupied automatically

---

## Test Cases (I will verify after deploy)

1. Check prints → table immediately turns purple on floor plan
2. Check prints → originating device receives "Check presented — Table N" notification
3. "Present Check" button visible on order screen for POS/Register/Bar
4. "Present Check" button NOT visible on Kiosk
5. Tapping "Present Check" → table turns purple + notification fires
6. "Present Check" button becomes disabled after trigger (no double-fire)
7. Closing table NOT selectable in floor plan state menu
8. Floor plan legend shows purple Closing entry
9. Kiosk QR scan on Closing table shows appropriate message
10. Marking table Dirty from Closing state works normally
11. Voiding check after Closing reverts table to Occupied
12. Maintenance override still works from Closing state
