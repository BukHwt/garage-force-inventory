import React, { useState, useEffect } from 'react';
import './index.css';

interface Location {
  id: string;
  name: string;
  description: string;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  color?: string;
  unitSize?: string;
  reorderPoint?: number;
  supplierType: string;
  category?: Category;
  inventoryItems: InventoryItem[];
}

interface InventoryItem {
  id: string;
  quantity: number;
  location: Location;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, locationsRes] = await Promise.all([
        fetch('http://localhost:5000/api/products'),
        fetch('http://localhost:5000/api/locations'),
      ]);

      const productsData = await productsRes.json();
      const locationsData = await locationsRes.json();

      setProducts(productsData);
      setLocations(locationsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const getTotalQuantity = (product: Product): number => {
    return product.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getLocationQuantity = (product: Product, locationId: string): number => {
    const item = product.inventoryItems.find(i => i.location.id === locationId);
    return item?.quantity || 0;
  };

  const needsReorder = (product: Product): boolean => {
    if (!product.reorderPoint) return false;
    return getTotalQuantity(product) < product.reorderPoint;
  };

  const getReorderAlerts = (): Product[] => {
    return products.filter(p => needsReorder(p));
  };

  const filteredProducts = selectedLocation === 'all'
    ? products
    : products.filter(p =>
        p.inventoryItems.some(item => item.location.id === selectedLocation)
      );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  const alerts = getReorderAlerts();

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
        <h1 className="text-xl font-bold">Inventory Manager</h1>
        <p className="text-sm opacity-90">Garage Force / SD Concrete Coating</p>
      </header>

      <div className="p-4 space-y-4">
        {/* Reorder Alerts */}
        {alerts.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow">
            <h2 className="font-bold text-red-800 mb-2 flex items-center">
              <span className="text-2xl mr-2">⚠️</span>
              Reorder Alerts ({alerts.length})
            </h2>
            <div className="space-y-2">
              {alerts.map(product => (
                <div key={product.id} className="bg-white p-3 rounded">
                  <div className="font-semibold text-gray-800">{product.name}</div>
                  <div className="text-sm text-gray-600">
                    Current: {getTotalQuantity(product)} | Reorder at: {product.reorderPoint}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {product.supplierType === 'GARAGE_FORCE_REQUIRED' && '🏢 Garage Force Required'}
                    {product.supplierType === 'GARAGE_FORCE_OPTIONAL' && '🏢 Garage Force Optional'}
                    {product.supplierType === 'OPEN_SOURCE' && '🏪 Available Locally'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location Filter */}
        <div className="bg-white p-4 rounded shadow">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Filter by Location
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-base"
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        {/* Inventory List */}
        <div className="space-y-3">
          <h2 className="font-bold text-gray-800 text-lg">
            Inventory {selectedLocation !== 'all' && `- ${locations.find(l => l.id === selectedLocation)?.name}`}
          </h2>

          {filteredProducts.length === 0 ? (
            <div className="bg-white p-8 rounded shadow text-center text-gray-500">
              No products found. Add some products to get started!
            </div>
          ) : (
            filteredProducts.map(product => (
              <div
                key={product.id}
                className={`bg-white p-4 rounded shadow ${
                  needsReorder(product) ? 'border-l-4 border-red-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{product.name}</h3>
                    {product.sku && (
                      <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                    )}
                    {product.category && (
                      <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {product.category.name}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-800">
                      {selectedLocation === 'all'
                        ? getTotalQuantity(product)
                        : getLocationQuantity(product, selectedLocation)
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {product.unitSize || 'units'}
                    </div>
                  </div>
                </div>

                {selectedLocation === 'all' && product.inventoryItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-600 font-semibold mb-1">By Location:</div>
                    <div className="grid grid-cols-3 gap-2">
                      {product.inventoryItems.map(item => (
                        <div key={item.id} className="text-xs">
                          <div className="font-semibold text-gray-700">{item.location.name}</div>
                          <div className="text-gray-600">{item.quantity}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {needsReorder(product) && (
                  <div className="mt-2 text-xs text-red-600 font-semibold">
                    ⚠️ Below reorder point ({product.reorderPoint})
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 shadow-lg">
        <div className="grid grid-cols-4 gap-1 p-2">
          <button className="flex flex-col items-center justify-center p-3 text-blue-600">
            <span className="text-2xl mb-1">📊</span>
            <span className="text-xs font-semibold">Dashboard</span>
          </button>
          <button className="flex flex-col items-center justify-center p-3 text-gray-600 hover:text-blue-600">
            <span className="text-2xl mb-1">➕</span>
            <span className="text-xs">Add</span>
          </button>
          <button className="flex flex-col items-center justify-center p-3 text-gray-600 hover:text-blue-600">
            <span className="text-2xl mb-1">📦</span>
            <span className="text-xs">Products</span>
          </button>
          <button className="flex flex-col items-center justify-center p-3 text-gray-600 hover:text-blue-600">
            <span className="text-2xl mb-1">⚙️</span>
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
