# GOS-SPEC-09: Customer Engagement — Square Parity Enhancements

## Context

Square's Customer Engagement ecosystem includes a Customer Directory with merge/deduplication, loyalty programs with volume-based pricing tiers ($45-$105/month at scale), email + SMS marketing with AI-generated content, physical + digital gift cards, Square Feedback for reputation management, smart group segmentation with auto-enrollment, Square Messages (unified SMS/email inbox), and marketing automation triggers (welcome series, win-back, birthday). OrderStack has strong CRM foundations — 5-segment customer dashboard (VIP/Regular/New/At-Risk/Dormant) with detail panel and loyalty section, 4-tier loyalty with rewards/redemption, email/SMS campaign builder with templates, and digital gift cards with balance tracking — but lacks several Square engagement features.

**Key gaps identified:**
- No **customer merge/deduplication** — same customer visiting with different phone numbers creates duplicates
- No **birthday/anniversary fields** — `Customer` model has no birthdate; birthday campaign template exists but no data to trigger it
- No **marketing consent tracking** — no email/SMS opt-in fields, no unsubscribe tracking
- No **customer notes/interaction log** — no free-text notes or history on customer records
- No **automated campaign triggers** — campaigns are manually sent/scheduled, no event-based automation
- No **customer-facing account portal** — customers cannot view order history, loyalty, or update info
- No **CRM insights tab** — `CrmTab` includes 'insights' but no content built
- No **physical gift cards** — only digital gift cards exist
- No **review/feedback collection** — no post-visit prompt, no NPS
- No **referral program** — no referral codes or rewards
- No **customer custom fields** — only fixed field set
- Marketing campaigns are **model-only** — `MarketingService.sendCampaign()` calls backend but no email/SMS provider wired

**Existing assets:**
- `models/customer.model.ts` — Customer with segments, 5 sort fields, tags
- `services/customer.ts` — CustomerService with loadCustomers, search, updateTags, getSegment
- `crm/customer-dashboard/` — search, segment filter, sort, detail panel with loyalty section
- `models/loyalty.model.ts` — 4 tiers, config, profile, transactions, rewards, redemption
- `services/loyalty.ts` — LoyaltyService with 12 methods
- `models/marketing.model.ts` — Campaign with 6 types, 3 channels, 5 statuses, audience targeting, performance
- `services/marketing.ts` — MarketingService with CRUD + send + schedule + audience estimate
- `models/gift-card.model.ts` — GiftCard with digital/physical type, redemption history
- `services/gift-card.ts` — GiftCardService with 7 methods

---

## Mode Awareness (GOS-SPEC-01 Alignment)

Customer engagement (CRM, loyalty, marketing, gift cards, feedback) is **universal across all business verticals**. The `crm`, `marketing`, `loyalty`, and `gift_cards` platform modules appear in most verticals' `enabledModules`. Customer data and engagement patterns are vertical-agnostic at the data layer, with UI labels and segmentation logic adapting per vertical.

### Universal Features (All Verticals)

Every feature in this spec is fundamentally universal:
- Customer model enrichment (birthday, notes, consent, custom fields, merge)
- CRM insights dashboard (growth, segments, LTV, retention)
- Marketing automation triggers (welcome, win-back, birthday, post-visit)
- Loyalty programs (points, tiers, rewards, redemption)
- Gift cards (digital + physical, activation, balance check)
- Referral programs
- Feedback collection (NPS, ratings, categories)
- Customer self-service portal

### Vertical-Specific Adaptations

