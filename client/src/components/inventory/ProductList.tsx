import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Product, Location } from "../../types";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "../common/EmptyState";
import { getChipBlendGroupKey, getChipUnitType, getLocationQuantity, isChipBlendProduct } from "../../utils/inventory";

type ProductRow =
  | {
      kind: "single";
      key: string;
      product: Product;
    }
  | {
      kind: "merged-chip";
      key: string;
      product: Product;
      chipUnitEntries: Array<{
        product: Product;
        unitType: "BOX" | "BUCKET";
        quantity: number;
      }>;
    };

interface ProductListProps {
  products: Product[];
  selectedLocation: string;
  locations: Location[];
  pendingKey?: string | null;
  errorByKey?: Record<string, string | null>;
  onIncrement?: (product: Product, locationId: string) => void;
  onDecrement?: (product: Product, locationId: string) => void;
  onAdjustChipUnit?: (product: Product, locationId: string, unitType: 'BOX' | 'BUCKET', delta: number) => void;
  onProductClick?: (product: Product, locationId: string) => void;
}

export function ProductList({
  products,
  selectedLocation,
  locations,
  pendingKey,
  errorByKey,
  onIncrement,
  onDecrement,
  onAdjustChipUnit,
  onProductClick,
}: ProductListProps) {
  const locationName =
    selectedLocation !== "all"
      ? locations.find((location) => location.id === selectedLocation)?.name
      : null;
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const groupedProducts = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        rows: ProductRow[];
      }
    >();

    for (const product of products) {
      const key = product.category?.id || "__uncategorized__";
      const name = product.category?.name || "Uncategorized";
      const existing = groups.get(key) ?? {
        key,
        name,
        rows: [],
      };

      const chipUnitType = getChipUnitType(product);
      if (isChipBlendProduct(product) && chipUnitType) {
        const mergedKey = getChipBlendGroupKey(product) ?? `chip:${product.name.trim().toLowerCase()}`;
        const existingMergedRow = existing.rows.find(
          (row): row is Extract<ProductRow, { kind: "merged-chip" }> =>
            row.kind === "merged-chip" && row.key === mergedKey,
        );

        const chipEntry = {
          product,
          unitType: chipUnitType,
          quantity: selectedLocation === "all"
            ? product.inventoryItems.reduce((sum, item) => sum + item.quantity, 0)
            : getLocationQuantity(product, selectedLocation),
        };

        if (existingMergedRow) {
          existingMergedRow.chipUnitEntries.push(chipEntry);
        } else {
          existing.rows.push({
            kind: "merged-chip",
            key: mergedKey,
            product,
            chipUnitEntries: [chipEntry],
          });
        }
      } else {
        existing.rows.push({
          kind: "single",
          key: product.id,
          product,
        });
      }

      groups.set(key, existing);
    }

    Array.from(groups.values()).forEach((group) => {
      group.rows = group.rows.sort((left, right) => left.product.name.localeCompare(right.product.name));
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (left.key === "__uncategorized__") return 1;
      if (right.key === "__uncategorized__") return -1;
      return left.name.localeCompare(right.name);
    });
  }, [products, selectedLocation]);

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

  const hasExpandedSections = groupedProducts.some((group) => !collapsedSections[group.key]);
  const hasCollapsedSections = groupedProducts.some((group) => collapsedSections[group.key] ?? true);
  const isEditable = selectedLocation !== "all";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-dark-text-primary text-lg">
            Inventory {locationName && `- ${locationName}`}
          </h2>
        </div>
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
                  {group.rows.length})
                </span>
              </button>

              {!collapsedSections[group.key] && (
                <div className="pb-2 space-y-2 border-t border-dark-border">
                  {group.rows.map((row) => {
                    const product = row.product;
                    const rowKey = `${product.id}:${selectedLocation}`;
                    return (
                      <ProductCard
                        key={row.key}
                        product={product}
                        chipUnitEntries={row.kind === "merged-chip" ? row.chipUnitEntries : undefined}
                        selectedLocation={selectedLocation}
                        isEditable={isEditable}
                        isPending={pendingKey === rowKey}
                        errorMessage={errorByKey?.[rowKey] ?? null}
                        onIncrement={onIncrement}
                        onDecrement={onDecrement}
                        onAdjustChipUnit={onAdjustChipUnit}
                        onCardClick={onProductClick}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
