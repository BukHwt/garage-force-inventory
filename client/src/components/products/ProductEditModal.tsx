import React, { useState, useEffect } from 'react';
import { Product, Category } from '../../types';
import { UpdateProductRequest } from '../../api/services/products';

interface ProductEditModalProps {
  product: Product;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: UpdateProductRequest) => Promise<void>;
}

export interface ProductUpdateData {
  name: string;
  description: string;
  sku: string;
  color: string;
  unitSize: string;
  reorderPoint: number | null;
  supplierType: 'GARAGE_FORCE_REQUIRED' | 'GARAGE_FORCE_OPTIONAL' | 'OPEN_SOURCE';
  categoryId: string;
}

/**
 * Modal form for editing product details
 * Mobile-first design with 44px touch targets
 */
export function ProductEditModal({
  product,
  categories,
  isOpen,
  onClose,
  onSave,
}: ProductEditModalProps) {
  const [formData, setFormData] = useState<ProductUpdateData>({
    name: product.name,
    description: product.description || '',
    sku: product.sku || '',
    color: product.color || '',
    unitSize: product.unitSize || '',
    reorderPoint: product.reorderPoint || null,
    supplierType: product.supplierType,
    categoryId: product.category?.id || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when product changes
  useEffect(() => {
    setFormData({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      color: product.color || '',
      unitSize: product.unitSize || '',
      reorderPoint: product.reorderPoint || null,
      supplierType: product.supplierType,
      categoryId: product.category?.id || '',
    });
    setError(null);
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        color: formData.color.trim() || undefined,
        unitSize: formData.unitSize.trim() || undefined,
        reorderPoint: formData.reorderPoint || undefined,
        supplierType: formData.supplierType,
        categoryId: formData.categoryId || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    field: keyof ProductUpdateData,
    value: string | number | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end sm:items-center justify-center z-50">
      <div className="bg-dark-card w-full max-h-[90vh] sm:max-w-2xl sm:rounded-lg rounded-t-lg overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-card border-b-2 border-gf-green p-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-dark-text-primary">
            Edit Product
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-dark-text-secondary hover:text-gf-green transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-alert-red bg-opacity-20 border-l-4 border-alert-red p-3 rounded">
              <p className="text-alert-red text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green disabled:opacity-50"
              style={{ minHeight: '44px' }}
              placeholder="Enter product name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green disabled:opacity-50 resize-none"
              placeholder="Enter product description"
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              SKU
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green disabled:opacity-50"
              style={{ minHeight: '44px' }}
              placeholder="Enter SKU"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              Category
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              Color
            </label>
            <input
              type="text"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green disabled:opacity-50"
              style={{ minHeight: '44px' }}
              placeholder="e.g., Gray, Tan, Clear"
            />
          </div>

          {/* Unit Size */}
          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              Unit Size
            </label>
            <input
              type="text"
              value={formData.unitSize}
              onChange={(e) => handleChange('unitSize', e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green disabled:opacity-50"
              style={{ minHeight: '44px' }}
              placeholder="e.g., gallon, box, unit"
            />
          </div>

          {/* Reorder Point */}
          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              Reorder Point
            </label>
            <input
              type="number"
              value={formData.reorderPoint || ''}
              onChange={(e) =>
                handleChange(
                  'reorderPoint',
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
              disabled={isSubmitting}
              min={0}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green disabled:opacity-50"
              style={{ minHeight: '44px' }}
              placeholder="Minimum quantity before reorder"
            />
          </div>

          {/* Supplier Type */}
          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              Supplier Type
            </label>
            <select
              value={formData.supplierType}
              onChange={(e) =>
                handleChange(
                  'supplierType',
                  e.target.value as ProductUpdateData['supplierType']
                )
              }
              disabled={isSubmitting}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              <option value="GARAGE_FORCE_REQUIRED">
                Garage Force Required
              </option>
              <option value="GARAGE_FORCE_OPTIONAL">
                Garage Force Optional
              </option>
              <option value="OPEN_SOURCE">Open Source</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-dark-bg border-2 border-dark-border text-dark-text-secondary font-heading font-semibold py-3 rounded-lg active:bg-dark-card transition-colors disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gf-green border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '44px' }}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
