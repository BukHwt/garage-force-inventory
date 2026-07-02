import React, { memo, useMemo } from "react";
import { Product } from "../../types";
import {
  getTotalQuantity,
  getLocationQuantity,
  isChipBlendProduct,
  needsReorder,
} from "../../utils/inventory";
import type { ChipUnitType } from "../../utils/inventory";

interface ChipUnitEntry {
  product: Product;
  unitType: ChipUnitType;
  quantity: number;
}

interface ProductCardProps {
  product: Product;
  selectedLocation: string;
  isEditable?: boolean;
  isPending?: boolean;
  errorMessage?: string | null;
  chipUnitEntries?: ChipUnitEntry[];
  onIncrement?: (product: Product, locationId: string) => void;
  onDecrement?: (product: Product, locationId: string) => void;
  onAdjustChipUnit?: (product: Product, locationId: string, unitType: ChipUnitType, delta: number) => void;
  onCardClick?: (product: Product, locationId: string) => void;
}

export const ProductCard = memo(function ProductCard({
  product,
  selectedLocation,
  isEditable = false,
  isPending = false,
  errorMessage,
  chipUnitEntries,
  onIncrement,
  onDecrement,
  onAdjustChipUnit,
  onCardClick,
}: ProductCardProps) {
  const isReorderNeeded = needsReorder(product);
  const showingAllLocations = selectedLocation === "all";
  const isSingleUse = product.consumableType === "SINGLE_USE";
  const isChipBlend = isChipBlendProduct(product);
  const hasMergedChipUnits = Boolean(chipUnitEntries?.length);
  const unitLabel = product.unitSize || "units";

  const displayQuantity = showingAllLocations
    ? (
      chipUnitEntries?.reduce((sum, entry) => sum + getTotalQuantity(entry.product), 0) ??
      getTotalQuantity(product)
    )
    : (
      chipUnitEntries?.reduce((sum, entry) => sum + entry.quantity, 0) ??
      getLocationQuantity(product, selectedLocation)
    );

  const inventoryByLocation = useMemo(() => {
    if (chipUnitEntries?.length) {
      const totals = new Map<string, { name: string; boxes: number; buckets: number }>();

      for (const entry of chipUnitEntries) {
        for (const item of entry.product.inventoryItems) {
          const existing = totals.get(item.location.id);
          if (existing) {
            if (entry.unitType === "BOX") {
              existing.boxes += item.quantity;
            } else {
              existing.buckets += item.quantity;
            }
          } else {
            totals.set(item.location.id, {
              name: item.location.name,
              boxes: entry.unitType === "BOX" ? item.quantity : 0,
              buckets: entry.unitType === "BUCKET" ? item.quantity : 0,
            });
          }
        }
      }

      return Array.from(totals.entries()).map(([locationId, entry]) => ({
        locationId,
        name: entry.name,
        boxes: entry.boxes,
        buckets: entry.buckets,
      }));
    }

    const totals = new Map<string, { name: string; open: number; sealed: number; total: number }>();

    for (const item of product.inventoryItems) {
      const existing = totals.get(item.location.id);
      if (existing) {
        existing.open += item.status === "OPEN" ? item.quantity : 0;
        existing.sealed += item.status === "SEALED" ? item.quantity : 0;
        existing.total += item.quantity;
      } else {
        totals.set(item.location.id, {
          name: item.location.name,
          open: item.status === "OPEN" ? item.quantity : 0,
          sealed: item.status === "SEALED" ? item.quantity : 0,
          total: item.quantity,
        });
      }
    }

    return Array.from(totals.entries()).map(([locationId, entry]) => ({
      locationId,
      name: entry.name,
      open: entry.open,
      sealed: entry.sealed,
      total: entry.total,
    }));
  }, [chipUnitEntries, product.inventoryItems]);

  const canDecrement = isEditable && displayQuantity > 0 && !isPending;
  const canIncrement = isEditable && !isPending;

  const chipCounts = useMemo(() => {
    if (chipUnitEntries?.length) {
      return chipUnitEntries.reduce(
        (totals, entry) => {
          if (entry.unitType === "BOX") {
            totals.boxes += entry.quantity;
          } else {
            totals.buckets += entry.quantity;
          }
          return totals;
        },
        { boxes: 0, buckets: 0 },
      );
    }

    if (!isChipBlend || showingAllLocations) {
      return { boxes: 0, buckets: 0 };
    }

    const matchingItem = product.inventoryItems.find((item) => item.location.id === selectedLocation);
    if (!matchingItem?.notes) {
      return { boxes: 0, buckets: 0 };
    }

    try {
      const parsed = JSON.parse(matchingItem.notes);
      return {
        boxes: Number(parsed?.boxes ?? 0) || 0,
        buckets: Number(parsed?.buckets ?? 0) || 0,
      };
    } catch {
      return { boxes: 0, buckets: 0 };
    }
  }, [chipUnitEntries, isChipBlend, product.inventoryItems, selectedLocation, showingAllLocations]);

  const chipUnitTargets = useMemo(() => {
    if (!chipUnitEntries?.length) {
      return {
        BOX: product,
        BUCKET: product,
      };
    }

    return chipUnitEntries.reduce(
      (targets, entry) => {
        if (!targets[entry.unitType]) {
          targets[entry.unitType] = entry.product;
        }
        return targets;
      },
      { BOX: undefined as Product | undefined, BUCKET: undefined as Product | undefined },
    );
  }, [chipUnitEntries, product]);

  const visibleChipUnits = useMemo(() => {
    if (!chipUnitEntries?.length) {
      return ["BOX", "BUCKET"] as ChipUnitType[];
    }

    return (["BOX", "BUCKET"] as ChipUnitType[]).filter((unitType) => Boolean(chipUnitTargets[unitType]));
  }, [chipUnitEntries, chipUnitTargets]);

  const handleCardClick = () => {
    if (hasMergedChipUnits) {
      onCardClick?.(product, selectedLocation);
      return;
    }

    if (showingAllLocations || !isEditable) {
      onCardClick?.(product, selectedLocation);
      return;
    }

    onIncrement?.(product, selectedLocation);
  };

  return (
    <div
      className={`bg-dark-card p-3 rounded-lg shadow-lg border ${
        isReorderNeeded ? "border-l-4 border-alert-red" : "border-dark-border"
      } ${onCardClick ? "cursor-pointer active:bg-gf-charcoal-700 transition-colors duration-150" : ""}`}
      style={{ minHeight: "44px" }}
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start gap-3 mb-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm text-dark-text-primary">{product.name}</h3>
          {product.sku && (
            <p className="text-xs text-dark-text-muted">SKU: {product.sku}</p>
          )}
        </div>

        {isEditable && !hasMergedChipUnits ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDecrement?.(product, selectedLocation);
              }}
              disabled={!canDecrement}
              className="h-9 w-9 rounded-lg border border-dark-border text-lg font-bold text-dark-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              -
            </button>
            <div className="min-w-[3.5rem] text-center">
              <div className="text-xl font-heading font-bold text-dark-text-primary">
                {displayQuantity}
              </div>
              <div className="text-xs font-body text-dark-text-secondary">
                {isPending ? "Saving..." : unitLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onIncrement?.(product, selectedLocation);
              }}
              disabled={!canIncrement}
              className="h-9 w-9 rounded-lg border border-dark-border text-lg font-bold text-dark-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        ) : (
          <div className="text-right">
            {hasMergedChipUnits ? (
              <div className="space-y-1 text-xs font-body text-dark-text-secondary">
                {visibleChipUnits.includes("BOX") && (
                  <div>
                    <span className="font-semibold text-dark-text-primary">{chipCounts.boxes}</span>{" "}
                    boxes
                  </div>
                )}
                {visibleChipUnits.includes("BUCKET") && (
                  <div>
                    <span className="font-semibold text-dark-text-primary">{chipCounts.buckets}</span>{" "}
                    buckets
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="text-xl font-heading font-bold text-dark-text-primary">
                  {displayQuantity}
                </div>
                <div className="text-xs font-body text-dark-text-secondary">
                  {unitLabel}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {isChipBlend && !showingAllLocations && isEditable && (
        <div className="mt-2 pt-2 border-t border-dark-border space-y-2">
          <div className={`grid gap-2 text-xs text-dark-text-secondary ${visibleChipUnits.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
            {visibleChipUnits.includes("BOX") && (
              <div className="rounded border border-dark-border px-2 py-1">
                <div className="font-semibold text-dark-text-primary">Boxes</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (chipUnitTargets.BOX) {
                        onAdjustChipUnit?.(chipUnitTargets.BOX, selectedLocation, "BOX", -1);
                      }
                    }}
                    disabled={!chipUnitTargets.BOX}
                    className="h-7 w-7 rounded border border-dark-border font-bold"
                  >
                    -
                  </button>
                  <span className="text-dark-text-primary">{chipCounts.boxes}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (chipUnitTargets.BOX) {
                        onAdjustChipUnit?.(chipUnitTargets.BOX, selectedLocation, "BOX", 1);
                      }
                    }}
                    disabled={!chipUnitTargets.BOX}
                    className="h-7 w-7 rounded border border-dark-border font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            {visibleChipUnits.includes("BUCKET") && (
              <div className="rounded border border-dark-border px-2 py-1">
                <div className="font-semibold text-dark-text-primary">Buckets</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (chipUnitTargets.BUCKET) {
                        onAdjustChipUnit?.(chipUnitTargets.BUCKET, selectedLocation, "BUCKET", -1);
                      }
                    }}
                    disabled={!chipUnitTargets.BUCKET}
                    className="h-7 w-7 rounded border border-dark-border font-bold"
                  >
                    -
                  </button>
                  <span className="text-dark-text-primary">{chipCounts.buckets}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (chipUnitTargets.BUCKET) {
                        onAdjustChipUnit?.(chipUnitTargets.BUCKET, selectedLocation, "BUCKET", 1);
                      }
                    }}
                    disabled={!chipUnitTargets.BUCKET}
                    className="h-7 w-7 rounded border border-dark-border font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showingAllLocations && inventoryByLocation.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dark-border">
          <div className="text-xs text-dark-text-muted font-semibold mb-1">
            By Location:
          </div>
          <div className="space-y-1 text-xs">
            {inventoryByLocation.map((item) => (
              <div key={item.locationId} className="flex items-center justify-between">
                <span className="font-semibold text-dark-text-secondary">{item.name}</span>
                <span className="text-dark-text-muted">
                  {hasMergedChipUnits ? (
                    <>
                      {"boxes" in item && visibleChipUnits.includes("BOX") && (
                        <span className="text-dark-text-primary">
                          {item.boxes} boxes
                        </span>
                      )}
                      {"boxes" in item && "buckets" in item && visibleChipUnits.includes("BOX") && visibleChipUnits.includes("BUCKET") && (
                        <span> / </span>
                      )}
                      {"buckets" in item && visibleChipUnits.includes("BUCKET") && (
                        <span className="text-dark-text-primary">
                          {item.buckets} buckets
                        </span>
                      )}
                    </>
                  ) : "total" in item && isSingleUse ? (
                    <span className="text-dark-text-primary">{item.total}</span>
                  ) : "open" in item && "sealed" in item ? (
                    <>
                      {item.open > 0 && (
                        <span className="text-amber-400">
                          {item.open} open
                          {item.sealed > 0 ? " / " : ""}
                        </span>
                      )}
                      {item.sealed > 0 && (
                        <span className="text-gf-green">{item.sealed} sealed</span>
                      )}
                      {item.open === 0 && item.sealed === 0 && <span>0</span>}
                    </>
                  ) : (
                    <span>0</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-2 text-xs text-alert-red">
          {errorMessage}
        </div>
      )}

      {isReorderNeeded && (
        <div className="mt-1 text-xs text-alert-red font-semibold flex items-center">
          <span className="text-base mr-1">!</span>
          Below reorder point ({product.reorderPoint})
        </div>
      )}
    </div>
  );
});
