# C-10 — Lead Capture & CTA System

## Project
`/Users/jam/development/orderstack-app/`

## Context
Read **`src/app/features/website/Claude.md`** first. This task maps to the GetOrderStack Marketing Site Plan C-11 (Lead Capture & CTA System), marked P0 in the docx. The footer links to `/contact` (dead route). The "Start Free Trial" CTAs across hero, pricing, and final CTA sections all route to `/signup` which currently loads the auth login page. This task builds the contact/demo-request page, a reusable email capture component for embedding across the site, and a once-per-session exit-intent popup. All forms submit client-side only (no backend endpoint yet) with a configurable API URL for when the backend is ready.

## What to Build

### 1. ContactPageComponent (`os-contact-page`)
**Location:** `src/app/features/website/pages/contact/` with separate `.ts`, `.html`, `.scss`

**Selector:** `os-contact-page`

**Route:** `/contact`

**Page structure (top to bottom):**

#### A. Hero
Reuse `MarketingHeroComponent` with contact-specific config (no CTAs — the form IS the CTA).

#### B. Two-Column Layout (desktop) / Stacked (mobile)

**Left Column — Contact Form:**
- Form fields (all signal-based state, NO reactive forms):
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `name` | text input | yes | min 2 chars |
  | `email` | email input | yes | email regex |
  | `phone` | tel input | no | — |
  | `restaurantName` | text input | no | — |
  | `inquiryType` | select dropdown | yes | must pick one |
  | `message` | textarea | yes | min 10 chars |

- Inquiry type options: `'general'`, `'demo_request'`, `'pricing_question'`, `'partnership'`, `'support'`
- Each field: label above, `--os-border` border, `--os-radius` corners, focus ring with `--os-primary`
- Inline validation: red border + error message below field on blur if invalid. Error text in `--os-danger` or `#dc2626`.
- Submit button: `btn-os-primary btn-lg` full-width, disabled while `formValid()` is false or `submitting()` is true
- On submit: set `submitting = signal(true)`, simulate 1.5s delay (`setTimeout`), then set `submitted = signal(true)` — NO actual HTTP call yet (see placeholder mode below)

**Right Column — Contact Info Cards:**
- 3 stacked info cards:
  - **Email:** bi-envelope icon, hello@getorderstack.com
  - **Phone:** bi-telephone icon, (561) 555-0123
  - **Location:** bi-geo-alt icon, Delray Beach, FL — Serving Broward & Palm Beach County
- Below cards: **"Prefer a demo?"** callout box with brief text + "Schedule a Demo" button that scrolls to the form and pre-selects `demo_request` as inquiry type

#### C. Thank You State
When `submitted()` is true, replace the entire form (not the page) with:
- Large `bi-check-circle` icon in green
- "Thanks, [name]! We'll be in touch within 24 hours."
- "What to expect" list: 1) Confirmation email, 2) Personalized demo walkthrough, 3) Custom pricing based on your needs
- "Back to Home" link

#### D. Placeholder / Mock Mode
Since no backend exists yet, form submission is mocked:
```typescript
// In component
private async submitForm(): Promise<void> {
  this.submitting.set(true);
  const payload = {
    name: this.name(),
    email: this.email(),
    phone: this.phone(),
    restaurantName: this.restaurantName(),
    inquiryType: this.inquiryType(),
    message: this.message(),
    source: 'contact_page',
    timestamp: new Date().toISOString(),
  };
  
  // TODO: Replace with actual API call when backend is ready
  // await fetch(`${environment.apiUrl}/api/leads`, { method: 'POST', body: JSON.stringify(payload) });
  console.log('[OrderStack Lead]', payload);
  
  await new Promise(resolve => setTimeout(resolve, 1500)); // simulate network
  this.submitted.set(true);
  this.submitting.set(false);
}
```

### 2. EmailCaptureComponent (`os-email-capture`)
**Location:** `src/app/features/website/shared/email-capture.component.ts` (inline template + styles)

**Selector:** `os-email-capture`

**Purpose:** Compact inline email signup for embedding in blog pages, landing page, etc. Single email input + submit button on one row.

