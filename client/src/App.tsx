import React, { useState, useMemo, useCallback, useEffect } from 'react';
import './index.css';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import { useInventory } from './hooks/useInventory';
import { useAuth } from './context/AuthContext';
import { filterProductsByLocation, getProductsNeedingReorder, getLocationQuantity, getTotalQuantity } from './utils/inventory';
import { updateInventoryStock, receiveInventory, transferInventory } from './api/services/inventory';
import type { ReceiveInventoryRequest, TransferInventoryRequest } from './api/services/inventory';
import { updateProduct, createProduct, UpdateProductRequest, CreateProductRequest } from './api/services/products';
import { Category, Product } from './types';
import { Header } from './components/layout/Header';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { BottomNavigation } from './components/common/BottomNavigation';
import { ReorderAlerts } from './components/inventory/ReorderAlerts';
import { LocationFilter } from './components/inventory/LocationFilter';
import { ProductList } from './components/inventory/ProductList';
import { AddInventoryScreen } from './components/inventory/AddInventoryScreen';
import { ProductCatalogScreen } from './components/products/ProductCatalogScreen';
import { LoginModal } from './components/auth/LoginModal';
import { MoreScreen } from './components/more/MoreScreen';
import { TransactionLogScreen } from './components/more/TransactionLogScreen';
import { LocationsScreen } from './components/more/LocationsScreen';
import { NeighborInventoryScreen } from './components/more/NeighborInventoryScreen';
import { SharedOrdersScreen } from './components/more/SharedOrdersScreen';

type TabId = 'dashboard' | 'add' | 'products' | 'more';
type ManagePrefill = {
  mode?: 'receive' | 'transfer';
  productId?: string;
  locationId?: string;
};

const TAB_TO_PATH: Record<TabId, string> = {
  dashboard: '/dashboard',
  add: '/manage',
  products: '/products',
  more: '/more',
};

const getTabFromPath = (pathname: string): TabId => {
  const normalizedPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (normalizedPath === '/' || normalizedPath === '') {
    return 'dashboard';
  }
  if (normalizedPath.startsWith('/manage')) {
    return 'add';
  }
  if (normalizedPath.startsWith('/products')) {
    return 'products';
  }
  if (
    normalizedPath.startsWith('/more') ||
    normalizedPath.startsWith('/transactions') ||
    normalizedPath.startsWith('/locations') ||
    normalizedPath.startsWith('/neighbor-inventory') ||
    normalizedPath.startsWith('/shared-orders')
  ) {
    return 'more';
  }
  return 'dashboard';
};

const buildManagePath = (prefill?: ManagePrefill) => {
  const params = new URLSearchParams();
  if (prefill?.mode) {
    params.set('mode', prefill.mode);
  }
  if (prefill?.productId) {
    params.set('productId', prefill.productId);
  }
  if (prefill?.locationId) {
    params.set('locationId', prefill.locationId);
  }
  const query = params.toString();
  return query ? `${TAB_TO_PATH.add}?${query}` : TAB_TO_PATH.add;
};

const parseManageSearch = (search: string): ManagePrefill => {
  if (!search) {
    return {};
  }
  const params = new URLSearchParams(search);
  const modeParam = params.get('mode');
  const allowedModes: ManagePrefill['mode'][] = ['receive', 'transfer'];
  const mode = allowedModes.includes(modeParam as ManagePrefill['mode'])
    ? (modeParam as ManagePrefill['mode'])
    : undefined;
  const productId = params.get('productId') || undefined;
  const locationId = params.get('locationId') || undefined;
  const next: ManagePrefill = {};
  if (mode) next.mode = mode;
  if (productId) next.productId = productId;
  if (locationId) next.locationId = locationId;
  return next;
};

const isSamePrefill = (a: ManagePrefill, b: ManagePrefill) =>
  a.mode === b.mode && a.productId === b.productId && a.locationId === b.locationId;

function applyStockOverrides(products: Product[], stockOverrides: Record<string, number>, locations: { id: string; name: string; description?: string | null }[]) {
  return products.map((product) => {
    let inventoryItems = product.inventoryItems;
    let changed = false;

    for (const [key, quantity] of Object.entries(stockOverrides)) {
      const [productId, locationId] = key.split(':');
      if (productId !== product.id) {
        continue;
      }

      changed = true;
      const existing = inventoryItems.find((item) => item.location.id === locationId);

      if (quantity <= 0) {
        inventoryItems = inventoryItems.filter((item) => item.location.id !== locationId);
        continue;
      }

      if (existing) {
        inventoryItems = inventoryItems.map((item) =>
          item.location.id === locationId ? { ...item, quantity } : item,
        );
        continue;
      }
    }

    if (!changed) {
      return product;
    }

    for (const [key, quantity] of Object.entries(stockOverrides)) {
      const [productId, locationId] = key.split(':');
      if (productId !== product.id || quantity <= 0) {
        continue;
      }
      const hasExisting = inventoryItems.some((item) => item.location.id === locationId);
      if (hasExisting) {
        continue;
      }
      const fallbackLocation =
        product.inventoryItems.find((item) => item.location.id === locationId)?.location ||
        locations.find((location) => location.id === locationId);
      if (!fallbackLocation) {
        continue;
      }
      inventoryItems = inventoryItems.concat({
        id: key,
        quantity,
        location: fallbackLocation,
      });
    }

    return {
      ...product,
      inventoryItems,
    };
  });
}

