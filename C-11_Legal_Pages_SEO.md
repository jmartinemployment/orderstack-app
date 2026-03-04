# C-11 — Legal Pages, Company Pages & SEO Meta

## Project
`/Users/jam/development/orderstack-app/`

## Context
Read **`src/app/features/website/Claude.md`** first. This task maps to the GetOrderStack Marketing Site Plan C-12 (Footer, Legal & SEO). The footer has 9 dead internal routes that lead nowhere:

| Dead Route | Footer Column | Resolution |
|------------|---------------|------------|
| `/privacy` | Company | BUILD — PrivacyPageComponent |
| `/terms` | Company | BUILD — TermsPageComponent |
| `/about` | Company | BUILD — AboutPageComponent |
| `/careers` | Company | PLACEHOLDER — single-section "No open positions" page |
| `/solutions/full-service` | Solutions | REDIRECT — all 4 `/solutions/*` redirect to `/features` |
| `/solutions/quick-service` | Solutions | REDIRECT |
| `/solutions/bar` | Solutions | REDIRECT |
| `/solutions/retail` | Solutions | REDIRECT |
| `/help` | Resources | REDIRECT — to `/contact` |

The `/docs` and `/status` links are already marked `external: true`, so they open in new tabs and don't need internal routes.

This task also adds a reusable SEO meta service that sets `<title>`, `<meta name="description">`, and Open Graph tags for every marketing page.

## What to Build

### 1. SeoMetaService
**Location:** `src/app/features/website/services/seo-meta.service.ts`

**Purpose:** Injectable service that sets page title, meta description, and OG tags. Called from each marketing page's `OnInit`.

