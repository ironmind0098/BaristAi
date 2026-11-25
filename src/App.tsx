import React, { useState, useEffect } from 'react';
import { Lock, LogOut, ExternalLink, Coffee, ShieldCheck } from 'lucide-react';
import { Header } from './components/Header';
import { DigitalMenu } from './components/DigitalMenu';
import { SmartBaristaQuiz } from './components/SmartBaristaQuiz';
import { CartDrawer } from './components/CartDrawer';
import { OrderStatusModal } from './components/OrderStatusModal';
import { AdminPanel } from './components/AdminPanel';

import {
  INITIAL_MENU_ITEMS,
  INITIAL_INVENTORY,
  INITIAL_ORDERS
} from './data/initialData';

import {
  MenuItem,
  CartItem,
  Order,
  InventoryItem,
  OrderStatus
} from './types';

const MENU_STORAGE_KEY = 'passincafe_menu_full_v6';
const PREV_MENU_STORAGE_KEY = 'passincafe_menu_full_v5';
const ORDERS_STORAGE_KEY = 'passincafe_orders_v3';
const HERO_IMAGE_STORAGE_KEY = 'passincafe_hero_image_v1';
const ADMIN_AUTH_KEY = 'passincafe_admin_auth';
const DEFAULT_LOGO_PATH = '/images/passin_logo.png';
const DEFAULT_HERO_IMAGE = '/images/cafe_hero_ambiance_1791965391181.jpg';
const LEGACY_STOCK_IMAGES = new Set([
  '/src/assets/images/passin_logo.png',
  '/src/assets/images/coffee_specialty_latte_1791965390221.jpg',
  '/src/assets/images/cold_brew_signature_1791965390613.jpg',
  '/src/assets/images/artisanal_croissant_pastry_1791965391727.jpg'
]);