**Inputs:**
```typescript
readonly headline = input('Stay in the loop');
readonly subtext = input('Get restaurant tech tips and product updates. No spam, ever.');
readonly buttonLabel = input('Subscribe');
readonly source = input('inline_capture'); // tracking source
```

**Display:**
- Optional headline (bold, `--os-text-primary`) + subtext (secondary)
- Inline row: email input (flex-grow) + submit button (`btn-os-primary`)
- Email validation on blur (red border if invalid)
- On submit: mock console.log like contact form, show "You're in! Check your inbox." success inline (replaces input row)
- Compact: entire component max-width 500px

### 3. EmailCaptureInBlog Integration
**File:** `src/app/features/website/pages/blog/blog.component.html`

Add `<os-email-capture>` below the blog post grid (before any pagination), inside an `<os-mkt-section background="alt">`:
```html
<os-mkt-section background="alt">
  <os-email-capture
    headline="Get Restaurant Tech Insights"
    subtext="Join operators who get weekly tips on cutting costs, improving ops, and growing without third-party fees."
    source="blog_page" />
</os-mkt-section>
```

Update `blog.component.ts` to import `EmailCaptureComponent` and `MarketingSectionComponent`.

### 4. ExitIntentPopupComponent (`os-exit-intent-popup`)
**Location:** `src/app/features/website/shared/exit-intent-popup.component.ts` with separate `.html` and `.scss`

**Selector:** `os-exit-intent-popup`

**Purpose:** Modal popup triggered once per session when user shows intent to leave. Captures email with a compelling offer.

**Trigger logic (in component):**
- **Desktop:** `mouseleave` on `document.documentElement` when `event.clientY <= 0` (cursor moved above viewport toward address bar/tabs)
- **Mobile:** No exit-intent on mobile — too aggressive and unreliable. Skip entirely for viewports < 768px.
- **Once per session:** Use a component signal `shown = signal(false)`. Once shown, never show again. Also set `sessionStorage.setItem('os_exit_popup_shown', '1')` and check on init — if already set, never show.
- **Delay:** Don't trigger until user has been on site for at least 10 seconds (track with `setTimeout` on init)
- **Excluded pages:** Don't trigger on `/contact` or `/signup` (user is already converting)

**Display:**
- Fullscreen backdrop (`rgba(0,0,0,0.5)`, `z-index: 1000`)
- Centered modal card (max-width 480px, `--os-bg-card`, `--os-radius-lg`, `--os-shadow-lg`)
- Close button (X) top-right
- Close on backdrop click
- Close on Escape key
- Content:
  - Headline: "Wait — before you go!"
  - Subtext: "Get a free savings report showing how much your restaurant could save by switching to OrderStack."
  - Email input + "Get My Free Report" button
  - Small muted text: "No spam. Unsubscribe anytime."
- On submit: mock console.log with `source: 'exit_intent'`, show thank-you state inside modal, auto-close after 3 seconds

**Config (add to marketing.config.ts):**
```typescript
export const EXIT_INTENT_CONFIG = {
  headline: 'Wait — before you go!',
  subtext: 'Get a free savings report showing how much your restaurant could save by switching to OrderStack.',
  buttonLabel: 'Get My Free Report',
  disclaimer: 'No spam. Unsubscribe anytime.',
  thankYou: 'Check your inbox! Your savings report is on the way.',
  delaySeconds: 10,
};
```

### 5. ExitIntentPopup Integration
**File:** `src/app/features/website/layout/marketing-layout.component.ts`

Add `ExitIntentPopupComponent` to the layout so it's available on ALL marketing pages:
```typescript
imports: [...existing, ExitIntentPopupComponent],
```

Add to template (after `<router-outlet />`):
```html
<router-outlet />
<os-exit-intent-popup />
```

### 6. Contact Page Config (add to marketing.config.ts)

