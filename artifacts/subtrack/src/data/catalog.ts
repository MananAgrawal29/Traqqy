// Re-export types and data from the shared catalog package.
// This is the single source of truth for all subscription services.
export type { CatalogCategory, CatalogBillingCycle, CatalogEntry } from "@workspace/catalog";
export { CATALOG_CATEGORIES, catalog } from "@workspace/catalog";

// ── Local helpers that depend on the catalog ──

import { catalog as _catalog, type CatalogCategory as _CatalogCategory } from "@workspace/catalog";

export const POPULAR_CATALOG_IDS = _catalog
  .filter(e => e.popular)
  .map(e => e.id);

export function searchCatalog(query: string, category?: _CatalogCategory | "All"): typeof _catalog {
  const q = query.toLowerCase().trim();
  return _catalog.filter(entry => {
    const matchesSearch = !q ||
      entry.name.toLowerCase().includes(q) ||
      entry.category.toLowerCase().includes(q) ||
      entry.icon.toLowerCase().includes(q);
    const matchesCategory = !category || category === "All" || entry.category === category;
    return matchesSearch && matchesCategory;
  });
}