function App() {
  const { user, isReady: authReady } = useAuth();
  const isAuthenticated = Boolean(user);
  const isViewer = user?.role === 'VIEWER';
  const { products, locations, loading, error, refetch } = useInventory({ enabled: isAuthenticated });
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [preFilledData, setPreFilledData] = useState<ManagePrefill>({});
  const [stockOverrides, setStockOverrides] = useState<Record<string, number>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorByKey, setErrorByKey] = useState<Record<string, string | null>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = getTabFromPath(location.pathname);
  const navigateToManage = useCallback(
    (prefill?: ManagePrefill, options?: { replace?: boolean }) => {
      const path = buildManagePath(prefill);
      navigate(path, { replace: options?.replace });
    },
    [navigate],
  );

  const handleClearPreFilled = useCallback(() => {
    setPreFilledData({});
    if (location.pathname.startsWith(TAB_TO_PATH.add) && location.search) {
      navigateToManage(undefined, { replace: true });
    }
  }, [location.pathname, location.search, navigateToManage]);

  useEffect(() => {
    if (currentTab !== 'add') {
      return;
    }
    const nextPrefill = parseManageSearch(location.search);
    setPreFilledData((prev) => (isSamePrefill(prev, nextPrefill) ? prev : nextPrefill));
  }, [currentTab, location.search]);

  useEffect(() => {
    if (isViewer && currentTab === 'add') {
      navigate(TAB_TO_PATH.dashboard, { replace: true });
    }
  }, [isViewer, currentTab, navigate]);

  const displayProducts = useMemo(
    () => applyStockOverrides(products, stockOverrides, locations),
    [locations, products, stockOverrides],
  );

  const dashboardVisibleProducts = useMemo(
    () =>
      displayProducts.filter((product) => {
        const hasInventory = getTotalQuantity(product) > 0;
        const hasReorderPoint = (product.reorderPoint ?? 0) > 0;
        return Boolean(product.isTracked || hasInventory || hasReorderPoint);
      }),
    [displayProducts],
  );

  const filteredProducts = useMemo(
    () => filterProductsByLocation(dashboardVisibleProducts, selectedLocation),
    [dashboardVisibleProducts, selectedLocation],
  );

  const reorderAlerts = useMemo(
    () => getProductsNeedingReorder(dashboardVisibleProducts),
    [dashboardVisibleProducts],
  );

  const categories = useMemo(() => {
    const categoryMap = new Map<string, Category>();
    products.forEach((product) => {
      if (product.category && !categoryMap.has(product.category.id)) {
        categoryMap.set(product.category.id, product.category);
      }
    });
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const handleStockChange = useCallback(async (product: Product, locationId: string, delta: number) => {
    if (locationId === 'all') {
      return;
    }

    const key = `${product.id}:${locationId}`;
    const currentQuantity = getLocationQuantity(product, locationId);
    const nextQuantity = Math.max(0, currentQuantity + delta);

    setErrorByKey((prev) => ({ ...prev, [key]: null }));
    setPendingKey(key);
    setStockOverrides((prev) => ({ ...prev, [key]: nextQuantity }));

    try {
      await updateInventoryStock({
        productId: product.id,
        locationId,
        quantity: nextQuantity,
      });
      await refetch();
      setStockOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      setStockOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setErrorByKey((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : 'Unable to update stock',
      }));
    } finally {
      setPendingKey((prev) => (prev === key ? null : prev));
    }
  }, [refetch]);

  const handleIncrement = useCallback((product: Product, locationId: string) => {
    void handleStockChange(product, locationId, 1);
  }, [handleStockChange]);

  const handleDecrement = useCallback((product: Product, locationId: string) => {
    void handleStockChange(product, locationId, -1);
  }, [handleStockChange]);

  const handleReceiveInventory = useCallback(async (data: ReceiveInventoryRequest) => {
    await receiveInventory(data);
    await refetch();
  }, [refetch]);

  const handleTransferInventory = useCallback(async (data: TransferInventoryRequest) => {
    await transferInventory(data);
    await refetch();
  }, [refetch]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (tabId === 'add' && isViewer) {
        return;
      }
      const typedTab = (['dashboard', 'add', 'products', 'more'].includes(tabId)
        ? (tabId as TabId)
        : 'dashboard');
      if (typedTab === currentTab) {
        if (typedTab === 'more' && location.pathname !== TAB_TO_PATH.more) {
          navigate(TAB_TO_PATH.more);
        }
        return;
      }
      if (typedTab === 'add') {
        navigateToManage();
        return;
      }
      const targetPath = TAB_TO_PATH[typedTab] ?? TAB_TO_PATH.dashboard;
      navigate(targetPath);
    },
    [currentTab, isViewer, location.pathname, navigate, navigateToManage],
  );

  const handleReceiveFromAlert = useCallback((product: Product) => {
    if (isViewer || !locations.length) {
      return;
    }
    const nextPrefill: ManagePrefill = {
      mode: 'receive',
      productId: product.id,
      locationId: selectedLocation !== 'all' ? selectedLocation : undefined,
    };
    setPreFilledData(nextPrefill);
    navigateToManage(nextPrefill);
  }, [isViewer, locations.length, navigateToManage, selectedLocation]);

  const handleCancelTransaction = useCallback(() => {
    handleClearPreFilled();
    navigate(TAB_TO_PATH.dashboard);
  }, [handleClearPreFilled, navigate]);

  const handleUpdateProduct = useCallback(async (productId: string, updates: UpdateProductRequest) => {
    await updateProduct(productId, updates);
    await refetch();
  }, [refetch]);

  const handleCreateProduct = useCallback(async (data: { isTracked: boolean; name: string; description: string; sku: string; color: string; unitSize: string; reorderPoint: number | null; supplierType: 'GARAGE_FORCE_REQUIRED' | 'GARAGE_FORCE_OPTIONAL' | 'OPEN_SOURCE'; categoryId: string }) => {
    const apiData: CreateProductRequest = {
      name: data.name,
      description: data.description || undefined,
      sku: data.sku || undefined,
      color: data.color || undefined,
      unitSize: data.unitSize || undefined,
      reorderPoint: data.reorderPoint ?? undefined,
      supplierType: data.supplierType,
      categoryId: data.categoryId || undefined,
      isTracked: data.isTracked,
    };
    await createProduct(apiData);
    await refetch();
  }, [refetch]);

  if (!authReady) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <LoginModal />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

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
      <Routes>
        <Route path="/" element={<Navigate to={TAB_TO_PATH.dashboard} replace />} />
        <Route
          path={TAB_TO_PATH.dashboard}
          element={
            <>
              <Header />
              <div className="p-4 space-y-4">
                {reorderAlerts.length > 0 && (
                  <ReorderAlerts
                    products={reorderAlerts}
                    onReceiveProduct={handleReceiveFromAlert}
                    disableReceive={isViewer || locations.length === 0}
                  />
                )}

                <LocationFilter
                  locations={locations}
                  selectedLocation={selectedLocation}
                  onLocationChange={setSelectedLocation}
                />

                <ProductList
                  products={filteredProducts}
                  selectedLocation={selectedLocation}
                  locations={locations}
                  pendingKey={pendingKey}
                  errorByKey={errorByKey}
                  onIncrement={isViewer ? undefined : handleIncrement}
                  onDecrement={isViewer ? undefined : handleDecrement}
                />
              </div>
            </>
          }
        />
        <Route
          path={TAB_TO_PATH.add}
          element={
            isViewer ? (
              <div className="p-6 text-center text-dark-text-secondary">
                You are signed in with view-only access. Please contact an admin to make changes.
              </div>
            ) : (
              <AddInventoryScreen
                products={products}
                locations={locations}
                onReceive={handleReceiveInventory}
                onTransfer={handleTransferInventory}
                initialMode={preFilledData.mode}
                initialProductId={preFilledData.productId}
                initialLocationId={preFilledData.locationId || selectedLocation}
                onClearPreFilled={handleClearPreFilled}
                onCancel={handleCancelTransaction}
              />
            )
          }
        />
        <Route
          path={TAB_TO_PATH.products}
          element={
            <ProductCatalogScreen
              products={products}
              categories={categories}
              onUpdateProduct={handleUpdateProduct}
              onCreateProduct={handleCreateProduct}
            />
          }
        />
        <Route path={TAB_TO_PATH.more} element={<MoreScreen />} />
        <Route path="/transactions" element={<TransactionLogScreen />} />
        <Route path="/neighbor-inventory" element={<NeighborInventoryScreen />} />
        <Route path="/shared-orders" element={<SharedOrdersScreen />} />
        <Route
          path="/locations"
          element={
            <LocationsScreen
              locations={locations}
              products={products}
              onLocationsChanged={refetch}
            />
          }
        />
        <Route path="*" element={<Navigate to={TAB_TO_PATH.dashboard} replace />} />
      </Routes>

      <BottomNavigation
        activeTab={currentTab}
        onTabChange={handleTabChange}
        disableManage={isViewer}
      />
    </div>
  );
}

export default App;
