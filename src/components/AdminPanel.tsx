import React, { useState } from 'react';
import {
  BarChart3,
  Package,
  Clock,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  Plus,
  Minus,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Search,
  RotateCcw,
  Check,
  Edit3,
  Trash2,
  X,
  Save,
  Tag
} from 'lucide-react';
import {
  Order,
  InventoryItem,
  MenuItem,
  OrderStatus,
  CategoryId,
  CoffeePriceMatrix,
  SizeOrVariantOption
} from '../types';
import {
  getContextualItemTitle,
  getDiscountedPrice,
  getItemDiscountPercent
} from '../utils/menuHelpers';

const DEFAULT_LOGO_PATH = '/images/passin_logo.png';
const DEFAULT_HERO_IMAGE = '/images/cafe_hero_ambiance_1791965391181.jpg';

interface AdminPanelProps {
  orders: Order[];
  inventory: InventoryItem[];
  menuItems: MenuItem[];
  heroImage: string;
  onUpdateHeroImage: (newImage: string) => void;
  onResetHeroImage: () => void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onUpdateInventoryStock: (itemId: string, newStock: number) => void;
  onUpdateMenuItem: (itemId: string, updates: Partial<MenuItem>) => void;
  onAddMenuItem: (newItem: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
  onResetAllMenuItems: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  orders,
  inventory,
  menuItems,
  heroImage,
  onUpdateHeroImage,
  onResetHeroImage,
  onUpdateOrderStatus,
  onUpdateInventoryStock,
  onUpdateMenuItem,
  onAddMenuItem,
  onDeleteMenuItem,
  onResetAllMenuItems
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'menu_images' | 'financial' | 'inventory' | 'orders' | 'ai_insights'
  >('menu_images');
  const [financialTimeframe, setFinancialTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // State for Menu Manager
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [urlInputItemId, setUrlInputItemId] = useState<string | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState<string>('');
  const [showHeroUrlInput, setShowHeroUrlInput] = useState<boolean>(false);
  const [tempHeroUrl, setTempHeroUrl] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // State for Edit / Add Item Modal
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [hasCoffeeMatrixInForm, setHasCoffeeMatrixInForm] = useState<boolean>(false);
  const [isFixedBlendMatrix, setIsFixedBlendMatrix] = useState<boolean>(false);

  const categories: { id: CategoryId; label: string }[] = [
    { id: 'all', label: 'همه دسته‌ها' },
    { id: 'coffee', label: 'بر پایه قهوه' },
    { id: 'brewed', label: 'قهوه‌های دمی' },
    { id: 'hot_drinks', label: 'نوشیدنی‌های گرم' },
    { id: 'herbal', label: 'دمنوش‌ها' },
    { id: 'pastry', label: 'شیرینی / دسر / میان‌وعده' },
    { id: 'cold_drinks', label: 'نوشیدنی‌های سرد' },
    { id: 'smoothie', label: 'اسموتی‌های میوه‌ای' },
    { id: 'milkshake', label: 'میلک شیک‌ها' },
    { id: 'mocktail', label: 'نوشیدنی‌های گازدار' }
  ];

  const itemCategories = categories.filter(c => c.id !== 'all');

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch =
      item.nameFa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const showToast = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  // Helper to compute auto priceLabel from coffeeMatrix
  const computeMatrixPriceLabel = (matrix?: CoffeePriceMatrix): string | undefined => {
    if (!matrix) return undefined;
    const values: number[] = [];
    (['blend7030', 'blend8020', 'arabica100'] as const).forEach(key => {
      const b = matrix[key];
      if (b) {
        if (b.single) values.push(b.single);
        if (b.double) values.push(b.double);
        if (b.fixed) values.push(b.fixed);
      }
    });
    if (values.length === 0) return undefined;
    const min = Math.round(Math.min(...values) / 1000).toLocaleString('fa-IR');
    const max = Math.round(Math.max(...values) / 1000).toLocaleString('fa-IR');
    return min === max ? `${min}` : `${min} تا ${max}`;
  };

  // Open Modal to Add New Item
  const handleOpenAddModal = () => {
    const defaultCategory: CategoryId = selectedCategory !== 'all' ? selectedCategory : 'coffee';
    const isCoffee = defaultCategory === 'coffee';
    setIsAddingNew(true);
    setHasCoffeeMatrixInForm(isCoffee);
    setIsFixedBlendMatrix(false);
    setEditingItem({
      id: `item_${Date.now()}`,
      nameFa: '',
      nameEn: '',
      categoryId: defaultCategory,
      description: '',
      price: 250000,
      priceLabel: '',
      coffeeMatrix: isCoffee
        ? {
            blend7030: { single: 200000, double: 250000 },
            blend8020: { single: 250000, double: 300000 },
            arabica100: { single: 300000, double: 350000 }
          }
        : undefined,
      cost: 80000,
      stock: 50,
      profitMargin: 70,
      calories: 150,
      prepTimeMinutes: 4,
      image: DEFAULT_LOGO_PATH,
      flavorNotes: ['تازه', 'مخصوص کافه پسین'],
      temperature: 'hot',
      caffeineLevel: isCoffee ? 'high' : 'none',
      tags: ['جدید'],
      isAvailable: true
    });
  };

  // Open Modal to Edit Existing Item
  const handleOpenEditModal = (item: MenuItem) => {
    setIsAddingNew(false);
    const hasMatrix = !!item.coffeeMatrix;
    const isFixed = hasMatrix && item.coffeeMatrix?.blend7030?.fixed !== undefined;
    setHasCoffeeMatrixInForm(hasMatrix);
    setIsFixedBlendMatrix(isFixed);
    setEditingItem(JSON.parse(JSON.stringify(item)));
  };

  // Save Add or Edit Modal
  const handleSaveModalItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editingItem.nameFa.trim()) {
      alert('لطفاً نام فارسی آیتم را وارد کنید.');
      return;
    }

    const normalizedDiscount = Math.min(90, Math.max(0, Math.round(Number(editingItem.discountPercent || 0))));

    const finalItem: MenuItem = {
      ...editingItem,
      nameFa: editingItem.nameFa.trim(),
      nameEn: editingItem.nameEn.trim(),
      description: editingItem.description.trim() || `تهیه شده با بهترین مواد اولیه در کافه پسین`,
      image: editingItem.image || DEFAULT_LOGO_PATH,
      discountPercent: normalizedDiscount > 0 ? normalizedDiscount : undefined
    };

    if (!hasCoffeeMatrixInForm) {
      delete finalItem.coffeeMatrix;
    } else if (finalItem.coffeeMatrix) {
      // Update base price from first available price in matrix
      const firstPrice =
        finalItem.coffeeMatrix.blend7030?.fixed ??
        finalItem.coffeeMatrix.blend7030?.single ??
        finalItem.price;
      finalItem.price = firstPrice;
      if (!finalItem.priceLabel?.trim()) {
        finalItem.priceLabel = computeMatrixPriceLabel(finalItem.coffeeMatrix);
      }
    }

    if (!finalItem.priceLabel?.trim()) {
      delete finalItem.priceLabel;
    }

    if (isAddingNew) {
      onAddMenuItem(finalItem);
      showToast(`آیتم جدید «${finalItem.nameFa}» با موفقیت به منو اضافه شد.`);
    } else {
      onUpdateMenuItem(finalItem.id, finalItem);
      showToast(`اطلاعات و قیمت «${finalItem.nameFa}» با موفقیت بروزرسانی شد.`);
    }

    setEditingItem(null);
    setIsAddingNew(false);
  };

