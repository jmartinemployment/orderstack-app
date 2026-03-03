# Website — Public Marketing Pages

## Purpose
Public-facing marketing pages for getorderstack.com. These pages are
unauthenticated and use the MarketingLayoutComponent (header + footer).

## Architecture
- Lives in src/app/features/website/ (separate from features/marketing/ which is the internal campaign builder)
- MarketingLayoutComponent is the third layout alongside MainLayout and AuthLayout
- All routes are public (no authGuard)
- All copy comes from marketing.config.ts
- Uses existing --os-* design tokens from src/styles.scss
- Marketing-specific classes use mkt- prefix
- Same blue/white design system as the product

## Components

### C-01 — Scaffold & Layout
- MarketingLayoutComponent: header + router-outlet + footer
- MarketingHeaderComponent: sticky white header, border on scroll, mobile hamburger
- MarketingFooterComponent: dark background, 4-column links, social, copyright
- MarketingSectionComponent: reusable full-width section with background variants (default, alt, dark, hero)
- MarketingHeroComponent: reusable hero block (tag, title, subtitle, CTAs)

### C-02 — Landing Page Content
- SocialProofBarComponent: trust signals strip (icons + labels)
- PainPointsComponent: 3-card grid with stats (marketplace fees, fragmented tools, data ownership)
- FeatureHighlightsComponent: 6-card grid (POS, online ordering, KDS, delivery, analytics, staff)
- StatsStripComponent: 4 big numbers on dark background
- HowItWorksComponent: 3 numbered steps (sign up, configure, go live)
- FinalCtaComponent: dark CTA section with headline + 2 buttons

### C-03 — Pricing Page
- PlanCardsComponent: 3-plan grid (Free/$0, Plus/$29, Premium/$79) with monthly/annual toggle
- ProcessingRatesComponent: 3 rate cards (in-person 3.29%+49c, online 3.79%+49c, keyed-in 3.80%+49c)
- CompetitorComparisonComponent: OrderStack vs Toast vs Square feature table with checkmarks
- PricingFaqComponent: accordion FAQ (8 questions)

### C-04 — Interactive Demo / Product Tour
- DemoBusinessSelectorComponent: pill buttons for Restaurant / Retail / Services
- DemoFeatureTourComponent: vertical tab list (desktop) / horizontal scroll (mobile) + detail pane
- DemoFeatureCardComponent: feature headline, description, 4 workflow steps, screenshot placeholder

12 feature entries covering:
- Shared: POS, Analytics, Staff
- Restaurant: Online Ordering, KDS, Delivery
- Retail: Online Store, Inventory
- Services: Bookings, Invoicing, CRM

Business type selector filters which feature tabs are visible.
Screenshot placeholders ready for future product images.

### C-05 — Blog & Content Hub
- BlogService: injectable service with getAllPosts(), getPostBySlug(), getPostsByCategory(), getFeaturedPosts(), getRelatedPosts()
- BlogPageComponent: category-filtered post list with featured hero card, category pills, 3-col responsive grid
- BlogPostComponent: article detail page with Markdown→HTML rendering (via `marked` library), prose typography, related posts, 404 state
- blog-registry.ts: static registry of blog post front-matter + body as string literals (no runtime file loading)

3 seed posts:
- "Restaurant POS Systems in 2026: What Actually Matters" (featured, Restaurant Tech)
- "How to Eliminate 30% Delivery Commissions Without Losing Customers" (Delivery)
- "BYOD Restaurant Tech: Why Your iPad Is Better Than a $1,200 Terminal" (Restaurant Tech)

Markdown source files in src/content/blog/ (reference copies — the registry is the build-time source of truth).

## Pages
- LandingComponent: / (full landing page with all sections)
- PricingPageComponent: /pricing (plans, rates, comparison, FAQ)
- DemoPageComponent: /demo (business type selector + feature tour)
- BlogPageComponent: /blog (category-filtered post list with featured hero card)
- BlogPostComponent: /blog/:slug (article detail with Markdown rendering)

## Services
- BlogService (services/blog.service.ts): signal-based, reads from static blog-registry.ts

## Dependencies
- `marked` (npm) — Markdown-to-HTML rendering for blog post detail page

## Conventions
- Standalone components, OnPush, signals
- os- selector prefix
- Lazy-loaded routes via loadComponent()
- Bootstrap responsive breakpoints (575.98px, 767.98px, 991.98px)
- Bootstrap Icons (bi-*) for all icons
- Vitest for unit tests
- No @angular/animations
- No hardcoded copy (all from marketing.config.ts)

## Route Integration
Marketing routes are registered in app.routes.ts as the FIRST route block
(before auth routes). The root / loads MarketingLayoutComponent with
LandingComponent as its default child. Blog post detail route (`blog/:slug`)
is registered BEFORE the blog list route (`blog`) so parameterized URLs match first.

## Adding a New Blog Post
1. Write the Markdown file in `src/content/blog/your-slug.md` with YAML front-matter
2. Add a corresponding entry to `BLOG_POSTS_RAW` in `services/blog-registry.ts`
3. The BlogService picks it up automatically (sorted by date descending)

### C-06 — Savings Calculator & Structured Data
- SavingsCalculatorComponent: interactive 3-input calculator comparing OrderStack vs Toast vs Square
  - Signal-based sliders + number inputs (monthlyOrders, avgTicket, deliveryPct)
  - Real-time cost computation with animated count-up results (requestAnimationFrame, ease-out cubic)
  - Fee models from published competitor rates (March 2026) in COMPETITOR_FEE_MODELS
  - Assumptions disclosure below results
  - 150ms input debounce prevents animation spam during slider drag
- Schema.org structured data on pricing page (FAQPage + Product/Offer JSON-LD)
  - Injected via Renderer2 in ngOnInit, removed in ngOnDestroy
- Calculator placed on dark background section between competitor comparison and FAQ

## Future Prompts
- C-07+: TBD