function checkIsAdminRoute(): boolean {
  return (
    window.location.pathname.startsWith('/admin') ||
    window.location.hash === '#/admin' ||
    window.location.hash === '#admin'
  );
}

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdminRoute);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  });
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'menu' | 'quiz'>('menu');
  
  // Load full menu items list (including added, deleted, and edited items) from localStorage
  const loadMenuFromStorage = (): MenuItem[] => {
    try {
      const savedRaw = localStorage.getItem(MENU_STORAGE_KEY);
      if (savedRaw) {
        const parsed: MenuItem[] = JSON.parse(savedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => ({
            ...item,
            image:
              !item.image || LEGACY_STOCK_IMAGES.has(item.image)
                ? DEFAULT_LOGO_PATH
                : item.image
          }));
        }
      }

      // Migrate custom edits from previous storage version while adding newly introduced diet items
      const prevRaw = localStorage.getItem(PREV_MENU_STORAGE_KEY);
      if (prevRaw) {
        const prevParsed: MenuItem[] = JSON.parse(prevRaw);
        if (Array.isArray(prevParsed) && prevParsed.length > 0) {
          const existingIds = new Set(prevParsed.map(i => i.id));
          const newlyAddedDefaults = INITIAL_MENU_ITEMS.filter(i => !existingIds.has(i.id));
          return [...prevParsed, ...newlyAddedDefaults].map(item => ({
            ...item,
            image:
              !item.image || LEGACY_STOCK_IMAGES.has(item.image)
                ? DEFAULT_LOGO_PATH
                : item.image
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load menu from localStorage:', e);
    }
    return INITIAL_MENU_ITEMS;
  };

  const [menuItems, setMenuItems] = useState<MenuItem[]>(loadMenuFromStorage);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (savedOrders) return JSON.parse(savedOrders);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ORDERS;
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [heroImage, setHeroImage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(HERO_IMAGE_STORAGE_KEY);
      if (saved && !saved.startsWith('/src/assets/images/')) return saved;
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_HERO_IMAGE;
  });

  // Modal States
  const [currentTable] = useState<string>('کافه پسین');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [activeOrderForStatus, setActiveOrderForStatus] = useState<Order | null>(null);
  const [hasCalorieCap, setHasCalorieCap] = useState<boolean>(false);

  // Listen to URL changes (popstate / hashchange) and cross-tab storage updates
  useEffect(() => {
    const handleRouteChange = () => {
      setIsAdminRoute(checkIsAdminRoute());
    };
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === MENU_STORAGE_KEY) {
        setMenuItems(loadMenuFromStorage());
      } else if (e.key === ORDERS_STORAGE_KEY && e.newValue) {
        try {
          setOrders(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      } else if (e.key === HERO_IMAGE_STORAGE_KEY) {
        setHeroImage(e.newValue || DEFAULT_HERO_IMAGE);
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('storage', handleStorageSync);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  // Save hero banner image to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HERO_IMAGE_STORAGE_KEY, heroImage);
    } catch (e) {
      console.error('Failed to save hero image to localStorage:', e);
    }
  }, [heroImage]);

  // Save full menu items list to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menuItems));
    } catch (e) {
      console.error('Failed to save menu items to localStorage:', e);
    }
  }, [menuItems]);

  // Save orders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error(e);
    }
  }, [orders]);

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToCustomerSite = () => {
    window.history.pushState({}, '', '/');
    if (window.location.hash) window.location.hash = '';
    setIsAdminRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword.trim() === '1234' || adminPassword.trim() === 'admin') {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      setIsAdminAuthenticated(true);
      setLoginError(null);
      setAdminPassword('');
    } else {
      setLoginError('رمز عبور اشتباه است. (رمز پیش‌فرض: 1234)');
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setIsAdminAuthenticated(false);
  };

  // Update a menu item (used by Admin Panel to edit texts, prices, or image)
  const handleUpdateMenuItem = (itemId: string, updates: Partial<MenuItem>) => {
    setMenuItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  // Add a new menu item (used by Admin Panel)
  const handleAddMenuItem = (newItem: MenuItem) => {
    setMenuItems(prev => [newItem, ...prev]);
  };

  // Delete a menu item (used by Admin Panel)
  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Reset all menu items to factory defaults
  const handleResetAllMenuItems = () => {
    setMenuItems(INITIAL_MENU_ITEMS);
    localStorage.removeItem(MENU_STORAGE_KEY);
  };

  // Cart operations
  const handleAddToCart = (item: MenuItem, discountedPrice?: number) => {
    setCart(prev => {
      const existing = prev.find(
        c =>
          c.item.id === item.id &&
          !c.selectedMilk &&
          !c.extraShot &&
          !c.selectedBlend &&
          !c.selectedShot &&
          !c.selectedVariant
      );
      if (existing) {
        return prev.map(c => 
          c.cartItemId === existing.cartItemId 
            ? { ...c, quantity: c.quantity + 1, discountedPrice: discountedPrice ?? c.discountedPrice }
            : c
        );
      }
      return [
        ...prev,
        {
          cartItemId: `ci_${Date.now()}_${Math.random()}`,
          item,
          quantity: 1,
          discountedPrice
        }
      ];
    });
  };

  const handleAddToCartWithOptions = (
    item: MenuItem,
    options: {
      selectedBlend?: string;
      selectedShot?: string;
      selectedVariant?: string;
      extraHotMilk?: boolean;
      selectedMilk?: string;
      sweetness?: string;
      extraShot?: boolean;
      notes?: string;
      unitPrice: number;
      discountedPrice?: number;
      quantity: number;
    }
  ) => {
    setCart(prev => {
      const normalizedNotes = (options.notes || '').trim();
      const existing = prev.find(
        c =>
          c.item.id === item.id &&
          (c.selectedBlend || '') === (options.selectedBlend || '') &&
          (c.selectedShot || '') === (options.selectedShot || '') &&
          (c.selectedVariant || '') === (options.selectedVariant || '') &&
          Boolean(c.extraHotMilk) === Boolean(options.extraHotMilk) &&
          Boolean(c.extraShot) === Boolean(options.extraShot) &&
          (c.notes || '').trim() === normalizedNotes
      );

      if (existing) {
        return prev.map(c =>
          c.cartItemId === existing.cartItemId
            ? {
                ...c,
                quantity: c.quantity + options.quantity,
                unitPrice: options.unitPrice,
                discountedPrice: options.discountedPrice ?? c.discountedPrice
              }
            : c
        );
      }

      return [
        ...prev,
        {
          cartItemId: `ci_${Date.now()}_${Math.random()}`,
          item,
          quantity: options.quantity,
          selectedBlend: options.selectedBlend,
          selectedShot: options.selectedShot,
          selectedVariant: options.selectedVariant,
          extraHotMilk: options.extraHotMilk,
          selectedMilk: options.selectedMilk,
          sweetness: options.sweetness,
          extraShot: options.extraShot,
          notes: normalizedNotes || undefined,
          unitPrice: options.unitPrice,
          discountedPrice: options.discountedPrice
        }
      ];
    });
  };

  const handleAddComboToCart = (
    primary: MenuItem,
    upsell: MenuItem,
    discountedUpsellPrice: number
  ) => {
    handleAddToCart(primary);
    handleAddToCart(upsell, discountedUpsellPrice);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCart(prev => prev.map(c => c.cartItemId === cartItemId ? { ...c, quantity: newQty } : c));
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCart(prev => prev.filter(c => c.cartItemId !== cartItemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Order submission
  const handleSubmitOrder = (orderData: {
    customerName: string;
    customerPhone: string;
    tableNumber: string;
    notes?: string;
    paymentMethod: 'online' | 'cash_or_card_at_counter';
    discountAmount: number;
  }) => {
    const subtotal = cart.reduce((sum, item) => {
      const price = item.discountedPrice ?? item.unitPrice ?? item.item.price;
      const extra = item.extraShot ? 25000 : 0;
      return sum + (price + extra) * item.quantity;
    }, 0);

    const total = Math.max(0, subtotal - orderData.discountAmount);
    const totalCost = cart.reduce((sum, item) => sum + (item.item.cost * item.quantity), 0);
    const profit = Math.max(0, total - totalCost);

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newOrderNumber = orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber)) + 1 : 101;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: newOrderNumber,
      tableNumber: orderData.tableNumber,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      items: [...cart],
      subtotal,
      discount: orderData.discountAmount,
      total,
      profit,
      status: 'pending',
      createdAt: timeString,
      paymentMethod: orderData.paymentMethod,
      isPaid: true,
      notes: orderData.notes
    };

    setOrders(prev => [newOrder, ...prev]);

    setMenuItems(prev => prev.map(mi => {
      const cartMatch = cart.find(ci => ci.item.id === mi.id);
      if (cartMatch) {
        return { ...mi, stock: Math.max(0, mi.stock - cartMatch.quantity) };
      }
      return mi;
    }));

    setCart([]);
    setIsCartOpen(false);
    setActiveOrderForStatus(newOrder);
  };

  // Admin handlers
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (activeOrderForStatus && activeOrderForStatus.id === orderId) {
      setActiveOrderForStatus(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleUpdateInventoryStock = (itemId: string, newStock: number) => {
    setInventory(prev => prev.map(i => i.id === itemId ? { ...i, currentStock: newStock } : i));
  };

  // =========================================================================
  // SEPARATE STANDALONE ADMIN PORTAL (/admin)
  // =========================================================================
  if (isAdminRoute) {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-[#110E0C] text-[#FAF5EB] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#191512] border border-[#2E251E] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#271F18] border border-[#3E3126] flex items-center justify-center text-[#F59E0B] shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-extrabold text-white">
                پرتال مستقل مدیریت کافه پسین
              </h1>
              <p className="text-xs text-[#C4BCB0]">
                جهت افزودن، حذف و ویرایش آیتم‌ها، قیمت‌ها و تصاویر منو وارد شوید.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#D4C9BC] mb-1.5">
                  رمز عبور مدیریت (پیش‌فرض: <span className="font-mono text-[#F59E0B]">1234</span>):
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="••••"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className="w-full bg-[#13100E] border border-[#2E251F] focus:border-[#F59E0B] rounded-xl px-4 py-2.5 text-sm text-white text-center font-mono tracking-widest focus:outline-none"
                />
                {loginError && (
                  <p className="text-xs text-[#EF4444] mt-1.5 text-center">{loginError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#F59E0B] hover:bg-[#D97706] text-[#161311] font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-lg active:scale-95"
              >
                ورود به پنل مدیریت
              </button>
            </form>

            <div className="pt-4 border-t border-[#261F19] text-center">
              <button
                type="button"
                onClick={navigateToCustomerSite}
                className="text-xs font-semibold text-[#C4BCB0] hover:text-white inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>بازگشت به منوی دیجیتال مشتریان</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#110E0C] text-[#FAF5EB] flex flex-col justify-between">
        {/* Dedicated Admin Header */}
        <header className="sticky top-0 z-30 bg-[#16120F]/95 backdrop-blur-md border-b border-[#2D241C] px-4 md:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-[#F59E0B] bg-white flex items-center justify-center shrink-0">
                <img
                  src="/images/passin_logo.png"
                  alt="لوگو کافه پسین"
                  className="w-full h-full object-cover scale-105"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-extrabold text-white">
                    پنل مدیریت کافه پسین
                  </span>
                  <span className="text-[11px] font-bold bg-[#292018] text-[#F59E0B] px-2 py-0.5 rounded border border-[#3E3024]">
                    /admin
                  </span>
                </div>
                <span className="text-xs text-[#A89F91] block">
                  افزودن، حذف و ویرایش نوشته‌ها، قیمت‌ها و تصاویر منو
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={navigateToCustomerSite}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#FAF5EB] bg-[#241C16] hover:bg-[#31261E] border border-[#3B2E24] rounded-xl transition-colors"
              >
                <Coffee className="w-4 h-4 text-[#F59E0B]" />
                <span>مشاهده منوی مشتریان</span>
              </button>

              <button
                type="button"
                onClick={handleAdminLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#EF4444] bg-[#241414] hover:bg-[#321A1A] border border-[#452222] rounded-xl transition-colors"
                title="خروج از حساب مدیریت"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>
        </header>

        {/* Admin Dashboard Body */}
        <main className="flex-1 pb-16">
          <AdminPanel
            orders={orders}
            inventory={inventory}
            menuItems={menuItems}
            heroImage={heroImage}
            onUpdateHeroImage={setHeroImage}
            onResetHeroImage={() => setHeroImage(DEFAULT_HERO_IMAGE)}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateInventoryStock={handleUpdateInventoryStock}
            onUpdateMenuItem={handleUpdateMenuItem}
            onAddMenuItem={handleAddMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            onResetAllMenuItems={handleResetAllMenuItems}
          />
        </main>
      </div>
    );
  }

  // =========================================================================
  // CUSTOMER-FACING DIGITAL MENU APPLICATION (/)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#12100E] text-[#F3EED9] flex flex-col justify-between selection:bg-[#F59E0B]/20 selection:text-white">
      
      {/* Customer Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cart={cart}
        setIsCartOpen={setIsCartOpen}
      />

      {/* Main Customer Content */}
      <main className="flex-1 pb-16">
        {activeTab === 'menu' && (
          <DigitalMenu
            menuItems={menuItems}
            cart={cart}
            heroImage={heroImage}
            onAddToCartWithOptions={handleAddToCartWithOptions}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onOpenQuiz={() => setActiveTab('quiz')}
          />
        )}

        {activeTab === 'quiz' && (
          <SmartBaristaQuiz
            menuItems={menuItems}
            cart={cart}
            onAddToCart={handleAddToCart}
            onAddToCartWithOptions={handleAddToCartWithOptions}
            onAddComboToCart={handleAddComboToCart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCalorieCapChange={setHasCalorieCap}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        currentTable={currentTable}
        menuItems={menuItems}
        hasCalorieCap={hasCalorieCap}
        onAddToCart={handleAddToCart}
        onSubmitOrder={handleSubmitOrder}
      />

      <OrderStatusModal
        order={activeOrderForStatus}
        onClose={() => setActiveOrderForStatus(null)}
        onCallWaiter={() => alert('درخواست شما به پیشخوان باریستا ارسال شد.')}
      />

      {/* Customer Footer */}
      <footer className="border-t border-[#231A14] bg-[#0E0C0A] py-6 px-4 text-xs sm:text-sm text-[#9E9486]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border border-[#F59E0B] bg-white flex items-center justify-center shrink-0">
              <img
                src="/images/passin_logo.png"
                alt="لوگو کافه پسین"
                className="w-full h-full object-cover scale-105"
              />
            </div>
            <span className="font-extrabold text-white">کافه پسین (Passin Cafe)</span>
            <span>·</span>
            <a
              href="https://instagram.com/passincafe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FBBF24] hover:underline font-bold"
            >
              @passincafe
            </a>
            <span>·</span>
            <a
              href="tel:07136249850"
              className="text-[#FFFDF9] hover:text-[#FBBF24] font-bold transition-colors"
              dir="ltr"
            >
              0713-624-9850
            </a>
          </div>

          <div className="flex items-center gap-4 text-[#C4BCB0]">
            <button
              onClick={navigateToAdmin}
              className="inline-flex items-center gap-1.5 text-[#A89F91] hover:text-[#FBBF24] font-semibold transition-colors"
              title="ورود به پرتال مستقل مدیریت (/admin)"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>پرتال مدیریت (/admin)</span>
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
