import React, { useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Clock,
  Flame,
  Check,
  X,
  LayoutGrid,
  BookOpen,
  Phone,
  Instagram,
  Coffee,
  Leaf,
  Cake,
  Snowflake,
  CupSoda,
  IceCream,
  Citrus
} from 'lucide-react';
import { MenuItem, CategoryId, CartItem } from '../types';
import {
  getCategoryLabelFa,
  getContextualItemTitle,
  getDiscountedPrice,
  getItemDiscountPercent
} from '../utils/menuHelpers';

const DEFAULT_LOGO_PATH = '/images/passin_logo.png';

interface DigitalMenuProps {
  menuItems: MenuItem[];
  cart: CartItem[];
  heroImage?: string;
  onAddToCartWithOptions: (item: MenuItem, options: {
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
  }) => void;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onOpenQuiz: () => void;
}

export const DigitalMenu: React.FC<DigitalMenuProps> = ({
  menuItems,
  cart,
  heroImage,
  onAddToCartWithOptions,
  onUpdateQuantity,
  onRemoveItem,
  onOpenQuiz
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'classic_board'>('classic_board');
  const [activeItemForCustomization, setActiveItemForCustomization] = useState<MenuItem | null>(null);

  // Customization state
  const [selectedBlend, setSelectedBlend] = useState<'blend7030' | 'blend8020' | 'arabica100'>('blend7030');
  const [selectedShot, setSelectedShot] = useState<'single' | 'double'>('single');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [selectedFlavor, setSelectedFlavor] = useState<string>('');
  const [extraHotMilk, setExtraHotMilk] = useState<boolean>(false);
  const [selectedMilk, setSelectedMilk] = useState('شیر معمولی');
  const [sweetness, setSweetness] = useState('طبیعی / متعادل');
  const [customNotes, setCustomNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  const categories: { id: CategoryId; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'همه آیتم‌ها', icon: Sparkles },
    { id: 'coffee', label: 'بر پایه قهوه', icon: Coffee },
    { id: 'brewed', label: 'قهوه‌های دمی', icon: Coffee },
    { id: 'hot_drinks', label: 'نوشیدنی‌های گرم', icon: Flame },
    { id: 'herbal', label: 'دمنوش‌ها', icon: Leaf },
    { id: 'pastry', label: 'شیرینی / دسر / میان‌وعده', icon: Cake },
    { id: 'cold_drinks', label: 'نوشیدنی‌های سرد', icon: Snowflake },
    { id: 'smoothie', label: 'اسموتی‌های میوه‌ای', icon: Citrus },
    { id: 'milkshake', label: 'میلک شیک‌ها', icon: IceCream },
    { id: 'mocktail', label: 'نوشیدنی‌های گازدار', icon: CupSoda }
  ];

  const availableMenuItems = menuItems.filter(i => i.isAvailable);

  const filteredItems = availableMenuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch =
      item.nameFa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.flavorNotes.some(n => n.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatShortPrice = (priceInTomans?: number) => {
    if (!priceInTomans) return '—';
    return Math.round(priceInTomans / 1000).toLocaleString('fa-IR');
  };

  const handleOpenCustomization = (
    item: MenuItem,
    presetBlend?: 'blend7030' | 'blend8020' | 'arabica100',
    presetShot?: 'single' | 'double',
    presetVariantIdx?: number
  ) => {
    setActiveItemForCustomization(item);
    setSelectedBlend(presetBlend || 'blend7030');
    setSelectedShot(presetShot || 'single');
    setSelectedVariantIdx(presetVariantIdx ?? 0);
    setSelectedFlavor(item.flavorChoices?.[0] || '');
    setExtraHotMilk(false);
    setSelectedMilk('شیر معمولی');
    setSweetness('طبیعی / متعادل');
    setCustomNotes('');
    setQuantity(1);
  };

  const computeCurrentUnitPrice = (item: MenuItem): number => {
    if (item.coffeeMatrix) {
      const blendObj = item.coffeeMatrix[selectedBlend];
      if (blendObj) {
        if (blendObj.fixed !== undefined) return blendObj.fixed;
        if (selectedShot === 'double' && blendObj.double !== undefined) return blendObj.double;
        if (blendObj.single !== undefined) return blendObj.single;
      }
    }
    if (item.variantOptions && item.variantOptions[selectedVariantIdx]) {
      return item.variantOptions[selectedVariantIdx].price;
    }
    return item.price;
  };

  const blendLabels: Record<'blend7030' | 'blend8020' | 'arabica100', string> = {
    blend7030: '۷۰ - ۳۰',
    blend8020: '۲۰ - ۸۰',
    arabica100: '۱۰۰ عربیکا'
  };

  const handleConfirmAddToCart = () => {
    if (!activeItemForCustomization) return;
    const unitPrice = computeCurrentUnitPrice(activeItemForCustomization);
    const discPct = getItemDiscountPercent(activeItemForCustomization);
    const discountedPrice = discPct > 0 ? getDiscountedPrice(unitPrice, discPct) : undefined;

    let variantSummary = '';
    if (activeItemForCustomization.variantOptions?.[selectedVariantIdx]) {
      variantSummary = activeItemForCustomization.variantOptions[selectedVariantIdx].label;
    }
    if (selectedFlavor) {
      variantSummary = variantSummary ? `${variantSummary} (${selectedFlavor})` : selectedFlavor;
    }

    const hasCoffeeMatrix = !!activeItemForCustomization.coffeeMatrix;
    const blendData = activeItemForCustomization.coffeeMatrix?.[selectedBlend];
    const hasShotChoice = blendData && blendData.fixed === undefined;

    onAddToCartWithOptions(activeItemForCustomization, {
      selectedBlend: hasCoffeeMatrix ? blendLabels[selectedBlend] : undefined,
      selectedShot: hasCoffeeMatrix && hasShotChoice ? (selectedShot === 'single' ? 'سینگل' : 'دبل') : undefined,
      selectedVariant: variantSummary || undefined,
      extraHotMilk: extraHotMilk || undefined,
      selectedMilk: (activeItemForCustomization.categoryId === 'coffee' || activeItemForCustomization.categoryId === 'hot_drinks') ? selectedMilk : undefined,
      sweetness,
      notes: customNotes,
      unitPrice,
      discountedPrice,
      quantity
    });

    const itemName = getContextualItemTitle(activeItemForCustomization);
    setActiveItemForCustomization(null);
    setAddedToast(`${itemName} به سبد سفارش اضافه شد.`);
    setTimeout(() => setAddedToast(null), 3000);
  };

  // Group items for classic menu board
  const coffeeItems = availableMenuItems.filter(i => i.categoryId === 'coffee');
  const brewedItems = availableMenuItems.filter(i => i.categoryId === 'brewed');
  const smoothieItems = availableMenuItems.filter(i => i.categoryId === 'smoothie');
  const coldDrinkItems = availableMenuItems.filter(i => i.categoryId === 'cold_drinks');
  const pastryItems = availableMenuItems.filter(i => i.categoryId === 'pastry');
  const herbalItems = availableMenuItems.filter(i => i.categoryId === 'herbal');
  const hotDrinkItems = availableMenuItems.filter(i => i.categoryId === 'hot_drinks');
  const milkshakeItems = availableMenuItems.filter(i => i.categoryId === 'milkshake');
  const mocktailItems = availableMenuItems.filter(i => i.categoryId === 'mocktail');

  // Helper to render item thumbnail (shows full Passin logo or custom item image)
  const renderItemAvatar = (item: MenuItem, sizeClass = 'w-14 h-14') => {
    const isDefaultLogo = !item.image || item.image === DEFAULT_LOGO_PATH;
    return (
      <div
        className={`${sizeClass} rounded-xl overflow-hidden border border-[#F59E0B]/70 bg-white flex items-center justify-center shrink-0 shadow-sm`}
      >
        <img
          src={item.image || DEFAULT_LOGO_PATH}
          alt={item.nameFa}
          referrerPolicy="no-referrer"
          className={`w-full h-full ${isDefaultLogo ? 'object-contain p-1' : 'object-cover'}`}
        />
      </div>
    );
  };

  const getCartEntryOptionLabel = (entry: CartItem): string => {
    const parts = [entry.selectedVariant, entry.selectedBlend, entry.selectedShot].filter(Boolean);
    return parts.join(' · ');
  };

  const renderInlineStepperPill = (entry: CartItem) => (
    <div
      className="inline-flex items-center gap-1 bg-emerald-950/90 border border-emerald-500/80 rounded-xl px-1.5 py-1 shadow-sm shrink-0"
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onUpdateQuantity(entry.cartItemId, entry.quantity + 1)}
        title="افزایش تعداد"
        className="w-6 h-6 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#111] flex items-center justify-center font-black transition-colors"
      >
        <Plus className="w-3.5 h-3.5 stroke-[3]" />
      </button>
      <span className="min-w-[22px] text-center text-xs font-black text-white px-0.5">
        {entry.quantity.toLocaleString('fa-IR')}
      </span>
      <button
        type="button"
        onClick={() =>
          entry.quantity > 1
            ? onUpdateQuantity(entry.cartItemId, entry.quantity - 1)
            : onRemoveItem(entry.cartItemId)
        }
        title="کاهش تعداد"
        className="w-6 h-6 rounded-lg bg-[#231C16] hover:bg-[#352A21] text-white border border-[#3E3127] flex items-center justify-center transition-colors"
      >
        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
      <button
        type="button"
        onClick={() => onRemoveItem(entry.cartItemId)}
        title="حذف از سبد خرید"
        className="w-6 h-6 rounded-lg bg-red-950/80 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 flex items-center justify-center transition-colors mr-0.5"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const renderInlineCartRowsForItem = (item: MenuItem) => {
    const entries = cart.filter(c => c.item.id === item.id);
    if (entries.length === 0) return null;
    return (
      <div className="space-y-1 pt-0.5">
        {entries.map(entry => {
          const optLabel = getCartEntryOptionLabel(entry);
          return (
            <div
              key={entry.cartItemId}
              className="flex items-center justify-between gap-2 bg-emerald-950/45 border border-emerald-600/45 rounded-xl px-3 py-1.5"
            >
              <span className="text-xs font-extrabold text-emerald-200 truncate">
                {optLabel ? `در سبد خرید: ${optLabel}` : 'در سبد خرید شما'}
              </span>
              {renderInlineStepperPill(entry)}
            </div>
          );
        })}
      </div>
    );
  };

  // Helper to render a strictly aligned menu row (all names right-aligned under each other, all prices left-aligned in a uniform column under each other, zero overflow)
  const renderMenuRow = (item: MenuItem) => {
    const discPct = getItemDiscountPercent(item);
    const discountedPrice = getDiscountedPrice(item.price, discPct);
    const hasInCart = cart.some(c => c.item.id === item.id);
    return (
      <div key={item.id} className="space-y-1">
        <button
          type="button"
          onClick={() => handleOpenCustomization(item)}
          className={`w-full grid grid-cols-[1fr_96px] items-center gap-3 py-2.5 px-3.5 rounded-xl transition-all text-right group ${
            hasInCart
              ? 'bg-[#15231B] hover:bg-[#1B2D23] border border-emerald-500/60'
              : 'bg-[#14100D]/70 hover:bg-[#261E18] border border-[#2B221B] hover:border-[#F59E0B]/50'
          }`}
        >
          <span className="text-[#FFFDF9] group-hover:text-[#FBBF24] font-bold text-sm sm:text-[15px] transition-colors leading-relaxed min-w-0 break-words text-right flex flex-wrap items-center gap-1.5">
            <span>{item.nameFa}</span>
            {discPct > 0 && (
              <span className="bg-[#EF4444] text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-xs">
                {discPct.toLocaleString('fa-IR')}٪ تخفیف
              </span>
            )}
          </span>
          {discPct > 0 ? (
            <span className="w-24 text-center font-black text-xs sm:text-sm text-emerald-400 bg-emerald-950/70 group-hover:bg-emerald-500 group-hover:text-[#111] py-1 px-1.5 rounded-lg border border-emerald-500/60 transition-all shadow-xs">
              <span className="text-[10px] text-[#A89F91] group-hover:text-[#222] line-through ml-1 font-bold">
                {formatShortPrice(item.price)}
              </span>
              {formatShortPrice(discountedPrice)}
            </span>
          ) : (
            <span className="w-24 text-center font-extrabold text-sm sm:text-[15px] text-[#FBBF24] bg-[#241C15] group-hover:bg-[#F59E0B] group-hover:text-[#161311] py-1 px-2 rounded-lg border border-[#423327] transition-all shadow-xs">
              {item.priceLabel || formatShortPrice(item.price)}
            </span>
          )}
        </button>
        {renderInlineCartRowsForItem(item)}
      </div>
    );
  };

  // Helper to render luxury section header with clearer, bolder typography
  const renderSectionHeader = (title: string, Icon: React.ElementType) => (
    <div className="flex items-center gap-2.5 border-b-2 border-[#3E3127] pb-3 mb-3.5">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center text-[#161311] shadow-md shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="text-lg sm:text-xl font-black text-[#FBBF24] tracking-tight drop-shadow-xs">
        {title}
      </h3>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* Toast Alert */}
      {addedToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#161311] border-2 border-[#F59E0B] text-[#FFFDF9] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-slide-up">
          <Check className="w-5 h-5 text-[#F59E0B]" />
          <span className="text-sm font-bold">{addedToast}</span>
        </div>
      )}

      {/* Hero Showcase */}
      <div className="relative rounded-3xl overflow-hidden border border-[#3E3127] bg-gradient-to-br from-[#1D1713] via-[#16120F] to-[#120E0C] shadow-2xl">
        {/* Subtle Warm Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#F59E0B]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[250px] items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-9 flex flex-col justify-between z-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Circular Medallion Logo */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[#F59E0B] ring-4 ring-[#F59E0B]/20 bg-white flex items-center justify-center shrink-0 shadow-xl shadow-black/60">
                <img
                  src={DEFAULT_LOGO_PATH}
                  alt="لوگو کافه پسین"
                  className="w-full h-full object-cover scale-105"
                />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#FBBF24] bg-[#282019] border border-[#45362A] px-3.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  <span>سرو تخصصی در ۳ لاین قهوه: ۷۰-۳۰ · ۸۰-۲۰ · ۱۰۰٪ عربیکا</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-[#FFFDF9] tracking-tight leading-tight drop-shadow-sm">
                  کافـه پسین · Passin Cafe
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-6">
              <button
                type="button"
                onClick={onOpenQuiz}
                className="flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold text-[#161311] bg-gradient-to-r from-[#FBBF24] to-[#D97706] hover:from-[#F59E0B] hover:to-[#B45309] rounded-xl transition-all shadow-lg shadow-[#D97706]/25 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>پیشنهاد هوشمند بر اساس بودجه و سلیقه</span>
              </button>

              <a
                href="https://instagram.com/passincafe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#241C16] hover:bg-[#30251D] border border-[#423429] hover:border-[#F59E0B] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#FBBF24] transition-all"
              >
                <Instagram className="w-4 h-4" />
                <span>@passincafe</span>
              </a>

              <a
                href="tel:07136249850"
                className="flex items-center gap-2 bg-[#241C16] hover:bg-[#30251D] border border-[#423429] hover:border-[#F59E0B] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#FFFDF9] transition-all"
                dir="ltr"
              >
                <Phone className="w-4 h-4 text-[#F59E0B]" />
                <span>0713-624-9850</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[190px] lg:min-h-full">
            <img
              src={heroImage || '/images/cafe_hero_ambiance_1791965391181.jpg'}
              alt="فضای کافه پسین"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#16120F] via-[#16120F]/45 to-transparent" />
          </div>
        </div>
      </div>

      {/* View Switcher, Category Filter and Search Bar */}
      <div className="flex flex-col gap-4 pt-1">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-[#1A1512] p-1.5 rounded-2xl border border-[#332922] self-start">
            <button
              type="button"
              onClick={() => setViewMode('classic_board')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm rounded-xl transition-all ${
                viewMode === 'classic_board'
                  ? 'bg-[#F59E0B] text-[#161311] font-extrabold shadow-md'
                  : 'text-[#C4BCB0] hover:text-white font-semibold'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>نمای منوی کامل (جدول کافه)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm rounded-xl transition-all ${
                viewMode === 'cards'
                  ? 'bg-[#F59E0B] text-[#161311] font-extrabold shadow-md'
                  : 'text-[#C4BCB0] hover:text-white font-semibold'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>نمای کارت‌های تصویری</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A89F91]" />
            <input
              type="text"
              placeholder="جستجوی نام نوشیدنی، شیک، دمنوش..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (e.target.value && viewMode === 'classic_board') {
                  setViewMode('cards');
                }
              }}
              className="w-full bg-[#1C1613] border border-[#362B22] focus:border-[#F59E0B] text-sm font-medium text-[#FFFDF9] pr-10 pl-3 py-2.5 rounded-2xl focus:outline-none placeholder:text-[#8A7F71] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A89F91] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs with Icons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  if (cat.id !== 'all') setViewMode('cards');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm rounded-2xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#F59E0B] text-[#161311] font-extrabold shadow-md shadow-[#D97706]/25'
                    : 'bg-[#1D1814] text-[#D6CFC2] hover:text-white font-bold border border-[#332922] hover:border-[#F59E0B]/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW MODE 1: CLASSIC BOARD VIEW (Luxury Cafe Board - Strictly Aligned)*/}
      {/* ===================================================================== */}
      {viewMode === 'classic_board' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* TOP FULL-WIDTH CARD: بر پایه قهوه */}
          <div className="bg-gradient-to-b from-[#1D1713] to-[#15110E] border border-[#3E3127] rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
            {/* Top Golden Ornamental Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent rounded-full" />

            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#F59E0B]/50 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center text-[#161311] shadow-md">
                  <Coffee className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#FBBF24] tracking-tight">
                  بر پایه قهوه
                </h2>
              </div>
              <span className="text-xs font-bold text-[#E6DEC8] bg-[#261E17] border border-[#423429] px-3 py-1.5 rounded-xl">
                قیمت‌ها به هزار تومان
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#362B22] bg-[#14100D]/80">
              <table className="w-full min-w-[600px] table-fixed text-right text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#362B22] bg-[#211A14] text-[#FBBF24]">
                    <th className="w-[37%] py-3 pr-4 pl-2 font-extrabold text-sm sm:text-base text-right">
                      عنوان نوشیدنی
                    </th>
                    <th colSpan={2} className="w-[21%] py-3 px-1 text-center font-extrabold text-xs sm:text-sm border-r border-[#362B22]">
                      ۷۰ - ۳۰
                    </th>
                    <th colSpan={2} className="w-[21%] py-3 px-1 text-center font-extrabold text-xs sm:text-sm border-r border-[#362B22]">
                      ۲۰ - ۸۰
                    </th>
                    <th colSpan={2} className="w-[21%] py-3 px-1 text-center font-extrabold text-xs sm:text-sm border-r border-[#362B22]">
                      ۱۰۰ عربیکا
                    </th>
                  </tr>
                  <tr className="border-b-2 border-[#3E3127] text-xs font-bold text-[#D6CFC2] bg-[#17120E]">
                    <th className="py-2 pr-4 pl-2 text-right">نام آیتم</th>
                    <th className="py-2 px-1 text-center border-r border-[#362B22]">سینگل</th>
                    <th className="py-2 px-1 text-center border-r border-[#261E18]">دبل</th>
                    <th className="py-2 px-1 text-center border-r border-[#362B22]">سینگل</th>
                    <th className="py-2 px-1 text-center border-r border-[#261E18]">دبل</th>
                    <th className="py-2 px-1 text-center border-r border-[#362B22]">سینگل</th>
                    <th className="py-2 px-1 text-center border-r border-[#261E18]">دبل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B221B]">
                  {coffeeItems.map(item => {
                    const m = item.coffeeMatrix;
                    const isSinglePricePerBlend = m?.blend7030?.fixed !== undefined;
                    const isSingleTotalPrice = !m;
                    const itemCartEntries = cart.filter(c => c.item.id === item.id);

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`transition-colors group ${
                            itemCartEntries.length > 0
                              ? 'bg-[#14231B] hover:bg-[#1A2D23]'
                              : 'hover:bg-[#261E18]'
                          }`}
                        >
                        <td className="py-3 pr-4 pl-2 text-[#FFFDF9] align-middle">
                          <button
                            type="button"
                            onClick={() => handleOpenCustomization(item)}
                            className="w-full text-right hover:text-[#FBBF24] transition-colors font-bold text-sm sm:text-[15px] leading-snug break-words flex flex-wrap items-center gap-1.5"
                          >
                            <span>{item.nameFa}</span>
                            {getItemDiscountPercent(item) > 0 && (
                              <span className="bg-[#EF4444] text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-xs">
                                {getItemDiscountPercent(item).toLocaleString('fa-IR')}٪ تخفیف
                              </span>
                            )}
                          </button>
                        </td>

                        {isSingleTotalPrice ? (
                          <td colSpan={6} className="py-2.5 px-2 text-center border-r border-[#362B22] align-middle">
                            <button
                              type="button"
                              onClick={() => handleOpenCustomization(item)}
                              className="w-28 py-1 rounded-xl bg-[#241C15] hover:bg-[#F59E0B] hover:text-[#161311] text-[#FBBF24] border border-[#45362A] font-extrabold text-sm sm:text-[15px] transition-all text-center inline-block"
                            >
                              {item.priceLabel || formatShortPrice(item.price)}
                            </button>
                          </td>
                        ) : isSinglePricePerBlend ? (
                          <>
                            <td colSpan={2} className="py-2.5 px-1 text-center border-r border-[#362B22] align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomization(item, 'blend7030')}
                                className="w-20 py-1 rounded-lg bg-[#241C16] hover:bg-[#F59E0B] hover:text-[#161311] text-[#FFFDF9] font-extrabold text-sm transition-colors text-center inline-block"
                              >
                                {formatShortPrice(m?.blend7030?.fixed)}
                              </button>
                            </td>
                            <td colSpan={2} className="py-2.5 px-1 text-center border-r border-[#362B22] align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomization(item, 'blend8020')}
                                className="w-20 py-1 rounded-lg bg-[#241C16] hover:bg-[#F59E0B] hover:text-[#161311] text-[#FFFDF9] font-extrabold text-sm transition-colors text-center inline-block"
                              >
                                {formatShortPrice(m?.blend8020?.fixed)}
                              </button>
                            </td>
                            <td colSpan={2} className="py-2.5 px-1 text-center border-r border-[#362B22] align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomization(item, 'arabica100')}
                                className="w-20 py-1 rounded-lg bg-[#2C2118] hover:bg-[#F59E0B] hover:text-[#161311] text-[#FBBF24] font-black text-sm transition-colors text-center inline-block"
                              >
                                {formatShortPrice(m?.arabica100?.fixed)}
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* 70-30 */}
                            <td className="py-2.5 px-1 text-center border-r border-[#362B22] align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomization(item, 'blend7030', 'single')}
                                className="w-14 py-1 rounded-lg hover:bg-[#F59E0B] hover:text-[#161311] text-[#E6DEC8] font-bold text-sm transition-colors text-center inline-block"
                              >
                                {formatShortPrice(m?.blend7030?.single)}
                              </button>
                            </td>
                            <td className="py-2.5 px-1 text-center border-r border-[#261E18] align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomization(item, 'blend7030', 'double')}
                                className="w-14 py-1 rounded-lg hover:bg-[#F59E0B] hover:text-[#161311] text-[#FFFDF9] font-extrabold text-sm transition-colors text-center inline-block"
                              >
                                {formatShortPrice(m?.blend7030?.double)}
                              </button>
                            </td>

                            {/* 80-20 */}
                            <td className="py-2.5 px-1 text-center border-r border-[#362B22] align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomization(item, 'blend8020', 'single')}
                                className="w-14 py-1 rounded-lg hover:bg-[#F59E0B] hover:text-[#161311] text-[#E6DEC8] font-bold text-sm transition-colors text-center inline-block"
                              >
                                {formatShortPrice(m?.blend8020?.single)}
                              </button>
                            </td>
                            <td className="py-2.5 px-1 text-center border-r border-[#261E18] align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomization(item, 'blend8020', 'double')}
                                className="w-14 py-1 rounded-lg hover:bg-[#F59E0B] hover:text-[#161311] text-[#FFFDF9] font-extrabold text-sm transition-colors text-center inline-block"
                              >
                                {formatShortPrice(m?.blend8020?.double)}
                              </button>
                            </td>

                            {/* 100 Arabica */}
                            <td className="py-2.5 px-1 text-center border-r border-[#362B22] align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomization(item, 'arabica100', 'single')}
                                className="w-14 py-1 rounded-lg hover:bg-[#F59E0B] hover:text-[#161311] text-[#FBBF24] font-bold text-sm transition-colors text-center inline-block"
                              >
                                {formatShortPrice(m?.arabica100?.single)}
                              </button>
                            </td>
                            <td className="py-2.5 px-1 text-center border-r border-[#261E18] align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomization(item, 'arabica100', 'double')}
                                className="w-14 py-1 rounded-lg hover:bg-[#F59E0B] hover:text-[#161311] text-[#FBBF24] font-black text-sm transition-colors text-center inline-block"
                              >
                                {formatShortPrice(m?.arabica100?.double)}
                              </button>
                            </td>
                          </>
                        )}
                        </tr>
                        {itemCartEntries.length > 0 && (
                          <tr className="bg-[#111E17]">
                            <td colSpan={7} className="py-2 px-4">
                              <div className="flex flex-wrap items-center gap-2">
                                {itemCartEntries.map(entry => {
                                  const optLabel = getCartEntryOptionLabel(entry);
                                  return (
                                    <div
                                      key={entry.cartItemId}
                                      className="inline-flex items-center gap-2.5 bg-emerald-950/60 border border-emerald-500/50 rounded-xl px-3 py-1"
                                    >
                                      <span className="text-xs font-extrabold text-emerald-200">
                                        {optLabel ? `در سبد: ${optLabel}` : 'در سبد خرید'}
                                      </span>
                                      {renderInlineStepperPill(entry)}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Notice Banner from Menu */}
            <div className="py-3.5 px-4 border border-[#F59E0B]/45 bg-gradient-to-r from-[#18130E] via-[#271E16] to-[#18130E] rounded-2xl text-center text-xs sm:text-sm font-extrabold text-[#FBBF24] shadow-inner">
              دوستان عزیز در صورت تمایل به داغ تر شدن شیر لطفا ما را با خبر نمایید.
            </div>
          </div>

          {/* ALL OTHER CATEGORIES IN A SPACIOUS, STRICTLY ALIGNED 2-COLUMN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Column 1: نوشیدنی‌های گرم + قهوه‌های دمی + دمنوش‌ها + شیرینی / دسر / میان‌وعده */}
            <div className="space-y-6">
              {/* نوشیدنی‌های گرم */}
              <div className="bg-gradient-to-b from-[#1D1713] to-[#15110E] border border-[#3E3127] rounded-3xl p-5 sm:p-6 shadow-xl">
                {renderSectionHeader('نوشیدنی‌های گرم', Flame)}
                <div className="space-y-2">
                  {hotDrinkItems.map(item => renderMenuRow(item))}
                </div>
              </div>

              {/* قهوه‌های دمی */}
              <div className="bg-gradient-to-b from-[#1D1713] to-[#15110E] border border-[#3E3127] rounded-3xl p-5 sm:p-6 shadow-xl">
                {renderSectionHeader('قهوه‌های دمی', Coffee)}
                <div className="space-y-2">
                  {brewedItems.map(item => (
                    <div key={item.id} className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenCustomization(item, undefined, undefined, 0)}
                        className="w-full grid grid-cols-[1fr_96px] items-center gap-3 py-2.5 px-3.5 rounded-xl bg-[#14100D]/70 hover:bg-[#261E18] border border-[#2B221B] hover:border-[#F59E0B]/50 transition-all text-right group"
                      >
                        <span className="text-[#FFFDF9] group-hover:text-[#FBBF24] font-bold text-sm sm:text-[15px] transition-colors leading-relaxed min-w-0 break-words text-right">
                          {item.nameFa} {item.variantOptions?.[0] ? '(تک کاپ)' : ''}
                        </span>
                        <span className="w-24 text-center font-extrabold text-sm sm:text-[15px] text-[#FBBF24] bg-[#241C15] group-hover:bg-[#F59E0B] group-hover:text-[#161311] py-1 px-2 rounded-lg border border-[#423327] transition-all">
                          {formatShortPrice(item.variantOptions?.[0]?.price ?? item.price)}
                        </span>
                      </button>

                      {item.variantOptions?.[1] && (
                        <button
                          type="button"
                          onClick={() => handleOpenCustomization(item, undefined, undefined, 1)}
                          className="w-full grid grid-cols-[1fr_96px] items-center gap-3 py-2.5 px-3.5 rounded-xl bg-[#14100D]/70 hover:bg-[#261E18] border border-[#2B221B] hover:border-[#F59E0B]/50 transition-all text-right group"
                        >
                          <span className="text-[#E6DEC8] group-hover:text-[#FBBF24] font-bold text-sm sm:text-[15px] transition-colors leading-relaxed min-w-0 break-words text-right">
                            {item.nameFa} (۲ کاپ - 2 Cup)
                          </span>
                          <span className="w-24 text-center font-extrabold text-sm sm:text-[15px] text-[#FBBF24] bg-[#241C15] group-hover:bg-[#F59E0B] group-hover:text-[#161311] py-1 px-2 rounded-lg border border-[#423327] transition-all">
                            {formatShortPrice(item.variantOptions[1].price)}
                          </span>
                        </button>
                      )}

                      {renderInlineCartRowsForItem(item)}
                    </div>
                  ))}
                </div>
              </div>

              {/* دمنوش‌ها */}
              <div className="bg-gradient-to-b from-[#1D1713] to-[#15110E] border border-[#3E3127] rounded-3xl p-5 sm:p-6 shadow-xl">
                {renderSectionHeader('دمنوش‌ها', Leaf)}
                <div className="space-y-2">
                  {herbalItems.map(item => renderMenuRow(item))}
                </div>
              </div>

              {/* شیرینی / دسر / میان‌وعده */}
              <div className="bg-gradient-to-b from-[#1D1713] to-[#15110E] border border-[#3E3127] rounded-3xl p-5 sm:p-6 shadow-xl">
                {renderSectionHeader('شیرینی / دسر / میان‌وعده', Cake)}
                <div className="space-y-2">
                  {pastryItems.map(item => renderMenuRow(item))}
                </div>
              </div>
            </div>

            {/* Column 2: میلک شیک‌ها + نوشیدنی‌های گازدار + اسموتی‌های میوه‌ای + نوشیدنی‌های سرد */}
            <div className="space-y-6">
              {/* میلک شیک‌ها */}
              <div className="bg-gradient-to-b from-[#1D1713] to-[#15110E] border border-[#3E3127] rounded-3xl p-5 sm:p-6 shadow-xl">
                {renderSectionHeader('میلک شیک‌ها', IceCream)}
                <div className="space-y-2">
                  {milkshakeItems.map(item => renderMenuRow(item))}
                </div>
              </div>

              {/* نوشیدنی‌های گازدار */}
              <div className="bg-gradient-to-b from-[#1D1713] to-[#15110E] border border-[#3E3127] rounded-3xl p-5 sm:p-6 shadow-xl">
                {renderSectionHeader('نوشیدنی‌های گازدار', CupSoda)}
                <div className="space-y-2">
                  {mocktailItems.map(item => renderMenuRow(item))}
                </div>
              </div>

              {/* اسموتی‌های میوه‌ای */}
              <div className="bg-gradient-to-b from-[#1D1713] to-[#15110E] border border-[#3E3127] rounded-3xl p-5 sm:p-6 shadow-xl">
                {renderSectionHeader('اسموتی‌های میوه‌ای', Citrus)}
                <div className="space-y-2">
                  {smoothieItems.map(item => renderMenuRow(item))}
                </div>
              </div>

              {/* نوشیدنی‌های سرد */}
              <div className="bg-gradient-to-b from-[#1D1713] to-[#15110E] border border-[#3E3127] rounded-3xl p-5 sm:p-6 shadow-xl">
                {renderSectionHeader('نوشیدنی‌های سرد', Snowflake)}
                <div className="space-y-2">
                  {coldDrinkItems.map(item => renderMenuRow(item))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW MODE 2: INTERACTIVE PRODUCT CARDS                                */}
      {/* ===================================================================== */}
      {viewMode === 'cards' && (
        <>
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-[#171412] rounded-2xl border border-[#29221C]">
              <p className="text-base font-bold text-[#C4BCB0]">موردی با مشخصات جستجوی شما یافت نشد.</p>
              <button
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                className="mt-3 text-sm font-bold text-[#F59E0B] hover:underline"
              >
                مشاهده تمام منو
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
              {filteredItems.map(item => {
                const isDefaultLogo = !item.image || item.image === DEFAULT_LOGO_PATH;
                const discPct = getItemDiscountPercent(item);
                const discountedBasePrice = getDiscountedPrice(item.price, discPct);
                const itemCartEntries = cart.filter(c => c.item.id === item.id);
                const hasItemOptions = Boolean(
                  item.coffeeMatrix ||
                    (item.variantOptions && item.variantOptions.length > 0) ||
                    (item.flavorChoices && item.flavorChoices.length > 0)
                );
                const isSimpleSingleInCart = itemCartEntries.length === 1 && !hasItemOptions;

                return (
                  <div
                    key={item.id}
                    className={`bg-[#1A1512] rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-2xl hover:shadow-black/50 ${
                      itemCartEntries.length > 0
                        ? 'border-2 border-emerald-500/75'
                        : 'border border-[#362B22] hover:border-[#F59E0B]/60'
                    }`}
                  >
                    <div>
                      <div className={`relative h-48 w-full overflow-hidden flex items-center justify-center ${isDefaultLogo ? 'bg-white' : 'bg-[#14100D]'}`}>
                        {isDefaultLogo ? (
                          <img
                            src={DEFAULT_LOGO_PATH}
                            alt={item.nameFa}
                            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <>
                            <img
                              src={item.image}
                              alt={item.nameFa}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
                          </>
                        )}

                        <div className="absolute top-2.5 right-2.5">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-black/80 text-[#FBBF24] border border-[#F59E0B]/40">
                            {getCategoryLabelFa(item.categoryId)}
                          </span>
                        </div>

                        {discPct > 0 ? (
                          <div className="absolute top-2.5 left-2.5 text-xs font-black px-2.5 py-1 rounded-lg bg-[#EF4444] text-white shadow-md">
                            🔥 {discPct.toLocaleString('fa-IR')}٪ تخفیف ویژه
                          </div>
                        ) : (
                          item.tags[0] && (
                            <div className="absolute top-2.5 left-2.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-[#F59E0B] text-[#161311] shadow">
                              {item.tags[0]}
                            </div>
                          )
                        )}

                        <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center justify-between text-xs font-bold text-[#E6DEC8]">
                          <div className="flex items-center gap-1 bg-black/75 px-2.5 py-0.5 rounded-lg backdrop-blur-xs">
                            <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                            <span>{item.prepTimeMinutes} دقیقه</span>
                          </div>
                          <div className="flex items-center gap-1 bg-black/75 px-2.5 py-0.5 rounded-lg backdrop-blur-xs">
                            <Flame className="w-3.5 h-3.5 text-[#EF4444]" />
                            <span>{item.calories} کالری</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <span className="inline-block text-[11px] font-bold text-[#FBBF24] bg-[#261D15] border border-[#3E3024] px-2 py-0.5 rounded-md mb-1">
                            {getCategoryLabelFa(item.categoryId)}
                          </span>
                          <h3 className="text-base sm:text-lg font-extrabold text-[#FFFDF9] group-hover:text-[#FBBF24] transition-colors">
                            {getContextualItemTitle(item)}
                          </h3>
                          {item.nameEn && (
                            <span className="text-xs text-[#9E9486] font-semibold block mt-0.5">
                              {item.nameEn}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-[#D6CFC2] font-medium leading-relaxed line-clamp-2">
                          {item.description}
                        </p>

                        {/* Mini Coffee Matrix Preview on Card */}
                        {item.coffeeMatrix && (
                          <div className="bg-[#14100D] border border-[#332920] rounded-xl p-2.5 text-xs space-y-1.5">
                            <div className="grid grid-cols-4 text-[#C4BCB0] font-extrabold border-b border-[#292019] pb-1">
                              <span>لاین</span>
                              <span className="text-center">۷۰-۳۰</span>
                              <span className="text-center">۸۰-۲۰</span>
                              <span className="text-center text-[#FBBF24]">عربیکا</span>
                            </div>
                            {item.coffeeMatrix.blend7030?.fixed ? (
                              <div className="grid grid-cols-4 font-bold text-[#FFFDF9] pt-0.5">
                                <span className="text-[#C4BCB0]">قیمت:</span>
                                <span className="text-center">{formatShortPrice(item.coffeeMatrix.blend7030.fixed)}</span>
                                <span className="text-center">{formatShortPrice(item.coffeeMatrix.blend8020?.fixed)}</span>
                                <span className="text-center text-[#FBBF24] font-extrabold">{formatShortPrice(item.coffeeMatrix.arabica100?.fixed)}</span>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-4 font-bold text-[#E6DEC8]">
                                  <span className="text-[#A89F91]">سینگل</span>
                                  <span className="text-center">{formatShortPrice(item.coffeeMatrix.blend7030?.single)}</span>
                                  <span className="text-center">{formatShortPrice(item.coffeeMatrix.blend8020?.single)}</span>
                                  <span className="text-center text-[#FBBF24]">{formatShortPrice(item.coffeeMatrix.arabica100?.single)}</span>
                                </div>
                                <div className="grid grid-cols-4 font-extrabold text-white">
                                  <span className="text-[#A89F91]">دبل</span>
                                  <span className="text-center">{formatShortPrice(item.coffeeMatrix.blend7030?.double)}</span>
                                  <span className="text-center">{formatShortPrice(item.coffeeMatrix.blend8020?.double)}</span>
                                  <span className="text-center text-[#FBBF24]">{formatShortPrice(item.coffeeMatrix.arabica100?.double)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {itemCartEntries.length > 0 && !isSimpleSingleInCart && (
                          <div className="pt-1">
                            {renderInlineCartRowsForItem(item)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-4 border-t border-[#2E241C] bg-[#15110E] flex items-center justify-between gap-2">
                      <div>
                        {discPct > 0 ? (
                          <>
                            <span className="text-xs font-bold text-[#A89F91] line-through decoration-red-500 decoration-2 block">
                              {item.price.toLocaleString('fa-IR')} تومان
                            </span>
                            <span className="text-base font-black text-emerald-400">
                              {discountedBasePrice.toLocaleString('fa-IR')} تومان
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-[#A89F91] block">
                              {item.priceLabel ? 'بازه قیمت (هزار تومان):' : 'قیمت:'}
                            </span>
                            <span className="text-base font-black text-[#FBBF24]">
                              {item.priceLabel
                                ? `${item.priceLabel} هزار ت`
                                : `${item.price.toLocaleString('fa-IR')} تومان`}
                            </span>
                          </>
                        )}
                      </div>

                      {isSimpleSingleInCart ? (
                        renderInlineStepperPill(itemCartEntries[0])
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenCustomization(item)}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-extrabold text-[#161311] bg-[#F59E0B] hover:bg-[#D97706] rounded-xl transition-all shadow-md active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>
                            {itemCartEntries.length > 0 ? 'مدل / لاین دیگر' : 'انتخاب و سفارش'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* CUSTOMIZATION & ADD-TO-CART MODAL                                     */}
      {/* ===================================================================== */}
      {activeItemForCustomization && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveItemForCustomization(null)}
        >
          <div 
            className="bg-[#1C1714] border border-[#423429] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-[#FFFDF9] max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#332920]">
              <div className="flex items-center gap-3.5">
                {renderItemAvatar(activeItemForCustomization, 'w-14 h-14')}
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-bold text-[#FBBF24] bg-[#292018] border border-[#3E3024] px-2 py-0.5 rounded-md">
                      {getCategoryLabelFa(activeItemForCustomization.categoryId)}
                    </span>
                    {getItemDiscountPercent(activeItemForCustomization) > 0 && (
                      <span className="bg-[#EF4444] text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow">
                        🔥 {getItemDiscountPercent(activeItemForCustomization).toLocaleString('fa-IR')}٪ تخفیف
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {getContextualItemTitle(activeItemForCustomization)}
                  </h3>
                  {getItemDiscountPercent(activeItemForCustomization) > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#A89F91] line-through decoration-red-500 decoration-2">
                        {computeCurrentUnitPrice(activeItemForCustomization).toLocaleString('fa-IR')}
                      </span>
                      <span className="text-sm font-black text-emerald-400">
                        {getDiscountedPrice(
                          computeCurrentUnitPrice(activeItemForCustomization),
                          getItemDiscountPercent(activeItemForCustomization)
                        ).toLocaleString('fa-IR')}{' '}
                        تومان
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-extrabold text-[#FBBF24]">
                      {computeCurrentUnitPrice(activeItemForCustomization).toLocaleString('fa-IR')} تومان
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setActiveItemForCustomization(null)}
                className="text-[#C4BCB0] hover:text-white p-1.5 rounded-xl hover:bg-[#2A211B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4">
              
              {/* 1. Coffee Blend Selection (۷۰-۳۰ | ۸۰-۲۰ | ۱۰۰ عربیکا) */}
              {activeItemForCustomization.coffeeMatrix && (
                <div>
                  <label className="block text-sm font-bold text-[#E6DEC8] mb-2">
                    انتخاب لاین دانه قهوه:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['blend7030', 'blend8020', 'arabica100'] as const).map(blendKey => {
                      const bData = activeItemForCustomization.coffeeMatrix?.[blendKey];
                      const priceToShow = bData?.fixed ?? (selectedShot === 'double' ? bData?.double : bData?.single);
                      return (
                        <button
                          key={blendKey}
                          type="button"
                          onClick={() => setSelectedBlend(blendKey)}
                          className={`p-3 text-xs sm:text-sm rounded-xl border text-center transition-all ${
                            selectedBlend === blendKey
                              ? 'border-[#F59E0B] bg-[#2C2118] text-[#FBBF24] font-extrabold shadow-sm'
                              : 'border-[#332920] bg-[#171310] text-[#C4BCB0] font-semibold hover:border-[#4A3B2F]'
                          }`}
                        >
                          <span className="block">{blendLabels[blendKey]}</span>
                          {priceToShow && (
                            <span className="text-xs font-bold opacity-90 mt-1 block">
                              {formatShortPrice(priceToShow)} هزار ت
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Single vs Double Shot Selection */}
              {activeItemForCustomization.coffeeMatrix &&
                activeItemForCustomization.coffeeMatrix[selectedBlend]?.fixed === undefined && (
                  <div>
                    <label className="block text-sm font-bold text-[#E6DEC8] mb-2">
                      تعداد شات قهوه (سینگل / دبل):
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(['single', 'double'] as const).map(shotKey => {
                        const shotPrice = activeItemForCustomization.coffeeMatrix?.[selectedBlend]?.[shotKey];
                        return (
                          <button
                            key={shotKey}
                            type="button"
                            onClick={() => setSelectedShot(shotKey)}
                            className={`p-3 text-xs sm:text-sm rounded-xl border flex items-center justify-between px-4 transition-all ${
                              selectedShot === shotKey
                                ? 'border-[#F59E0B] bg-[#2C2118] text-[#FBBF24] font-extrabold'
                                : 'border-[#332920] bg-[#171310] text-[#C4BCB0] font-semibold hover:border-[#4A3B2F]'
                            }`}
                          >
                            <span>{shotKey === 'single' ? 'سینگل شات' : 'دبل شات'}</span>
                            <span className="font-extrabold">{formatShortPrice(shotPrice)} ت</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* 3. Variant / Size Options */}
              {activeItemForCustomization.variantOptions && (
                <div>
                  <label className="block text-sm font-bold text-[#E6DEC8] mb-2">
                    سایز / نوع سرو:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {activeItemForCustomization.variantOptions.map((opt, idx) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setSelectedVariantIdx(idx)}
                        className={`p-3 text-xs sm:text-sm rounded-xl border flex items-center justify-between px-4 transition-all ${
                          selectedVariantIdx === idx
                            ? 'border-[#F59E0B] bg-[#2C2118] text-[#FBBF24] font-extrabold'
                            : 'border-[#332920] bg-[#171310] text-[#C4BCB0] font-semibold hover:border-[#4A3B2F]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="font-extrabold">{formatShortPrice(opt.price)} ت</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Flavor / Sub-item Choices */}
              {activeItemForCustomization.flavorChoices && (
                <div>
                  <label className="block text-sm font-bold text-[#E6DEC8] mb-2">
                    انتخاب طعم / مدل:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeItemForCustomization.flavorChoices.map(flav => (
                      <button
                        key={flav}
                        type="button"
                        onClick={() => setSelectedFlavor(flav)}
                        className={`p-2.5 text-xs sm:text-sm rounded-xl border text-center transition-all ${
                          selectedFlavor === flav
                            ? 'border-[#F59E0B] bg-[#2C2118] text-[#FBBF24] font-extrabold'
                            : 'border-[#332920] bg-[#171310] text-[#C4BCB0] font-semibold hover:border-[#4A3B2F]'
                        }`}
                      >
                        {flav}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Extra Hot Milk Checkbox */}
              {(activeItemForCustomization.categoryId === 'coffee' ||
                activeItemForCustomization.categoryId === 'hot_drinks') && (
                <div className="p-3.5 bg-[#241C16] border border-[#3E3127] rounded-xl flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-[#FFFDF9]">
                    تمایل دارم شیر نوشیدنی داغ‌تر سرو شود (Extra Hot)
                  </span>
                  <input
                    type="checkbox"
                    checked={extraHotMilk}
                    onChange={e => setExtraHotMilk(e.target.checked)}
                    className="w-4 h-4 accent-[#F59E0B] rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Custom Notes */}
              <div>
                <label className="block text-sm font-bold text-[#E6DEC8] mb-1.5">
                  توضیحات اختصاصی برای باریستا:
                </label>
                <textarea
                  rows={2}
                  placeholder="مثال: کم‌شیرین باشد، یخ کمتر..."
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  className="w-full bg-[#171310] border border-[#332920] focus:border-[#F59E0B] rounded-xl p-3 text-sm text-white focus:outline-none placeholder:text-[#786E62]"
                />
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold text-[#E6DEC8]">تعداد:</span>
                <div className="flex items-center gap-3 bg-[#171310] border border-[#332920] rounded-xl px-3.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-lg font-extrabold text-[#C4BCB0] hover:text-white px-1.5"
                  >
                    -
                  </button>
                  <span className="text-sm font-black text-white w-5 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="text-lg font-extrabold text-[#C4BCB0] hover:text-white px-1.5"
                  >
                    +
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#332920] gap-3">
              <div>
                <span className="text-xs font-semibold text-[#A89F91] block">مبلغ کل آیتم:</span>
                {getItemDiscountPercent(activeItemForCustomization) > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#A89F91] line-through decoration-red-500 decoration-2">
                      {(computeCurrentUnitPrice(activeItemForCustomization) * quantity).toLocaleString('fa-IR')}
                    </span>
                    <span className="text-lg font-black text-emerald-400">
                      {(
                        getDiscountedPrice(
                          computeCurrentUnitPrice(activeItemForCustomization),
                          getItemDiscountPercent(activeItemForCustomization)
                        ) * quantity
                      ).toLocaleString('fa-IR')}{' '}
                      تومان
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-black text-[#FBBF24]">
                    {(computeCurrentUnitPrice(activeItemForCustomization) * quantity).toLocaleString('fa-IR')} تومان
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleConfirmAddToCart}
                className="flex items-center gap-2 px-6 py-3 text-sm font-extrabold text-[#161311] bg-[#F59E0B] hover:bg-[#D97706] rounded-xl transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن به سبد سفارش</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
