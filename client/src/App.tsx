import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import './index.css';

// Hooks
import { useInventory } from './hooks/useInventory';

// Utils
import { filterProductsByLocation, getProductsNeedingReorder } from './utils/inventory';

// API Services
import { adjustInventory, receiveInventory, transferInventory, useInventory as recordInventoryUsage, unsealInventory } from './api/services/inventory';
import type { ReceiveInventoryRequest, TransferInventoryRequest, UseInventoryRequest } from './api/services/inventory';
import { updateProduct, createProduct, UpdateProductRequest, CreateProductRequest } from './api/services/products';

// Types
import { InventoryItem, Category, Product } from './types';

// Components
import { Header } from './components/layout/Header';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { BottomNavigation } from './components/common/BottomNavigation';
import { ReorderAlerts } from './components/inventory/ReorderAlerts';
import { LocationFilter } from './components/inventory/LocationFilter';
import { ProductList } from './components/inventory/ProductList';
import { InventoryAdjustmentModal } from './components/common/InventoryAdjustmentModal';
import { InventoryActionModal } from './components/inventory/InventoryActionModal';
import { UnsealModal } from './components/inventory/UnsealModal';
import { AddInventoryScreen } from './components/inventory/AddInventoryScreen';
import { ProductCatalogScreen } from './components/products/ProductCatalogScreen';