```typescript
@Injectable({ providedIn: 'root' })
export class SeoMetaService {
  private readonly title = inject(Title);        // @angular/platform-browser
  private readonly meta = inject(Meta);          // @angular/platform-browser

  updateMeta(config: PageSeoConfig): void {
    const fullTitle = config.title.includes('OrderStack')
      ? config.title
      : `${config.title} | OrderStack`;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: config.description });

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:type', content: config.ogType || 'website' });
    this.meta.updateTag({ property: 'og:url', content: `https://getorderstack.com${config.path}` });
    this.meta.updateTag({ property: 'og:image', content: config.ogImage || 'https://getorderstack.com/assets/og-default.png' });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });

    // Optional: canonical URL
    if (config.canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', config.canonical);
    }
  }
}
```

**Data model (add to marketing.config.ts):**
```typescript
export interface PageSeoConfig {
  title: string;
  description: string;
  path: string;
  ogType?: string;
  ogImage?: string;
  canonical?: string;
}
```

**SEO_CONFIGS record covering all marketing pages:** landing, pricing, demo, blog, integrations, contact, privacy, terms, about, careers. Each with a title (appended with " | OrderStack" by the service unless it already contains "OrderStack"), a meta description (150-160 chars), and path.

**Integration into existing pages:** Add `SeoMetaService` injection + `ngOnInit` call to each existing marketing page component (landing, pricing, demo, blog, integrations, contact). Pattern:
```typescript
private readonly seo = inject(SeoMetaService);
ngOnInit(): void { this.seo.updateMeta(SEO_CONFIGS['landing']); }
```

### 2. LegalPageLayoutComponent (`os-legal-page`)
**Location:** `src/app/features/website/shared/legal-page-layout.component.ts` (inline template + styles)

**Selector:** `os-legal-page`

**Purpose:** Shared layout wrapper for privacy, terms, and any future legal pages. Consistent styling for long-form legal text.

**Inputs:**
```typescript
readonly pageTitle = input.required<string>();
readonly lastUpdated = input.required<string>();
```

**Template:** Title, "Last updated" date, then `<ng-content />` for section content.

**Styles:**
- Content max-width: 720px, centered
- h2 headings: `--os-text-primary`, 1.25rem, bold, margin-top: 40px
- Paragraphs: `--os-text-secondary`, 1rem, line-height 1.7
- Links: `--os-primary`, underline on hover
- Top padding: 48px, bottom: 80px

### 3. PrivacyPageComponent (`os-privacy-page`)
**Location:** `src/app/features/website/pages/privacy/privacy.component.ts` (inline template using LegalPageLayout)

**Route:** `/privacy`

**10 sections from config:** Information We Collect, How We Use Your Information, Data Sharing, Cookies & Tracking, Data Security, Data Retention, Your Rights, Children's Privacy, Changes to This Policy, Contact Us.

Content tailored to a restaurant SaaS — references Stripe payment processing, DoorDash/Uber delivery dispatch, Star Micronics cloud printing, PCI DSS compliance, data export, CCPA rights.

**Config:**
```typescript
export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export const PRIVACY_POLICY: { lastUpdated: string; sections: LegalSection[] } = {
  lastUpdated: 'March 1, 2026',
  sections: [ /* 10 sections with 1-3 paragraphs each */ ],
};
```

### 4. TermsPageComponent (`os-terms-page`)
**Location:** `src/app/features/website/pages/terms/terms.component.ts` (inline template using LegalPageLayout)

**Route:** `/terms`

**13 sections from config:** Acceptance of Terms, Description of Service, Account Registration, Fees & Payment, Acceptable Use, Intellectual Property, Data Ownership, Service Availability, Limitation of Liability, Termination, Governing Law (Florida / Palm Beach County), Changes to Terms, Contact.

Content tailored to restaurant SaaS — references subscription billing, per-transaction fees, BYOD hardware, data export, 30-day notice for changes, Florida governing law.

**Config:**
```typescript
export const TERMS_OF_SERVICE: { lastUpdated: string; sections: LegalSection[] } = {
  lastUpdated: 'March 1, 2026',
  sections: [ /* 13 sections */ ],
};
```

### 5. AboutPageComponent (`os-about-page`)
**Location:** `src/app/features/website/pages/about/` with separate `.ts`, `.html`, `.scss`

**Route:** `/about`

**Page structure:**

#### A. Hero
Reuse `MarketingHeroComponent`: tag "About Us", title "Built in South Florida for Independent Restaurants", subtitle about 30% commission fees and locked-in hardware. No CTA buttons.

#### B. Mission Section
- `background="alt"` section
- Large pull-quote centered: "Every dollar a restaurant sends to a marketplace middleman is a dollar that should stay in the kitchen."
- 2 paragraphs about founding story (Delray Beach conversations, the problem, the solution)

#### C. Values Grid
- 3 cards: Transparency (bi-eye), Restaurant-First (bi-shop), No Lock-In (bi-unlock)
- Each: icon, title, description
- 3 columns desktop, stacked mobile

#### D. South Florida Section
- Left: text about serving Broward & Palm Beach County
- Right: placeholder div with `bi-geo-alt` icon (same pattern as CloudPRNT feature placeholder)

#### E. Final CTA
Reuse `FinalCtaComponent`.

**Config:**
```typescript
export const ABOUT_HERO = { tag, title, subtitle };
export const ABOUT_MISSION = { pullQuote, paragraphs: string[] };
export const ABOUT_VALUES: ValueCard[] = [ /* 3 cards */ ];
export const ABOUT_LOCAL = { title, description };
```

### 6. CareersPageComponent (`os-careers-page`)
**Location:** `src/app/features/website/pages/careers/careers.component.ts` (inline template + styles — very small)

**Route:** `/careers`

**Display:** Hero ("Careers" / "Join the OrderStack Team"), centered empty state with `bi-briefcase` icon, "No open positions right now." + paragraph with careers@getorderstack.com, FinalCtaComponent.

**Config:**
```typescript
export const CAREERS_HERO = { tag, title, subtitle };
export const CAREERS_EMPTY = { title, description, email };
```

### 7. Route Registration
**File:** `src/app/app.routes.ts`

Add inside `MarketingLayoutComponent` children:
```typescript
{ path: 'privacy', loadComponent: () => import('./features/website/pages/privacy/privacy.component').then(m => m.PrivacyPageComponent) },
{ path: 'terms', loadComponent: () => import('./features/website/pages/terms/terms.component').then(m => m.TermsPageComponent) },
{ path: 'about', loadComponent: () => import('./features/website/pages/about/about.component').then(m => m.AboutPageComponent) },
{ path: 'careers', loadComponent: () => import('./features/website/pages/careers/careers.component').then(m => m.CareersPageComponent) },
// Redirects for dead routes
{ path: 'solutions/full-service', redirectTo: '/features', pathMatch: 'full' },
{ path: 'solutions/quick-service', redirectTo: '/features', pathMatch: 'full' },
{ path: 'solutions/bar', redirectTo: '/features', pathMatch: 'full' },
{ path: 'solutions/retail', redirectTo: '/features', pathMatch: 'full' },
{ path: 'help', redirectTo: '/contact', pathMatch: 'full' },
```

### 8. Existing Page SEO Integration
Add `SeoMetaService` call to each existing page's `ngOnInit`:

| Page | File | Config Key |
|------|------|------------|
| Landing | `pages/landing/landing.component.ts` | `SEO_CONFIGS['landing']` |
| Pricing | `pages/pricing/pricing.component.ts` | `SEO_CONFIGS['pricing']` |
| Demo | `pages/demo/demo.component.ts` | `SEO_CONFIGS['demo']` |
| Blog | `pages/blog/blog.component.ts` | `SEO_CONFIGS['blog']` |
| Integrations | `pages/integrations/integrations.component.ts` | `SEO_CONFIGS['integrations']` |
| Contact | `pages/contact/contact.component.ts` | `SEO_CONFIGS['contact']` |

### 9. Update Claude.md
**File:** `src/app/features/website/Claude.md` — add C-11 entry.

## What NOT to Build
- **No cookie consent banner** — separate task requiring actual cookie management
- **No real lawyer-reviewed legal copy** — placeholder marketing-grade text, real review before launch
- **No solutions pages** (`/solutions/*`) — redirect to `/features`, dedicated vertical pages are future
- **No help center** — `/help` redirects to `/contact`, full knowledge base is future
- **No sitemap.xml generation** — future SEO task
- **No robots.txt** — future DevOps task
- **No SSR** for SEO — meta tags set client-side via Angular Title/Meta services
- **No @angular/animations, no NgModules, no zone.js**

## Conventions (match existing code exactly)
- **Standalone components**, `ChangeDetectionStrategy.OnPush`, signals
- **`os-` selector prefix**, `mkt-` CSS class prefix
- **Design tokens**: `--os-primary`, `--os-bg-card`, `--os-bg-alt`, `--os-border`, `--os-text-primary`, `--os-text-secondary`, `--os-radius-lg`
- **Bootstrap Icons** (`bi-*`)
- **Responsive breakpoints**: 575.98px, 767.98px, 991.98px
- **No hardcoded copy** — all text in marketing.config.ts
- **Lazy-loaded routes** via `loadComponent()` in app.routes.ts

## File Checklist
| Action | File |
|--------|------|
| CREATE | `src/app/features/website/services/seo-meta.service.ts` |
| CREATE | `src/app/features/website/shared/legal-page-layout.component.ts` |
| CREATE | `src/app/features/website/pages/privacy/privacy.component.ts` |
| CREATE | `src/app/features/website/pages/terms/terms.component.ts` |
| CREATE | `src/app/features/website/pages/about/about.component.ts` |
| CREATE | `src/app/features/website/pages/about/about.component.html` |
| CREATE | `src/app/features/website/pages/about/about.component.scss` |
| CREATE | `src/app/features/website/pages/careers/careers.component.ts` |
| CREATE | `src/app/features/website/pages/about/about.component.spec.ts` |
| EDIT | `src/app/features/website/marketing.config.ts` — add PageSeoConfig, SEO_CONFIGS, LegalSection, PRIVACY_POLICY, TERMS_OF_SERVICE, ABOUT_HERO, ABOUT_MISSION, ABOUT_VALUES, ABOUT_LOCAL, CAREERS_HERO, CAREERS_EMPTY |
| EDIT | `src/app/app.routes.ts` — add /privacy, /terms, /about, /careers routes + /solutions/* and /help redirects |
| EDIT | `src/app/features/website/pages/landing/landing.component.ts` — add SeoMetaService |
| EDIT | `src/app/features/website/pages/pricing/pricing.component.ts` — add SeoMetaService |
| EDIT | `src/app/features/website/pages/demo/demo.component.ts` — add SeoMetaService |
| EDIT | `src/app/features/website/pages/blog/blog.component.ts` — add SeoMetaService |
| EDIT | `src/app/features/website/pages/integrations/integrations.component.ts` — add SeoMetaService |
| EDIT | `src/app/features/website/pages/contact/contact.component.ts` — add SeoMetaService |
| EDIT | `src/app/features/website/Claude.md` — add C-11 docs |

## Testing
### about.component.spec.ts
- Renders hero with "About Us" tag and title
- Renders pull-quote text from config
- Renders 3 value cards with icons, titles, descriptions
- Renders local section with Delray Beach content
- SeoMetaService.updateMeta called with about config on init

### General (seo-meta.service.spec.ts)
- Sets document title with " | OrderStack" suffix
- Does NOT double-add suffix if title already contains "OrderStack"
- Updates og:title, og:description, og:url meta tags
- Sets canonical link element when provided
- Privacy page renders all 10 sections from config
- Terms page renders all 13 sections from config
- Careers page shows empty state with email
- `/solutions/full-service` redirects to `/features`
- `/help` redirects to `/contact`

## Done When
1. `/privacy` renders full privacy policy with all 10 sections
2. `/terms` renders full terms of service with all 13 sections
3. `/about` renders hero, mission pull-quote, 3 value cards, local section, final CTA
4. `/careers` renders placeholder with "no open positions" message
5. `/solutions/*` (all 4) redirect to `/features`
6. `/help` redirects to `/contact`
7. Every marketing page sets title, meta description, and OG tags via SeoMetaService
8. LegalPageLayout provides consistent styling for long-form text pages
9. All text in marketing.config.ts — zero hardcoded strings
10. All new routes lazy-loaded in app.routes.ts
11. Zero dead footer links remain
12. Vitest specs pass
13. website/Claude.md updated with C-11 documentation
