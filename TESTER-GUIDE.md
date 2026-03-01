# OrderStack — Tester Guide

Welcome to OrderStack, a restaurant management platform. This guide will help you explore the app and provide feedback.

---

## Getting Started

**URL:** https://www.getorderstack.com

### Login Credentials

| Role | Email | Password | What You Can Access |
|------|-------|----------|-------------------|
| Owner | owner@taipa.com | owner123 | Everything — full admin access |
| Manager | manager@taipa.com | manager123 | Most features, no billing/account settings |
| Staff | staff@taipa.com | staff123 | Staff portal, POS, time clock |

**Start with the Owner account** to see everything. After login, you'll be asked to select a restaurant — pick the one that appears.

---

## Main Areas to Explore

### Day-to-Day Operations

| Feature | Where to Find It | What It Does |
|---------|-----------------|--------------|
| **POS Terminal** | Sidebar → POS | Ring up orders, add items, apply discounts, split checks |
| **Order Pad** | Sidebar → Order Pad | Quick order entry (simpler than full POS) |
| **Pending Orders** | Sidebar → Orders | View open orders, mark complete, void |
| **Order History** | Sidebar → Order History | Search past orders, view receipts |
| **KDS (Kitchen Display)** | Sidebar → KDS | Kitchen ticket view — bump orders as they're made |
| **Cash Drawer** | Sidebar → Cash Drawer | Track cash in/out, reconcile at end of shift |
| **Close of Day** | Sidebar → Close of Day | End-of-day summary and reconciliation |

### Floor & Table Management

| Feature | Where to Find It | What It Does |
|---------|-----------------|--------------|
| **Floor Plan** | Sidebar → Floor Plan | Drag-and-drop table layout editor |
| **Reservations** | Sidebar → Reservations | Manage bookings, waitlist, recurring reservations |

### Menu & Inventory

| Feature | Where to Find It | What It Does |
|---------|-----------------|--------------|
| **Menu Management** | Sidebar → Menu | Add/edit menu items, categories, modifiers, pricing |
| **Combo Management** | Sidebar → Combos | Create meal deals and bundles |
| **Inventory** | Sidebar → Inventory | Track stock levels, set alerts, unit conversions |
| **Food Cost** | Sidebar → Food Cost | Recipe costing, vendor invoices, margin analysis |

### Staff & Labor

| Feature | Where to Find It | What It Does |
|---------|-----------------|--------------|
| **Scheduling** | Sidebar → Scheduling | Build schedules, manage shifts, time clock |
| **Staff Portal** | Login as staff@taipa.com | Employee self-service — view schedule, clock in/out |

### Analytics & Reports

| Feature | Where to Find It | What It Does |
|---------|-----------------|--------------|
| **Home Dashboard** | Sidebar → Home | Daily snapshot — sales, orders, trends |
| **Command Center** | Sidebar → Command Center | Real-time overview with AI insights, forecasting |
| **Menu Engineering** | Sidebar → Menu Engineering | Item profitability matrix (stars, plowhorses, puzzles, dogs) |
| **Reports** | Sidebar → Reports | Close-of-day, sales reports, tax summaries |

### Customers & Marketing

| Feature | Where to Find It | What It Does |
|---------|-----------------|--------------|
| **CRM** | Sidebar → Customers | Customer database, order history, feedback |
| **Marketing** | Sidebar → Marketing | Email/SMS campaigns, automations, audience segments |
| **Invoicing** | Sidebar → Invoicing | House accounts, invoice management |

### Retail (if applicable)

| Feature | Where to Find It | What It Does |
|---------|-----------------|--------------|
| **Retail Catalog** | Sidebar → Retail → Catalog | Manage retail products, categories, option sets |
| **Retail POS** | Sidebar → Retail → POS | Ring up retail items |
| **Retail Inventory** | Sidebar → Retail → Inventory | Stock levels, low-stock alerts |
| **Retail Ecommerce** | Sidebar → Retail → Ecommerce | Online retail orders |

### Settings & Configuration

| Feature | Where to Find It | What It Does |
|---------|-----------------|--------------|
| **Settings** | Sidebar → Settings (gear icon) | All configuration in one place |
| → Hardware | Settings tab | Printers, terminals, peripherals |
| → Payment | Settings tab | Stripe/PayPal connection for processing |
| → Delivery | Settings tab | DoorDash Drive, Uber Direct credentials |
| → Loyalty | Settings tab | Rewards program, referrals |
| → Gift Cards | Settings tab | Gift card management |
| → Kitchen & Orders | Settings tab | Ticket routing, order flow |
| → AI | Settings tab | AI assistant configuration |
| → Time Clock | Settings tab | Break types, overtime rules |
| → Account & Billing | Settings tab | Subscription, business info |

---

## What to Look For

You know restaurants better than any developer. As you click around, think about:

### Does it match how you actually work?
- Is the POS flow natural? Can you ring up a typical order quickly?
- Does the KDS show tickets the way your kitchen expects?
- Is the floor plan editor intuitive for setting up your dining room?
- Does the scheduling tool work the way you'd actually build a schedule?

### What's missing?
- Any feature you use daily that isn't here?
- Any workflow that takes too many clicks?
- Any terminology that doesn't match what restaurants actually say?

### What's confusing?
- Any page where you don't know what to do?
- Any buttons or labels that aren't clear?
- Any empty pages that should have example data or instructions?

### What's broken?
- Anything that errors out or looks wrong?
- Any page that loads blank or shows a spinner forever?
- Any action that doesn't do what you'd expect?

---

## How to Report Feedback

Just tell Jeff. No formal process needed. The most useful feedback is:

1. **What you were trying to do** (e.g., "I was trying to add a modifier to a menu item")
2. **What happened** (e.g., "The save button didn't do anything")
3. **What you expected** (e.g., "I expected it to save and go back to the menu")

Screenshots help but aren't required. Even a text message like "the POS is weird when you try to split a check" is useful.

---

## Notes

- This is a demo environment with sample data — you can't break anything permanently
- Some features are configuration-only right now (delivery, payment processing) — they need real API keys to fully work
- The Kiosk page has some missing images — that's a known data issue, not a bug
- If a page redirects you back to the dashboard, it might require a different login role
