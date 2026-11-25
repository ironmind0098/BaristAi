import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  Zap,
  Heart,
  Coffee,
  TrendingUp,
  ShoppingBag,
  RotateCcw,
  Flame,
  Leaf,
  Star,
  Plus,
  Minus,
  Trash2,
  X,
  Tag,
  SlidersHorizontal
} from 'lucide-react';
import { MenuItem, QuizPreferences, CartItem } from '../types';
import {
  generateSmartRecommendation,
  getMenuCalorieBrackets,
  isDietMenuItem
} from '../services/recommendationEngine';
import {
  getCategoryLabelFa,
  getContextualItemTitle,
  getDiscountedPrice,
  getItemDiscountPercent
} from '../utils/menuHelpers';

interface SmartBaristaQuizProps {
  menuItems: MenuItem[];
  cart: CartItem[];
  onAddToCart: (item: MenuItem, discountedPrice?: number) => void;
  onAddToCartWithOptions: (
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
  ) => void;
  onAddComboToCart: (primary: MenuItem, upsell: MenuItem, discountedUpsellPrice: number) => void;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onCalorieCapChange?: (hasCap: boolean) => void;
  onOpenCart: () => void;
}

const blendLabels: Record<'blend7030' | 'blend8020' | 'arabica100', string> = {
  blend7030: '۷۰ - ۳۰',
  blend8020: '۲۰ - ۸۰',
  arabica100: '۱۰۰ عربیکا'
};