| Feature | Adaptation by Vertical | Notes |
|---|---|---|
| **Customer segments** | Universal 5-segment model (VIP/Regular/New/At-Risk/Dormant) works for all verticals | Segment thresholds may differ: a VIP diner visits 3x/month, a VIP retail shopper may visit 1x/month at higher spend |
| **Segment labels** | `food_and_drink`: "Diners"; `retail`: "Shoppers"; `services`: "Clients" | Label-only change |
| **Loyalty program names** | `food_and_drink`: "Rewards Program"; `retail`: "Loyalty Program"; `services`: "Member Benefits" | Cosmetic |
| **Loyalty earn trigger** | `food_and_drink`: per dollar spent on food/drink; `retail`: per dollar spent on products; `services`: per appointment completed | `LoyaltyConfig.pointsPerDollar` is universal; trigger event source differs |
| **Reward types** | `food_and_drink`: free item, discount, free delivery; `retail`: discount, free product, free shipping; `services`: free session, discount, upgrade | `LoyaltyReward.rewardType` stays the same; available items change per vertical |
| **Marketing campaign types** | Universal 6 types (promotion, announcement, loyalty, birthday, seasonal, custom) | Campaign type list is universal |
| **Marketing audience targeting** | Segment + loyalty tier + custom fields — universal | Channel options may differ (services adds "appointment reminder" as type) |
| **Automation triggers** | All 7 triggers are universal; `post_visit` is renamed per vertical: "post-order" (food), "post-purchase" (retail), "post-appointment" (services) | Trigger name is cosmetic; logic is identical |
| **Feedback categories** | `food_and_drink`: food, service, ambiance, speed, value; `retail`: products, service, selection, value, checkout; `services`: quality, timeliness, ambiance, value, staff | `FeedbackRequest.categories` string array adapts per vertical |
| **Gift cards** | Universal | No vertical differences |
| **Referral program** | Universal | No vertical differences |
| **Customer portal** | Universal layout; content adapts: restaurants show order history, retail shows purchase history, services show appointment history | Portal sections gated by `enabledModules` |

### Marketing Consent — Compliance Note

Marketing consent (email/SMS opt-in) is regulated regardless of vertical. The opt-in checkboxes placement adapts:
- `food_and_drink`: Checkout modal, online ordering portal, kiosk checkout
- `retail`: POS checkout, online store checkout
- `services`: Booking confirmation, intake forms, appointment check-in

All placements follow the same `emailOptIn` / `smsOptIn` fields on the `Customer` model.

### CRM Insights — Metric Adaptations

| Metric | `food_and_drink` | `retail` | `services` |
|---|---|---|---|
| Visit frequency | Orders per month | Purchases per month | Appointments per month |
| Average ticket | Average check size | Average basket size | Average service value |
| LTV calculation | Lifetime food spend | Lifetime purchase spend | Lifetime service spend |
| Retention definition | Returned within 30/60/90 days | Purchased again within 30/60/90 days | Rebooked within 30/60/90 days |
| Top customers ranked by | Total spend + visit count | Total spend + purchase count | Total spend + appointment count |

---

## Phase 1 — Customer Data Enrichment (Steps 1-5)

### Step 1: Extend Customer Model

**Add to `models/customer.model.ts`:**
```ts
// Add to Customer interface
birthdate: string | null;
anniversary: string | null;
emailOptIn: boolean;
smsOptIn: boolean;
unsubscribedAt: string | null;
notes: CustomerNote[];
customFields: Record<string, string>;
referralCode: string | null;
referredBy: string | null;
npsScore: number | null;
lastNpsAt: string | null;
mergedIntoId: string | null;    // Non-null if this record was merged

// New interfaces
export interface CustomerNote {
  id: string;
  text: string;
  createdBy: string;
  createdAt: string;
}

export interface CustomerMergePreview {
  sourceId: string;
  targetId: string;
  conflictFields: string[];     // Fields that differ between records
  mergedResult: Partial<Customer>;
}

export interface CustomerCustomField {
  id: string;
  restaurantId: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'date' | 'select';
  options: string[] | null;     // For 'select' type
  isRequired: boolean;
  displayOrder: number;
}
```

### Step 2: Customer Merge/Deduplication

**Add to `CustomerService`:**
- `findDuplicates(customerId)` — GET `/customers/:id/duplicates` (matches by phone, email, or name similarity)
- `previewMerge(sourceId, targetId)` — GET `/customers/merge-preview?source=...&target=...`
- `mergeCustomers(sourceId, targetId, resolvedFields)` — POST `/customers/merge`
- `loadMergeHistory()` — GET `/customers/merge-history`

**UI in Customer Dashboard:**
- "Possible Duplicates" badge on customer cards when duplicates detected
- Merge wizard: side-by-side comparison, field-by-field resolution (pick source or target value), confirm merge
- Merged customer retains all orders, loyalty points, and transactions from both records
- Source customer marked as merged (soft delete), redirects to target

### Step 3: Customer Notes & Interaction Log

**Add to `CustomerService`:**
- `addNote(customerId, text)` — POST `/customers/:id/notes`
- `deleteNote(customerId, noteId)` — DELETE `/customers/:id/notes/:noteId`

**Add to Customer Dashboard detail panel:**
- Notes section: chronological list of notes with author + timestamp
- "Add Note" input with submit button
- Note templates: "Phone call", "Complaint", "VIP request", "Dietary restriction"

### Step 4: Marketing Consent Management