  // Compress & convert uploaded image file to Data URL
  const handleFileUpload = (item: MenuItem, file: File | undefined, isInsideModal = false) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 720;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          if (isInsideModal && editingItem) {
            setEditingItem({ ...editingItem, image: compressedDataUrl });
          } else {
            onUpdateMenuItem(item.id, { image: compressedDataUrl });
            showToast(`تصویر جدید برای «${item.nameFa}» با موفقیت روی سایت قرار گرفت.`);
          }
        }
      };
      if (typeof e.target?.result === 'string') {
        img.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveImageUrl = (item: MenuItem) => {
    if (!tempImageUrl.trim()) return;
    onUpdateMenuItem(item.id, { image: tempImageUrl.trim() });
    setUrlInputItemId(null);
    setTempImageUrl('');
    showToast(`لینک تصویر «${item.nameFa}» بروزرسانی شد.`);
  };

  const handleResetDefaultImage = (item: MenuItem) => {
    onUpdateMenuItem(item.id, { image: DEFAULT_LOGO_PATH });
    showToast(`تصویر «${item.nameFa}» به لوگوی کافه پسین بازگردانده شد.`);
  };

  // Upload & compress Hero Banner image (max 1400px wide so it stays crisp and fits localStorage)
  const handleHeroImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('لطفاً یک فایل تصویری معتبر (JPG, PNG, WEBP) انتخاب کنید.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1400;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onUpdateHeroImage(compressedDataUrl);
          showToast('تصویر بنر بزرگ صفحه اصلی با موفقیت بروزرسانی شد.');
        }
      };
      if (typeof e.target?.result === 'string') {
        img.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveHeroUrl = () => {
    if (!tempHeroUrl.trim()) return;
    onUpdateHeroImage(tempHeroUrl.trim());
    setShowHeroUrlInput(false);
    setTempHeroUrl('');
    showToast('لینک تصویر بنر بزرگ صفحه اصلی ذخیره شد.');
  };

  const handleDeleteClick = (item: MenuItem) => {
    if (window.confirm(`آیا از حذف آیتم «${item.nameFa}» از منو مطمئن هستید؟`)) {
      onDeleteMenuItem(item.id);
      showToast(`آیتم «${item.nameFa}» از منو حذف شد.`);
    }
  };

  // Helper to update coffeeMatrix inside modal state
  const updateMatrixField = (
    blend: 'blend7030' | 'blend8020' | 'arabica100',
    field: 'single' | 'double' | 'fixed',
    valInTomans: number
  ) => {
    if (!editingItem) return;
    const currentMatrix: CoffeePriceMatrix = editingItem.coffeeMatrix || {
      blend7030: { single: 150000, double: 200000 },
      blend8020: { single: 250000, double: 280000 },
      arabica100: { single: 280000, double: 310000 }
    };
    const updatedMatrix: CoffeePriceMatrix = {
      ...currentMatrix,
      [blend]: {
        ...(currentMatrix[blend] || {}),
        [field]: valInTomans
      }
    };
    const newLabel = computeMatrixPriceLabel(updatedMatrix);
    setEditingItem({
      ...editingItem,
      coffeeMatrix: updatedMatrix,
      price:
        updatedMatrix.blend7030?.fixed ??
        updatedMatrix.blend7030?.single ??
        editingItem.price,
      priceLabel: newLabel || editingItem.priceLabel
    });
  };

  // Helper to update variantOptions inside modal state
  const updateVariantOption = (idx: number, field: 'label' | 'price', value: string | number) => {
    if (!editingItem || !editingItem.variantOptions) return;
    const updatedVariants: SizeOrVariantOption[] = editingItem.variantOptions.map((v, i) =>
      i === idx ? { ...v, [field]: value } : v
    );
    setEditingItem({
      ...editingItem,
      variantOptions: updatedVariants,
      price: updatedVariants[0]?.price ?? editingItem.price
    });
  };

  // Calculate live financial statistics from orders
  const todayRevenue = orders.reduce((sum, o) => sum + o.total, 0) + 1250000;
  const todayProfit = orders.reduce((sum, o) => sum + o.profit, 0) + 890000;
  const todayProfitMargin = Math.round((todayProfit / todayRevenue) * 100);

  const weeklyRevenue = todayRevenue * 6.8;
  const weeklyProfit = todayProfit * 6.8;

  const monthlyRevenue = todayRevenue * 29.5;
  const monthlyProfit = todayProfit * 29.5;

  const lowStockItems = inventory.filter(i => i.currentStock <= i.minThreshold);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-[#FAF5EB]">
      
      {/* Toast Notification */}
      {savedNotice && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#161311] border-2 border-[#F59E0B] text-[#FFFDF9] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-slide-up">
          <Check className="w-5 h-5 text-[#F59E0B]" />
          <span className="text-xs sm:text-sm font-bold">{savedNotice}</span>
        </div>
      )}

      {/* Header & Section Title */}
      <div className="flex flex-col gap-4 border-b border-[#2B231D] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#F59E0B] mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>پنل مدیریت اختصاصی کافه پسین</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            مدیریت کامل آیتم‌ها، نوشته‌ها، قیمت‌ها و تصاویر منو
          </h2>
        </div>

        {/* Sub-tab navigation (Full width, wrapped grid without horizontal scroll) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-[#171310] p-2 rounded-2xl border border-[#2D241E] w-full">
          {[
            { id: 'menu_images', label: `مدیریت آیتم‌ها، قیمت و عکس (${menuItems.length})`, icon: Edit3 },
            { id: 'financial', label: 'گزارش سود و مالی', icon: DollarSign },
            { id: 'inventory', label: `انبارداری (${lowStockItems.length > 0 ? 'هشدار' : 'سالم'})`, icon: Package },
            { id: 'orders', label: `سفارشات زنده (${orders.filter(o => o.status !== 'served').length})`, icon: Clock },
            { id: 'ai_insights', label: 'تحلیل فروش', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#F59E0B] text-[#161311] shadow-md'
                    : 'bg-[#1D1814] text-[#C4BCB0] hover:text-white border border-[#2B231C]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 0: MENU ITEMS, TEXTS, PRICES & IMAGES MANAGEMENT              */}
      {/* ===================================================================== */}
      {activeSubTab === 'menu_images' && (
        <div className="space-y-6 animate-fade-in">
          {/* Hero Banner Photo Editor Card */}
          <div className="bg-[#181412] border border-[#3E3127] rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center gap-5">
            <div className="w-full lg:w-72 h-40 rounded-xl overflow-hidden border border-[#F59E0B]/50 bg-[#120E0C] shrink-0 relative">
              <img
                src={heroImage || DEFAULT_HERO_IMAGE}
                alt="پیش‌نمایش بنر بزرگ صفحه اصلی"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 right-2 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-black/80 text-[#FBBF24] border border-[#F59E0B]/40">
                بنر بزرگ صفحه اصلی
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#F59E0B]" />
                  <span>تغییر تصویر بزرگ بالای صفحه منو (بنر فضای کافه)</span>
                </h3>
                <p className="text-xs sm:text-sm text-[#C4BCB0] mt-1">
                  این تصویر در کادر بزرگ بالای صفحه اصلی مشتریان نمایش داده می‌شود. می‌توانید عکس دلخواهتان را مستقیم از دستگاه آپلود کنید یا لینک آن را وارد نمایید.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#161311] font-extrabold text-xs sm:text-sm transition-all shadow-md active:scale-95">
                  <Upload className="w-4 h-4" />
                  <span>آپلود تصویر جدید</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleHeroImageUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setShowHeroUrlInput(!showHeroUrlInput);
                    setTempHeroUrl(heroImage.startsWith('http') ? heroImage : '');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#241C16] hover:bg-[#30251D] border border-[#3E3127] text-xs sm:text-sm font-bold text-[#E6DEC8] hover:text-white transition-colors"
                >
                  <LinkIcon className="w-4 h-4 text-[#F59E0B]" />
                  <span>تنظیم با لینک تصویر</span>
                </button>

                {heroImage !== DEFAULT_HERO_IMAGE && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetHeroImage();
                      showToast('تصویر بنر بزرگ صفحه اصلی به حالت پیش‌فرض بازگردانده شد.');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#241816] hover:bg-[#331F1B] border border-[#4A2D26] text-xs sm:text-sm font-bold text-[#FCA5A5] hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>بازگردانی تصویر پیش‌فرض</span>
                  </button>
                )}
              </div>

              {showHeroUrlInput && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <input
                    type="url"
                    dir="ltr"
                    placeholder="https://example.com/cafe-banner.jpg"
                    value={tempHeroUrl}
                    onChange={e => setTempHeroUrl(e.target.value)}
                    className="flex-1 bg-[#13100E] border border-[#3E3127] focus:border-[#F59E0B] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none placeholder:text-[#786E62]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveHeroUrl}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#111] font-extrabold text-xs sm:text-sm transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>ثبت لینک</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar + Search & Filter */}
          <div className="bg-[#181412] border border-[#332920] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#F59E0B]" />
                  <span>افزودن، حذف و ویرایش نوشته‌ها، قیمت‌ها و تصاویر منو</span>
                </h3>
                <p className="text-xs sm:text-sm text-[#C4BCB0] mt-1">
                  می‌توانید آیتم جدید اضافه کنید، هر آیتم را حذف کنید، یا نام، توضیحات، قیمت‌ها (شامل جدول قهوه) و عکس هر آیتم را تغییر دهید.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FBBF24] to-[#D97706] hover:from-[#F59E0B] hover:to-[#B45309] text-[#161311] font-extrabold text-xs sm:text-sm shadow-lg shadow-[#D97706]/25 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن آیتم جدید به منو</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('آیا مایلید تمام تغییرات به منوی اولیه کافه پسین بازنشانی شود؟')) {
                      onResetAllMenuItems();
                      showToast('تمام آیتم‌ها به حالت پیش‌فرض بازنشانی شدند.');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#241C16] hover:bg-[#30251D] border border-[#3E3127] text-xs font-bold text-[#C4BCB0] hover:text-white transition-colors"
                  title="بازنشانی کل منو به حالت اولیه"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>بازنشانی پیش‌فرض</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-[#2A211A]">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-[#F59E0B] text-[#161311]'
                        : 'bg-[#13100E] text-[#C4BCB0] hover:text-white border border-[#2D241C]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative w-full md:w-72 shrink-0">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#A89F91]" />
                <input
                  type="text"
                  placeholder="جستجوی نام آیتم..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#13100E] border border-[#332920] focus:border-[#F59E0B] text-xs sm:text-sm font-medium text-[#FAF5EB] pr-9 pl-3 py-2 rounded-xl focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Grid of Menu Items for Editing Texts, Prices, Images & Deleting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMenuItems.map(item => {
              const isDefaultLogo = !item.image || item.image === DEFAULT_LOGO_PATH;
              const catLabel = categories.find(c => c.id === item.categoryId)?.label || item.categoryId;
              const itemDisc = getItemDiscountPercent(item);
              const discountedBasePrice = getDiscountedPrice(item.price, itemDisc);

              return (
                <div
                  key={item.id}
                  className="bg-[#181412] border border-[#332920] hover:border-[#F59E0B]/50 rounded-2xl overflow-hidden flex flex-col justify-between shadow-md transition-all"
                >
                  <div>
                    {/* Current Image Preview */}
                    <div className={`relative h-48 w-full flex items-center justify-center group ${isDefaultLogo ? 'bg-white' : 'bg-[#13100D]'}`}>
                      {isDefaultLogo ? (
                        <img
                          src={DEFAULT_LOGO_PATH}
                          alt={item.nameFa}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <>
                          <img
                            src={item.image}
                            alt={item.nameFa}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                        </>
                      )}

                      {/* Category & Discount Badges */}
                      <div className="absolute top-2.5 right-2.5 flex flex-col items-start gap-1">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-black/75 text-[#FBBF24] border border-[#F59E0B]/30">
                          {catLabel}
                        </span>
                        {itemDisc > 0 && (
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-[#EF4444] text-white shadow-md">
                            🔥 {itemDisc.toLocaleString('fa-IR')}٪ تخفیف
                          </span>
                        )}
                      </div>

                      {/* Top-Left Actions: Reset Image & Delete Item */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        {!isDefaultLogo && (
                          <button
                            type="button"
                            onClick={() => handleResetDefaultImage(item)}
                            title="بازگردانی عکس به لوگوی کافه پسین"
                            className="p-1.5 rounded-lg bg-black/75 hover:bg-[#F59E0B] hover:text-black text-white transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(item)}
                          title="حذف این آیتم از منو"
                          className="p-1.5 rounded-lg bg-red-950/90 hover:bg-red-600 text-red-200 hover:text-white border border-red-700/50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Item Title & Price Overlay */}
                      <div className="absolute bottom-2.5 right-2.5 left-2.5 bg-black/75 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10">
                        <h4 className="text-sm font-extrabold text-white truncate">
                          {getContextualItemTitle(item)}
                        </h4>
                        {itemDisc > 0 ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[#A89F91] line-through decoration-red-500 decoration-2 font-bold">
                              {item.price.toLocaleString('fa-IR')}
                            </span>
                            <span className="font-black text-emerald-400">
                              {discountedBasePrice.toLocaleString('fa-IR')} تومان
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-extrabold text-[#FBBF24] block">
                            {item.priceLabel
                              ? `${item.priceLabel} هزار تومان`
                              : `${item.price.toLocaleString('fa-IR')} تومان`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Edit, Quick Discount & Upload Controls */}
                    <div className="p-3.5 space-y-2.5">
                      {/* Quick Owner Discount Control */}
                      <div className="p-2.5 rounded-xl bg-[#13100E] border border-[#2F251E] space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-[#E6DEC8] flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-[#EF4444]" />
                            <span>اعمال تخفیف (٪):</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={90}
                              value={itemDisc || ''}
                              placeholder="۰"
                              onChange={e => {
                                const val = Math.min(90, Math.max(0, Math.round(Number(e.target.value) || 0)));
                                onUpdateMenuItem(item.id, {
                                  discountPercent: val > 0 ? val : undefined
                                });
                              }}
                              className="w-12 bg-[#1D1713] border border-[#3E3127] focus:border-[#F59E0B] rounded-md px-1.5 py-0.5 text-xs font-black text-center text-[#FBBF24] focus:outline-none"
                            />
                            <span className="text-[#A89F91] font-bold">٪</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1">
                          {[0, 10, 15, 20].map(pct => {
                            const active = itemDisc === pct;
                            return (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => {
                                  onUpdateMenuItem(item.id, {
                                    discountPercent: pct > 0 ? pct : undefined
                                  });
                                  showToast(
                                    pct > 0
                                      ? `تخفیف ${pct.toLocaleString('fa-IR')}٪ روی «${item.nameFa}» اعمال شد.`
                                      : `تخفیف «${item.nameFa}» حذف شد.`
                                  );
                                }}
                                className={`py-1 rounded-md text-[11px] transition-all ${
                                  active
                                    ? pct > 0
                                      ? 'bg-[#EF4444] text-white font-black shadow-xs'
                                      : 'bg-[#382C22] text-white font-extrabold'
                                    : 'bg-[#1D1713] text-[#C4BCB0] hover:text-white border border-[#2C231C] font-bold'
                                }`}
                              >
                                {pct === 0 ? 'بدون' : `${pct.toLocaleString('fa-IR')}٪`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Primary Button: Edit Texts & Prices */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#161311] font-extrabold text-xs sm:text-sm transition-all shadow-sm active:scale-95"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>ویرایش نام، نوشته‌ها، قیمت و تخفیف</span>
                      </button>

                      {/* File Upload Button */}
                      <label className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#241C16] hover:bg-[#31261E] border border-[#3E3127] text-[#FFFDF9] font-bold text-xs cursor-pointer transition-all">
                        <Upload className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>آپلود عکس جدید از گالری / سیستم</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleFileUpload(item, e.target.files?.[0])}
                        />
                      </label>

                      {/* Toggle Image URL Input */}
                      {urlInputItemId === item.id ? (
                        <div className="space-y-1.5 pt-1">
                          <input
                            type="url"
                            placeholder="https://example.com/photo.jpg"
                            value={tempImageUrl}
                            onChange={e => setTempImageUrl(e.target.value)}
                            className="w-full bg-[#120F0D] border border-[#3A2E25] focus:border-[#F59E0B] rounded-lg px-2.5 py-1.5 text-xs text-white text-left focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveImageUrl(item)}
                              className="flex-1 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                            >
                              ثبت لینک
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUrlInputItemId(null);
                                setTempImageUrl('');
                              }}
                              className="px-2.5 py-1.5 text-xs bg-[#261F1A] text-[#A89F91] hover:text-white rounded-lg"
                            >
                              انصراف
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setUrlInputItemId(item.id);
                            setTempImageUrl(item.image.startsWith('data:') ? '' : item.image);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#1D1713] hover:bg-[#28201A] border border-[#2D241C] text-[#C4BCB0] hover:text-white text-xs font-semibold transition-colors"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-[#F59E0B]" />
                          <span>تغییر عکس با لینک مستقیم</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Availability & Delete Footer */}
                  <div className="px-3.5 py-2.5 border-t border-[#282019] bg-[#14110E] flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateMenuItem(item.id, { isAvailable: !item.isAvailable });
                        showToast(`وضعیت «${item.nameFa}» بروزرسانی شد.`);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                        item.isAvailable
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {item.isAvailable ? 'موجود در منو' : 'ناموجود'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(item)}
                      className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-950/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف آیتم</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL FOR ADDING OR EDITING A MENU ITEM (TEXTS, PRICES, IMAGE)        */}
      {/* ===================================================================== */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-[#1B1612] border-2 border-[#45362A] rounded-3xl w-full max-w-2xl p-6 shadow-2xl text-[#FFFDF9] max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#332920]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#F59E0B] bg-white flex items-center justify-center shrink-0">
                  <img
                    src={editingItem.image || DEFAULT_LOGO_PATH}
                    alt={editingItem.nameFa || 'آیتم'}
                    className="w-full h-full object-cover scale-105"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {isAddingNew ? 'افزودن آیتم جدید به منوی کافه پسین' : `ویرایش «${editingItem.nameFa}»`}
                  </h3>
                  <span className="text-xs text-[#C4BCB0]">
                    تغییر نام، دسته‌بندی، توضیحات، قیمت‌ها و تصویر آیتم
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-[#C4BCB0] hover:text-white p-1.5 rounded-xl hover:bg-[#2A211B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalItem} className="py-5 space-y-5">
              {/* Row 1: Name Fa, Name En, Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-[#FBBF24] mb-1.5">
                    نام فارسی آیتم (الزامی):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: اسپرسو / شیک نوتلا"
                    value={editingItem.nameFa}
                    onChange={e => setEditingItem({ ...editingItem, nameFa: e.target.value })}
                    className="w-full bg-[#13100D] border border-[#3A2E24] focus:border-[#F59E0B] rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#D6CFC2] mb-1.5">
                    نام انگلیسی (اختیاری):
                  </label>
                  <input
                    type="text"
                    placeholder="Espresso / Nutella Shake"
                    value={editingItem.nameEn}
                    onChange={e => setEditingItem({ ...editingItem, nameEn: e.target.value })}
                    className="w-full bg-[#13100D] border border-[#3A2E24] focus:border-[#F59E0B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#FBBF24] mb-1.5">
                    دسته‌بندی در منو:
                  </label>
                  <select
                    value={editingItem.categoryId}
                    onChange={e => {
                      const newCat = e.target.value as CategoryId;
                      setEditingItem({ ...editingItem, categoryId: newCat });
                    }}
                    className="w-full bg-[#13100D] border border-[#3A2E24] focus:border-[#F59E0B] rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none"
                  >
                    {itemCategories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-[#181412] text-white">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Base Price, Display Price Label, Calories & Diet Tag */}
              <div className="p-4 bg-[#14100D] border border-[#332920] rounded-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-[#FBBF24] mb-1">
                      قیمت پایه (به تومان):
                    </label>
                    <input
                      type="number"
                      step={5000}
                      min={0}
                      value={editingItem.price}
                      onChange={e =>
                        setEditingItem({ ...editingItem, price: Number(e.target.value) || 0 })
                      }
                      className="w-full bg-[#1C1612] border border-[#3E3127] focus:border-[#F59E0B] rounded-xl px-3.5 py-2 text-sm font-extrabold text-[#FBBF24] focus:outline-none"
                    />
                    <span className="text-[11px] text-[#A89F91] mt-1 block">
                      معادل: {Math.round(editingItem.price / 1000).toLocaleString('fa-IR')} هزار تومان در جدول منو
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#D6CFC2] mb-1">
                      نوشته دلخواه قیمت در منو (اختیاری):
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: ۱۵۰ تا ۳۱۰ یا ۳۱۰ - ۳۵۰ (خالی = محاسبه خودکار)"
                      value={editingItem.priceLabel || ''}
                      onChange={e =>
                        setEditingItem({ ...editingItem, priceLabel: e.target.value })
                      }
                      className="w-full bg-[#1C1612] border border-[#3E3127] focus:border-[#F59E0B] rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none"
                    />
                    <span className="text-[11px] text-[#A89F91] mt-1 block">
                      اگر خالی بگذارید، عدد قیمت پایه (به هزار تومان) نمایش داده می‌شود.
                    </span>
                  </div>
                </div>

                {/* Owner Discount Configuration inside Modal */}
                <div className="pt-3 border-t border-[#2A211B] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-extrabold text-[#EF4444]">
                      <Tag className="w-4 h-4" />
                      <span>میزان تخفیف این آیتم (۰ تا ۹۰ درصد):</span>
                    </label>
                    {getItemDiscountPercent(editingItem) > 0 && (
                      <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-2.5 py-0.5 rounded-lg">
                        قیمت با تخفیف:{' '}
                        {getDiscountedPrice(
                          editingItem.price,
                          getItemDiscountPercent(editingItem)
                        ).toLocaleString('fa-IR')}{' '}
                        تومان
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={90}
                      step={1}
                      value={editingItem.discountPercent || 0}
                      onChange={e =>
                        setEditingItem({
                          ...editingItem,
                          discountPercent: Math.min(
                            90,
                            Math.max(0, Math.round(Number(e.target.value) || 0))
                          )
                        })
                      }
                      className="w-24 bg-[#1C1612] border border-[#3E3127] focus:border-[#EF4444] rounded-xl px-3 py-2 text-sm font-black text-center text-white focus:outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[0, 10, 15, 20, 25, 30].map(pct => {
                        const isSelectedPct = getItemDiscountPercent(editingItem) === pct;
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() =>
                              setEditingItem({
                                ...editingItem,
                                discountPercent: pct > 0 ? pct : undefined
                              })
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                              isSelectedPct
                                ? pct > 0
                                  ? 'bg-[#EF4444] text-white font-black shadow'
                                  : 'bg-[#382C22] text-white font-extrabold'
                                : 'bg-[#1C1612] text-[#C4BCB0] hover:text-white border border-[#332920] font-bold'
                            }`}
                          >
                            {pct === 0 ? 'بدون تخفیف (۰٪)' : `${pct.toLocaleString('fa-IR')}٪`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#2A211B] items-center">
                  <div>
                    <label className="block text-xs font-extrabold text-[#FBBF24] mb-1">
                      میزان کالری آیتم (kcal):
                    </label>
                    <input
                      type="number"
                      step={5}
                      min={0}
                      value={editingItem.calories}
                      onChange={e =>
                        setEditingItem({ ...editingItem, calories: Number(e.target.value) || 0 })
                      }
                      className="w-full bg-[#1C1612] border border-[#3E3127] focus:border-[#F59E0B] rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 sm:pt-4">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-700/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingItem.tags.some(
                          t => t.includes('رژیمی') || t.includes('بدون شکر')
                        )}
                        onChange={e => {
                          const checked = e.target.checked;
                          const filteredTags = editingItem.tags.filter(
                            t => !t.includes('رژیمی') && !t.includes('بدون شکر')
                          );
                          setEditingItem({
                            ...editingItem,
                            tags: checked
                              ? ['رژیمی و بدون شکر', ...filteredTags]
                              : filteredTags
                          });
                        }}
                        className="w-4 h-4 accent-emerald-500 rounded"
                      />
                      <div>
                        <span className="text-xs font-extrabold text-emerald-300 block">
                          آیتم رژیمی / بدون شکر
                        </span>
                        <span className="text-[11px] text-[#A89F91]">
                          پیشنهاد ویژه باریستای هوشمند به مشتریان دارای رژیم
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 3: Coffee Matrix Editor (for Coffee items or any item using 3 coffee lines) */}
              <div className="p-4 bg-[#14100D] border border-[#362B22] rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#FBBF24] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCoffeeMatrixInForm}
                      onChange={e => {
                        const checked = e.target.checked;
                        setHasCoffeeMatrixInForm(checked);
                        if (checked && !editingItem.coffeeMatrix) {
                          setEditingItem({
                            ...editingItem,
                            coffeeMatrix: {
                              blend7030: { single: 200000, double: 250000 },
                              blend8020: { single: 250000, double: 300000 },
                              arabica100: { single: 300000, double: 350000 }
                            }
                          });
                        }
                      }}
                      className="w-4 h-4 accent-[#F59E0B] rounded"
                    />
                    <span>دارای جدول ۳ لاین قهوه (۷۰-۳۰، ۲۰-۸۰، ۱۰۰ عربیکا)</span>
                  </label>

                  {hasCoffeeMatrixInForm && (
                    <label className="flex items-center gap-1.5 text-xs font-bold text-[#D6CFC2] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFixedBlendMatrix}
                        onChange={e => {
                          const fixed = e.target.checked;
                          setIsFixedBlendMatrix(fixed);
                          if (fixed) {
                            setEditingItem({
                              ...editingItem,
                              coffeeMatrix: {
                                blend7030: {
                                  fixed:
                                    editingItem.coffeeMatrix?.blend7030?.fixed ??
                                    editingItem.coffeeMatrix?.blend7030?.single ??
                                    370000
                                },
                                blend8020: {
                                  fixed:
                                    editingItem.coffeeMatrix?.blend8020?.fixed ??
                                    editingItem.coffeeMatrix?.blend8020?.single ??
                                    400000
                                },
                                arabica100: {
                                  fixed:
                                    editingItem.coffeeMatrix?.arabica100?.fixed ??
                                    editingItem.coffeeMatrix?.arabica100?.single ??
                                    430000
                                }
                              }
                            });
                          } else {
                            setEditingItem({
                              ...editingItem,
                              coffeeMatrix: {
                                blend7030: { single: 250000, double: 300000 },
                                blend8020: { single: 300000, double: 350000 },
                                arabica100: { single: 350000, double: 400000 }
                              }
                            });
                          }
                        }}
                        className="w-3.5 h-3.5 accent-[#F59E0B] rounded"
                      />
                      <span>تک‌نرخی در هر لاین (بدون سینگل/دبل، مثل کارامل ماکیاتو)</span>
                    </label>
                  )}
                </div>

                {hasCoffeeMatrixInForm && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {(
                      [
                        { key: 'blend7030', title: 'لاین ۷۰ - ۳۰' },
                        { key: 'blend8020', title: 'لاین ۲۰ - ۸۰' },
                        { key: 'arabica100', title: 'لاین ۱۰۰ عربیکا' }
                      ] as const
                    ).map(blend => {
                      const bData = editingItem.coffeeMatrix?.[blend.key];
                      return (
                        <div
                          key={blend.key}
                          className="p-3 rounded-xl bg-[#1B1612] border border-[#2F251D] space-y-2"
                        >
                          <div className="text-xs font-extrabold text-[#FBBF24] text-center border-b border-[#2F251D] pb-1.5">
                            {blend.title}
                          </div>
                          {isFixedBlendMatrix ? (
                            <div>
                              <label className="block text-[11px] text-[#C4BCB0] mb-1">
                                قیمت (تومان):
                              </label>
                              <input
                                type="number"
                                step={5000}
                                value={bData?.fixed ?? 0}
                                onChange={e =>
                                  updateMatrixField(blend.key, 'fixed', Number(e.target.value) || 0)
                                }
                                className="w-full bg-[#120F0D] border border-[#3A2E25] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] text-[#C4BCB0] mb-1">
                                  سینگل (تومان):
                                </label>
                                <input
                                  type="number"
                                  step={5000}
                                  value={bData?.single ?? 0}
                                  onChange={e =>
                                    updateMatrixField(
                                      blend.key,
                                      'single',
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  className="w-full bg-[#120F0D] border border-[#3A2E25] rounded-lg px-2 py-1.5 text-xs font-bold text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-[#C4BCB0] mb-1">
                                  دبل (تومان):
                                </label>
                                <input
                                  type="number"
                                  step={5000}
                                  value={bData?.double ?? 0}
                                  onChange={e =>
                                    updateMatrixField(
                                      blend.key,
                                      'double',
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  className="w-full bg-[#120F0D] border border-[#3A2E25] rounded-lg px-2 py-1.5 text-xs font-bold text-white"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Row 3b: Variant Options Editor (if item has variantOptions like V60 or Matcha) */}
              {editingItem.variantOptions && editingItem.variantOptions.length > 0 && (
                <div className="p-4 bg-[#14100D] border border-[#362B22] rounded-2xl space-y-3">
                  <div className="text-xs font-extrabold text-[#FBBF24]">
                    گزینه‌های چند نرخی (مانند تک کاپ / ۲ کاپ):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {editingItem.variantOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#1B1612] border border-[#2F251D] rounded-xl space-y-2"
                      >
                        <div>
                          <label className="block text-[11px] text-[#C4BCB0] mb-1">عنوان گزینه:</label>
                          <input
                            type="text"
                            value={opt.label}
                            onChange={e => updateVariantOption(idx, 'label', e.target.value)}
                            className="w-full bg-[#120F0D] border border-[#3A2E25] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#C4BCB0] mb-1">
                            قیمت (تومان):
                          </label>
                          <input
                            type="number"
                            step={5000}
                            value={opt.price}
                            onChange={e =>
                              updateVariantOption(idx, 'price', Number(e.target.value) || 0)
                            }
                            className="w-full bg-[#120F0D] border border-[#3A2E25] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#FBBF24]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 4: Description */}
              <div>
                <label className="block text-xs font-extrabold text-[#FBBF24] mb-1.5">
                  توضیحات و ترکیبات آیتم:
                </label>
                <textarea
                  rows={2}
                  placeholder="توضیحات آیتم برای نمایش در منو..."
                  value={editingItem.description}
                  onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full bg-[#13100D] border border-[#3A2E24] focus:border-[#F59E0B] rounded-xl p-3 text-sm text-white focus:outline-none"
                />
              </div>

              {/* Row 5: Image in Modal */}
              <div className="p-4 bg-[#14100D] border border-[#332920] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-[#F59E0B] bg-white flex items-center justify-center shrink-0">
                    <img
                      src={editingItem.image || DEFAULT_LOGO_PATH}
                      alt="پیش‌نمایش"
                      className="w-full h-full object-cover scale-105"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-white block">تصویر آیتم</span>
                    <span className="text-[11px] text-[#A89F91]">
                      پیش‌فرض: لوگوی دایره‌ای کافه پسین
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#241C16] hover:bg-[#31261E] border border-[#3E3127] text-xs font-bold text-[#FBBF24] cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>آپلود عکس</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFileUpload(editingItem, e.target.files?.[0], true)}
                    />
                  </label>

                  {editingItem.image !== DEFAULT_LOGO_PATH && (
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, image: DEFAULT_LOGO_PATH })}
                      className="px-3 py-2 rounded-xl bg-[#1D1713] hover:bg-[#28201A] border border-[#332920] text-xs font-bold text-[#C4BCB0] hover:text-white"
                    >
                      استفاده از لوگوی پسین
                    </button>
                  )}
                </div>
              </div>

              {/* Submit / Cancel Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#332920]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#261F1A] hover:bg-[#332922] text-xs sm:text-sm font-bold text-[#C4BCB0] hover:text-white transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#161311] font-extrabold text-xs sm:text-sm shadow-lg transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{isAddingNew ? 'ثبت و افزودن به منو' : 'ذخیره تغییرات در منو'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: FINANCIAL REPORTS & PROFIT ESTIMATIONS */}
      {activeSubTab === 'financial' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#C4BCB0]">بازه زمانی محاسبات مالی:</span>
            <div className="flex items-center gap-1 bg-[#1A1512] p-1 rounded-xl border border-[#2B231D]">
              <button
                type="button"
                onClick={() => setFinancialTimeframe('daily')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  financialTimeframe === 'daily'
                    ? 'bg-[#2E241D] text-[#F59E0B]'
                    : 'text-[#8A8072] hover:text-white'
                }`}
              >
                روزانه (امروز)
              </button>
              <button
                type="button"
                onClick={() => setFinancialTimeframe('weekly')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  financialTimeframe === 'weekly'
                    ? 'bg-[#2E241D] text-[#F59E0B]'
                    : 'text-[#8A8072] hover:text-white'
                }`}
              >
                هفتگی (۷ روز اخیر)
              </button>
              <button
                type="button"
                onClick={() => setFinancialTimeframe('monthly')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  financialTimeframe === 'monthly'
                    ? 'bg-[#2E241D] text-[#F59E0B]'
                    : 'text-[#8A8072] hover:text-white'
                }`}
              >
                ماهانه و تخمین سود
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#181412] border border-[#2D251F] rounded-2xl p-5 space-y-2">
              <span className="text-xs text-[#8F8476] block">
                {financialTimeframe === 'daily'
                  ? 'فروش کل امروز:'
                  : financialTimeframe === 'weekly'
                  ? 'فروش کل هفتگی:'
                  : 'فروش کل ماهانه:'}
              </span>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {Math.round(
                  financialTimeframe === 'daily'
                    ? todayRevenue
                    : financialTimeframe === 'weekly'
                    ? weeklyRevenue
                    : monthlyRevenue
                ).toLocaleString('fa-IR')}
                <span className="text-xs text-[#8F8476] mr-1">تومان</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+۱۸٪ رشد نسبت به دوره قبل</span>
              </div>
            </div>

            <div className="bg-[#181412] border border-[#F59E0B]/40 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-md shadow-[#D97706]/10">
              <span className="text-xs text-[#D4C9BC] font-semibold block">
                {financialTimeframe === 'daily'
                  ? 'سود خالص تخمینی امروز:'
                  : financialTimeframe === 'weekly'
                  ? 'سود خالص تخمینی هفتگی:'
                  : 'پیش‌بینی سود خالص ماهانه:'}
              </span>
              <div className="text-xl sm:text-2xl font-bold text-[#F59E0B]">
                {Math.round(
                  financialTimeframe === 'daily'
                    ? todayProfit
                    : financialTimeframe === 'weekly'
                    ? weeklyProfit
                    : monthlyProfit
                ).toLocaleString('fa-IR')}
                <span className="text-xs text-[#8F8476] mr-1">تومان</span>
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span>
                  حاشیه سود میانگین: <strong>{todayProfitMargin}٪</strong>
                </span>
              </div>
            </div>

            <div className="bg-[#181412] border border-[#2D251F] rounded-2xl p-5 space-y-2">
              <span className="text-xs text-[#8F8476] block">میانگین ارزش هر سفارش (AOV):</span>
              <div className="text-xl sm:text-2xl font-bold text-white">
                ۵۴۵,۰۰۰
                <span className="text-xs text-[#8F8476] mr-1">تومان</span>
              </div>
              <div className="text-[11px] text-[#A89F91]">
                با آفرهای هوشمند مکمل: <strong>+۳۲٪ افزایش</strong>
              </div>
            </div>

            <div className="bg-[#181412] border border-[#2D251F] rounded-2xl p-5 space-y-2">
              <span className="text-xs text-[#8F8476] block">آیتم‌های فعال منو:</span>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {menuItems.filter(i => i.isAvailable).length} از {menuItems.length}
              </div>
              <div className="text-[11px] text-emerald-400">همگی آماده سفارش‌گیری آنلاین</div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INVENTORY & STOCK MANAGEMENT */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6 animate-fade-in">
          {lowStockItems.length > 0 && (
            <div className="p-4 bg-amber-950/60 border border-amber-700/60 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-200">
                    هشدار کمبود موجودی در {lowStockItems.length} قلم کالا
                  </h4>
                  <p className="text-xs text-amber-300/80">
                    موجودی اقلامی مانند «{lowStockItems.map(i => i.name.split(' ')[0]).join('، ')}» به آستانه بحرانی رسیده است.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#181412] border border-[#2D251F] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#29211B] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">لیست مواد اولیه و انبارداری کافه</h3>
              <span className="text-xs text-[#8A8072]">کل اقلام: {inventory.length} مورد</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#14100E] text-[#8A8072] border-b border-[#251D18]">
                  <tr>
                    <th className="p-3.5">نام ماده اولیه</th>
                    <th className="p-3.5">موجودی فعلی</th>
                    <th className="p-3.5">حداقل هشدار</th>
                    <th className="p-3.5">هزینه واحد</th>
                    <th className="p-3.5 text-center">تنظیم سریع موجودی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#231A14]">
                  {inventory.map(item => (
                    <tr key={item.id} className="hover:bg-[#1C1714] transition-colors">
                      <td className="p-3.5 font-bold text-white">{item.name}</td>
                      <td className="p-3.5 font-bold text-[#F59E0B]">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="p-3.5 text-[#8C8276]">
                        {item.minThreshold} {item.unit}
                      </td>
                      <td className="p-3.5 text-white">
                        {item.costPerUnit.toLocaleString('fa-IR')} ت
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateInventoryStock(item.id, Math.max(0, item.currentStock - 1))
                            }
                            className="p-1 rounded bg-[#271E18] text-[#8C8276] hover:text-white"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold w-8 text-center">
                            {item.currentStock}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateInventoryStock(item.id, item.currentStock + 1)}
                            className="p-1 rounded bg-[#271E18] text-[#8C8276] hover:text-white"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: KITCHEN DISPLAY SYSTEM (KDS) ORDERS */}
      {activeSubTab === 'orders' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">سفارشات زنده باریستا (KDS)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(order => {
              const isServed = order.status === 'served';
              return (
                <div
                  key={order.id}
                  className={`bg-[#181412] border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                    order.status === 'pending'
                      ? 'border-[#F59E0B]'
                      : isServed
                      ? 'border-[#28211B] opacity-75'
                      : 'border-emerald-500/50'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between border-b border-[#261E18] pb-3">
                      <div>
                        <span className="font-bold text-base text-white">#{order.orderNumber}</span>
                        <span className="text-xs text-[#8C8173] block mt-0.5">
                          {order.customerName} ({order.customerPhone})
                        </span>
                      </div>
                      <span className="text-xs text-[#8C8173]">{order.createdAt}</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {order.items.map(it => (
                        <div key={it.cartItemId} className="flex justify-between items-start">
                          <span className="font-bold text-white">
                            {it.quantity} × {it.item.nameFa}
                          </span>
                          <span className="text-[#F59E0B] font-bold">
                            {(
                              (it.discountedPrice ?? it.unitPrice ?? it.item.price) * it.quantity
                            ).toLocaleString('fa-IR')}{' '}
                            ت
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#261E18] flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-400">
                      {order.total.toLocaleString('fa-IR')} ت
                    </span>
                    <div className="flex items-center gap-1.5">
                      {order.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => onUpdateOrderStatus(order.id, 'preparing')}
                          className="px-3 py-1.5 text-xs font-bold text-black bg-[#F59E0B] rounded-lg"
                        >
                          شروع تهیه
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          type="button"
                          onClick={() => onUpdateOrderStatus(order.id, 'ready')}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg"
                        >
                          آماده سرو
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button
                          type="button"
                          onClick={() => onUpdateOrderStatus(order.id, 'served')}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg"
                        >
                          تحویل شد
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: AI INSIGHTS */}
      {activeSubTab === 'ai_insights' && (
        <div className="bg-[#181412] border border-[#2D251F] rounded-2xl p-6 space-y-3 animate-fade-in">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#F59E0B]" />
            <span>تحلیل هوشمند فروش کافه پسین</span>
          </h3>
          <p className="text-xs sm:text-sm text-[#C4BCB0] leading-relaxed">
            پیشنهادهای ترکیبی باریستا هوشمند به طور میانگین باعث افزایش ۳۲ درصدی سبد خرید مشتریان در سفارش دسر و کیک‌های روز در کنار نوشیدنی‌های بر پایه قهوه شده است.
          </p>
        </div>
      )}
    </div>
  );
};