export const SmartBaristaQuiz: React.FC<SmartBaristaQuizProps> = ({
  menuItems,
  cart,
  onAddToCart,
  onAddToCartWithOptions,
  onUpdateQuantity,
  onRemoveItem,
  onCalorieCapChange,
  onOpenCart
}) => {
  const [step, setStep] = useState<number>(1);
  const [preferences, setPreferences] = useState<QuizPreferences>({
    vibe: 'energy',
    temperature: 'hot',
    sweetness: 'balanced',
    caffeine: 'high',
    caloriePreference: 'any',
    budgetMax: 350000,
    includePastry: true
  });
  const [showCafeProfitInsight, setShowCafeProfitInsight] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<string | null>(null);

  // Quick inline flavor choice map per item ID (e.g. Frappuccino -> 'فندق')
  const [inlineFlavors, setInlineFlavors] = useState<Record<string, string>>({});

  // Customization Modal state (for flavors like Hazelnut/Caramel/Coconut, coffee blends/shots, cup sizes, notes)
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedBlend, setSelectedBlend] = useState<'blend7030' | 'blend8020' | 'arabica100'>('blend7030');
  const [selectedShot, setSelectedShot] = useState<'single' | 'double'>('single');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [selectedFlavor, setSelectedFlavor] = useState<string>('');
  const [extraHotMilk, setExtraHotMilk] = useState<boolean>(false);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Dynamically computed calorie brackets based on actual Passin Cafe menu items
  const calorieBrackets = getMenuCalorieBrackets(menuItems);

  // Live recommendation computed directly from current menuItems (so owner edits/discounts update live)
  const result = useMemo(
    () => (step === 4 ? generateSmartRecommendation(menuItems, preferences) : null),
    [step, menuItems, preferences]
  );

  const showToast = (msg: string) => {
    setAddedSuccess(msg);
    setTimeout(() => setAddedSuccess(null), 4000);
  };

  const handleComputeRecommendation = () => {
    setInlineFlavors({});
    setStep(4);
  };

  const handleReset = () => {
    setStep(1);
    setInlineFlavors({});
    setAddedSuccess(null);
  };

  // Any calorie selection other than 'any' means the customer has set a calorie cap
  const hasCalorieCap = preferences.caloriePreference !== 'any';

  useEffect(() => {
    onCalorieCapChange?.(hasCalorieCap);
  }, [hasCalorieCap, onCalorieCapChange]);

  const hasComplexOptions = (item: MenuItem): boolean =>
    Boolean(item.coffeeMatrix || (item.variantOptions && item.variantOptions.length > 0));

  const hasAnySelectableOptions = (item: MenuItem): boolean =>
    Boolean(
      item.coffeeMatrix ||
        (item.variantOptions && item.variantOptions.length > 0) ||
        (item.flavorChoices && item.flavorChoices.length > 0)
    );

  const formatShortPrice = (priceInTomans?: number) => {
    if (!priceInTomans) return '—';
    return Math.round(priceInTomans / 1000).toLocaleString('fa-IR');
  };

  const handleOpenCustomization = (item: MenuItem, presetFlavor?: string) => {
    setCustomizingItem(item);
    setSelectedBlend('blend7030');
    setSelectedShot('single');
    setSelectedVariantIdx(0);
    setSelectedFlavor(presetFlavor || inlineFlavors[item.id] || item.flavorChoices?.[0] || '');
    setExtraHotMilk(false);
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

  const handleConfirmModalAddToCart = () => {
    if (!customizingItem) return;
    const baseUnitPrice = computeCurrentUnitPrice(customizingItem);
    const discPct = getItemDiscountPercent(customizingItem);
    const discountedUnitPrice =
      discPct > 0 ? getDiscountedPrice(baseUnitPrice, discPct) : undefined;

    let variantSummary = '';
    if (customizingItem.variantOptions?.[selectedVariantIdx]) {
      variantSummary = customizingItem.variantOptions[selectedVariantIdx].label;
    }
    if (selectedFlavor) {
      variantSummary = variantSummary ? `${variantSummary} (${selectedFlavor})` : selectedFlavor;
    }

    const hasCoffeeMatrix = !!customizingItem.coffeeMatrix;
    const blendData = customizingItem.coffeeMatrix?.[selectedBlend];
    const hasShotChoice = blendData && blendData.fixed === undefined;

    onAddToCartWithOptions(customizingItem, {
      selectedBlend: hasCoffeeMatrix ? blendLabels[selectedBlend] : undefined,
      selectedShot:
        hasCoffeeMatrix && hasShotChoice ? (selectedShot === 'single' ? 'سینگل' : 'دبل') : undefined,
      selectedVariant: variantSummary || undefined,
      extraHotMilk: extraHotMilk || undefined,
      notes: customNotes || undefined,
      unitPrice: baseUnitPrice,
      discountedPrice: discountedUnitPrice,
      quantity
    });

    const flavorLabel = variantSummary ? ` (${variantSummary})` : '';
    const discountLabel =
      discPct > 0 ? ` با ${discPct.toLocaleString('fa-IR')}٪ تخفیف ویژه` : '';
    const itemTitle = getContextualItemTitle(customizingItem);
    setCustomizingItem(null);
    showToast(`«${itemTitle}${flavorLabel}»${discountLabel} به سبد خرید اضافه شد.`);
  };

  const handlePrimaryActionOnCard = (item: MenuItem) => {
    const pickedInlineFlavor = inlineFlavors[item.id];
    const discPct = getItemDiscountPercent(item);
    const itemTitle = getContextualItemTitle(item);

    // If item has coffeeMatrix or variantOptions, always open customization modal
    if (hasComplexOptions(item)) {
      handleOpenCustomization(item, pickedInlineFlavor);
      return;
    }

    // If item has flavorChoices (like Frappuccino: فندق، کارامل، نارگیل)
    if (item.flavorChoices && item.flavorChoices.length > 0) {
      if (pickedInlineFlavor) {
        const discountedPrice =
          discPct > 0 ? getDiscountedPrice(item.price, discPct) : undefined;
        onAddToCartWithOptions(item, {
          selectedVariant: pickedInlineFlavor,
          unitPrice: item.price,
          discountedPrice,
          quantity: 1
        });
        showToast(
          `«${itemTitle} (${pickedInlineFlavor})»${
            discPct > 0 ? ` با ${discPct.toLocaleString('fa-IR')}٪ تخفیف ویژه` : ''
          } به سبد خرید اضافه شد.`
        );
      } else {
        handleOpenCustomization(item);
      }
      return;
    }

    // Simple item with no required sub-options -> add directly to cart
    const discountedPrice = discPct > 0 ? getDiscountedPrice(item.price, discPct) : undefined;
    onAddToCart(item, discountedPrice);
    showToast(
      `«${itemTitle}»${
        discPct > 0 ? ` با ${discPct.toLocaleString('fa-IR')}٪ تخفیف ویژه` : ''
      } به سبد خرید اضافه شد.`
    );
  };

  const renderItemThumbnail = (item: MenuItem, sizeClass = 'w-14 h-14') => {
    const isLogo = !item.image || item.image === '/images/passin_logo.png';
    return (
      <div
        className={`${sizeClass} rounded-xl overflow-hidden border border-[#F59E0B]/60 bg-white flex items-center justify-center shrink-0`}
      >
        <img
          src={item.image || '/images/passin_logo.png'}
          alt={item.nameFa}
          referrerPolicy="no-referrer"
          className={`w-full h-full ${isLogo ? 'object-contain p-1' : 'object-cover'}`}
        />
      </div>
    );
  };

  const getCartEntryOptionSummary = (entry: CartItem): string => {
    const parts = [entry.selectedVariant, entry.selectedBlend, entry.selectedShot].filter(Boolean);
    return parts.join(' · ');
  };

  const renderInlineStepperPill = (entry: CartItem) => (
    <div
      className="inline-flex items-center gap-1 bg-emerald-950/90 border border-emerald-500/80 rounded-xl px-1.5 py-1 shadow-sm"
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

  // Build selectable complementary items list:
  // - If calorie doesn't matter ('any'): suggest regular cakes (کیک شکلاتی، کیک روز، چیزکیک) alongside drinks
  // - If calorie matters (!== 'any'): suggest ONLY diet cookies/pastries (کوکی رژیمی) alongside drinks — never herbal teas like گل گاوزبان!
  const { complementaryItems, hasComplementaryDiscount } = useMemo(() => {
    if (!result || !preferences.includePastry) {
      return { complementaryItems: [] as MenuItem[], hasComplementaryDiscount: false };
    }
    const available = menuItems.filter(i => i.isAvailable && i.stock > 0);
    const matchingIds = new Set(result.matchingItems.map(m => m.id));
    const isDietContext = preferences.caloriePreference !== 'any';

    const candidates: MenuItem[] = [];
    if (result.upsellItem && (!isDietContext || isDietMenuItem(result.upsellItem))) {
      candidates.push(result.upsellItem);
    }

    const extraCandidates = available
      .filter(i => {
        if (candidates.some(existing => existing.id === i.id)) return false;
        if (matchingIds.has(i.id)) return false;
        if (isDietContext) {
          return result.primaryItem.categoryId !== 'pastry'
            ? i.categoryId === 'pastry' && isDietMenuItem(i)
            : (i.categoryId === 'coffee' || i.categoryId === 'brewed') && isDietMenuItem(i);
        }
        return result.primaryItem.categoryId !== 'pastry'
          ? i.categoryId === 'pastry' && !isDietMenuItem(i)
          : i.categoryId === 'coffee' || i.categoryId === 'brewed' || i.categoryId === 'hot_drinks';
      })
      .sort(
        (a, b) =>
          getItemDiscountPercent(b) - getItemDiscountPercent(a) ||
          b.stock * b.profitMargin - a.stock * a.profitMargin
      );

    const allCandidates = [...candidates, ...extraCandidates];
    const discountedOnly = allCandidates.filter(i => getItemDiscountPercent(i) > 0);

    if (discountedOnly.length > 0) {
      return {
        complementaryItems: discountedOnly.slice(0, 3),
        hasComplementaryDiscount: true
      };
    }

    return {
      complementaryItems: allCandidates.slice(0, 3),
      hasComplementaryDiscount: false
    };
  }, [result, menuItems, preferences]);

  const modalDiscountPercent = customizingItem ? getItemDiscountPercent(customizingItem) : 0;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6">
      {/* Quiz Container */}
      <div className="bg-[#181412] border border-[#2E2621] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D97706]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header / Intro */}
        <div className="mb-8 border-b border-[#28211C] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#F59E0B] mb-1.5">
              <Sparkles className="w-4 h-4" />
              <span>باریسـتای هوشمند کافه پسین</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              پیشنهاد طعم ایده‌آل بر اساس سلیقه، کالری و بودجه شما
            </h2>
            <p className="text-xs sm:text-sm text-[#C4BCB0] mt-1">
              با پاسخ به ۳ مرحله کوتاه، تمام گزینه‌های متناسب از منو به همراه پیشنهاد نهایی ما نمایش داده می‌شوند.
            </p>
          </div>

          {step < 4 && (
            <div className="flex items-center gap-2 self-start sm:self-auto bg-[#231D18] px-3.5 py-2 rounded-xl border border-[#3A3027] text-xs font-bold text-[#E6DEC8]">
              <span>مرحله {step.toLocaleString('fa-IR')} از ۳</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      step >= i ? 'bg-[#F59E0B]' : 'bg-[#3D332B]'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* STEP 1: Vibe & Mood */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white mb-2">
                ۱. در حال حاضر چه حس و حالی دارید یا به چه چیزی نیاز دارید؟
              </h3>
              <p className="text-xs sm:text-sm text-[#A89F91] mb-5">
                هدف شما از این سفارش به باریستا کمک می‌کند بهترین گزینه‌های منو را جدا کند:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                {
                  id: 'energy',
                  title: 'انرژی خالص و هوشیاری کاری',
                  desc: 'قهوه پرکافئین، اسپرسو، آمریکانو یا میلک‌شیک‌های مقوی ورزشی',
                  icon: Zap
                },
                {
                  id: 'relax',
                  title: 'آرامش، خلوت یا گپ دوستانه',
                  desc: 'طعم‌های ملایم، لاته ابریشمی، چای زعفران یا دمنوش‌های اصیل',
                  icon: Heart
                },
                {
                  id: 'sweet',
                  title: 'هوس عصرانه شیرین و دلچسب',
                  desc: 'طعم‌یادهای کارامل، شکلات، عسل طبیعی یا میلک‌شیک‌های جذاب',
                  icon: Coffee
                },
                {
                  id: 'refresh',
                  title: 'حس خنک، باطراوت و میوه‌ای',
                  desc: 'ماکتیل خنک، اسموتی طبیعی میوه‌ای یا آیس کافی',
                  icon: Sparkles
                }
              ].map(option => {
                const Icon = option.icon;
                const isSelected = preferences.vibe === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPreferences({ ...preferences, vibe: option.id as any })}
                    className={`p-4 rounded-xl border text-right transition-all flex items-start gap-3.5 ${
                      isSelected
                        ? 'border-[#F59E0B] bg-[#2A2017] shadow-md shadow-[#D97706]/10 text-white'
                        : 'border-[#2D251F] bg-[#1B1613] hover:border-[#473B31] text-[#C4BDB2]'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                        isSelected ? 'bg-[#F59E0B] text-[#161311]' : 'bg-[#29221C] text-[#A89F91]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white mb-1 flex items-center justify-between gap-2">
                        <span>{option.title}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#F59E0B] shrink-0" />}
                      </div>
                      <p className="text-xs text-[#A89F91] leading-relaxed">{option.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-extrabold text-[#161311] bg-[#F59E0B] hover:bg-[#D97706] rounded-xl transition-all shadow-md"
              >
                <span>مرحله بعد: دما، کافئین و کالری</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Temperature, Caffeine, Sweetness & Calorie Range */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white mb-2">
                ۲. دما، کافئین، شیرینی و میزان کالری دلخواهتان چیست؟
              </h3>
              <p className="text-xs sm:text-sm text-[#A89F91]">
                ویژگی‌های نوشیدنی و محدوده کالری مدنظرتان را بر اساس منوی کافه پسین مشخص کنید:
              </p>
            </div>

            {/* Temperature Selection */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-[#E6DEC8] mb-2">
                دمای نوشیدنی:
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'hot', label: 'داغ و بخاردیده ☕' },
                  { id: 'cold', label: 'خنک با یخ بلوری 🧊' },
                  { id: 'any', label: 'فرقی نمی‌کند ⚡' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreferences({ ...preferences, temperature: item.id as any })}
                    className={`py-3 px-3 text-xs sm:text-sm rounded-xl border text-center transition-all ${
                      preferences.temperature === item.id
                        ? 'border-[#F59E0B] bg-[#2A2017] text-[#FBBF24] font-extrabold'
                        : 'border-[#2D251F] bg-[#1B1613] text-[#C4BCB0] font-semibold hover:border-[#473B31]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caffeine Selection */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-[#E6DEC8] mb-2">
                میزان کافئین:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'high', label: 'کافئین بالا' },
                  { id: 'medium', label: 'متعادل' },
                  { id: 'decaf', label: 'ملایم (چای/ماسالا/کاکائو)' },
                  { id: 'none', label: 'بدون کافئین' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreferences({ ...preferences, caffeine: item.id as any })}
                    className={`py-2.5 px-3 text-xs sm:text-sm rounded-xl border text-center transition-all ${
                      preferences.caffeine === item.id
                        ? 'border-[#F59E0B] bg-[#2A2017] text-[#FBBF24] font-extrabold'
                        : 'border-[#2D251F] bg-[#1B1613] text-[#C4BCB0] font-semibold hover:border-[#473B31]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sweetness Preference */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-[#E6DEC8] mb-2">
                سطح شیرینی طعم:
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'bitter', label: 'تلخ / بدون شکر' },
                  { id: 'balanced', label: 'طبیعی و متعادل' },
                  { id: 'sweet', label: 'شیرین و دسرگونه' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreferences({ ...preferences, sweetness: item.id as any })}
                    className={`py-2.5 px-3 text-xs sm:text-sm rounded-xl border text-center transition-all ${
                      preferences.sweetness === item.id
                        ? 'border-[#F59E0B] bg-[#2A2017] text-[#FBBF24] font-extrabold'
                        : 'border-[#2D251F] bg-[#1B1613] text-[#C4BCB0] font-semibold hover:border-[#473B31]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calorie Range Selection */}
            <div className="pt-2 border-t border-[#2A211B]">
              <div className="flex items-center justify-between mb-2.5">
                <label className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#FBBF24]">
                  <Flame className="w-4 h-4 text-[#F59E0B]" />
                  <span>میزان کالری دلخواه (بر اساس آیتم‌های منوی کافه پسین):</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {calorieBrackets.map(bracket => {
                  const isSelected = preferences.caloriePreference === bracket.id;
                  const isDietCard = bracket.id === 'diet';
                  return (
                    <button
                      key={bracket.id}
                      type="button"
                      onClick={() =>
                        setPreferences({
                          ...preferences,
                          caloriePreference: bracket.id,
                          sweetness:
                            bracket.id === 'diet' && preferences.sweetness === 'sweet'
                              ? 'balanced'
                              : preferences.sweetness
                        })
                      }
                      className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? isDietCard
                            ? 'border-emerald-500 bg-emerald-950/35 text-white shadow-md'
                            : 'border-[#F59E0B] bg-[#2A2017] text-white shadow-md'
                          : 'border-[#2D251F] bg-[#1B1613] text-[#C4BCB0] hover:border-[#473B31]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                          {isDietCard && <Leaf className="w-3.5 h-3.5 text-emerald-400" />}
                          <span>{bracket.title}</span>
                        </span>
                        <span
                          className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                            isSelected
                              ? isDietCard
                                ? 'bg-emerald-500 text-[#111]'
                                : 'bg-[#F59E0B] text-[#161311]'
                              : 'bg-[#261E18] text-[#FBBF24]'
                          }`}
                        >
                          {bracket.rangeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-[#A89F91] leading-relaxed">
                        {bracket.examplesLabel} ({bracket.count.toLocaleString('fa-IR')} آیتم)
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#A89F91] hover:text-white transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>مرحله قبل</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-extrabold text-[#161311] bg-[#F59E0B] hover:bg-[#D97706] rounded-xl transition-all shadow-md"
              >
                <span>مرحله بعد: بودجه و پیشنهاد همراه</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Budget & Complementary Preference */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white mb-2">
                ۳. بودجه مدنظر شما چقدر است؟
              </h3>
              <p className="text-xs sm:text-sm text-[#A89F91] mb-5">
                باریستای هوشمند تمام آیتم‌های هماهنگ در محدوده بودجه شما را استخراج می‌کند:
              </p>
            </div>

            {/* Budget Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-bold text-[#C4BCB0]">حداکثر سقف بودجه:</span>
                <span className="text-base font-extrabold text-[#FBBF24]">
                  {preferences.budgetMax.toLocaleString('fa-IR')} تومان
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                {[
                  { amount: 250000, label: 'تا ۲۵۰ هزار تومان' },
                  { amount: 350000, label: 'تا ۳۵۰ هزار تومان' },
                  { amount: 450000, label: 'تا ۴۵۰ هزار تومان' },
                  { amount: 650000, label: 'تا ۶۵۰ هزار تومان' }
                ].map(tier => (
                  <button
                    key={tier.amount}
                    type="button"
                    onClick={() => setPreferences({ ...preferences, budgetMax: tier.amount })}
                    className={`py-2.5 px-2.5 text-xs sm:text-sm rounded-xl border transition-all ${
                      preferences.budgetMax === tier.amount
                        ? 'border-[#F59E0B] bg-[#2A2017] text-[#FBBF24] font-extrabold'
                        : 'border-[#2D251F] bg-[#1B1613] text-[#C4BCB0] font-semibold hover:border-[#473B31]'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>

              <input
                type="range"
                min={150000}
                max={650000}
                step={20000}
                value={preferences.budgetMax}
                onChange={e => setPreferences({ ...preferences, budgetMax: Number(e.target.value) })}
                className="w-full accent-[#F59E0B] cursor-pointer bg-[#2A221C] h-2 rounded-lg"
              />
            </div>

            {/* Complementary Suggestion toggle */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                hasCalorieCap
                  ? 'border-emerald-600/50 bg-emerald-950/25'
                  : 'border-[#3E3227] bg-[#221A15]/80'
              }`}
            >
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                  {hasCalorieCap ? (
                    <>
                      <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        مایلید با توجه به سقف کالری انتخابی شما، آیتم‌های رژیمی (مثل کوکی رژیمی جودوسر) به عنوان مکمل پیشنهاد شود؟
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 text-[#F59E0B] shrink-0" />
                      <span>
                        مایلید کیک تازه روز و خوشمزه‌های همراه کنار نوشیدنی‌تان پیشنهاد شود؟
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-[#C4BCB0]">
                  {hasCalorieCap
                    ? 'چون سقف کالری مشخص کرده‌اید، فقط مکمل‌های رژیمی، کم‌کالری و بدون شکر افزوده کنار سفارشتان پیشنهاد می‌شوند.'
                    : 'آیتم‌های همراه (و در صورت داشتن تخفیف ویژه، با تخفیف برجسته) برای انتخاب مستقیم نمایش داده می‌شوند.'}
                </p>
              </div>

              <input
                type="checkbox"
                checked={preferences.includePastry}
                onChange={e => setPreferences({ ...preferences, includePastry: e.target.checked })}
                className="w-5 h-5 accent-[#F59E0B] rounded cursor-pointer shrink-0"
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#A89F91] hover:text-white transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>مرحله قبل</span>
              </button>

              <button
                type="button"
                onClick={handleComputeRecommendation}
                className="flex items-center gap-2 px-7 py-3 text-sm font-extrabold text-[#161311] bg-[#F59E0B] hover:bg-[#D97706] rounded-xl transition-all shadow-lg shadow-[#D97706]/20 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>مشاهده گزینه‌ها و پیشنهاد باریستا</span>
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 4: UNIFIED MATCHING LIST (BADGE FOR OUR #1 PICK) + COMPLEMENTARY */}
        {/* =================================================================== */}
        {step === 4 && result && (
          <div className="space-y-7 animate-fade-in">
            {/* Header Bar & Brief Barista Note */}
            <div className="bg-[#1E1814] border border-[#352A22] rounded-2xl p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs sm:text-sm font-extrabold text-[#FFFDF9]">
                  بر اساس پاسخ‌های شما،{' '}
                  <strong className="text-[#FBBF24] font-black">
                    {result.matchingItems.length.toLocaleString('fa-IR')} آیتم
                  </strong>{' '}
                  از منوی کافه پسین با سلیقه شما هم‌خوانی دارد:
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#FBBF24] hover:text-white bg-[#2A2018] px-3 py-1.5 rounded-lg border border-[#423429] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تغییر پاسخ‌ها</span>
                </button>
              </div>
              <p className="text-xs text-[#D6CEC2] leading-relaxed border-t border-[#2D241D] pt-2.5">
                {result.reason}
              </p>
            </div>

            {/* Success Toast with Quick Cart Access */}
            {addedSuccess && (
              <div className="p-3.5 bg-emerald-950/95 border-2 border-emerald-500 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fade-in">
                <span className="text-xs sm:text-sm text-emerald-100 font-extrabold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{addedSuccess}</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-[#111] text-xs font-black flex items-center gap-1.5 transition-colors"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>مشاهده سبد خرید</span>
                </button>
              </div>
            )}

            {/* =============================================================== */}
            {/* UNIFIED MATCHING ITEMS GRID (WITH TOP BADGE ON OUR #1 PICK)     */}
            {/* =============================================================== */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  آیتم‌های پیشنهادی متناسب با انتخاب شما:
                </h3>
                <span className="text-xs text-[#A89F91]">
                  دسته‌بندی هر آیتم بالای نام آن درج شده است؛ طعم یا لاین دلخواهتان را انتخاب کنید
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {result.matchingItems.map(item => {
                  const isOurFinalRecommendation = item.id === result.primaryItem.id;
                  const pickedFlavor = inlineFlavors[item.id];
                  const itemDisc = getItemDiscountPercent(item);
                  const discountedPrice = getDiscountedPrice(item.price, itemDisc);
                  const itemCartEntries = cart.filter(c => c.item.id === item.id);
                  const isSimpleSingleInCart =
                    itemCartEntries.length === 1 && !hasAnySelectableOptions(item);
                  const isPickedFlavorAlreadyInCart = Boolean(
                    pickedFlavor &&
                      !hasComplexOptions(item) &&
                      itemCartEntries.some(e => e.selectedVariant === pickedFlavor && !e.notes)
                  );

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenCustomization(item, pickedFlavor)}
                      className={`relative cursor-pointer rounded-2xl p-4 transition-all flex flex-col justify-between gap-3.5 ${
                        isOurFinalRecommendation
                          ? 'bg-[#251C15] border-2 border-[#F59E0B] shadow-lg shadow-[#D97706]/15 pt-6'
                          : itemCartEntries.length > 0
                            ? 'bg-[#17211B] border border-emerald-500/70 hover:border-emerald-400'
                            : 'bg-[#15110E] border border-[#2E251E] hover:border-[#F59E0B]/55 hover:bg-[#1C1612]'
                      }`}
                    >
                      {/* Badge on top of OUR final recommendation (no separate big card) */}
                      {isOurFinalRecommendation && (
                        <div className="absolute -top-3.5 right-4 z-10 inline-flex items-center gap-1.5 bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#161311] text-xs font-black px-3 py-1 rounded-full shadow-md border border-[#FEF3C7]/60">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>پیشنهاد نهایی ما</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        {/* Thumbnail + Category Badge + Clear Contextual Title + Calories */}
                        <div className="flex items-start gap-3">
                          {renderItemThumbnail(item, 'w-14 h-14')}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-block text-[10px] sm:text-[11px] font-bold text-[#FBBF24] bg-[#281F17] border border-[#423326] px-2 py-0.5 rounded-md">
                                {getCategoryLabelFa(item.categoryId)}
                              </span>
                              {itemDisc > 0 && (
                                <span className="bg-[#EF4444] text-white text-[11px] px-2 py-0.5 rounded-md font-black shadow-sm">
                                  🔥 {itemDisc.toLocaleString('fa-IR')}٪ تخفیف ویژه
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                              {getContextualItemTitle(item)}
                            </h4>

                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="inline-flex items-center gap-1 bg-[#221B15] text-[#E6DEC8] px-2 py-0.5 rounded-md font-bold">
                                <Flame className="w-3 h-3 text-[#F59E0B]" />
                                <span>{item.calories.toLocaleString('fa-IR')} کالری</span>
                              </span>
                              {isDietMenuItem(item) && (
                                <span className="bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-md font-bold">
                                  رژیمی
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Short Description */}
                        <p className="text-xs text-[#B8AEA0] line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>

                        {/* Interactive Flavor Chips right on the card (e.g. فندق، کارامل، نارگیل for Frappuccino) */}
                        {item.flavorChoices && item.flavorChoices.length > 0 && (
                          <div
                            className="pt-1 space-y-1.5"
                            onClick={e => e.stopPropagation()}
                          >
                            <span className="text-[11px] font-extrabold text-[#FBBF24] block">
                              انتخاب طعم / مدل:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.flavorChoices.map(flav => {
                                const isFlavSelected = pickedFlavor === flav;
                                return (
                                  <button
                                    key={flav}
                                    type="button"
                                    onClick={() =>
                                      setInlineFlavors(prev => ({
                                        ...prev,
                                        [item.id]: flav
                                      }))
                                    }
                                    className={`px-2.5 py-1 rounded-lg text-[11px] transition-all border ${
                                      isFlavSelected
                                        ? 'bg-[#F59E0B] text-[#161311] border-[#FBBF24] font-black shadow-sm'
                                        : 'bg-[#1F1914] text-[#E6DEC8] border-[#3B2F25] hover:border-[#F59E0B] font-bold'
                                    }`}
                                  >
                                    {isFlavSelected ? `✓ ${flav}` : flav}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Blend / Variant indicator if item has coffeeMatrix or variantOptions */}
                        {(item.coffeeMatrix || (item.variantOptions && item.variantOptions.length > 0)) && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#D6CEC2]">
                            <span className="inline-flex items-center gap-1 bg-[#211A14] border border-[#382C22] px-2 py-0.5 rounded-md font-semibold">
                              <SlidersHorizontal className="w-3 h-3 text-[#F59E0B]" />
                              <span>
                                {item.coffeeMatrix
                                  ? 'انتخاب لاین قهوه (۷۰-۳۰ / ۲۰-۸۰ / عربیکا) و شات'
                                  : 'انتخاب سایز / نوع سرو'}
                              </span>
                            </span>
                          </div>
                        )}

                        {/* Inline Cart Quantity & Delete Controls for multi-option / multiple entries */}
                        {itemCartEntries.length > 0 && !isSimpleSingleInCart && (
                          <div
                            className="space-y-1.5 pt-1"
                            onClick={e => e.stopPropagation()}
                          >
                            {itemCartEntries.map(entry => {
                              const optSummary = getCartEntryOptionSummary(entry);
                              return (
                                <div
                                  key={entry.cartItemId}
                                  className="flex items-center justify-between gap-2 bg-emerald-950/55 border border-emerald-600/50 rounded-xl px-2.5 py-1.5"
                                >
                                  <span className="text-[11px] font-extrabold text-emerald-200 truncate">
                                    {optSummary ? `در سبد: ${optSummary}` : 'در سبد شما'}
                                  </span>
                                  {renderInlineStepperPill(entry)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Price & Inline Stepper / Add Button */}
                      <div
                        className="flex items-center justify-between gap-2 pt-3 border-t border-[#282019]"
                        onClick={e => e.stopPropagation()}
                      >
                        <div>
                          {itemDisc > 0 ? (
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-[#A89F91] line-through decoration-red-500 decoration-2">
                                {item.price.toLocaleString('fa-IR')}
                              </span>
                              <span className="text-sm sm:text-base font-black text-emerald-400">
                                {discountedPrice.toLocaleString('fa-IR')} ت
                              </span>
                            </div>
                          ) : item.priceLabel ? (
                            <span className="text-xs sm:text-sm font-black text-[#FBBF24]">
                              {item.priceLabel} <span className="text-[11px] font-bold">هزار ت</span>
                            </span>
                          ) : (
                            <span className="text-xs sm:text-sm font-black text-[#FBBF24]">
                              {item.price.toLocaleString('fa-IR')} تومان
                            </span>
                          )}
                        </div>

                        {isSimpleSingleInCart ? (
                          renderInlineStepperPill(itemCartEntries[0])
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {hasAnySelectableOptions(item) &&
                              pickedFlavor &&
                              !hasComplexOptions(item) &&
                              !isPickedFlavorAlreadyInCart && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCustomization(item, pickedFlavor)}
                                  title="تغییر تعداد یا ثبت توضیحات"
                                  className="p-1.5 rounded-lg bg-[#231C16] hover:bg-[#332820] text-[#C4BCB0] hover:text-white border border-[#3A2E25] transition-colors"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </button>
                              )}

                            {!isPickedFlavorAlreadyInCart && (
                              <button
                                type="button"
                                onClick={() => handlePrimaryActionOnCard(item)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-sm active:scale-95 ${
                                  itemDisc > 0
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-[#111] font-black'
                                    : isOurFinalRecommendation
                                      ? 'bg-[#F59E0B] hover:bg-[#D97706] text-[#161311]'
                                      : 'bg-[#261E18] hover:bg-[#F59E0B] text-[#FFFDF9] hover:text-[#161311] border border-[#3E3127]'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>
                                  {itemCartEntries.length > 0 && hasComplexOptions(item)
                                    ? 'افزودن لاین دیگر'
                                    : hasComplexOptions(item)
                                      ? 'انتخاب لاین و افزودن'
                                      : item.flavorChoices && item.flavorChoices.length > 0
                                        ? pickedFlavor
                                          ? `افزودن (${pickedFlavor})`
                                          : itemCartEntries.length > 0
                                            ? 'طعم دیگر'
                                            : 'انتخاب طعم و افزودن'
                                        : itemDisc > 0
                                          ? 'افزودن با تخفیف'
                                          : 'افزودن به سبد'}
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* =============================================================== */}
            {/* SELECTABLE COMPLEMENTARY ITEMS (Dynamic Copy Based on Discount!) */}
            {/* =============================================================== */}
            {!preferences.includePastry ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setPreferences(prev => ({ ...prev, includePastry: true }))}
                  className="text-xs sm:text-sm font-black text-[#FBBF24] hover:text-white bg-[#241B14] border border-[#F59E0B]/50 px-4 py-2.5 rounded-xl inline-flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                  <span>مشاهده پیشنهادهای خوشمزه کنار سفارش (کیک روز / کوکی رژیمی)</span>
                </button>
              </div>
            ) : (
              complementaryItems.length > 0 && (
                <div className="pt-5 border-t-2 border-[#2F251D] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                        <span>
                          {hasComplementaryDiscount
                            ? 'در کنار سفارشت، با تخفیف امتحانش کن:'
                            : 'کنار سفارشت می‌چسبه:'}
                        </span>
                      </h3>

                      {hasComplementaryDiscount && (
                        <span className="inline-flex items-center gap-1 bg-[#EF4444] text-white text-xs sm:text-sm font-black px-3 py-1 rounded-xl shadow-md ring-2 ring-[#FBBF24]/60">
                          <Tag className="w-3.5 h-3.5" />
                          <span>تخفیف ویژه کافه پسین</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                    {complementaryItems.map(compItem => {
                      const compDiscPct = getItemDiscountPercent(compItem);
                      const hasCompDiscount = compDiscPct > 0;
                      const discountedPrice = getDiscountedPrice(compItem.price, compDiscPct);
                      const savingsAmount = compItem.price - discountedPrice;
                      const compPickedFlavor = inlineFlavors[compItem.id];
                      const isPrimaryUpsell = compItem.id === result.upsellItem?.id;
                      const compCartEntries = cart.filter(c => c.item.id === compItem.id);
                      const isCompSimpleSingleInCart =
                        compCartEntries.length === 1 && !hasAnySelectableOptions(compItem);
                      const isCompFlavorAlreadyInCart = Boolean(
                        compPickedFlavor &&
                          !hasComplexOptions(compItem) &&
                          compCartEntries.some(e => e.selectedVariant === compPickedFlavor && !e.notes)
                      );

                      return (
                        <div
                          key={compItem.id}
                          onClick={() => handleOpenCustomization(compItem, compPickedFlavor)}
                          className={`relative cursor-pointer rounded-2xl p-4 transition-all flex flex-col justify-between gap-3.5 border-2 ${
                            compCartEntries.length > 0
                              ? 'bg-[#13241B] border-emerald-400 shadow-md shadow-emerald-950/30'
                              : isDietMenuItem(compItem)
                                ? 'bg-[#13221B] border-emerald-500/75 hover:border-emerald-400'
                                : hasCompDiscount
                                  ? 'bg-[#261C15] border-[#EF4444]/75 hover:border-[#FBBF24]'
                                  : isPrimaryUpsell
                                    ? 'bg-[#221A14] border-[#F59E0B]/70 hover:border-[#FBBF24]'
                                    : 'bg-[#1C1612] border-[#3D3025] hover:border-[#F59E0B]/60'
                          }`}
                        >
                          {/* Top Badges (Bold Discount if present + Category Badge) */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-block text-[11px] font-bold text-[#FBBF24] bg-black/45 border border-[#423326] px-2 py-0.5 rounded-md">
                              {getCategoryLabelFa(compItem.categoryId)}
                            </span>

                            {hasCompDiscount ? (
                              <span className="inline-flex items-center gap-1 bg-[#EF4444] text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md">
                                <span>🔥 {compDiscPct.toLocaleString('fa-IR')}٪ تخفیف ویژه</span>
                              </span>
                            ) : (
                              isPrimaryUpsell && (
                                <span className="inline-flex items-center gap-1 bg-[#F59E0B] text-[#161311] text-[11px] font-black px-2.5 py-0.5 rounded-lg">
                                  <Star className="w-3 h-3 fill-current" />
                                  <span>انتخاب ویژه باریستا</span>
                                </span>
                              )
                            )}
                          </div>

                          {/* Item Info */}
                          <div className="space-y-2.5">
                            <div className="flex items-start gap-3">
                              {renderItemThumbnail(compItem, 'w-14 h-14')}
                              <div className="min-w-0 flex-1 space-y-1">
                                <h4 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                                  {getContextualItemTitle(compItem)}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="inline-flex items-center gap-1 bg-black/40 text-[#E6DEC8] px-2 py-0.5 rounded-md font-bold">
                                    <Flame className="w-3 h-3 text-[#F59E0B]" />
                                    <span>{compItem.calories.toLocaleString('fa-IR')} کالری</span>
                                  </span>
                                  {isDietMenuItem(compItem) && (
                                    <span className="bg-emerald-500 text-[#111] px-2 py-0.5 rounded-md font-black">
                                      رژیمی و بدون شکر
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-[#C4BCB0] line-clamp-2 leading-relaxed">
                              {compItem.description}
                            </p>

                            {compItem.flavorChoices && compItem.flavorChoices.length > 0 && (
                              <div
                                className="pt-1 flex flex-wrap gap-1.5"
                                onClick={e => e.stopPropagation()}
                              >
                                {compItem.flavorChoices.map(flav => {
                                  const isSelectedFlav = compPickedFlavor === flav;
                                  return (
                                    <button
                                      key={flav}
                                      type="button"
                                      onClick={() =>
                                        setInlineFlavors(prev => ({
                                          ...prev,
                                          [compItem.id]: flav
                                        }))
                                      }
                                      className={`px-2 py-0.5 rounded-md text-[11px] border ${
                                        isSelectedFlav
                                          ? 'bg-[#F59E0B] text-[#161311] border-[#FBBF24] font-black'
                                          : 'bg-[#171310] text-[#E6DEC8] border-[#382C22] font-bold'
                                      }`}
                                    >
                                      {flav}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Inline Cart Quantity & Delete Controls for multi-option / multiple entries */}
                            {compCartEntries.length > 0 && !isCompSimpleSingleInCart && (
                              <div
                                className="space-y-1.5 pt-1"
                                onClick={e => e.stopPropagation()}
                              >
                                {compCartEntries.map(entry => {
                                  const optSummary = getCartEntryOptionSummary(entry);
                                  return (
                                    <div
                                      key={entry.cartItemId}
                                      className="flex items-center justify-between gap-2 bg-emerald-950/60 border border-emerald-500/50 rounded-xl px-2.5 py-1.5"
                                    >
                                      <span className="text-[11px] font-extrabold text-emerald-200 truncate">
                                        {optSummary ? `در سبد: ${optSummary}` : 'در سبد شما'}
                                      </span>
                                      {renderInlineStepperPill(entry)}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Price + Inline Stepper / Direct Add to Cart Button */}
                          <div
                            className="pt-3 border-t border-[#362B22] flex items-center justify-between gap-2"
                            onClick={e => e.stopPropagation()}
                          >
                            {hasCompDiscount ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[#A89F91] line-through decoration-red-500 decoration-2">
                                    {compItem.price.toLocaleString('fa-IR')}
                                  </span>
                                  <span className="text-base sm:text-lg font-black text-emerald-400">
                                    {discountedPrice.toLocaleString('fa-IR')} ت
                                  </span>
                                </div>
                                <span className="inline-block mt-0.5 text-[11px] font-black text-[#FBBF24]">
                                  سود شما: {savingsAmount.toLocaleString('fa-IR')} تومان تخفیف
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs sm:text-sm font-black text-[#FBBF24]">
                                {compItem.price.toLocaleString('fa-IR')} تومان
                              </span>
                            )}

                            {isCompSimpleSingleInCart ? (
                              renderInlineStepperPill(compCartEntries[0])
                            ) : (
                              !isCompFlavorAlreadyInCart && (
                                <button
                                  type="button"
                                  onClick={() => handlePrimaryActionOnCard(compItem)}
                                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 shrink-0 ${
                                    hasCompDiscount
                                      ? 'bg-emerald-500 hover:bg-emerald-400 text-[#111]'
                                      : 'bg-[#F59E0B] hover:bg-[#D97706] text-[#161311]'
                                  }`}
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>
                                    {compCartEntries.length > 0 && hasComplexOptions(compItem)
                                      ? 'افزودن مدل دیگر'
                                      : hasCompDiscount
                                        ? 'افزودن با تخفیف'
                                        : 'افزودن به سبد'}
                                  </span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}

            {/* Transparency for Cafe Owner / Manager */}
            <div className="pt-2 border-t border-[#261E18]">
              <button
                type="button"
                onClick={() => setShowCafeProfitInsight(!showCafeProfitInsight)}
                className="text-xs text-[#A89F91] hover:text-[#F59E0B] flex items-center gap-1.5 transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {showCafeProfitInsight
                    ? 'مخفی کردن تحلیل سودآوری کافه'
                    : 'مشاهده تحلیل اقتصادی این پیشنهاد'}
                </span>
              </button>

              {showCafeProfitInsight && (
                <div className="mt-3 p-4 bg-[#14100E] border border-[#2B221B] rounded-xl text-xs text-[#BDB2A4] space-y-2 animate-fade-in">
                  <div className="font-bold text-[#F59E0B] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>تحلیل سوددهی و گردش انبار:</span>
                  </div>
                  <p className="leading-relaxed">{result.profitAnalysis}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* ITEM CUSTOMIZATION MODAL (Flavors, Coffee Blends, Shots, Sizes, Notes) */}
      {/* ===================================================================== */}
      {customizingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setCustomizingItem(null)}
        >
          <div
            className="bg-[#1C1714] border border-[#423429] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-[#FFFDF9] max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#332920]">
              <div className="flex items-center gap-3.5">
                {renderItemThumbnail(customizingItem, 'w-14 h-14')}
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-bold text-[#FBBF24] bg-[#292018] border border-[#3E3024] px-2 py-0.5 rounded-md">
                      {getCategoryLabelFa(customizingItem.categoryId)}
                    </span>
                    {modalDiscountPercent > 0 && (
                      <span className="bg-[#EF4444] text-white text-xs font-black px-2.5 py-0.5 rounded-lg shadow">
                        🔥 {modalDiscountPercent.toLocaleString('fa-IR')}٪ تخفیف ویژه
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {getContextualItemTitle(customizingItem)}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {modalDiscountPercent > 0 ? (
                      <>
                        <span className="text-xs font-bold text-[#A89F91] line-through decoration-red-500 decoration-2">
                          {computeCurrentUnitPrice(customizingItem).toLocaleString('fa-IR')}
                        </span>
                        <span className="text-sm sm:text-base font-black text-emerald-400">
                          {getDiscountedPrice(
                            computeCurrentUnitPrice(customizingItem),
                            modalDiscountPercent
                          ).toLocaleString('fa-IR')}{' '}
                          تومان
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-extrabold text-[#FBBF24]">
                        {computeCurrentUnitPrice(customizingItem).toLocaleString('fa-IR')} تومان
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="text-[#C4BCB0] hover:text-white p-1.5 rounded-xl hover:bg-[#2A211B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4">
              {/* 1. Flavor / Sub-item Choices (e.g. فندق، کارامل، نارگیل for Frappuccino) */}
              {customizingItem.flavorChoices && customizingItem.flavorChoices.length > 0 && (
                <div>
                  <label className="block text-sm font-extrabold text-[#FBBF24] mb-2">
                    انتخاب طعم / مدل دلخواه:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {customizingItem.flavorChoices.map(flav => (
                      <button
                        key={flav}
                        type="button"
                        onClick={() => {
                          setSelectedFlavor(flav);
                          setInlineFlavors(prev => ({ ...prev, [customizingItem.id]: flav }));
                        }}
                        className={`p-2.5 text-xs sm:text-sm rounded-xl border text-center transition-all ${
                          selectedFlavor === flav
                            ? 'border-[#F59E0B] bg-[#2C2118] text-[#FBBF24] font-black shadow-sm'
                            : 'border-[#332920] bg-[#171310] text-[#C4BCB0] font-semibold hover:border-[#4A3B2F]'
                        }`}
                      >
                        {flav}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Coffee Blend Selection (۷۰-۳۰ | ۲۰-۸۰ | ۱۰۰ عربیکا) */}
              {customizingItem.coffeeMatrix && (
                <div>
                  <label className="block text-sm font-bold text-[#E6DEC8] mb-2">
                    انتخاب لاین دانه قهوه:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['blend7030', 'blend8020', 'arabica100'] as const).map(blendKey => {
                      const bData = customizingItem.coffeeMatrix?.[blendKey];
                      const priceToShow =
                        bData?.fixed ?? (selectedShot === 'double' ? bData?.double : bData?.single);
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

              {/* 3. Single vs Double Shot Selection */}
              {customizingItem.coffeeMatrix &&
                customizingItem.coffeeMatrix[selectedBlend]?.fixed === undefined && (
                  <div>
                    <label className="block text-sm font-bold text-[#E6DEC8] mb-2">
                      تعداد شات قهوه (سینگل / دبل):
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(['single', 'double'] as const).map(shotKey => {
                        const shotPrice = customizingItem.coffeeMatrix?.[selectedBlend]?.[shotKey];
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

              {/* 4. Variant / Size Options */}
              {customizingItem.variantOptions && customizingItem.variantOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-[#E6DEC8] mb-2">
                    سایز / نوع سرو:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {customizingItem.variantOptions.map((opt, idx) => (
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

              {/* 5. Extra Hot Milk Checkbox */}
              {(customizingItem.categoryId === 'coffee' ||
                customizingItem.categoryId === 'hot_drinks') &&
                customizingItem.temperature === 'hot' && (
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
                    {quantity.toLocaleString('fa-IR')}
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
                {modalDiscountPercent > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#A89F91] line-through decoration-red-500 decoration-2">
                      {(computeCurrentUnitPrice(customizingItem) * quantity).toLocaleString('fa-IR')}
                    </span>
                    <span className="text-lg font-black text-emerald-400">
                      {(
                        getDiscountedPrice(
                          computeCurrentUnitPrice(customizingItem),
                          modalDiscountPercent
                        ) * quantity
                      ).toLocaleString('fa-IR')}{' '}
                      تومان
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-black text-[#FBBF24]">
                    {(computeCurrentUnitPrice(customizingItem) * quantity).toLocaleString('fa-IR')}{' '}
                    تومان
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleConfirmModalAddToCart}
                className="flex items-center gap-2 px-6 py-3 text-sm font-black text-[#161311] bg-[#F59E0B] hover:bg-[#D97706] rounded-xl transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>افزودن به سبد خرید</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
