import React, { useState } from 'react';
import './index.css';

// Hooks
import { useInventory } from './hooks/useInventory';

// Utils
import { filterProductsByLocation, getProductsNeedingReorder } from './utils/inventory';

// API Services
import { adjustInventory } from './api/services/inventory';

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

function App() {
  const { products, locations, loading, error, refetch } = useInventory();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

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

  // Derived state - computed from products and filter
  const filteredProducts = filterProductsByLocation(products, selectedLocation);
  const reorderAlerts = getProductsNeedingReorder(products);

  // Handle product card clicks (placeholder for future detail view)
  const handleProductClick = (productId: string) => {
    console.log('Product clicked:', productId);
    // Future: Navigate to product detail view
  };

  // Handle opening adjustment modal
  const handleAdjustClick = (inventoryItem: InventoryItem, productName: string) => {
    setAdjustmentModal({
      isOpen: true,
      inventoryItem,
      productName,
    });
  };

  // Handle closing adjustment modal
  const handleCloseModal = () => {
    setAdjustmentModal({
      isOpen: false,
      inventoryItem: null,
      productName: '',
    });
  };

  // Handle inventory adjustment
  const handleAdjustment = async (inventoryItemId: string, adjustment: number) => {
    await adjustInventory(inventoryItemId, adjustment);
    await refetch(); // Refresh the data after adjustment
  };

  // Handle navigation tab changes (placeholder for future routing)
  const handleTabChange = (tabId: string) => {
    console.log('Tab changed:', tabId);
    // Future: Implement routing
  };

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

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="dashboard"
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