**Add to Customer Dashboard:**
- Email opt-in / SMS opt-in toggle per customer
- Bulk opt-in collection: "SMS Opt-in" checkbox on checkout forms (OnlinePortal, Kiosk, CheckoutModal)
- Unsubscribe handling: marketing campaign includes unsubscribe link → marks customer
- Consent timestamp logging for compliance
- Campaign audience filters respect opt-in status

**Add to Online Portal + Kiosk checkout:**
- "Get order updates via text?" checkbox (SMS opt-in)
- "Receive deals and offers via email?" checkbox (email opt-in)

### Step 5: CRM Insights Tab

**Build the missing 'insights' tab content in Customer Dashboard:**
- **Customer growth chart** — new customers per week/month (line chart)
- **Segment distribution doughnut** — VIP/Regular/New/At-Risk/Dormant percentages
- **Average lifetime value trend** — LTV over time
- **Top customers table** — ranked by total spent or visit count
- **Retention rate** — % of customers returning within 30/60/90 days
- **At-risk alert** — count of customers trending from regular → at-risk

---

## Phase 2 — Marketing Automation & Feedback (Steps 6-10)

### Step 6: Marketing Automation Triggers

**Add to `models/marketing.model.ts`:**
```ts
export type AutomationTrigger =
  | 'welcome'            // Customer's first order
  | 'win_back'           // No order in X days
  | 'birthday'           // X days before birthday
  | 'anniversary'        // X days before anniversary
  | 'loyalty_tier_up'    // Customer reaches new tier
  | 'post_visit'         // X hours after order
  | 'abandoned_cart';    // Cart created but no order (online only)

export interface MarketingAutomation {
  id: string;
  restaurantId: string;
  trigger: AutomationTrigger;
  name: string;
  campaignTemplateId: string | null;  // Links to template
  channel: CampaignChannel;
  delayMinutes: number;        // Wait time after trigger event
  isActive: boolean;
  triggerConfig: Record<string, number>;  // e.g. { daysInactive: 30 } for win_back
  sentCount: number;
  createdAt: string;
}
```

**Add to `MarketingService`:**
- `loadAutomations()` — GET `/marketing/automations`
- `createAutomation(data)` — POST `/marketing/automations`
- `updateAutomation(id, data)` — PATCH `/marketing/automations/:id`
- `toggleAutomation(id, isActive)` — PATCH `/marketing/automations/:id/toggle`
- `deleteAutomation(id)` — DELETE `/marketing/automations/:id`

**Add "Automations" tab to Campaign Builder:**
- Automation list with trigger type icon, channel badge, active toggle, sent count
- Create/edit modal: trigger selector, delay config, channel, template picker, activation toggle
- Per-trigger config: win_back → "days inactive" slider, birthday → "days before" slider, post_visit → "hours after" slider

### Step 7: Referral Program

**Add to `models/customer.model.ts`:**
```ts
export interface ReferralConfig {
  enabled: boolean;
  referrerReward: ReferralReward;
  refereeReward: ReferralReward;
  maxReferrals: number | null;   // null = unlimited
}

export interface ReferralReward {
  type: 'points' | 'discount_percentage' | 'discount_flat' | 'free_item';
  value: number;
  freeItemId: string | null;
}

export interface Referral {
  id: string;
  referrerCustomerId: string;
  refereeCustomerId: string;
  referralCode: string;
  rewardFulfilled: boolean;
  createdAt: string;
}
```

**Integrate:**
- Customer Dashboard: referral code display in detail panel, referral count
- Online Portal: "Referral Code" input on checkout (optional)
- Loyalty Settings: referral program configuration section

### Step 8: Post-Visit Feedback Collection

**Add to `models/customer.model.ts`:**
```ts
export interface FeedbackRequest {
  id: string;
  orderId: string;
  customerId: string;
  npsScore: number | null;       // 0-10
  rating: number | null;         // 1-5 stars
  comment: string | null;
  categories: string[];          // 'food', 'service', 'ambiance', 'speed', 'value'
  isPublic: boolean;             // Customer consented to public display
  createdAt: string;
}
```

**Add to `CustomerService`:**
- `sendFeedbackRequest(orderId)` — POST `/customers/feedback/request` (triggers email/SMS)
- `loadFeedback(restaurantId, dateRange?)` — GET `/customers/feedback`
- `respondToFeedback(feedbackId, response)` — POST `/customers/feedback/:id/respond`

