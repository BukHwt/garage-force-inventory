import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import './index.css';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// Hooks
import { useInventory } from './hooks/useInventory';
import { useAuth } from './context/AuthContext';

// Utils
import { filterProductsByLocation, getProductsNeedingReorder, getTotalQuantity } from './utils/inventory';

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
import { QuickReceiveModal } from './components/inventory/QuickReceiveModal';
import { LocationFilter } from './components/inventory/LocationFilter';
import { ProductList } from './components/inventory/ProductList';
import { InventoryAdjustmentModal } from './components/common/InventoryAdjustmentModal';
import { InventoryActionModal } from './components/inventory/InventoryActionModal';
import { UnsealModal } from './components/inventory/UnsealModal';
import { AddInventoryScreen } from './components/inventory/AddInventoryScreen';
import { ProductCatalogScreen } from './components/products/ProductCatalogScreen';
import { LoginModal } from './components/auth/LoginModal';
import { MoreScreen } from './components/more/MoreScreen';
import { TransactionLogScreen } from './components/more/TransactionLogScreen';

type TabId = 'dashboard' | 'add' | 'products' | 'more';
type ManagePrefill = {
  mode?: 'receive' | 'transfer' | 'use';
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
  if (normalizedPath.startsWith('/more') || normalizedPath.startsWith('/transactions')) {
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
  const allowedModes: ManagePrefill['mode'][] = ['receive', 'transfer', 'use'];
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

function App() {
  const { user, isReady: authReady } = useAuth();
  const isAuthenticated = Boolean(user);
  const isViewer = user?.role === 'VIEWER';
  const { products, locations, loading, error, refetch } = useInventory({ enabled: isAuthenticated });
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = getTabFromPath(location.pathname);
  const navigateToManage = useCallback(
    (prefill?: ManagePrefill, options?: { replace?: boolean }) => {
      const path = buildManagePath(prefill);
      navigate(path, { replace: options?.replace });
    },
    [navigate]
  );

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
  const [preFilledData, setPreFilledData] = useState<ManagePrefill>({});

  // Scroll position tracking for returning to Dashboard
  const [savedScrollPosition, setSavedScrollPosition] = useState<number>(0);
  const shouldRestoreScroll = useRef<boolean>(false);
  const [previousTab, setPreviousTab] = useState<TabId>('dashboard');
  const lastTabRef = useRef<TabId>(currentTab);
  const [quickReceiveProduct, setQuickReceiveProduct] = useState<Product | null>(null);
  const [reorderAlertsCollapsed, setReorderAlertsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('gf_reorder_collapsed') === 'true';
  });
  const handleClearPreFilled = useCallback(() => {
    setPreFilledData({});
    if (location.pathname.startsWith(TAB_TO_PATH.add) && location.search) {
      navigateToManage(undefined, { replace: true });
    }
  }, [location.pathname, location.search, navigateToManage]);

  useEffect(() => {
    if (lastTabRef.current === 'add' && currentTab !== 'add') {
      setPreFilledData({});
    }
    lastTabRef.current = currentTab;
  }, [currentTab]);

  useEffect(() => {
    if (currentTab !== 'add') {
      return;
    }
    const nextPrefill = parseManageSearch(location.search);
    setPreFilledData(prev => (isSamePrefill(prev, nextPrefill) ? prev : nextPrefill));
  }, [currentTab, location.search]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gf_reorder_collapsed', reorderAlertsCollapsed ? 'true' : 'false');
    }
  }, [reorderAlertsCollapsed]);

  useEffect(() => {
    if (isViewer && currentTab === 'add') {
      navigate(TAB_TO_PATH.dashboard, { replace: true });
    }
  }, [isViewer, currentTab, navigate]);

  // Memoized derived state - only recompute when dependencies change
  const dashboardVisibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const hasInventory = getTotalQuantity(product) > 0;
        const hasReorderPoint = (product.reorderPoint ?? 0) > 0;
        return Boolean(product.isTracked || hasInventory || hasReorderPoint);
      }),
    [products]
  );

  const filteredProducts = useMemo(
    () => filterProductsByLocation(dashboardVisibleProducts, selectedLocation),
    [dashboardVisibleProducts, selectedLocation]
  );

  const reorderAlerts = useMemo(
    () => getProductsNeedingReorder(dashboardVisibleProducts),
    [dashboardVisibleProducts]
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
    setPreviousTab(currentTab);
    const nextPrefill: ManagePrefill = {
      mode: 'use',
      productId,
      locationId,
    };
    setPreFilledData(nextPrefill);
    navigateToManage(nextPrefill);
  }, [currentTab, navigateToManage]);

  const handleProductClick = useCallback(
    (product: Product, locationId: string) => {
      if (isViewer) {
        return;
      }
      if (product.consumableType === 'SINGLE_USE') {
        handleUseFromOpen(product.id, locationId);
        return;
      }

      setActionModal({
        isOpen: true,
        product,
        locationId,
      });
    },
    [handleUseFromOpen, isViewer]
  );

  const handleAdjustClick = useCallback(
    (inventoryItem: InventoryItem, productName: string) => {
      if (isViewer) {
        return;
      }
      setAdjustmentModal({
        isOpen: true,
        inventoryItem,
        productName,
      });
    },
    [isViewer]
  );

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
    navigate(TAB_TO_PATH.dashboard);
  }, [navigate, refetch]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (tabId === 'add' && isViewer) {
        return;
      }
      const typedTab = (['dashboard', 'add', 'products', 'more'].includes(tabId)
        ? (tabId as TabId)
        : 'dashboard');
      if (typedTab === currentTab) {
        return;
      }
      setPreviousTab(currentTab);
      if (typedTab === 'add') {
        navigateToManage();
        return;
      }
      const targetPath = TAB_TO_PATH[typedTab] ?? TAB_TO_PATH.dashboard;
      navigate(targetPath);
    },
    [currentTab, isViewer, navigate, navigateToManage]
  );

  const handleReceiveFromAlert = useCallback((product: Product) => {
    if (isViewer || !locations.length) {
      return;
    }
    setQuickReceiveProduct(product);
  }, [isViewer, locations.length]);

  const handleCloseQuickReceive = useCallback(() => {
    setQuickReceiveProduct(null);
  }, []);

  const handleQuickReceiveSuccess = useCallback(async () => {
    await refetch();
  }, [refetch]);

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
    handleClearPreFilled();
    // Return to previous tab
    shouldRestoreScroll.current = previousTab === 'dashboard';
    const targetPath = TAB_TO_PATH[previousTab] ?? TAB_TO_PATH.dashboard;
    navigate(targetPath);
  }, [handleClearPreFilled, navigate, previousTab]);

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
    if (currentTab === 'dashboard' && shouldRestoreScroll.current) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        window.scrollTo(0, savedScrollPosition);
        shouldRestoreScroll.current = false;
      }, 0);
    } else if (currentTab === 'add') {
      // Always scroll to top when entering Manage tab
      window.scrollTo(0, 0);
    }
  }, [currentTab, savedScrollPosition]);

  // Loading state
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
                    collapsed={reorderAlertsCollapsed}
                    onToggleCollapsed={() => setReorderAlertsCollapsed((prev) => !prev)}
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
                  onProductClick={
                    isViewer
                      ? undefined
                      : selectedLocation === 'all'
                  ? (product, _locationId) => {
                      setPreviousTab(currentTab);
                      const nextPrefill: ManagePrefill = {
                        mode: 'receive',
                        productId: product.id,
                      };
                      setPreFilledData(nextPrefill);
                      navigateToManage(nextPrefill);
                    }
                  : handleProductClick
                  }
                  onAdjustClick={isViewer ? undefined : handleAdjustClick}
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
                onUse={handleUseInventory}
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
        <Route path="*" element={<Navigate to={TAB_TO_PATH.dashboard} replace />} />
      </Routes>

      <BottomNavigation
        activeTab={currentTab}
        onTabChange={handleTabChange}
        disableManage={isViewer}
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

      {quickReceiveProduct && (
        <QuickReceiveModal
          product={quickReceiveProduct}
          locations={locations}
          isOpen
          onClose={handleCloseQuickReceive}
          onSuccess={handleQuickReceiveSuccess}
        />
      )}
    </div>
  );
}

export default App;

