# Traqqy - Engineering History

> **Purpose:** Permanent project history so any developer or AI agent can understand how Traqqy reached its current state without needing the original conversation thread.
>
> **Source of truth:** The repository code is authoritative for the CURRENT state. The conversation history is authoritative for historical context, decisions, and reasoning.

---

## 1. Project Origin & Evolution

### Why Traqqy Was Created
Traqqy is a subscription and recurring payment tracker designed as a privacy-first alternative to bank-connected finance apps. The core premise: users manually track their subscriptions instead of giving a third party access to bank accounts, emails, or SMS.

### Original Concept
- Originally named **SubTrack** (the internal workspace package is still @workspace/subtrack)
- Built initially on **Replit** with Replit-native tooling and connectors
- Early commits show a Replit-centric setup (.replit, @replit/connectors-sdk, @replit/vite-plugin-*)
- The project was migrated from Replit to a local Windows development environment

### Major Pivots / Scope Changes
1. **Replit to Local Development:** Migrated from Replit cloud to local Windows development (commit 09195fd)
2. **Landing Page Redesign:** Complete landing page overhaul with finalized branding (commit d57d7cb)
3. **UI Redesign:** Full visual redesign introducing pill-bar navigation, replacing the original sidebar (commit 387f187)
4. **Feature Expansion:** Addition of Wallet Health, Trial/Lifetime subscriptions, and Cost Sharing (commit a0bb5a2)
5. **Branding Finalization:** Replaced generic branding with finalized Traqqy wordmark and symbol assets
6. **README Redesign:** Complete README rewrite from conventional open-source format to product-page design

### Current Name
The product is **Traqqy**. The wordmark is a hand-drawn red Traqqy text. The symbol is an atomic/orbital icon.

---

## 2. Product & Design Decisions

### Product Philosophy
> **Track -> Understand -> Improve**

- Traqqy **tracks** subscriptions (what you pay, when, how much)
- Traqqy helps you **understand** spending (analytics, Wallet Health)
- Traqqy helps you **improve** (recommendations, renewal management)

### Core Tagline
**"Subscriptions. Sorted."**

### Privacy Principles (Intentionally Enforced)
- **No bank access** - never connects to financial institutions
- **No email scanning** - no Gmail parsing for receipt detection (auto-import is planned, not production-ready)
- **No SMS reading** - no message interception
- All data is user-entered manually

### Features Intentionally Included
- Subscription tracking (recurring, trial, lifetime)
- Dashboard with monthly spending summary
- Analytics with category breakdown and spending trends
- Calendar with renewal events
- Wallet Health scoring (0-100, personalized)
- Cost Sharing (equal and custom split)
- 520+ service catalog with 62+ logos
- 62 supported currencies
- Dark/light theme
- Health preferences onboarding (3 questions)

### Features Intentionally Deferred
- Production cron/scheduling (reminder backend complete, cron infrastructure not configured)
- Public API deployment
- Production hosting
- Domain purchase
- Resend custom-domain verification
- PWA support
- Import and export
- Gmail auto-import (backend exists, not production-ready)

### Important Product Constraints
- Traqqy is a **manual** subscription tracker - it does not automatically detect payments
- Past renewal dates should be treated as **data-quality issues**, not missed payments
- The scoring model must be **personalized** to each user own budget, not based on arbitrary absolute thresholds
- 100/100 Wallet Health is achievable but represents a "dream state" requiring exceptional management

---

## 3. Technical Stack

### Frontend
- **React 19.1** (exact version required by Expo compatibility)
- **TypeScript 5.9**
- **Vite 7.3** (build tool)
- **Tailwind CSS 4.1** (styling)
- **shadcn/ui** (component library via Radix UI primitives)
- **TanStack Query 5.x** (data fetching/caching)
- **Wouter 3.3** (routing, not React Router)
- **Framer Motion** (animations)
- **Recharts** (analytics charts)
- **date-fns** (date formatting)
- **sonner** (toast notifications)
- **Clerk** (@clerk/react for authentication)
- **simple-icons** (subscription service logos via NPM)

### Backend
- **Node.js** with **Express 5.2**
- **TypeScript**
- **Drizzle ORM 0.45** (database ORM)
- **PostgreSQL** (Neon serverless)
- **Clerk** (@clerk/express for auth middleware)
- **Resend** (email delivery for reminders)
- **Pino** (structured logging)
- **Vitest** (testing)

### Shared Libraries (Monorepo)
- @workspace/db - Database schema and connection
- @workspace/catalog - Subscription service catalog (520+ services)
- @workspace/api-client-react - Generated React Query hooks from API spec
- @workspace/api-zod - Zod validation schemas
- @workspace/api-spec - API specification
- @workspace/currencies - Canonical 15-currency list, formatting, conversion utility

