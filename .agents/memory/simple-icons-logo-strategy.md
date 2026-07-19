---
name: Simple Icons logo strategy
description: How SubTrack renders subscription logos from Simple Icons with fallback behavior.
---

- Fetch official Simple Icons SVGs from `https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/{slug}.svg` at runtime, parse the `<path>` and `viewBox`, and render inline SVG.
- The `simple-icons` npm package is installed in the project as the canonical reference for the dataset; CDN is used to keep bundle size small and avoid loading all 3,000+ icons eagerly.
- `SubscriptionLogo` caches parsed SVGs in a module-level `Map` and shows a deterministic circular letter-avatar fallback (using the same `stringToColor` helper) when the slug is missing or the fetch fails.
- Catalog entries now only need `name`, `category`, `icon` (Simple Icons slug), and `defaultBillingCycle`.

**Why:** Loading every Simple Icons SVG at build time would bloat the bundle by several megabytes; runtime CDN keeps the initial payload small while still using official icons.

**How to apply:** When adding a new catalog entry, set `icon` to a valid Simple Icons slug. If the service isn't in Simple Icons, leave `icon` empty or set a slug; the component will fall back to the letter avatar automatically.
