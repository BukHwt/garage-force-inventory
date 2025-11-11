import React, { useState, useMemo, useCallback } from 'react';
import './index.css';

// Hooks
import { useInventory } from './hooks/useInventory';

// Utils
import { filterProductsByLocation, getProductsNeedingReorder } from './utils/inventory';

// API Services
import { adjustInventory, receiveInventory, transferInventory, useInventory as useInventoryAPI } from './api/services/inventory';
import type { ReceiveInventoryRequest, TransferInventoryRequest, UseInventoryRequest } from './api/services/inventory';

// Types
import { InventoryItem } from './types';

// Components
import { Header } from './components/layout/Header';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { BottomNavigation } from './components/common/BottomNavigation';
import { ReorderAlerts } from './components/inventory/ReorderAlerts';
import { LocationFilter } from './components/inventory/LocationFilter';
import { ProductList } from './components/inventory/ProductList';
import { InventoryAdjustmentModal } from './components/common/InventoryAdjustmentModal';
import { AddInventoryScreen } from './components/inventory/AddInventoryScreen';

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

  // Memoized derived state - only recompute when dependencies change
  const filteredProducts = useMemo(
    () => filterProductsByLocation(products, selectedLocation),
    [products, selectedLocation]
  );

  const reorderAlerts = useMemo(
    () => getProductsNeedingReorder(products),
    [products]
  );

  // Stable callback references - prevent unnecessary re-renders of child components
  const handleProductClick = useCallback((productId: string) => {
    console.log('Product clicked:', productId);
    // Future: Navigate to product detail view
  }, []);

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

  const handleAdjustment = useCallback(async (inventoryItemId: string, adjustment: number) => {
    await adjustInventory(inventoryItemId, adjustment);
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
    await useInventoryAPI(data);
    await refetch();
  }, [refetch]);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

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
        />
      )}

      {/* Products View (placeholder) */}
      {activeTab === 'products' && (
        <div className="min-h-screen bg-dark-bg">
          <Header />
          <div className="p-4">
            <h2 className="font-heading text-xl font-bold text-dark-text-primary">Products</h2>
            <p className="font-body text-dark-text-secondary mt-2">Product management coming soon...</p>
          </div>
        </div>
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
    </div>
  );
}

export default App;