### Package Manager
- **pnpm** (enforced via preinstall script)
- Workspace monorepo with pnpm-workspace.yaml
- Supply-chain security: 1-day minimum release age for npm packages

---

## 4. Architecture

### Directory Structure
```
Traqqy/
  artifacts/
    subtrack/          # Frontend (React + Vite)
      src/
        App.tsx         # Router, Clerk setup, route definitions
        pages/          # Dashboard, Subscriptions, Analytics, Calendar, Health, Settings, Reminders, Landing
        components/     # UI components, layout, health, subscriptions, doodles
        data/           # Currency definitions
        hooks/          # Custom React hooks
        lib/            # Utilities, motion helpers, API fetch
      public/           # Static assets (logos, fonts, icons)
    api-server/        # Backend (Express)
      src/
        routes/         # API route handlers
        middlewares/    # Auth, logging
        lib/            # Auth helpers, billing utils, scheduler, health engine
  lib/
    db/                # Drizzle schema + connection
      src/schema/      # Table definitions
    currencies/        # Canonical currency list, conversion, formatting
    catalog/           # Subscription service catalog
    api-client-react/  # Generated React Query hooks
    api-spec/          # API specification
    api-zod/           # Zod validation schemas
  docs/
    images/            # Old screenshots (pre-redesign)
    screenshots/       # Current screenshots (README)
  scripts/             # Build/utility scripts
  README.md
```

