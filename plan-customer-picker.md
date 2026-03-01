# Plan: Add Customer to Order — POS Sidebar Customer Picker

## Context

All four POS-style terminals (POS, Bar, Kiosk, Register) have a placeholder "Add Customer" button in the right sidebar with no click handler. Square POS allows attaching a customer to an order for receipt delivery, loyalty tracking, and CRM history. The customer model, service, and CRM dashboard already exist — this feature wires them into the order flow.

## Scope

- **In scope:** Shared customer picker component, wiring into 4 terminals, `createCustomer` method in CustomerService, backend POST endpoint
- **Out of scope:** KDS (no sidebar), loyalty point redemption at checkout, customer-specific discounts

---

## Step 1: Add `createCustomer()` to CustomerService

**File:** `src/app/services/customer.ts`

Add method to POST a new customer to the backend and append to the local `_customers` signal. Accepts `{ firstName, lastName?, phone?, email? }`, returns `Customer | null`.

## Step 2: Create shared `CustomerPicker` component

**New files:**
- `src/app/shared/customer-picker/customer-picker.ts`
- `src/app/shared/customer-picker/customer-picker.html`
- `src/app/shared/customer-picker/customer-picker.scss`

**Component design:**
- Standalone, OnPush, uses `inject(CustomerService)`
- `output()` signals: `customerSelected` (emits `Customer`), `cancelled` (emits `void`)
- Internal signals: search query, search results, loading, create-form visibility, new customer form fields
- Debounced search (300ms) calls `customerService.searchCustomers(query)`
- Create-new-customer inline form (firstName required, lastName/phone/email optional)

**Template layout (Square-inspired):**
```
┌─────────────────────────────┐
│ Add Customer            [X] │  ← header + close
├─────────────────────────────┤
│ 🔍 Search name, phone...   │  ← search input
├─────────────────────────────┤
│ ○ JD  John Doe              │  ← results list
│      (555) 123-4567         │     initials avatar + name + detail
│ ○ JS  Jane Smith            │
│      jane@email.com         │
├─────────────────────────────┤
│ + Create new customer       │  ← toggles inline form
│                             │
│ First name*  [___________]  │  ← form (conditional)
│ Last name    [___________]  │
│ Phone        [___________]  │
│ Email        [___________]  │
│         [Save & Select]     │
└─────────────────────────────┘
```

**Empty state:** "No customers found" with prominent "Create new customer" button.

## Step 3: Wire into `ServerPosTerminal` (reference implementation)

**Files:**
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts`
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.html`
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.scss`

**TS changes:**
- Import `CustomerPicker` and `Customer`
- Add signals: `_selectedCustomer = signal<Customer | null>(null)`, `_showCustomerPicker = signal(false)`
- Add methods: `openCustomerPicker()`, `onCustomerSelected(customer)`, `closeCustomerPicker()`, `clearCustomer()`
- In order creation, map `_selectedCustomer()` to `CustomerInfo` (coalesce nulls to `''`)
- In `finishAndNewOrder()`, reset `_selectedCustomer` to `null`

**HTML changes** — replace placeholder at lines 224-231:
```html
@if (selectedCustomer(); as customer) {
  <!-- Show selected customer with name, phone, and clear (X) button -->
} @else {
  <button class="customer-row" (click)="openCustomerPicker()">Add customer</button>
}

@if (showCustomerPicker()) {
  <div class="send-overlay">
    <div class="send-modal">
      <os-customer-picker (customerSelected)="onCustomerSelected($event)" (cancelled)="closeCustomerPicker()" />
    </div>
  </div>
}
```

**SCSS changes:** Add `.customer-row-selected`, `.customer-avatar-filled`, `.customer-initials`, `.customer-clear-btn` styles.

## Step 4: Wire into `BarTerminal`

**Files:** `src/app/features/bar/bar-terminal/bar-terminal.{ts,html,scss}`

Same pattern as Step 3. Replace placeholder at lines 245-252. Uses existing `checkout-overlay` / `checkout-modal` class names. The bar terminal's existing checkout customer-info form fields should be auto-populated from `_selectedCustomer` when set.

## Step 5: Wire into `KioskTerminal`

**Files:** `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.{ts,html,scss}`

Same pattern as Step 3.

## Step 6: Wire into `RegisterTerminal`

**Files:** `src/app/features/register/register-terminal/register-terminal.{ts,html,scss}`

Same pattern as Step 3.

## Step 7: Backend — Add POST customer endpoint

**File:** `/Users/jam/development/Get-Order-Stack-Restaurant-Backend/` (appropriate routes file)

Add `POST /restaurant/:restaurantId/customers` endpoint:
- Accept: `{ firstName, lastName?, phone?, email? }`
- Insert into `customers` table with defaults (`totalOrders: 0`, `totalSpent: 0`, `loyaltyPoints: 0`, `loyaltyTier: 'none'`, `tags: []`)
- Return created `Customer` object
- Commit and push so Render auto-deploys

---

## Files Summary

| # | File | Action |
|---|------|--------|
| 1 | `src/app/services/customer.ts` | Add `createCustomer()` method |
| 2 | `src/app/shared/customer-picker/customer-picker.ts` | **NEW** |
| 3 | `src/app/shared/customer-picker/customer-picker.html` | **NEW** |
| 4 | `src/app/shared/customer-picker/customer-picker.scss` | **NEW** |
| 5 | `src/app/features/pos/server-pos-terminal/server-pos-terminal.{ts,html,scss}` | Wire picker |
| 6 | `src/app/features/bar/bar-terminal/bar-terminal.{ts,html,scss}` | Wire picker |
| 7 | `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.{ts,html,scss}` | Wire picker |
| 8 | `src/app/features/register/register-terminal/register-terminal.{ts,html,scss}` | Wire picker |
| 9 | Backend routes file | Add POST `/restaurant/:restaurantId/customers` |

## Verification

1. `ng serve` — confirm app compiles with no errors
2. Navigate to `/pos` — click "Add Customer" button, verify picker modal opens
3. Search for a customer name — verify results appear with debounced search
4. Select a customer — verify sidebar shows name/phone with clear button
5. Clear customer — verify "Add Customer" button returns
6. Create new customer — verify inline form works and selects the new customer
7. Repeat steps 2-6 on `/bar`, `/kiosk`, `/register`
8. Create an order with a customer attached — verify `customer` field in order payload