function App() {
  const { products, locations, loading, error, refetch } = useInventory();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Modal state for inventory adjustments
  const [adjustmentModal, setAdjustmentModal] = useState<{
    isOpen: boolean;
    inventoryItem: InventoryItem | null;
    productName: string;
  }>({
    isOpen: false,
    inventoryItem: null,
    productName: '',
  });

  // Modal state for inventory actions (use open/open sealed)
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    product: Product | null;
    locationId: string;
  }>({
    isOpen: false,
    product: null,
    locationId: '',
  });

  // Modal state for unsealing containers
  const [unsealModal, setUnsealModal] = useState<{
    isOpen: boolean;
    product: Product | null;
    locationId: string;
    maxQuantity: number;
  }>({
    isOpen: false,
    product: null,
    locationId: '',
    maxQuantity: 0,
  });

  // Pre-filled form state for quick actions from Dashboard
  const [preFilledData, setPreFilledData] = useState<{
    mode?: 'receive' | 'transfer' | 'use';
    productId?: string;
    locationId?: string;
  }>({});

  // Scroll position tracking for returning to Dashboard
  const [savedScrollPosition, setSavedScrollPosition] = useState<number>(0);
  const shouldRestoreScroll = useRef<boolean>(false);
  const [previousTab, setPreviousTab] = useState<string>('dashboard');

  // Memoized derived state - only recompute when dependencies change
  const filteredProducts = useMemo(
    () => filterProductsByLocation(products, selectedLocation),
    [products, selectedLocation]
  );

  const reorderAlerts = useMemo(
    () => getProductsNeedingReorder(products),
    [products]
  );

  // Extract unique categories from products
  const categories = useMemo(() => {
    const categoryMap = new Map<string, Category>();
    products.forEach((product) => {
      if (product.category && !categoryMap.has(product.category.id)) {
        categoryMap.set(product.category.id, product.category);
      }
    });
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Stable callback references - prevent unnecessary re-renders of child components
  const handleUseFromOpen = useCallback((productId: string, locationId: string) => {
    // Save current scroll position and tab
    setSavedScrollPosition(window.scrollY || document.documentElement.scrollTop);
    setPreviousTab(activeTab);
    // Set pre-filled data
    setPreFilledData({
      mode: 'use',
      productId,
      locationId,
    });
    // Navigate to Manage Inventory tab
    setActiveTab('add');
  }, [activeTab]);

  const handleProductClick = useCallback((product: Product, locationId: string) => {
    if (product.consumableType === 'SINGLE_USE') {
      handleUseFromOpen(product.id, locationId);
      return;
    }

    setActionModal({
      isOpen: true,
      product,
      locationId,
    });
  }, [handleUseFromOpen]);

  const handleAdjustClick = useCallback((inventoryItem: InventoryItem, productName: string) => {
    setAdjustmentModal({
      isOpen: true,
      inventoryItem,
      productName,
    });
  }, []);

  const handleCloseModal = useCallback(() => {
    setAdjustmentModal({
      isOpen: false,
      inventoryItem: null,
      productName: '',
    });
  }, []);

  const handleAdjustment = useCallback(async (inventoryItemId: string, adjustment: number, status?: 'SEALED' | 'OPEN') => {
    await adjustInventory(inventoryItemId, adjustment, status);
    await refetch();
  }, [refetch]);

  const handleReceiveInventory = useCallback(async (data: ReceiveInventoryRequest) => {
    await receiveInventory(data);
    await refetch();
  }, [refetch]);

  const handleTransferInventory = useCallback(async (data: TransferInventoryRequest) => {
    await transferInventory(data);
    await refetch();
  }, [refetch]);

  const handleUseInventory = useCallback(async (data: UseInventoryRequest) => {
    await recordInventoryUsage(data);
    await refetch();
    // Navigate back to Dashboard after successful usage
    shouldRestoreScroll.current = true;
    setActiveTab('dashboard');
  }, [refetch]);

  const handleTabChange = useCallback((tabId: string) => {
    setPreviousTab(activeTab);
    setActiveTab(tabId);
    // Clear pre-filled data when manually changing tabs
    if (tabId !== 'add') {
      setPreFilledData({});
    }
  }, [activeTab]);

  const handleOpenSealed = useCallback((product: Product, locationId: string) => {
    // Calculate max sealed quantity at this location
    const sealedItems = product.inventoryItems.filter(
      item => item.location.id === locationId && item.status === 'SEALED'
    );
    const maxQuantity = sealedItems.reduce((sum, item) => sum + item.quantity, 0);

    // Open unseal modal
    setUnsealModal({
      isOpen: true,
      product,
      locationId,
      maxQuantity,
    });

    // Close the action modal
    setActionModal({
      isOpen: false,
      product: null,
      locationId: '',
    });
  }, []);

  const handleConfirmUnseal = useCallback(async (quantity: number) => {
    if (!unsealModal.product) return;

    try {
      await unsealInventory({
        productId: unsealModal.product.id,
        locationId: unsealModal.locationId,
        quantity,
      });
      await refetch();
      // Close the unseal modal after successful unsealing
      setUnsealModal({
        isOpen: false,
        product: null,
        locationId: '',
        maxQuantity: 0,
      });
    } catch (error) {
      console.error('Failed to unseal containers:', error);
      // Could show a toast notification here
    }
  }, [unsealModal.product, unsealModal.locationId, refetch]);

  const handleCloseUnsealModal = useCallback(() => {
    setUnsealModal({
      isOpen: false,
      product: null,
      locationId: '',
      maxQuantity: 0,
    });
  }, []);

  const handleCloseActionModal = useCallback(() => {
    setActionModal({
      isOpen: false,
      product: null,
      locationId: '',
    });
  }, []);

  const handleCancelTransaction = useCallback(() => {
    // Clear pre-filled data
    setPreFilledData({});
    // Return to previous tab
    shouldRestoreScroll.current = previousTab === 'dashboard';
    setActiveTab(previousTab);
  }, [previousTab]);

  const handleUpdateProduct = useCallback(async (productId: string, updates: UpdateProductRequest) => {
    await updateProduct(productId, updates);
    await refetch();
  }, [refetch]);

  const handleCreateProduct = useCallback(async (data: { name: string; description: string; sku: string; color: string; unitSize: string; reorderPoint: number | null; supplierType: 'GARAGE_FORCE_REQUIRED' | 'GARAGE_FORCE_OPTIONAL' | 'OPEN_SOURCE'; categoryId: string }) => {
    // Convert null to undefined for API
    const apiData: CreateProductRequest = {
      name: data.name,
      description: data.description || undefined,
      sku: data.sku || undefined,
      color: data.color || undefined,
      unitSize: data.unitSize || undefined,
      reorderPoint: data.reorderPoint ?? undefined,
      supplierType: data.supplierType,
      categoryId: data.categoryId || undefined,
    };
    await createProduct(apiData);
    await refetch();
  }, [refetch]);

  // Restore scroll position when returning to Dashboard
  useEffect(() => {
    if (activeTab === 'dashboard' && shouldRestoreScroll.current) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        window.scrollTo(0, savedScrollPosition);
        shouldRestoreScroll.current = false;
      }, 0);
    } else if (activeTab === 'add') {
      // Always scroll to top when entering Manage tab
      window.scrollTo(0, 0);
    }
  }, [activeTab, savedScrollPosition]);

  // Loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-gf-green-900 border-l-4 border-gf-green p-4 rounded shadow-lg max-w-md">
          <h2 className="font-bold text-gf-green-200 mb-2">Error Loading Data</h2>
          <p className="text-dark-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Dashboard View */}
      {activeTab === 'dashboard' && (
        <>
          <Header />

          <div className="p-4 space-y-4">
            {/* Reorder Alerts */}
            <ReorderAlerts products={reorderAlerts} />

            {/* Location Filter */}
            <LocationFilter
              locations={locations}
              selectedLocation={selectedLocation}
              onLocationChange={setSelectedLocation}
            />

            {/* Product List */}
            <ProductList
              products={filteredProducts}
              selectedLocation={selectedLocation}
              locations={locations}
              onProductClick={handleProductClick}
              onAdjustClick={handleAdjustClick}
            />
          </div>
        </>
      )}

      {/* Add Inventory View */}
      {activeTab === 'add' && (
        <AddInventoryScreen
          products={products}
          locations={locations}
          onReceive={handleReceiveInventory}
          onTransfer={handleTransferInventory}
          onUse={handleUseInventory}
          initialMode={preFilledData.mode}
          initialProductId={preFilledData.productId}
          initialLocationId={preFilledData.locationId}
          onClearPreFilled={() => setPreFilledData({})}
          onCancel={handleCancelTransaction}
        />
      )}

      {/* Products View */}
      {activeTab === 'products' && (
        <ProductCatalogScreen
          products={products}
          categories={categories}
          onUpdateProduct={handleUpdateProduct}
          onCreateProduct={handleCreateProduct}
        />
      )}

      {/* Settings View (placeholder) */}
      {activeTab === 'settings' && (
        <div className="min-h-screen bg-dark-bg">
          <Header />
          <div className="p-4">
            <h2 className="font-heading text-xl font-bold text-dark-text-primary">Settings</h2>
            <p className="font-body text-dark-text-secondary mt-2">Settings coming soon...</p>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Inventory Adjustment Modal */}
      {adjustmentModal.inventoryItem && (
        <InventoryAdjustmentModal
          inventoryItem={adjustmentModal.inventoryItem}
          productName={adjustmentModal.productName}
          isOpen={adjustmentModal.isOpen}
          onClose={handleCloseModal}
          onAdjust={handleAdjustment}
        />
      )}

      {/* Inventory Action Modal (Use Open/Open Sealed) */}
      {actionModal.product && (
        <InventoryActionModal
          product={actionModal.product}
          locationId={actionModal.locationId}
          isOpen={actionModal.isOpen}
          onClose={handleCloseActionModal}
          onUseFromOpen={handleUseFromOpen}
          onOpenSealed={handleOpenSealed}
        />
      )}

      {/* Unseal Modal */}
      {unsealModal.product && (
        <UnsealModal
          product={unsealModal.product}
          locationId={unsealModal.locationId}
          maxQuantity={unsealModal.maxQuantity}
          isOpen={unsealModal.isOpen}
          onClose={handleCloseUnsealModal}
          onConfirm={handleConfirmUnseal}
        />
      )}
    </div>
  );
}

export default App;
