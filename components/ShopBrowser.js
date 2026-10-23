"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { colorValues, collections, formatPrice, products } from "@/lib/products";
import Icon from "./Icon";
import ProductCard from "./ProductCard";

const categories = [...new Set(products.map((product) => product.category))];
const audiences = ["Men", "Women", "Kids"];
const sizes = [...new Set(products.flatMap((product) => product.sizes))].sort((a, b) => a - b);
const colors = [...new Set(products.flatMap((product) => product.colors))];
const priceCeiling = Math.max(...products.map((product) => product.price));

export default function ShopBrowser() {
  const searchParams = useSearchParams();
  // Remounting on router navigation reseeds local state from the URL; manual
  // history updates below keep the URL shareable without triggering re-renders.
  return <Catalog key={searchParams.toString()} params={searchParams} />;
}

function Catalog({ params }) {
  const audience = params.get("audience") || "";
  const collection = params.get("collection") || "";
  const [query, setQuery] = useState(params.get("q") || "");
  const [selectedCategories, setSelectedCategories] = useState(() => params.getAll("category"));
  const [selectedSizes, setSelectedSizes] = useState(() => params.getAll("size"));
  const [selectedColors, setSelectedColors] = useState(() => params.getAll("color"));
  const [maxPrice, setMaxPrice] = useState(() => {
    const raw = params.get("max-price");
    const parsed = raw === null || raw === "" ? priceCeiling : Number(raw);
    return Number.isFinite(parsed) ? Math.min(priceCeiling, Math.max(0, parsed)) : priceCeiling;
  });
  const [sort, setSort] = useState(() => (["newest", "price-low", "price-high"].includes(params.get("sort")) ? params.get("sort") : "newest"));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterToggle = useRef(null);

  const searchWords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matchingProducts = products.filter((product) => {
    const searchable = [product.name, product.category, product.audience, product.description, ...product.colors, ...product.collections].join(" ").toLowerCase();
    return (
      (!audience || product.audience === audience) &&
      (!collection || product.collections.includes(collection)) &&
      searchWords.every((word) => searchable.includes(word)) &&
      (!selectedCategories.length || selectedCategories.includes(product.category)) &&
      (!selectedSizes.length || product.sizes.some((size) => selectedSizes.includes(String(size)))) &&
      (!selectedColors.length || product.colors.some((color) => selectedColors.includes(color))) &&
      product.price <= maxPrice
    );
  }).sort((a, b) => {
    if (sort === "price-low") return a.price - b.price;
    if (sort === "price-high") return b.price - a.price;
    return b.date.localeCompare(a.date);
  });

  function syncUrl(patch) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      next.delete(key);
      (Array.isArray(value) ? value : [value]).forEach((entry) => {
        if (entry !== "" && entry !== null && entry !== undefined) next.append(key, String(entry));
      });
    }
    const queryString = next.toString();
    window.history.replaceState(null, "", queryString ? `/shop?${queryString}` : "/shop");
  }

  function toggleIn(list, setList, name, value) {
    const option = String(value);
    const updated = list.includes(option) ? list.filter((item) => item !== option) : [...list, option];
    setList(updated);
    syncUrl({ [name]: updated });
  }

  function clearAll() {
    setQuery("");
    setSelectedCategories([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setMaxPrice(priceCeiling);
    setSort("newest");
    syncUrl({ q: "", category: [], size: [], color: [], "max-price": "", sort: "" });
  }

  function closeFilters() {
    setFiltersOpen(false);
    filterToggle.current?.focus();
  }

  const activeFilters = [
    ...(query ? [{ key: "q", value: query, label: `Search: ${query}` }] : []),
    ...(audience ? [{ key: "audience", value: audience, label: audience, href: collection ? `/shop?collection=${encodeURIComponent(collection)}` : "/shop" }] : []),
    ...(collection ? [{ key: "collection", value: collection, label: collection, href: audience ? `/shop?audience=${audience}` : "/shop" }] : []),
    ...selectedCategories.map((value) => ({ key: "category", value, label: value })),
    ...selectedSizes.map((value) => ({ key: "size", value, label: `EU ${value}` })),
    ...selectedColors.map((value) => ({ key: "color", value, label: value })),
    ...(maxPrice < priceCeiling ? [{ key: "max-price", value: String(maxPrice), label: `Up to ${formatPrice(maxPrice)}` }] : []),
  ];
  const heading = collection ? `${collection}${audience ? ` · ${audience}` : ""}` : audience ? `${audience}’s rotation` : query.trim() ? "Find your next pair." : "All sneakers.";

  function removeFilter(filter) {
    if (filter.href) return;
    if (filter.key === "q") { setQuery(""); syncUrl({ q: "" }); return; }
    if (filter.key === "max-price") { setMaxPrice(priceCeiling); syncUrl({ "max-price": "" }); return; }
    if (filter.key === "category") return toggleIn(selectedCategories, setSelectedCategories, "category", filter.value);
    if (filter.key === "size") return toggleIn(selectedSizes, setSelectedSizes, "size", filter.value);
    if (filter.key === "color") return toggleIn(selectedColors, setSelectedColors, "color", filter.value);
  }

  return (
    <section className="page-shell catalog-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Shop</span>
      </nav>
      <header className="catalog-heading mb-8">
        <p className="eyebrow">THE SOLEIX ROTATION</p>
        <h1 className="page-title">{heading}</h1>
        <p className="muted">Built for your everyday. Chosen for your next move.</p>
      </header>

      <nav className="mb-8 flex flex-wrap gap-x-6 gap-y-3 text-sm" aria-label="Shop collections">
        {collections.map((item) => (
          <Link key={item} href={`/shop?collection=${encodeURIComponent(item)}`} className={`text-link ${collection === item ? "font-semibold" : "muted"}`} aria-current={collection === item ? "page" : undefined}>{item}</Link>
        ))}
      </nav>

      <div className="catalog-toolbar">
        <button ref={filterToggle} type="button" className="button button-outline filters-toggle lg:hidden" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(!filtersOpen)}>
          <Icon name="filter" size={17} /> Filters{activeFilters.length > 0 ? ` (${activeFilters.length})` : ""}
        </button>
        <p className="muted text-sm" role="status" aria-live="polite" aria-atomic="true">
          <strong>{matchingProducts.length}</strong> {matchingProducts.length === 1 ? "pair" : "pairs"} found
        </p>
        <form className="field min-w-0 flex-1" role="search" aria-label="Search the collection" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="catalog-search" className="sr-only">Search sneakers</label>
          <div className="relative">
            <input id="catalog-search" className="input w-full pr-11" type="search" placeholder="Search your next pair…" value={query} onChange={(event) => { setQuery(event.target.value); syncUrl({ q: event.target.value }); }} />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><Icon name="search" size={18} /></span>
          </div>
        </form>
        <div className="field flex items-center gap-2">
          <label htmlFor="catalog-sort" className="muted whitespace-nowrap text-sm">Sort by</label>
          <select id="catalog-sort" className="select" value={sort} onChange={(event) => { setSort(event.target.value); syncUrl({ sort: event.target.value === "newest" ? "" : event.target.value }); }}>
            <option value="newest">Newest arrivals</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="active-filters mb-6 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {activeFilters.map((filter) => filter.href ? (
            <Link key={`${filter.key}-${filter.value}`} href={filter.href} className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/15 px-3 py-2 text-xs"><span className="truncate">{filter.label}</span><Icon name="close" size={13} /></Link>
          ) : (
            <button key={`${filter.key}-${filter.value}`} type="button" className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/15 px-3 py-2 text-xs" aria-label={`Remove ${filter.label} filter`} onClick={() => removeFilter(filter)}>
              <span className="truncate">{filter.label}</span><Icon name="close" size={13} />
            </button>
          ))}
          <button type="button" className="text-link px-2 py-2 text-sm" onClick={clearAll}>Clear all</button>
        </div>
      )}

      <div className="catalog-layout">
        <aside id="catalog-filters" className={`filters-panel${filtersOpen ? " is-open" : ""}`} aria-label="Filter sneakers" onKeyDown={(event) => { if (event.key === "Escape" && filtersOpen) closeFilters(); }}>
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Filters</h2>
            <button type="button" className="text-link text-sm disabled:opacity-40" onClick={clearAll} disabled={!activeFilters.length}>Reset all</button>
            <button type="button" className="p-2 lg:hidden" aria-label="Close filters" onClick={closeFilters}><Icon name="close" size={18} /></button>
          </div>

          <nav className="filter-group" aria-label="Shop by audience">
            <h3 className="mb-3 text-sm font-semibold">Made for</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/shop" className={`size-button ${!audience && !collection ? "active" : ""}`}>Everyone</Link>
              {audiences.map((item) => <Link key={item} href={`/shop?audience=${item}`} className={`size-button ${audience === item ? "active" : ""}`} aria-current={audience === item ? "page" : undefined}>{item}</Link>)}
            </div>
          </nav>

          <fieldset className="filter-group">
            <legend className="mb-3 text-sm font-semibold">Category</legend>
            <div className="space-y-3">
              {categories.map((category) => (
                <label key={category} className="flex cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-black" checked={selectedCategories.includes(category)} onChange={() => toggleIn(selectedCategories, setSelectedCategories, "category", category)} />
                  {category}
                  <span className="muted ml-auto">{products.filter((product) => product.category === category).length}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="filter-group">
            <legend className="mb-3 text-sm font-semibold">Size <span className="muted font-normal">EU</span></legend>
            <div className="size-grid">
              {sizes.map((size) => <button key={size} type="button" className={`size-button ${selectedSizes.includes(String(size)) ? "active" : ""}`} aria-label={`Filter size EU ${size}`} aria-pressed={selectedSizes.includes(String(size))} onClick={() => toggleIn(selectedSizes, setSelectedSizes, "size", size)}>{size}</button>)}
            </div>
          </fieldset>

          <fieldset className="filter-group">
            <legend className="mb-3 text-sm font-semibold">Colour</legend>
            <div className="grid grid-cols-2 gap-3">
              {colors.map((color) => (
                <label key={color} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-black" checked={selectedColors.includes(color)} onChange={() => toggleIn(selectedColors, setSelectedColors, "color", color)} />
                  <span className="color-dot shrink-0" style={{ backgroundColor: colorValues[color] }} aria-hidden="true" />{color}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="filter-group field">
            <label htmlFor="catalog-price" className="mb-3 block text-sm font-semibold">Maximum price</label>
            <output htmlFor="catalog-price" className="mb-3 block text-sm">{formatPrice(maxPrice)}</output>
            <input id="catalog-price" className="w-full accent-black" type="range" min="0" max={priceCeiling} step="500" value={maxPrice} aria-valuetext={formatPrice(maxPrice)} onChange={(event) => { const value = Number(event.target.value); setMaxPrice(value); syncUrl({ "max-price": value === priceCeiling ? "" : String(value) }); }} />
            <div className="muted mt-2 flex justify-between text-xs"><span>{formatPrice(0)}</span><span>{formatPrice(priceCeiling)}</span></div>
          </div>
          <button type="button" className="button button-dark w-full lg:hidden" onClick={closeFilters}>Show {matchingProducts.length} {matchingProducts.length === 1 ? "pair" : "pairs"}<Icon name="arrow" size={17} /></button>
        </aside>

        <div className="catalog-results min-w-0">
          {matchingProducts.length > 0 ? (
            <div className="catalog-grid">{matchingProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          ) : (
            <div className="empty-state flex min-h-96 flex-col items-center justify-center px-6 py-16 text-center">
              <Icon name="search" size={32} />
              <h2 className="section-heading mt-5">No pairs found.</h2>
              <p className="muted mx-auto mb-6 mt-3 max-w-md">Try a different search or loosen a filter. Your next favourite pair may be just one reset away.</p>
              <button type="button" className="button button-dark" onClick={clearAll}>Reset filters & search<Icon name="arrow" size={17} /></button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
