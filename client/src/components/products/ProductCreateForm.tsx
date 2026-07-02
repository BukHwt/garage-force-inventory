import React, { useEffect, useMemo, useState } from 'react';
import { Category } from '../../types';

export interface ProductCreateData {
  isTracked: boolean;
  name: string;
  description: string;
  sku: string;
  color: string;
  unitSize: string;
  reorderPoint: number | null;
  supplierType: 'GARAGE_FORCE_REQUIRED' | 'GARAGE_FORCE_OPTIONAL' | 'OPEN_SOURCE';
  categoryId: string;
}

interface ProductCreateFormProps {
  categories: Category[];
  onSubmit: (data: ProductCreateData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<ProductCreateData>;
  submitLabel?: string;
  successMessage?: string;
  heading?: string;
  description?: string;
}

const EMPTY_FORM_DATA: ProductCreateData = {
  isTracked: false,
  name: '',
  description: '',
  sku: '',
  color: '',
  unitSize: '',
  reorderPoint: null,
  supplierType: 'OPEN_SOURCE',
  categoryId: '',
};

export function ProductCreateForm({
  categories,
  onSubmit,
  onCancel,
  initialData,
  submitLabel = 'Create Product',
  successMessage = 'Product created successfully!',
  heading,
  description,
}: ProductCreateFormProps) {
  const resolvedInitialData = useMemo<ProductCreateData>(
    () => ({
      ...EMPTY_FORM_DATA,
      ...initialData,
    }),
    [initialData],
  );
  const [formData, setFormData] = useState<ProductCreateData>(resolvedInitialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setFormData(resolvedInitialData);
    setError(null);
    setShowSuccess(false);
  }, [resolvedInitialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowSuccess(false);

    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        isTracked: formData.isTracked,
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        sku: formData.sku.trim() || '',
        color: formData.color.trim() || '',
        unitSize: formData.unitSize.trim() || '',
        reorderPoint: formData.reorderPoint === null ? null : formData.reorderPoint,
        supplierType: formData.supplierType,
        categoryId: formData.categoryId || '',
      });

      setFormData(resolvedInitialData);
      setIsSubmitting(false);
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    field: keyof ProductCreateData,
    value: string | number | boolean | null,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (showSuccess) {
      setShowSuccess(false);
    }
  };

  return (
    <div className="bg-dark-card rounded-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {heading && (
          <div>
            <h2 className="font-heading text-lg font-semibold text-dark-text-primary">
              {heading}
            </h2>
            {description && (
              <p className="text-sm text-dark-text-secondary mt-1">{description}</p>
            )}
          </div>
        )}

        {showSuccess && !error && !isSubmitting && (
          <div className="bg-gf-green bg-opacity-20 border-l-4 border-gf-green p-3 rounded">
            <p className="text-gf-green text-sm font-semibold">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-alert-red bg-opacity-20 border-l-4 border-alert-red p-3 rounded">
            <p className="text-alert-red text-sm font-semibold">{error}</p>
          </div>
        )}

        <div className="bg-dark-bg border border-dark-border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-dark-text-primary">
              Track this product
            </p>
            <button
              type="button"
              onClick={() => handleChange('isTracked', !formData.isTracked)}
              disabled={isSubmitting || ((formData.reorderPoint ?? 0) > 0 && formData.isTracked)}
              className={`px-3 py-1.5 rounded border text-sm font-semibold transition-colors ${
                formData.isTracked
                  ? 'border-gf-green text-gf-green'
                  : 'border-dark-border text-dark-text-muted'
              } ${((formData.reorderPoint ?? 0) > 0 && formData.isTracked) ? 'opacity-50 cursor-not-allowed' : 'active:bg-gf-charcoal-700'}`}
            >
              {formData.isTracked ? 'Tracked' : 'Untracked'}
            </button>
          </div>
          {(formData.reorderPoint ?? 0) > 0 && (
            <p className="text-xs text-dark-text-muted mt-1">
              Reorder point above 0 requires tracking.
            </p>
          )}
        </div>

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
            placeholder="e.g., gallon, 40 lb box, bucket"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-dark-text-primary mb-2">
            Reorder Point
          </label>
          <input
            type="number"
            value={formData.reorderPoint ?? ''}
            onChange={(e) => {
              const nextReorderPoint = e.target.value === '' ? null : parseInt(e.target.value, 10);
              handleChange('reorderPoint', nextReorderPoint);
              if ((nextReorderPoint ?? 0) > 0) {
                handleChange('isTracked', true);
              }
            }}
            disabled={isSubmitting}
            min={0}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green disabled:opacity-50"
            style={{ minHeight: '44px' }}
            placeholder="Minimum quantity before reorder"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-dark-text-primary mb-2">
            Supplier Type
          </label>
          <select
            value={formData.supplierType}
            onChange={(e) =>
              handleChange(
                'supplierType',
                e.target.value as ProductCreateData['supplierType'],
              )
            }
            disabled={isSubmitting}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green disabled:opacity-50"
            style={{ minHeight: '44px' }}
          >
            <option value="GARAGE_FORCE_REQUIRED">Garage Force Required</option>
            <option value="GARAGE_FORCE_OPTIONAL">Garage Force Optional</option>
            <option value="OPEN_SOURCE">Open Source</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 bg-dark-bg border-2 border-dark-border text-dark-text-secondary font-heading font-semibold py-3 rounded-lg active:bg-dark-card transition-colors disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-gf-green border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '44px' }}
          >
            {isSubmitting ? 'Creating...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