```typescript
export const CONTACT_HERO = {
  tag: 'Get in Touch',
  title: 'Let\'s Talk About Your Restaurant',
  subtitle: 'Whether you want a demo, have a pricing question, or just want to learn more — we\'re here to help.',
};

export interface InquiryTypeOption {
  value: string;
  label: string;
}

export const INQUIRY_TYPES: InquiryTypeOption[] = [
  { value: '', label: 'Select a topic...' },
  { value: 'demo_request', label: 'Request a Demo' },
  { value: 'pricing_question', label: 'Pricing Question' },
  { value: 'general', label: 'General Inquiry' },
  { value: 'partnership', label: 'Partnership Opportunity' },
  { value: 'support', label: 'Technical Support' },
];

export const CONTACT_INFO = {
  email: 'hello@getorderstack.com',
  phone: '(561) 555-0123',
  location: 'Delray Beach, FL',
  serviceArea: 'Serving Broward & Palm Beach County',
};

export const CONTACT_THANK_YOU = {
  title: 'Thanks, {name}! We\'ll be in touch within 24 hours.',
  steps: [
    'Confirmation email sent to your inbox',
    'Personalized demo walkthrough',
    'Custom pricing based on your needs',
  ],
};

export const CONTACT_FORM_LABELS = {
  name: 'Your Name',
  email: 'Email Address',
  phone: 'Phone Number (optional)',
  restaurantName: 'Restaurant Name (optional)',
  inquiryType: 'What can we help with?',
  message: 'Your Message',
  submit: 'Send Message',
  submitting: 'Sending...',
};

export const CONTACT_VALIDATION = {
  nameMin: 'Name must be at least 2 characters',
  emailInvalid: 'Please enter a valid email address',
  inquiryRequired: 'Please select a topic',
  messageMin: 'Message must be at least 10 characters',
};
```

### 7. Route Registration
**File:** `src/app/app.routes.ts`

Add inside `MarketingLayoutComponent` children:
```typescript
{
  path: 'contact',
  loadComponent: () =>
    import('./features/website/pages/contact/contact.component').then(m => m.ContactPageComponent),
},
```

### 8. Update Claude.md
**File:** `src/app/features/website/Claude.md`

Add C-10 entry under `## Components`:
```markdown
### C-10 — Lead Capture & CTA System
- ContactPageComponent: `/contact` route with two-column layout
  - Signal-based contact form (name, email, phone, restaurantName, inquiryType, message)
  - Inline validation on blur, disabled submit when invalid
  - Mock submission (console.log) with simulated delay — TODO: wire to backend POST /api/leads
  - Thank-you state replaces form after submission
  - Right column: contact info cards + "Prefer a demo?" callout
- EmailCaptureComponent: compact inline email signup, reusable across pages
  - Configurable headline, subtext, button label, tracking source
  - Embedded on blog page in alt-background section
- ExitIntentPopupComponent: once-per-session modal on desktop only
  - Triggers on mouseleave above viewport after 10s delay
  - sessionStorage prevents re-showing
  - Excluded on /contact and /signup pages
  - Lives in MarketingLayoutComponent for site-wide coverage
- All form submissions mock-only (console.log) until backend endpoint exists
```

Update `## Pages` to add:
```markdown
- ContactPageComponent: /contact (contact form + demo request)
```

## What NOT to Build
- **No backend API endpoint** — all form submissions are mocked with console.log and simulated delay. The payload structure is defined so the backend can be wired later with a single fetch() call.
- **No SendGrid / email integration** — no confirmation emails sent. That's a backend task.
- **No CRM integration** — no HubSpot, Salesforce, etc. Just structured JSON payloads logged to console.
- **No CAPTCHA / reCAPTCHA** — add when backend is live. For now, forms are client-side only.
- **No rate limiting** — no backend means no rate limiting needed yet.
- **No reactive forms (Angular FormGroup/FormControl)** — use plain signals + (input)/(blur) events, matching every other marketing component.
- **No @angular/animations** — modal enter/exit uses CSS transitions only (opacity + transform).
- **No third-party modal/dialog library** — hand-built with CSS backdrop + z-index.
- **No mobile exit-intent** — desktop only (mouseleave). Mobile is excluded entirely.
- **No NgModules, no zone.js**.

