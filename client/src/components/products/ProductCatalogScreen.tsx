import React, { useState } from 'react';
import { Product, Category } from '../../types';
import { ProductEditModal } from './ProductEditModal';
import { UpdateProductRequest } from '../../api/services/products';

interface ProductCatalogScreenProps {
  products: Product[];
  categories: Category[];
  onUpdateProduct: (productId: string, updates: UpdateProductRequest) => Promise<void>;
}

/**
 * Product catalog screen for viewing and editing product details
 * Mobile-first design with 44px touch targets
 */
export function ProductCatalogScreen({
  products,
  categories,
  onUpdateProduct,
}: ProductCatalogScreenProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter products by search term
  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.category?.name.toLowerCase().includes(searchLower)
    );
  });

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const handleSave = async (updates: Partial<Product>) => {
    if (selectedProduct) {
      await onUpdateProduct(selectedProduct.id, updates);
      setSelectedProduct(null);
    }
  };

  // Get category-specific colors
  const getCategoryColors = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('coating')) {
      return 'bg-category-coatings-bg text-category-coatings-text';
    } else if (name.includes('chip')) {
      return 'bg-category-chips-bg text-category-chips-text';
    } else if (name.includes('disposable')) {
      return 'bg-category-disposables-bg text-category-disposables-text';
    } else if (name.includes('equipment')) {
      return 'bg-category-equipment-bg text-category-equipment-text';
    }
    return 'bg-gf-charcoal-600 text-dark-text-primary';
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Header */}
      <div className="bg-dark-card border-b-2 border-gf-green p-4 sticky top-0 z-10">
        <h1 className="font-heading text-2xl font-bold text-dark-text-primary mb-3">
          Product Catalog
        </h1>

        {/* Search Input */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search products..."
          className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-gf-green"
          style={{ minHeight: '44px' }}
        />
      </div>

      <div className="p-4">
        {/* Product count */}
        <div className="text-sm text-dark-text-secondary mb-3">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
        </div>

        {/* Product List */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-dark-card p-6 rounded-lg text-center">
              <p className="text-dark-text-muted">No products found</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-dark-card p-4 rounded-lg shadow-lg border border-dark-border cursor-pointer active:bg-gf-charcoal-700 transition-colors"
                style={{ minHeight: '44px' }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-dark-text-primary">
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
                      {product.category && (
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded font-semibold ${getCategoryColors(
                            product.category.name
                          )}`}
                        >
                          {product.category.name}
                        </span>
                      )}
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
                  <div className="text-right ml-3">
                    <span className="text-2xl">✏️</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
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
