your research is wrong
# Square POS Bottom Navigation — Research

## Overview

Square POS uses a persistent **bottom navigation bar** across all staff-facing devices (Terminal, Register, iPad/phone app). The bar contains four fixed tabs: **Checkout**, **Transactions**, **Notifications**, and **More**. The nav bar is customizable — merchants can add optional modules (Orders, Invoices, Reports) between the fixed tabs. Checkout, Notifications, and More are always locked in place.

**Key insight:** The kiosk is fundamentally different. It has NO bottom nav — it's a locked, full-screen, customer-facing self-ordering flow. Staff never interact with it.

---

## 1. Checkout (Main Item Grid / Order Creation)

Split into two areas:
- **Left side:** Item selection with three sub-tabs: **Keypad** (custom amounts), **Library** (full catalog by category), **Favorites** (customizable tile grid)
- **Right side:** Current order/cart with line items, quantities, subtotals, **Charge** button

Favorites grid: color-coded tiles for items, categories, discounts, gift cards, rewards. Long-press to edit/rearrange. Up to 6 pages on tablet, 1 on phone.

**Actions:** Add items (Favorites/Library/search), custom amounts via Keypad, apply discounts, add notes, sell/check gift cards, redeem loyalty, clear cart, split payment, select dining option, open/manage bar tabs.

**Device differences:**
- Terminal: Smaller screen, same 3 sub-tabs, 1 Favorites page, built-in printer
- Register: Dual-screen (seller sees full checkout, customer sees itemized order + payment)
- Kiosk: Completely different full-screen self-ordering flow — no bottom nav

---

## 2. Transactions (History / Refunds / Receipts)

List view of past transactions sorted by most recent. Each row: amount, payment method, timestamp, status.

**Search by:** Customer name/phone/email, card last 4, receipt ID, item or ticket name, notes, device name, or by tapping the original card.

**Actions:** Search, tap to view details, issue receipt (email/print), process refund (full or partial, within 1 year).

**Detail view shows:** Line items, payment info (method, amount, tip), receipt number, refund status, customer info.

**Device differences:**
- Terminal: Same capabilities, smaller screen, can print from built-in printer
- Register: Full history on seller screen
- Phone: More limited search (card numbers, receipt IDs, card tap only)
- Kiosk: No transactions tab at all

---

## 3. Notifications (Alerts / Order Updates)

Bell icon with blue dot for unread. Feed of alerts:
- **Order alerts:** New incoming orders (online, delivery, pickup) — popup + badge
- **Account alerts:** Payment confirmations, refund notifications, transfer status
- **Low inventory alerts:** When stock drops below thresholds
- **Feature announcements:** New Square features
- **Service disruptions:** Square system outage notifications
- **Invoice events:** Sent, viewed, paid, canceled
- **Staff scheduling:** Shift-related notifications

**Actions:** View/read, tap to navigate to relevant section, manage preferences.

**Device differences:**
- Terminal/Register/iPad: Full notification center
- Kiosk: No notification tab
- Square for Restaurants: Notifications can optionally be removed from bottom bar

---

## 4. More (Tools Menu)

Grid/list of available modules. Has a **Customize** button to add/remove items.

| Category | Options |
|----------|---------|
| **Cash Management** | Open Cash Drawer (No Sale), Start/End Drawer Session, Pay In/Out, Current Drawer status |
| **Reports** | Drawer History, sales summary, quick sales overview |
| **Orders** | Order Manager, open tickets management |
| **Invoices** | Create, send, manage invoices |
| **Settings** | Hardware, Add-ons, Account settings, Checkout preferences |
| **Actions** (Retail) | Clear Cart, Add Custom Amount, Gift Card, Redeem Reward, Manage Favorites |
| **Support** | Help articles, contact support |
| **Other** | Setup Hardware, Sign Out |

**Square for Restaurants extras:** Floor Plan (pinnable to nav), Open Tickets/Bar Tabs, Bills (split checks, settle tips).

**Device differences:**
- Terminal: Same menu, smaller screen, USB cash drawer required
- Register: Full menu, more USB ports, Ethernet support
- Kiosk: No More menu at all

---

## OrderStack Current State

All 4 terminals (bar, POS, kiosk, register) have bottom nav buttons that track state but render **zero content** for Transactions, Notifications, or More.

| Terminal | Tabs | Content Implemented |
|----------|------|-------------------|
| Bar | Checkout, Transactions, Notifications, More | Checkout only |
| POS | Checkout, **Open Orders**, Notifications, More | Checkout only |
| Kiosk | Checkout, Transactions, Notifications, More | Checkout only |
| Register | Checkout, Transactions, Notifications, More | Checkout only |

**Existing code that can be reused:**
- `OrderService` — `orders()` signal, `loadOrders()`, `getOrderById()`, status methods
- `CashDrawer` component at `src/app/features/pos/cash-drawer/`
- `OrderHistory` component at `src/app/features/orders/order-history/`
- `PaymentTerminal` shared component (pattern to follow)
- `SocketService` — `lastOrderEvent` signal for notification generation
- `AuthService` — `logout()` method

---

## Sources

- [Square POS Redesign](https://squareup.com/us/en/the-bottom-line/inside-square/square-pos-redesign)
- [Square Retail POS Actions and Defaults](https://squareup.com/help/us/en/article/5777-square-retail-pos-app-actions-and-defaults)
- [Item Grid Setup](https://squareup.com/help/us/en/article/8334-set-up-item-grid)
- [Transaction Search](https://squareup.com/help/us/en/article/5145-transaction-search)
- [Process Refunds](https://squareup.com/help/us/en/article/6116-process-refunds)
- [Notification Center](https://squareup.com/help/us/en/article/6838-notification-center)
- [Cash Drawer Management](https://squareup.com/help/us/en/article/5152-cash-drawer-management)
- [Cash Drawer Sessions](https://squareup.com/help/us/en/article/8344-start-and-end-a-cash-drawer-session)
- [Cash Drawer Reports](https://squareup.com/help/us/en/article/8358-view-cash-drawer-reports)
- [Square Kiosk Setup](https://squareup.com/help/us/en/article/8538-set-up-square-kiosk)
- [KDS Display Modes](https://www.fresh.technology/blog/kds-display-modes)