**UI:**
- CRM Dashboard: "Feedback" section in insights tab
  - Average NPS score, star rating distribution, category breakdown
  - Recent feedback list with respond button
  - Negative feedback flagged for immediate attention
- Post-visit automation (from Step 6): auto-send feedback request X hours after order completion

### Step 9: Physical Gift Cards

**Extend `models/gift-card.model.ts`:**
```ts
// Add to GiftCard
physicalCardNumber: string | null;   // Printed card number
activatedAt: string | null;
activatedBy: string | null;         // Staff who activated

// New
export interface GiftCardActivation {
  cardNumber: string;
  amount: number;
}
```

**Add to `GiftCardService`:**
- `activatePhysicalCard(cardNumber, amount)` — POST `/gift-cards/activate`
- `lookupByCardNumber(cardNumber)` — GET `/gift-cards/lookup?cardNumber=...`

**UI in Gift Card Management:**
- "Activate Physical Card" button → card number input (barcode scanner compatible) + amount
- Physical cards distinguished from digital in list view
- POS Terminal: "Gift Card" payment type → scan/enter card number → check balance → apply

### Step 10: Customer Self-Service Portal

**New: `online-ordering/customer-portal/` (4 files)**

Customer-facing account page:
- Login via phone number + OTP (or email link)
- Order history: list of past orders with reorder button
- Loyalty dashboard: tier, points, available rewards, transaction history
- Profile: name, email, phone, birthday, saved addresses, marketing preferences
- Gift card balance checker
- Active reservations list
- Feedback history

Register as `get-order-stack-customer-portal` custom element.

---

## Phase 3 — Advanced Engagement (Steps 11-13)

### Step 11: Smart Customer Groups

**Extend segment system beyond 5 static segments:**
- Custom group definitions: rules-based (e.g., "ordered 3+ times in last 30 days AND spent > $100")
- Auto-enrollment: customers automatically added/removed as they meet/lose criteria
- Groups usable as campaign audience (replaces manual segment selection)
- Pre-built smart groups: "Lunch Regulars", "Weekend Diners", "High Spenders", "Birthday This Month"

### Step 12: Unified Messaging Inbox

**Add to CRM or as standalone component:**
- Combined view of all customer communications: SMS, email, feedback responses
- Per-customer conversation thread
- Quick reply from inbox
- Message templates for common responses
- Unread message count badge

### Step 13: Build Verification

- `ng build` both library and elements — zero errors
- Verify customer merge wizard shows side-by-side comparison
- Verify marketing automations create and show in list
- Verify birthday field saves on customer record
- Verify opt-in checkboxes appear in checkout flows
- Verify CRM insights tab shows charts
- Verify feedback collection sends request and displays responses
- Verify customer portal renders order history and loyalty

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `online-ordering/customer-portal/` (4 files) | Customer self-service portal |

### Modified Files
| File | Changes |
|------|---------|
| `models/customer.model.ts` | Birthday, consent, notes, customFields, referral, NPS, merge, CustomerCustomField, FeedbackRequest, ReferralConfig |
| `models/marketing.model.ts` | MarketingAutomation, AutomationTrigger |
| `models/gift-card.model.ts` | Physical card fields, GiftCardActivation |
| `services/customer.ts` | Merge, notes, feedback, duplicates |
| `services/marketing.ts` | Automation CRUD |
| `services/gift-card.ts` | Physical card activation, barcode lookup |
| `crm/customer-dashboard/` | Notes section, merge wizard, insights tab charts, consent toggles, feedback view |
| `marketing/campaign-builder/` | Automations tab |
| `settings/gift-card-management/` | Physical card activation UI |
| `online-ordering/online-order-portal/` | Consent checkboxes in checkout |
| `sos/checkout-modal/` | Consent checkboxes |
| `kiosk/kiosk-terminal/` | Consent checkbox |
| `settings/loyalty-settings/` | Referral program config section |
| `public-api.ts` | Add CustomerPortal export |
| `elements/src/main.ts` | Register `get-order-stack-customer-portal` |

---

## Verification

1. `ng build` both library and elements — zero errors
2. Customer merge wizard merges records and consolidates orders/points
3. Birthday field saves and is usable by birthday automation trigger
4. Marketing opt-in checkboxes appear in online checkout and kiosk
5. CRM insights tab shows customer growth, segment distribution, retention
6. Marketing automations list shows with active/inactive toggle
7. Feedback request sends after post-visit trigger fires
8. Physical gift card activation works from barcode input
9. Customer portal shows order history, loyalty, and profile editing