### Key Routes (Frontend)
| Path | Component | Description |
|------|-----------|-------------|
| / | Landing1 | Public landing page (signed out), Dashboard redirect (signed in) |
| /sign-in/* | Clerk SignIn | Authentication |
| /sign-up/* | Clerk SignUp | Registration |
| /dashboard | Dashboard | Monthly spending, upcoming renewals, Wallet Health card, category breakdown |
| /subscriptions | Subscriptions | Full subscription list with filtering, sorting, add/edit |
| /analytics | Analytics | Spending trends, category breakdown charts |
| /calendar | Calendar | Visual calendar with renewal events |
| /reminders | Reminders | Reminder management UI |
| /settings | Settings | User preferences, display name, currency, theme |
| /health | Health | Wallet Health score, factors, recommendations |

### Key API Routes (Backend)
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/subscriptions | GET/POST | List and create subscriptions |
| /api/subscriptions/:id | GET/PATCH/DELETE | Get, update, delete subscription |
| /api/subscriptions/:id/archive | PATCH | Archive a subscription |
| /api/subscriptions/:id/restore | PATCH | Restore archived subscription |
| /api/categories | GET | List subscription categories |
| /api/dashboard | GET | Dashboard summary data |
| /api/analytics | GET | Analytics data |
| /api/calendar | GET | Calendar renewal events |
| /api/reminders | GET/POST | List and create reminders |
| /api/reminders/:id | PATCH/DELETE | Update and delete reminders |
| /api/reminders/process | POST | Process due reminders (protected by x-reminder-secret) |
| /api/settings | GET/PATCH | User settings |
| /api/wallet-health | GET | Wallet Health score and analysis |
| /api/auto-import/* | Various | Gmail auto-import (not production-ready) |

### Authentication Flow
1. Frontend loads -> Clerk checks session
2. If signed out -> Landing page or redirect to sign-in
3. If signed in -> AuthTokenProvider sets token getter for API calls
4. API requests include Clerk JWT in Authorization header
5. requireAuth middleware validates JWT and extracts clerkId
6. All data queries are scoped to the authenticated user clerkId

### Data Flow for Subscriptions
1. User creates subscription via Add Subscription form
2. Form validates with Zod schemas
3. POST /api/subscriptions with all fields
4. Server validates type-specific fields (recurring/trial/lifetime)
5. Server sanitizes fields based on subscription type
6. If shared: shares are created via upsertShares()
7. Response returns enriched subscription with monthlyEquivalent, daysUntilRenewal, shares
8. Frontend uses TanStack Query to cache and display

---

## 5. Database & Data Model

### Tables

**users** - User accounts (synced from Clerk)
- id, clerkId (unique), displayName, email, timestamps

**user_settings** - Per-user preferences
- clerkId (unique FK to users), displayName, currency, theme, timezone, healthPreferences (JSON string), timestamps

**categories** - Subscription categories (seeded on startup)
- id, name, color, timestamps

**subscriptions** - Core subscription records
- Identity: id, clerkId, name, icon, categoryId
- Financial: price, currency, billingCycle
- Scheduling: renewalDate, purchaseDate
- Type: subscriptionType (recurring|trial|lifetime)
- Trial: trialEndsAt, trialConvertsToRecurring, recurringPrice, recurringBillingCycle
- Cost Sharing: isShared, splitMode (equal|custom)
- State: isActive, isArchived
- Metadata: paymentMethod, notes
- Timestamps: createdAt, updatedAt

**subscription_shares** - Cost-sharing breakdowns
- id, subscriptionId (FK with cascade delete), name, amount, isCurrentUser, createdAt

**reminders** - Reminder scheduling
- id, clerkId, subscriptionId (FK with cascade delete), daysBefore, isEnabled
- Scheduling: scheduledSendAt
- Execution: status (pending|processing|sent|failed|cancelled), sentAt, error
- Unique index on (subscriptionId, daysBefore) to prevent duplicates

**fx_rates** - Daily exchange rate cache
- id, base_currency, target_currency, rate (numeric 16,8), rate_date, created_at
- UNIQUE constraint on (base_currency, target_currency, rate_date)
- Populated once daily from Frankfurter API (base=USD)
- Designed for future historical rate storage

**gmail_connections** - Gmail OAuth connections (auto-import)
**auto_import_scans** - Auto-import scan records
**auto_import_candidates** - Detected subscription candidates from Gmail

### Key Schema Decisions
- subscriptionType defaults to "recurring" - backward compatible with existing data
- isShared defaults to false - existing subscriptions are personal
- splitMode defaults to "equal" - safe default for cost sharing
- healthPreferences stored as JSON string in user_settings - flexible schema for onboarding preferences
- subscription_shares has onDelete: cascade - deleting a subscription removes its shares
- billingCycle is required by schema but only meaningful for recurring subscriptions

---

## 6. Authentication & Authorization

### How It Works
- **Clerk** handles all authentication (sign-in, sign-up, session management)
- Frontend uses @clerk/react with customized appearance (amber primary color)
- API server uses @clerk/express middleware (requireAuth)
- getUserId(req) extracts clerkId from verified JWT

### Authorization Rules
- **All data is scoped to clerkId** - users can only see/modify their own data
- Every API query includes eq(table.clerkId, userId) condition
- Subscription queries, reminders, settings, and health all enforce this
- No admin roles or shared-data scenarios exist

### Important Auth Decisions
- ClerkQueryClientCacheInvalidator clears TanStack Query cache when user changes (prevents data leakage)
- AuthTokenProvider sets the token getter for API client on mount
- routerPush/routerReplace in ClerkProvider use Wouter setLocation for SPA navigation
- Clerk appearance customized with Traqqy amber primary color and traqqy-symbol.png logo

---

## 7. Features Implemented

### Subscription Tracking - COMPLETE
- Create, read, update, delete subscriptions
- Three types: Recurring, Free Trial, Lifetime
- Type-specific form fields (conditional UI)
- 520+ service catalog with 62+ logos (via Simple Icons)
- 15 supported currencies with real-time exchange rates
- Categories with color coding
- Multiple billing cycles (weekly, monthly, quarterly, semi-annual, yearly)
- Monthly equivalent calculation
- Archive/restore functionality
- Search, filter, sort

### Dashboard - COMPLETE
- Monthly spending hero number
- Active/archived subscription count
- Wallet Health summary card (links to /health)
- Upcoming renewals with urgency indicators
- Category spending breakdown with animated bars
- Attention section for urgent renewals (3 days or less)
- Ambient doodle decorations

### Analytics - COMPLETE
- Spending trends over time (line chart)
- Category breakdown (pie chart)
- Period-based filtering

### Calendar - COMPLETE
- Monthly calendar view
- Renewal events displayed on dates
- Event count indicators
- Lifetime subscriptions excluded from calendar
- Trial subscriptions show expiration events via trialEndsAt

### Wallet Health - COMPLETE
- 100-point scoring model with 5 factors:
  - Spending Health (35 points) - budget-relative
  - Renewal Pressure (20 points) - amount-based
  - Spending Stability (15 points) - neutral without historical data
  - Subscription Efficiency (15 points) - neutral without evidence
  - Renewal Management (15 points) - stale dates as data-quality issues
- Personalized via 3-question onboarding:
  1. Monthly budget (optional)
  2. Spending feeling (calibration, +/-5 points)
  3. Priority categories (recommendations only, not score)
- Status ranges: Excellent (90+), Healthy (75-89), Needs attention (50-74), Unhealthy (25-49), Critical (0-24)
- 100 achievable but requires exceptional wallet management
- No subscriptions: score null with Add a subscription recommendation
- No budget: neutral spending component (20/35) with Set a budget recommendation
- Preferences editable after initial setup
- Dashboard compact card showing score + status
- 131+ tests passing for scoring model

### Cost Sharing - COMPLETE
- Personal vs Shared subscription toggle
- Equal split mode (automatic division)
- Custom split mode (manual amounts per person)
- Share sum must equal subscription price (validated)
- subscription_shares table with cascade delete
- Subscription list shows Shared . Your share indicator
- Edit form loads existing sharing state and people
- Dashboard uses user share amount (not full price) for totals
- Defensive isShared=true enforcement in POST/PATCH after share creation

### Multi-Currency Conversion - COMPLETE
- 15 canonical currencies defined in `@workspace/currencies` shared package
- Single source of truth: INR, USD, EUR, GBP, CAD, AUD, JPY, CNY, SGD, TRY, CHF, NZD, KRW, HKD, PLN
- Frontend (Settings, Add/Edit Subscription, SubscriptionRow) all consume the same canonical list
- Server-side currency conversion using Frankfurter API (ECB data, free, no API key)
- USD-pivot strategy: one daily Frankfurter API call fetches all 14 target rates
- Exchange rates cached in `fx_rates` database table (Neon/Postgres)
- Daily refresh: checks DB for today's rates, fetches only if missing
- In-memory lock prevents concurrent Frankfurter requests during cache miss
- Stale rate fallback: uses most recent cached rates when API fails
- Central `convertAmount(amount, from, to, usdRates)` utility in `@workspace/currencies/convert`
- Conversion applied AFTER billing-cycle normalization (monthly equivalent calculated first)
- All aggregate API routes convert to user's Default Currency before responding:
  - `/api/dashboard/summary` — monthlySpend, yearlySpend
  - `/api/analytics/overview` — totalAnnualSpend, averageMonthlySpend, highestExpense
  - `/api/analytics/monthly-trend` — totalAmount per month
  - `/api/analytics/spending-by-category` — monthlyAmount per category
  - `/api/wallet-health` — monthlySpend, yearlySpend, costIn30Days, averagePerSubscription
- API responses include `defaultCurrency` and `conversionAvailable` fields
- Frontend reads server-provided `defaultCurrency` (not client-side settings) for formatting
- Individual subscriptions always display in their original billing currency
- `conversionAvailable` flag indicates whether conversion was successful
- Graceful degradation: missing rates return null, raw values summed as fallback
- `fx_rates` table schema: (base_currency, target_currency, rate_date) UNIQUE constraint
- 25 unit tests for conversion (156 total tests)

### Reminders - BACKEND COMPLETE (cron NOT configured)
- CRUD API for reminder management
- Reminder scheduling (1, 3, 7, 14, 30 days before renewal)
- POST /api/reminders/process endpoint for cron triggering
- Protected by x-reminder-secret header
- Atomic claiming for concurrent safety
- Stale reminder recovery
- Resend email delivery
- Error handling (failed deliveries tracked)
- 53+ tests passing

### Navigation - COMPLETE
- Pill-bar segmented navigation (horizontal, top of app)
- Desktop: sticky header with wordmark + pills + user dropdown
- Mobile: sticky brand bar + scrollable pill bar
- Animated active indicator (Framer Motion spring)
- Routes: Overview, Subscriptions, Reminders, Calendar, Analytics, Health

### Authentication - COMPLETE
- Clerk sign-in / sign-up
- Customized appearance
- Session management
- Cache invalidation on user change

### Settings - COMPLETE
- Display name, Currency preference, Theme preference (dark/light/system)
- Health preferences (accessible from Health page)

### Landing Page - COMPLETE
- Two versions: Landing.tsx (older) and Landing1.tsx (current, used in App.tsx)
- Finalized Traqqy branding
- Feature showcase, Theme toggle, CTA to sign up

### Branding - COMPLETE
- TraqqyBrand component with wordmark and symbol variants
- Clean transparent PNGs extracted from source artwork
- Favicon, PWA icons
- Consistent across: sidebar, landing page, auth screens, footer

---

## 8. Bugs & Fixes

### Critical: Cost Sharing Not Persisting isShared Flag
- **Problem:** Creating a shared subscription had shares in subscription_shares but is_shared=false in subscriptions table
- **Root cause:** Data inconsistency - likely from column migration timing or silent INSERT failure
- **Fix:** (1) Database data repair. (2) Defensive UPDATE in POST and PATCH handlers after upsertShares() to explicitly set isShared=true
- **Files:** artifacts/api-server/src/routes/subscriptions.ts
- **Lesson:** Always verify boolean flags are persisted when creating related records

### Currency Symbol Bug in Monthly Equivalent
- **Problem:** Monthly equivalent displayed dollar sign regardless of selected currency (e.g., INR showed dollar 999.00 instead of rupee 999.00)
- **Root cause:** Hardcoded dollar sign or USD-defaulting formatter in the monthly equivalent display
- **Fix:** Ensure currency symbol flows from selected currency into all formatted displays
- **Lesson:** Currency formatting must be consistent across all display points

### Trial Billing Cycle Data Leak
- **Problem:** Creating a Trial subscription persisted the default billingCycle (e.g., monthly) even though billing cycle is meaningless for trials
- **Fix:** Server-side field sanitization: Trial sets renewalDate=null, recurringPrice=null, recurringBillingCycle=null. Lifetime gets similar cleanup
- **Lesson:** Type-specific fields should be explicitly cleaned, not just ignored by the UI

### Duplicate Post-Insert Validation in Subscriptions
- **Problem:** POST handler had custom split validation BEFORE insert (correct) AND AFTER insert (dangerous - could create orphan subscription)
- **Fix:** Removed the after-insert duplicate validation
- **Lesson:** Validate before mutation, not after

### Edit Form Not Loading Subscription Type
- **Problem:** Edit Subscription form always showed Personal even for shared subscriptions; type selector was hidden when editing
- **Root cause:** activeType was hardcoded to original type, not using watchSubType; type selector JSX was conditionally hidden for editing
- **Fix:** Changed activeType to use watchSubType; added type selector for edit mode with field reset logic on type change
- **Lesson:** Edit forms must fully support all creation-mode features

### Old Dashboard Preview Used as README Screenshots
- **Problem:** Automated Playwright screenshot capture landed on the landing page DashboardPreview component instead of the authenticated dashboard
- **Root cause:** Clerk session cookies from the Freebuff preview browser do not transfer to Playwright separate Chromium instance
- **Resolution:** Screenshots must be captured manually from the authenticated session
- **Lesson:** Cross-browser session sharing requires shared browser context, not just cookies

### Account Deletion Using Wrong Table Reference
- **Problem:** `DELETE /api/settings/account` used `eq(subscriptionsTable.clerkId, userId)` when deleting categories instead of `eq(categoriesTable.clerkId, userId)`
- **Root cause:** Copy-paste error — the wrong table reference was used in the WHERE clause. With Drizzle ORM, this compiles to `subscriptions.clerk_id = $1` in a `DELETE FROM categories` statement, which is a SQL column resolution error
- **Fix:** Changed to `eq(categoriesTable.clerkId, userId)` so only user-created categories (clerkId non-null) are deleted, preserving system/default categories (clerkId null)
- **Files:** artifacts/api-server/src/routes/settings.ts
- **Adversarial audit findings:** Deletion order is correct (subscriptions before categories avoids FK conflict), all queries are properly scoped to the authenticated user's clerkId, FK cascades handle subscription_shares/reminders/user_settings/auto_import_candidates, transaction wraps all deletes for atomic rollback
- **Lesson:** When using Drizzle ORM, verify that column references in WHERE clauses use the correct table — `eq(Table.column, value)` compiles to `table.column` in SQL, so using the wrong table will reference a non-existent column in the target table's DELETE statement

### Analytics Monthly-Trend Chart Showing Zero Values
- **Problem:** Spending trend chart in Analytics showed a flat line at $0 for all 12 months despite active subscriptions
- **Root cause:** The monthly-trend route filtered subscriptions by `createdAt <= monthStart`, but `createdAt` is when the user added the subscription to Traqqy, not when the subscription started. All subscriptions were added recently, so every month got `totalAmount: 0`
- **Fix:** Removed the `createdAt <= monthStart` filter. All active non-archived subscriptions now count toward all months (same portfolio across all months)
- **Files:** artifacts/api-server/src/routes/analytics.ts
- **Lesson:** `createdAt` is an application event (when the record was created in Traqqy), not a business event (when the subscription started). Filtering by it for historical financial data produces incorrect results

### Dashboard and Analytics Showing Wrong Currency
- **Problem:** Dashboard showed amounts in INR, Analytics showed EUR — inconsistent despite user having a Default Currency set
- **Root cause:** Frontend pages hardcoded `formatCurrency(amount, "INR")` or used `useGetSettings()` independently. No centralized currency conversion existed — aggregate calculations summed raw numeric amounts from different currencies without conversion
- **Fix:** Added `useGetSettings()` to Dashboard and Health to use the user's configured currency. This was a presentation-only fix (formatting), not a conversion fix. The full conversion fix came in Session 5
- **Files:** artifacts/subtrack/src/pages/Dashboard.tsx, artifacts/subtrack/src/pages/Analytics.tsx, artifacts/subtrack/src/pages/Health.tsx
- **Lesson:** When multiple currencies exist in the system, formatting alone is insufficient — actual conversion is needed for correct aggregates

### Subscription Rows Not Tappable on Mobile
- **Problem:** On mobile, there was no way to open the edit dialog for a subscription. The three-dot menu was hidden (opacity-0 until hover) and rows were not clickable
- **Root cause:** SubscriptionRow had no click handler; the three-dot dropdown trigger used `opacity-0 group-hover:opacity-100` which required hover — unavailable on touch devices
- **Fix:** Added `onRowClick` prop to SubscriptionRow with `onClick`/`onKeyDown` (Enter/Space), `tabIndex={0}`, and `aria-label`. Changed three-dot button from `opacity-0 group-hover:opacity-100` to `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` (always visible on mobile). Added `stopPropagation` on the actions container div to prevent row click when menu button is clicked
- **Files:** artifacts/subtrack/src/components/subscriptions/SubscriptionRow.tsx, artifacts/subtrack/src/pages/Subscriptions.tsx
- **Lesson:** Mobile-first design requires considering touch interactions, not just hover. Event isolation (stopPropagation) is needed when nesting interactive elements

---

## 9. Important Edge Cases

### No Subscriptions
- Wallet Health returns score null with recommendation to add first subscription
- Dashboard shows 0/month with 0 active subscriptions
- Calendar shows no events
- Analytics shows no data

### No Budget Set
- Spending Health component gives neutral 20/35 instead of making arbitrary affordability assumptions
- UI recommends setting a budget for personalized scoring
- Set a monthly budget recommendation appears

### No Historical Spending Data
- Spending Stability factor gives 15/15 (neutral) with description Not enough history yet to evaluate spending changes
- This prevents penalizing users whose subscriptions simply have different prices
- Future: will use month-over-month comparison when historical data exists

### Subscription Type Changes
- Recurring to Trial: clears renewalDate, shows trialEndsAt, optional recurringPrice/recurringBillingCycle for conversion
- Trial to Recurring: requires billingCycle + renewalDate, clears trial fields
- Lifetime to Recurring: requires billingCycle + renewalDate, clears trial fields
- All transitions clear stale fields from the previous type

### Stale Renewal Dates
- Past renewalDate values are treated as data-quality issues, NOT missed payments
- Traqqy is a manual tracker - a past date may simply mean the user has not updated it
- Management factor describes them as renewal dates need updating not payments overdue
- Traqqy cannot distinguish confirmed overdue renewals from stale data

### Cost Sharing Sum Validation
- Custom split: share amounts must sum exactly to subscription price (within 0.01 tolerance)
- Equal split: calculateEqualSplit() handles rounding by distributing remainder to last person
- Deleting a subscription cascades to remove all share records

### Wallet Health Dream State (100/100)
- Achievable but requires: well within budget, low renewal pressure, no stale dates, no efficiency concerns, spending feeling aligned
- Each introduced weakness drops the score: 100 -> 96 -> 91 -> 84 etc.
- Ordinary healthy users typically score 75-89

---

## 10. Previous Audits & Lessons

### Full-Project Bug Audit (Session 1)
- Found and fixed 5 bugs across the entire application
- Covered: all pages, routes, components, API endpoints, database queries, auth flow, forms, calculations, data flows, loading/error/empty states

### Adversarial Break-the-Project Audit (Session 2)
- Assumed previous audits missed bugs
- Actively tried to break Traqqy through edge cases, malformed inputs, race conditions
- Focused on runtime behavior, not just code review

### Production-Readiness Audit (Session 3)
- Final developer pass before feature freeze
- Checked: type safety, error handling, null/undefined handling, date handling, currency handling, cache invalidation, duplicate submissions, responsive behavior

### Key Audit Lessons
1. **Never trust client-side state alone** - server must validate and sanitize (e.g., subscription type fields)
2. **Defensive database updates** - when creating related records, explicitly verify the parent flag was persisted
3. **Validate before mutation** - not after, to prevent orphaned records
4. **Edit forms need full feature parity** - what works in Create must work in Edit
5. **Manual data trackers have different semantics** - past dates do not equal missed payments

---

## 11. Known Problems & Technical Debt

### Currently Known Issues

1. **No production cron/scheduling** - Reminder processing endpoint exists (POST /api/reminders/process) but no external cron triggers it. Reminders are backend-complete but not production-active.

2. **Gmail auto-import not production-ready** - Backend and frontend interfaces exist but the feature is not fully functional or tested end-to-end.

3. **Old screenshots in docs/images/** - Pre-redesign screenshots still exist but are not referenced by README. Can be cleaned up.

4. **Playwright screenshots could not capture authenticated pages** - The automated screenshot pipeline captures the landing page instead of the authenticated app due to Clerk session isolation between browser instances.

5. **Spending Stability is neutral** - Without historical spending data, the stability factor always returns 15/15. This is by design but means one factor is essentially disabled.

6. **Subscription Efficiency is neutral** - Without explicit unused or needs review flags in the data model, efficiency is always 15/15. The archived-ratio approach was rejected to avoid double-counting with Spending Health.

7. **billingCycle required by schema for all types** - The database schema requires billingCycle for all subscriptions, but it is only meaningful for recurring. Server defaults to monthly for trial/lifetime. This is cosmetically imperfect but functionally harmless.

8. **Multiple branding-related files at project root** - New branding/ and Traqqy_Readme_Screenshots/ directories exist. These are reference files, not part of the application.

9. **Old Replit files remain** - .replit, .replitignore, and @replit/connectors-sdk dependency still exist. They are harmless but could be cleaned up.

10. **Landing.old.tsx** - Legacy landing page component still exists in the codebase but is not routed to in App.tsx.

### Areas Needing Future Attention
- Production deployment infrastructure
- Cron service configuration for reminders
- Gmail auto-import completion
- Historical spending data collection for genuine stability measurement
- Historical exchange rates for analytics (currently uses latest rates for all months)
- Frankfurter only supports 29 currencies — 33 of the original 62 are unsupported for conversion
- Production cron/scheduling for reminders
- PWA support
- Import/export functionality
- Domain purchase and custom email domain for Resend

---

## 12. Current Project State

### What Works
Full subscription lifecycle (CRUD, archive/restore, type changes)
Dashboard with real-time spending data and multi-currency conversion
Analytics with charts and multi-currency conversion
Calendar with renewal events
Wallet Health scoring with personalized factors and multi-currency conversion
Cost Sharing with equal and custom splits
Reminder backend (API + processing endpoint)
Authentication (Clerk)
Dark/light theme
520+ service catalog with logos
15 canonical currencies with server-side Frankfurter/ECB exchange-rate conversion
Mobile subscription management (tappable rows, visible three-dot menu)
Responsive design (desktop + mobile pill-bar navigation)
Premium README with current screenshots
Finalized Traqqy branding (wordmark + symbol)

### What Is Incomplete
Reminder production cron (backend done, cron not configured)
Gmail auto-import (backend + UI exist, not production-ready)
Production deployment
Spending stability measurement (needs historical data)

### What Is Broken
Nothing currently broken (account deletion bug fixed Aug 30)

### What Was Last Being Worked On
README redesign with new screenshots from user-provided attachments
The last user request was to create this engineering history file

### What Should Be Tackled Next
1. Production deployment setup
2. Cron configuration for reminders
3. README screenshot update
4. Gmail auto-import completion

---

## 13. Important Decisions

### Why Wouter Over React Router
Wouter was chosen for lightweight client-side routing. It is smaller, simpler, and sufficient for Traqqy routing needs.

### Why Manual Tracking Over Bank Integration
Intentional product decision. Bank integrations raise privacy concerns, require financial API access, and add regulatory complexity.

### Why JSON String for Health Preferences
healthPreferences is stored as a JSON string in user_settings rather than a separate table. Keeps the schema simple for a small set of preferences.

### Why Neutral Stability/Efficiency Factors
Previous attempts to use proxy metrics (price variation for stability, subscription count for efficiency) produced misleading scores. Neutral is better than wrong.

### Why Treat Past Renewal Dates as Data Quality Issues
Traqqy is a manual tracker. A past renewalDate most likely means the user has not updated the date, not that they missed a payment.

### Why isShared Defensive UPDATE
After discovering that upsertShares() could succeed while the parent is_shared flag remained false, defensive UPDATEs were added in both POST and PATCH handlers.

### Why Pill-Bar Navigation
The original sidebar felt generic and vibe-coded. A segmented pill-bar was chosen for its compactness, warmth, and distinctiveness from conventional SaaS dashboards.

### Why @workspace/subtrack Name
The frontend package retains its original SubTrack name from before the product was rebranded to Traqqy. Renaming would require updating all workspace references and is low priority.

---

## 14. Historical Timeline

| Date/Period | Milestone |
|-------------|----------|
| Early dev | Project started on Replit as SubTrack |
| Pre-Aug 2026 | Core subscription tracking, basic sidebar, Replit hosting |
| ~Aug 19 | Migrated from Replit to local Windows development |
| ~Aug 19-20 | Clerk auth configured for local development |
| ~Aug 20 | Category seeding, subscription catalog built out |
| ~Aug 21 | Landing page created, initial README added |
| ~Aug 21-22 | Gmail auto-import backend and frontend added |
| ~Aug 22 | Catalog shared as workspace package |
| ~Aug 22-23 | New Traqqy logo introduced, branding refreshed |
| ~Aug 24 | Complete visual redesign - pill-bar navigation |
| ~Aug 24-25 | Wallet Health system implemented (100-point, 5 factors) |
| ~Aug 25 | 131+ Wallet Health tests passing |
| ~Aug 25-26 | Catalog expanded to 520+ services, 62+ logos |
| ~Aug 26 | Trial and Lifetime subscription support |
| ~Aug 27 | Cost Sharing implemented (equal + custom split) |
| ~Aug 27 | Currency symbol bug fixed |
| ~Aug 27 | Cost Sharing isShared bug fixed |
| ~Aug 27 | Database migration applied |
| ~Aug 27 | 3 full-project audits completed, feature freeze |
| ~Aug 28 | Traqqy branding finalized (wordmark + symbol) |
| ~Aug 28 | README redesigned as product page |
| ~Aug 28 | Reminder system backend completed |
| Aug 30 | Engineering history document created |
| Aug 30 | Account deletion bug fixed (wrong table reference in category deletion) |
| Aug 31 | Session 4: Analytics chart fix, mobile subscription interaction, currency formatting |
| Aug 31 | Session 5: Multi-currency system with Frankfurter/ECB rates, 15 canonical currencies, server-side conversion, CurrencySelect fix, wallet-health audit fixes |
| Aug 31 | Session 5 committed (84eb026): 26 files, 1142 insertions, 242 deletions |

---

## Appendix: Key File Quick Reference

| File | Purpose |
|------|---------|
| artifacts/subtrack/src/App.tsx | Router, Clerk setup, route definitions |
| artifacts/subtrack/src/components/layout/Sidebar.tsx | Pill-bar navigation, user dropdown |
| artifacts/subtrack/src/components/layout/Shell.tsx | App shell with theme and transitions |
| artifacts/subtrack/src/components/layout/TraqqyBrand.tsx | Branding component (wordmark/symbol) |
| artifacts/subtrack/src/pages/Dashboard.tsx | Dashboard with spending, renewals, Health card |
| artifacts/subtrack/src/pages/Health.tsx | Wallet Health page |
| artifacts/subtrack/src/components/health/HealthOnboarding.tsx | 3-question health preferences |
| artifacts/subtrack/src/components/subscriptions/SubscriptionForm.tsx | Add/Edit form with type selector |
| artifacts/subtrack/src/components/subscriptions/SubscriptionLogo.tsx | Service logo renderer |
| artifacts/api-server/src/routes/subscriptions.ts | Subscription CRUD with sharing |
| artifacts/api-server/src/routes/wallet-health.ts | Wallet Health scoring engine |
| artifacts/api-server/src/routes/reminders.ts | Reminder CRUD and processing |
| artifacts/api-server/src/lib/billing.ts | Billing calculations, daysUntil |
| artifacts/api-server/src/lib/auth.ts | Clerk auth helpers |
| lib/db/src/schema/subscriptions.ts | Subscription table definition |
| lib/db/src/schema/subscriptionShares.ts | Share records table |
| lib/db/src/schema/userSettings.ts | User settings |
| lib/catalog/src/catalog-data.ts | 520+ service definitions |
| lib/catalog/src/index.ts | Catalog exports, logo resolution |
| lib/currencies/src/index.ts | Canonical 15-currency list, formatAmount, getCurrency |
| lib/currencies/src/convert.ts | Central convertAmount (USD-pivot), roundMoney |
| lib/db/src/schema/fxRates.ts | fx_rates table (base_currency, target_currency, rate, rate_date) |
| artifacts/api-server/src/lib/fx-rates.ts | Frankfurter API client |
| artifacts/api-server/src/lib/fx-cache.ts | Daily rate caching with in-memory lock |
| artifacts/api-server/src/lib/currency.ts | Server-side conversion helpers (sumConverted, roundMoney) |
| artifacts/subtrack/src/data/currencies.ts | Re-exports from @workspace/currencies (backward compat) |
