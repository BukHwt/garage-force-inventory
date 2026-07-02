import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Product, Category } from "../../types";
import { ProductEditModal } from "./ProductEditModal";
import { ProductCreateForm, ProductCreateData } from "./ProductCreateForm";
import { UpdateProductRequest } from "../../api/services/products";

type ProductMode = "catalog" | "add";

interface ProductCatalogScreenProps {
  products: Product[];
  categories: Category[];
  onUpdateProduct: (
    productId: string,
    updates: UpdateProductRequest,
  ) => Promise<void>;
  onCreateProduct: (data: ProductCreateData) => Promise<void>;
}

/**
 * Product catalog screen for viewing/editing and creating products
 * Mobile-first design with 44px touch targets
 */
export function ProductCatalogScreen({
  products,
  categories,
  onUpdateProduct,
  onCreateProduct,
}: ProductCatalogScreenProps) {
  const [mode, setMode] = useState<ProductMode>("catalog");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [unitBaseProductId, setUnitBaseProductId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const setProductMode = useCallback((nextMode: ProductMode) => {
    setMode(nextMode);
    if (nextMode !== "catalog") {
      setSelectedProduct(null);
    }
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (
          product.name.toLowerCase().includes(searchLower) ||
          product.sku?.toLowerCase().includes(searchLower) ||
          product.category?.name.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) {
          return false;
        }
        if (showTrackedOnly && !product.isTracked) {
          return false;
        }
        return true;
      }),
    [products, searchTerm, showTrackedOnly],
  );

  const filteredUnitCandidates = useMemo(
    () =>
      products.filter((product) => {
        const searchLower = unitSearchTerm.toLowerCase();
        if (!searchLower) {
          return true;
        }
        return (
          product.name.toLowerCase().includes(searchLower) ||
          product.sku?.toLowerCase().includes(searchLower) ||
          product.category?.name.toLowerCase().includes(searchLower)
        );
      }),
    [products, unitSearchTerm],
  );

  const selectedUnitBaseProduct = useMemo(
    () => products.find((product) => product.id === unitBaseProductId) ?? null,
    [products, unitBaseProductId],
  );

  const unitFormInitialData = useMemo<ProductCreateData | undefined>(() => {
    if (!selectedUnitBaseProduct) {
      return undefined;
    }

    return {
      isTracked: Boolean(selectedUnitBaseProduct.isTracked),
      name: selectedUnitBaseProduct.name,
      description: selectedUnitBaseProduct.description || "",
      sku: "",
      color: selectedUnitBaseProduct.color || "",
      unitSize: "",
      reorderPoint: selectedUnitBaseProduct.reorderPoint ?? null,
      supplierType: selectedUnitBaseProduct.supplierType,
      categoryId: selectedUnitBaseProduct.category?.id || "",
    };
  }, [selectedUnitBaseProduct]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; name: string; products: Product[]; trackedCount: number }
    >();

    for (const product of filteredProducts) {
      const key = product.category?.id || "__uncategorized__";
      const name = product.category?.name || "Uncategorized";
      const existing = groups.get(key) ?? { key, name, products: [], trackedCount: 0 };
      existing.products.push(product);
      if (product.isTracked) {
        existing.trackedCount += 1;
      }
      groups.set(key, existing);
    }

    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === "__uncategorized__") return 1;
      if (b.key === "__uncategorized__") return -1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredProducts]);

  useEffect(() => {
    if (mode !== "catalog") {
      return;
    }
    setCollapsedSections((prev) => {
      const next: Record<string, boolean> = {};
      for (const group of groupedProducts) {
        next[group.key] = prev[group.key] ?? true;
      }
      return next;
    });
  }, [groupedProducts, mode]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleSelectUnitBaseProduct = useCallback((productId: string) => {
    setUnitBaseProductId(productId);
  }, []);

  const handleStartAddUnitFromProduct = useCallback((product: Product) => {
    setUnitBaseProductId(product.id);
    setUnitSearchTerm(product.name);
    setProductMode("add");
  }, [setProductMode]);

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const handleSave = async (updates: UpdateProductRequest) => {
    if (selectedProduct) {
      await onUpdateProduct(selectedProduct.id, updates);
      setSelectedProduct(null);
    }
  };

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

  const getCategoryAccentClasses = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes("coating")) {
      return "border-l-category-coatings-text";
    }
    if (name.includes("chip")) {
      return "border-l-category-chips-text";
    }
    if (name.includes("disposable")) {
      return "border-l-category-disposables-text";
    }
    if (name.includes("equipment")) {
      return "border-l-category-equipment-text";
    }
    return "border-l-gf-green";
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      <div className="bg-dark-card border-b-2 border-gf-green p-4 sticky top-0 z-10">
        <h1 className="font-heading text-2xl font-bold text-dark-text-primary mb-3">
          Product Catalog
        </h1>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setProductMode("catalog")}
            className={`p-3 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === "catalog"
                ? "bg-gf-green-700 border-gf-green text-white"
                : "bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card"
            }`}
            style={{ minHeight: "44px" }}
          >
            <div className="text-sm">View/Edit</div>
          </button>
          <button
            type="button"
            onClick={() => setProductMode("add")}
            className={`p-3 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === "add"
                ? "bg-gf-green-700 border-gf-green text-white"
                : "bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card"
            }`}
            style={{ minHeight: "44px" }}
          >
            <div className="text-sm">Add / Add Unit</div>
          </button>
        </div>

        {mode === "catalog" ? (
          <div className="space-y-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-gf-green"
              style={{ minHeight: "44px" }}
            />
            <button
              type="button"
              onClick={() => setShowTrackedOnly((prev) => !prev)}
              className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                showTrackedOnly
                  ? "border-gf-green bg-gf-green-900 text-gf-green-200"
                  : "border-dark-border text-dark-text-secondary active:bg-gf-charcoal-700"
              }`}
              style={{ minHeight: "44px" }}
            >
              {showTrackedOnly ? "Showing Tracked Only" : "Show Tracked Only"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-dark-text-secondary">
            Create a brand-new product or pick an existing catalog item to add another unit size.
          </p>
        )}
      </div>

      <div className="p-4">
        {mode === "catalog" && (
          <>
            <div className="text-sm text-dark-text-secondary mb-3">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "product" : "products"}
              {showTrackedOnly ? " tracked" : ""}
            </div>

            <div className="flex items-center justify-end gap-2 mb-3">
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

            <div className="space-y-3">
              {filteredProducts.length === 0 ? (
                <div className="bg-dark-card p-6 rounded-lg text-center">
                  <p className="text-dark-text-muted">No products found</p>
                </div>
              ) : (
                groupedProducts.map((group) => (
                  <section
                    key={group.key}
                    className="bg-dark-card border border-dark-border rounded-lg shadow-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(group.key)}
                      className={`w-full px-3 py-2 flex items-center justify-between text-left border-l-4 hover:bg-gf-charcoal-700 transition-colors duration-150 ${getCategoryAccentClasses(group.name)}`}
                      aria-expanded={!collapsedSections[group.key]}
                    >
                      <div className="pr-2">
                        <h3 className="font-heading font-semibold text-sm text-dark-text-primary truncate">
                          {group.name}
                        </h3>
                        {group.trackedCount > 0 && (
                          <p className="text-xs text-gf-green mt-0.5">
                            {group.trackedCount} tracked
                          </p>
                        )}
                      </div>
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
                          <div
                            key={product.id}
                            onClick={() => handleProductClick(product)}
                            className={`bg-dark-card p-3 rounded-lg shadow-lg border cursor-pointer active:bg-gf-charcoal-700 transition-colors ${
                              product.isTracked
                                ? "border-l-4 border-l-gf-green border-dark-border"
                                : "border-dark-border"
                            }`}
                            style={{ minHeight: "44px" }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-heading font-semibold text-sm text-dark-text-primary">
                                    {product.name}
                                  </h3>
                                  {product.isTracked && (
                                    <span className="inline-block px-2 py-0.5 text-[10px] rounded font-semibold bg-gf-green-900 text-gf-green-200 border border-gf-green-700">
                                      Tracked
                                    </span>
                                  )}
                                </div>
                                {product.sku && (
                                  <p className="text-xs text-dark-text-muted mt-1">
                                    SKU: {product.sku}
                                  </p>
                                )}
                                {product.description && (
                                  <p className="text-sm text-dark-text-secondary mt-1 line-clamp-2">
                                    {product.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {product.color && (
                                    <span className="inline-block px-2 py-1 text-xs rounded font-semibold bg-gf-charcoal-700 text-dark-text-secondary">
                                      {product.color}
                                    </span>
                                  )}
                                  {product.unitSize && (
                                    <span className="inline-block px-2 py-1 text-xs rounded font-semibold bg-gf-charcoal-700 text-dark-text-secondary">
                                      {product.unitSize}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right ml-3 flex flex-col items-end gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleStartAddUnitFromProduct(product);
                                  }}
                                  className="px-2 py-1 text-xs rounded border border-dark-border text-dark-text-secondary active:bg-gf-charcoal-700"
                                >
                                  Add Unit
                                </button>
                                <span className="text-sm text-dark-text-secondary">Edit</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))
              )}
            </div>
          </>
        )}

        {mode === "add" && (
          <div className="space-y-4">
            <div className="bg-dark-card rounded-lg p-4 border border-dark-border">
              <h2 className="font-heading text-lg font-semibold text-dark-text-primary">
                Add Unit Size To Existing Product
              </h2>
              <p className="text-sm text-dark-text-secondary mt-1">
                Pick an existing catalog item. The form below will copy the shared fields and let you enter a new unit size and SKU.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={unitSearchTerm}
                  onChange={(e) => setUnitSearchTerm(e.target.value)}
                  placeholder="Search for an existing product..."
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-gf-green"
                  style={{ minHeight: "44px" }}
                />
                <select
                  value={unitBaseProductId}
                  onChange={(e) => handleSelectUnitBaseProduct(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green"
                  style={{ minHeight: "44px" }}
                >
                  <option value="">Select an existing product</option>
                  {filteredUnitCandidates
                    .slice()
                    .sort((left, right) => left.name.localeCompare(right.name))
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.unitSize ? ` | ${product.unitSize}` : ""}
                        {product.sku ? ` | SKU: ${product.sku}` : ""}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {selectedUnitBaseProduct && unitFormInitialData && (
              <ProductCreateForm
                categories={categories}
                onSubmit={onCreateProduct}
                initialData={unitFormInitialData}
                heading={`New unit size for ${selectedUnitBaseProduct.name}`}
                description="Shared product details are prefilled from the selected catalog item. Change the unit size and SKU for the new variant before saving."
                submitLabel="Create Unit Variant"
                successMessage="Unit variant created successfully."
              />
            )}

            <ProductCreateForm
              categories={categories}
              onSubmit={onCreateProduct}
              heading="Add Brand-New Product"
              description="Use this when the item does not already exist in the catalog."
              submitLabel="Create Product"
              successMessage="Product created successfully."
            />
          </div>
        )}
      </div>

      {selectedProduct && (
        <ProductEditModal
          product={selectedProduct}
          categories={categories}
          isOpen={!!selectedProduct}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
