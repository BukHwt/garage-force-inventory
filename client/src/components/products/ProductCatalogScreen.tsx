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
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(searchLower) ||
          product.sku?.toLowerCase().includes(searchLower) ||
          product.category?.name.toLowerCase().includes(searchLower)
        );
      }),
    [products, searchTerm],
  );

  const groupedProducts = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; name: string; products: Product[] }
    >();

    for (const product of filteredProducts) {
      const key = product.category?.id || "__uncategorized__";
      const name = product.category?.name || "Uncategorized";
      const existing = groups.get(key) ?? { key, name, products: [] };
      existing.products.push(product);
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

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      <div className="bg-dark-card border-b-2 border-gf-green p-4 sticky top-0 z-10">
        <h1 className="font-heading text-2xl font-bold text-dark-text-primary mb-3">
          Product Catalog
        </h1>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setMode("catalog")}
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
            onClick={() => setMode("add")}
            className={`p-3 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === "add"
                ? "bg-gf-green-700 border-gf-green text-white"
                : "bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card"
            }`}
            style={{ minHeight: "44px" }}
          >
            <div className="text-sm">Add New</div>
          </button>
        </div>

        {mode === "catalog" && (
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-gf-green"
            style={{ minHeight: "44px" }}
          />
        )}
      </div>

      <div className="p-4">
        {mode === "catalog" && (
          <>
            <div className="text-sm text-dark-text-secondary mb-3">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "product" : "products"}
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
                          <div
                            key={product.id}
                            onClick={() => handleProductClick(product)}
                            className="bg-dark-card p-3 rounded-lg shadow-lg border border-dark-border cursor-pointer active:bg-gf-charcoal-700 transition-colors"
                            style={{ minHeight: "44px" }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-heading font-semibold text-sm text-dark-text-primary">
                                  {product.name}
                                </h3>
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
                                <span className="text-sm text-dark-text-secondary">
                                  Edit
                                </span>
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
          <ProductCreateForm
            categories={categories}
            onSubmit={onCreateProduct}
          />
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
