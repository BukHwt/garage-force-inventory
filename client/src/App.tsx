import React, { useState } from 'react';
import './index.css';

// Hooks
import { useInventory } from './hooks/useInventory';

// Utils
import { filterProductsByLocation, getProductsNeedingReorder } from './utils/inventory';

// Components
import { Header } from './components/layout/Header';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { BottomNavigation } from './components/common/BottomNavigation';
import { ReorderAlerts } from './components/inventory/ReorderAlerts';
import { LocationFilter } from './components/inventory/LocationFilter';
import { ProductList } from './components/inventory/ProductList';

function App() {
  const { products, locations, loading, error } = useInventory();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Derived state - computed from products and filter
  const filteredProducts = filterProductsByLocation(products, selectedLocation);
  const reorderAlerts = getProductsNeedingReorder(products);

  // Handle product card clicks (placeholder for future detail view)
  const handleProductClick = (productId: string) => {
    console.log('Product clicked:', productId);
    // Future: Navigate to product detail view
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow max-w-md">
          <h2 className="font-bold text-red-800 mb-2">Error Loading Data</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
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
        />
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="dashboard"
        onTabChange={handleTabChange}
      />
    </div>
  );
}

export default App;
