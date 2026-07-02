import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Product, Location, InventoryItem } from "../../types";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "../common/EmptyState";

interface ProductListProps {
  products: Product[];
  selectedLocation: string;
  locations: Location[];
  onProductClick?: (product: Product, locationId: string) => void;
  onAdjustClick?: (inventoryItem: InventoryItem, productName: string) => void;
}

export function ProductList({
  products,
  selectedLocation,
  locations,
  onProductClick,
  onAdjustClick,
}: ProductListProps) {
  const locationName =
    selectedLocation !== "all"
      ? locations.find((l) => l.id === selectedLocation)?.name
      : null;
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const groupedProducts = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        products: Product[];
      }
    >();

    for (const product of products) {
      const key = product.category?.id || "__uncategorized__";
      const name = product.category?.name || "Uncategorized";
      const existing = groups.get(key) ?? {
        key,
        name,
        products: [],
      };

      existing.products.push(product);

      groups.set(key, existing);
    }

    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === "__uncategorized__") return 1;
      if (b.key === "__uncategorized__") return -1;
      return a.name.localeCompare(b.name);
    });
  }, [products]);

  useEffect(() => {
    setCollapsedSections((prev) => {
      const next: Record<string, boolean> = {};
      for (const group of groupedProducts) {
        next[group.key] = prev[group.key] ?? true;
      }
      return next;
    });
  }, [groupedProducts]);

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const hideAllSections = useCallback(() => {
    setCollapsedSections(() =>
      groupedProducts.reduce<Record<string, boolean>>((acc, group) => {
        acc[group.key] = true;
        return acc;
      }, {}),
    );
  }, [groupedProducts]);

  const showAllSections = useCallback(() => {
    setCollapsedSections(() =>
      groupedProducts.reduce<Record<string, boolean>>((acc, group) => {
        acc[group.key] = false;
        return acc;
      }, {}),
    );
  }, [groupedProducts]);

  const hasExpandedSections = groupedProducts.some(
    (group) => !collapsedSections[group.key],
  );
  const hasCollapsedSections = groupedProducts.some(
    (group) => collapsedSections[group.key] ?? true,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-dark-text-primary text-lg">
          Inventory {locationName && `- ${locationName}`}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={hideAllSections}
            disabled={!hasExpandedSections}
            className="px-2 py-1 text-xs rounded border border-dark-border text-dark-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hide All
          </button>
          <button
            type="button"
            onClick={showAllSections}
            disabled={!hasCollapsedSections}
            className="px-2 py-1 text-xs rounded border border-dark-border text-dark-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Show All
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState message="No products found. Add some products to get started!" />
      ) : (
        <div className="space-y-3">
          {groupedProducts.map((group) => (
            <section
              key={group.key}
              className="bg-dark-card border border-dark-border rounded-lg shadow-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSection(group.key)}
                className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gf-charcoal-700 transition-colors duration-150"
                aria-expanded={!collapsedSections[group.key]}
              >
                <h3 className="font-heading font-semibold text-sm text-dark-text-primary truncate pr-2">
                  {group.name}
                </h3>
                <span
                  className="text-dark-text-secondary text-xs whitespace-nowrap"
                  aria-hidden="true"
                >
                  {collapsedSections[group.key] ? "Show" : "Hide"} (
                  {group.products.length})
                </span>
              </button>

              {!collapsedSections[group.key] && (
                <div className="pb-2 space-y-2 border-t border-dark-border">
                  {group.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      selectedLocation={selectedLocation}
                      onCardClick={onProductClick}
                      onAdjustClick={onAdjustClick}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