## Conventions (match existing code exactly)
- **Standalone components**, `ChangeDetectionStrategy.OnPush`, signals
- **`os-` selector prefix**, `mkt-` CSS class prefix
- **Design tokens**: `--os-primary`, `--os-primary-light`, `--os-bg-card`, `--os-bg-alt`, `--os-border`, `--os-text-primary`, `--os-text-secondary`, `--os-shadow-lg`, `--os-radius-lg`, `--os-danger` (or `#dc2626` for validation errors)
- **Bootstrap Icons** (`bi-*`)
- **Responsive breakpoints**: 575.98px, 767.98px, 991.98px
- **No hardcoded copy** — all text in marketing.config.ts
- **Lazy-loaded route** via `loadComponent()` in app.routes.ts
- **Form inputs**: standard `<input>`, `<select>`, `<textarea>` with `(input)` and `(blur)` event bindings to signals. NO `[(ngModel)]`, NO `FormGroup`.
- **Validation pattern**: each field has a `touched` signal (set true on blur) and a `computed()` error signal. Error message shows only when `touched() && error()`.

## File Checklist
| Action | File |
|--------|------|
| CREATE | `src/app/features/website/pages/contact/contact.component.ts` |
| CREATE | `src/app/features/website/pages/contact/contact.component.html` |
| CREATE | `src/app/features/website/pages/contact/contact.component.scss` |
| CREATE | `src/app/features/website/pages/contact/contact.component.spec.ts` |
| CREATE | `src/app/features/website/shared/email-capture.component.ts` |
| CREATE | `src/app/features/website/shared/email-capture.component.spec.ts` |
| CREATE | `src/app/features/website/shared/exit-intent-popup.component.ts` |
| CREATE | `src/app/features/website/shared/exit-intent-popup.component.html` |
| CREATE | `src/app/features/website/shared/exit-intent-popup.component.scss` |
| EDIT | `src/app/features/website/marketing.config.ts` — add CONTACT_HERO, INQUIRY_TYPES, CONTACT_INFO, CONTACT_THANK_YOU, CONTACT_FORM_LABELS, CONTACT_VALIDATION, EXIT_INTENT_CONFIG |
| EDIT | `src/app/app.routes.ts` — add `/contact` lazy route |
| EDIT | `src/app/features/website/layout/marketing-layout.component.ts` — add ExitIntentPopupComponent |
| EDIT | `src/app/features/website/pages/blog/blog.component.ts` — add EmailCaptureComponent import |
| EDIT | `src/app/features/website/pages/blog/blog.component.html` — add email capture section |
| EDIT | `src/app/features/website/Claude.md` — add C-10 docs |

## Testing

### contact.component.spec.ts
- Empty form: submit button is disabled
- Fill all required fields with valid data: submit button enables
- Submit valid form: `submitting()` becomes true, then `submitted()` becomes true after delay
- Thank-you state renders with personalized name
- Invalid email (blur): shows email validation error
- Short name (blur): shows name min-length error
- Empty inquiry type (blur): shows required error
- Short message (blur): shows message min-length error
- Valid fields show no errors after blur
- Pre-selecting inquiry type via query param `?type=demo_request` sets dropdown value

### email-capture.component.spec.ts
- Renders headline and subtext from inputs
- Invalid email: shows error on blur
- Valid email submit: shows success message, hides input row
- Custom `source` input is included in logged payload

### exit-intent-popup.component.spec.ts
- Does not show on init
- Shows after simulated mouseleave with clientY <= 0 (after delay)
- Does not show if sessionStorage flag is already set
- Close button hides popup
- Escape key hides popup
- Backdrop click hides popup
- Does not show on viewports < 768px
- Email submit inside popup shows thank-you state
- Does not trigger before 10s delay

## Done When
1. `/contact` route loads with hero, two-column form + info cards
2. Form validates inline on blur with clear error messages
3. Submit button disabled while form invalid or submitting
4. Successful submission shows thank-you state with personalized name
5. Form payload logged to console with all fields + source + timestamp
6. EmailCaptureComponent renders on blog page in alt-background section
7. ExitIntentPopup appears once per session on desktop after 10s, not on /contact or /signup
8. Popup closes via X button, backdrop click, or Escape key
9. All text lives in marketing.config.ts — zero hardcoded strings
10. Route registered and lazy-loaded in app.routes.ts
11. ExitIntentPopup lives in MarketingLayoutComponent for site-wide coverage
12. Vitest specs pass for all three components
13. website/Claude.md updated with C-10 documentation
