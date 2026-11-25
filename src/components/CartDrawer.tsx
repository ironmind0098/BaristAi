import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Tag, Sparkles, Clock, Leaf, Flame } from 'lucide-react';
import { CartItem, MenuItem } from '../types';
import { findSmartDietUpsell, isDietMenuItem } from '../services/recommendationEngine';
import {
  getCategoryLabelFa,
  getContextualItemTitle,
  getDiscountedPrice,
  getItemDiscountPercent
} from '../utils/menuHelpers';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  currentTable: string;
  menuItems: MenuItem[];
  hasCalorieCap?: boolean;
  onAddToCart: (item: MenuItem, discountedPrice?: number) => void;
  onSubmitOrder: (orderData: {
    customerName: string;
    customerPhone: string;
    tableNumber: string;
    notes?: string;
    paymentMethod: 'online' | 'cash_or_card_at_counter';
    discountAmount: number;
  }) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  currentTable,
  menuItems,
  hasCalorieCap,
  onAddToCart,
  onSubmitOrder
}) => {
  if (!isOpen) return null;

  const [customerName, setCustomerName] = useState('علی تهرانی');
  const [customerPhone, setCustomerPhone] = useState('09121234567');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash_or_card_at_counter'>('online');
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  // Calculate Subtotal
  const subtotal = cart.reduce((sum, item) => {
    const itemPrice = item.discountedPrice ?? item.unitPrice ?? item.item.price;
    const extraShotCost = item.extraShot ? 25000 : 0;
    return sum + (itemPrice + extraShotCost) * item.quantity;
  }, 0);

  // Apply Coupon
  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'AFTERNOON_SWEET' || code === 'WEEKEND_LATTE') {
      setAppliedDiscountPercent(20);
      setCouponMessage('کد تخفیف ۲۰٪ شخصی‌سازی شده شما با موفقیت اعمال شد!');
    } else if (code === 'BARISTA10') {
      setAppliedDiscountPercent(10);
      setCouponMessage('کد تخفیف ۱۰٪ باشگاه وفاداری اعمال شد.');
    } else {
      setCouponMessage('کد تخفیف نامعتبر یا منقضی شده است.');
      setAppliedDiscountPercent(0);
    }
  };

  const discountAmount = Math.round((subtotal * appliedDiscountPercent) / 100);
  const finalTotal = subtotal - discountAmount;

  // Detect if customer set a calorie cap or explicitly ordered diet items
  const cartItemIds = new Set(cart.map(c => c.item.id));
  const isDietCart =
    Boolean(hasCalorieCap) ||
    (cart.length > 0 &&
      cart.every(
        c =>
          c.item.nameFa.includes('رژیمی') ||
          c.item.tags.some(t => t.includes('رژیمی') || t.includes('بدون شکر'))
      ));
  const allCartItemsArePastry = cart.length > 0 && cart.every(c => c.item.categoryId === 'pastry');

  const smartUpsellItem = isDietCart
    ? findSmartDietUpsell(
        menuItems,
        cartItemIds,
        allCartItemsArePastry ? 'pastry' : 'coffee'
      )
    : menuItems
        .filter(
          i =>
            i.isAvailable &&
            i.categoryId === 'pastry' &&
            !isDietMenuItem(i) &&
            !cartItemIds.has(i.id) &&
            i.stock > 0
        )
        .sort(
          (a, b) =>
            getItemDiscountPercent(b) - getItemDiscountPercent(a) ||
            b.stock * b.profitMargin - a.stock * a.profitMargin
        )[0];

  const smartUpsellDiscountPct = smartUpsellItem ? getItemDiscountPercent(smartUpsellItem) : 0;
  const smartUpsellFinalPrice = smartUpsellItem
    ? getDiscountedPrice(smartUpsellItem.price, smartUpsellDiscountPct)
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    onSubmitOrder({
      customerName: customerName.trim() || 'مشتری کافه',
      customerPhone: customerPhone.trim() || '09120000000',
      tableNumber: currentTable,
      notes: orderNotes,
      paymentMethod,
      discountAmount
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-y-0 left-0 max-w-full flex">
        <div 
          className="w-screen max-w-md bg-[#181412] border-r border-[#2D251F] text-[#FAF5EB] flex flex-col justify-between shadow-2xl relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#2B231D] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#271F19] flex items-center justify-center text-[#F59E0B]">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-serif">سبد سفارش مستقیم</h3>
                <span className="text-xs text-[#9E9385]">
                  موقعیت تحویل: <strong className="text-white">{currentTable}</strong>
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-[#9E9385] hover:text-white p-1 rounded-lg hover:bg-[#2A211B] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#241D17] text-[#8C8072] flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-sm text-[#A89F91]">سبد سفارش شما در حال حاضر خالی است.</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#161311] bg-[#F59E0B] rounded-xl hover:bg-[#D97706] transition-colors"
                >
                  مشاهده منو و انتخاب
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map(cartItem => {
                    const priceToUse = cartItem.discountedPrice ?? cartItem.unitPrice ?? cartItem.item.price;
                    const extraShotCost = cartItem.extraShot ? 25000 : 0;
                    const itemTotal = (priceToUse + extraShotCost) * cartItem.quantity;

                    return (
                      <div
                        key={cartItem.cartItemId}
                        className="bg-[#1F1916] border border-[#30261F] rounded-xl p-3 flex gap-3 relative"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#F59E0B]/70 bg-white flex items-center justify-center shrink-0">
                          <img
                            src={cartItem.item.image || '/images/passin_logo.png'}
                            alt={cartItem.item.nameFa}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-1"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <span className="inline-block text-[10px] font-bold text-[#FBBF24] bg-[#281F17] px-1.5 py-0.5 rounded mb-0.5">
                                {getCategoryLabelFa(cartItem.item.categoryId)}
                              </span>
                              <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                                {getContextualItemTitle(cartItem.item)}
                              </h4>
                            </div>
                            <button
                              onClick={() => onRemoveItem(cartItem.cartItemId)}
                              className="text-[#857B6F] hover:text-[#EF4444] p-0.5 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Options selected */}
                          <div className="text-[11px] text-[#A89F91] flex flex-wrap items-center gap-1 pt-1">
                            {cartItem.selectedBlend && (
                              <span className="bg-[#292018] text-[#FBBF24] px-1.5 py-0.5 rounded font-bold">
                                لاین {cartItem.selectedBlend}
                              </span>
                            )}
                            {cartItem.selectedShot && (
                              <span className="bg-[#241C16] text-[#E6DEC8] px-1.5 py-0.5 rounded font-semibold">
                                {cartItem.selectedShot}
                              </span>
                            )}
                            {cartItem.selectedVariant && (
                              <span className="bg-[#2D231A] text-[#FBBF24] border border-[#F59E0B]/40 px-1.5 py-0.5 rounded font-extrabold">
                                طعم/مدل: {cartItem.selectedVariant}
                              </span>
                            )}
                            {cartItem.extraHotMilk && (
                              <span className="text-amber-300 font-semibold">شیر داغ‌تر</span>
                            )}
                            {cartItem.discountedPrice && (
                              <span className="bg-[#EF4444] text-white px-2 py-0.5 rounded font-black text-[10px]">
                                🔥 تخفیف ویژه
                              </span>
                            )}
                          </div>

                          {/* Price & Quantity Stepper */}
                          <div className="flex items-center justify-between pt-2">
                            {cartItem.discountedPrice ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-[#8C8072] line-through decoration-red-500 decoration-2">
                                  {(
                                    ((cartItem.unitPrice ?? cartItem.item.price) + extraShotCost) *
                                    cartItem.quantity
                                  ).toLocaleString('fa-IR')}
                                </span>
                                <span className="text-xs sm:text-sm font-black text-emerald-400">
                                  {itemTotal.toLocaleString('fa-IR')} تومان
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-extrabold text-[#F59E0B]">
                                {itemTotal.toLocaleString('fa-IR')} تومان
                              </span>
                            )}

                            <div className="flex items-center gap-2 bg-[#171310] border border-[#2D241E] rounded-lg px-2 py-0.5">
                              <button
                                onClick={() => onUpdateQuantity(cartItem.cartItemId, cartItem.quantity - 1)}
                                className="text-xs text-[#A89F91] hover:text-white px-1"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-mono font-bold text-white w-3 text-center">
                                {cartItem.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(cartItem.cartItemId, cartItem.quantity + 1)}
                                className="text-xs text-[#A89F91] hover:text-white px-1"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Smart Upsell Card (Dynamic Copy Based on Owner Discount!) */}
                {smartUpsellItem && (
                  <div
                    className={`p-3.5 rounded-xl space-y-2.5 border-2 ${
                      isDietCart
                        ? 'bg-emerald-950/35 border-emerald-500/70'
                        : smartUpsellDiscountPct > 0
                          ? 'bg-[#261C15] border-[#EF4444]/70'
                          : 'bg-[#221A14] border-[#F59E0B]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-black flex items-center gap-1.5 ${
                          isDietCart ? 'text-emerald-300' : 'text-[#FBBF24]'
                        }`}
                      >
                        {isDietCart ? (
                          <Leaf className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>
                          {smartUpsellDiscountPct > 0
                            ? 'در کنار سفارشت، با تخفیف امتحانش کن:'
                            : 'کنار سفارشت می‌چسبه:'}
                        </span>
                      </span>

                      {smartUpsellDiscountPct > 0 ? (
                        <span className="bg-[#EF4444] text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow shrink-0">
                          🔥 {smartUpsellDiscountPct.toLocaleString('fa-IR')}٪ تخفیف ویژه
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#E6DEC8] font-bold flex items-center gap-1 shrink-0">
                          <Flame className="w-3 h-3 text-[#F59E0B]" />
                          <span>{smartUpsellItem.calories.toLocaleString('fa-IR')} کالری</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#F59E0B]/70 bg-white flex items-center justify-center shrink-0">
                          <img
                            src={smartUpsellItem.image || '/images/passin_logo.png'}
                            alt={smartUpsellItem.nameFa}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="inline-block text-[10px] font-bold text-[#FBBF24] bg-black/40 px-1.5 py-0.5 rounded mb-0.5">
                            {getCategoryLabelFa(smartUpsellItem.categoryId)}
                          </span>
                          <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                            {getContextualItemTitle(smartUpsellItem)}
                          </p>
                          {smartUpsellDiscountPct > 0 ? (
                            <div className="flex items-center gap-1.5 text-xs mt-0.5">
                              <span className="text-[#9E9385] font-bold line-through decoration-red-500 decoration-2">
                                {smartUpsellItem.price.toLocaleString('fa-IR')}
                              </span>
                              <span className="text-emerald-400 font-black text-sm">
                                {smartUpsellFinalPrice.toLocaleString('fa-IR')} ت
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-extrabold text-[#FBBF24] block mt-0.5">
                              {smartUpsellItem.price.toLocaleString('fa-IR')} تومان
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onAddToCart(
                            smartUpsellItem,
                            smartUpsellDiscountPct > 0 ? smartUpsellFinalPrice : undefined
                          )
                        }
                        className={`px-3 py-1.5 text-xs font-black rounded-lg shrink-0 transition-colors shadow ${
                          smartUpsellDiscountPct > 0 || isDietCart
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-[#111]'
                            : 'bg-[#F59E0B] hover:bg-[#D97706] text-[#161311]'
                        }`}
                      >
                        {smartUpsellDiscountPct > 0 ? '+ افزودن با تخفیف' : '+ افزودن به سبد'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Coupon Code Section */}
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A7E70]" />
                      <input
                        type="text"
                        placeholder="کد تخفیف (مثال: AFTERNOON_SWEET)"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value)}
                        className="w-full bg-[#1A1512] border border-[#2E251E] focus:border-[#F59E0B] text-xs text-white pr-8 pl-3 py-1.5 rounded-lg focus:outline-none uppercase font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-3 py-1.5 text-xs font-semibold text-[#FAF5EB] bg-[#2E241D] hover:bg-[#3E3228] border border-[#44362A] rounded-lg transition-colors"
                    >
                      اعمال
                    </button>
                  </div>
                  {couponMessage && (
                    <p className={`text-[11px] mt-1.5 ${appliedDiscountPercent > 0 ? 'text-emerald-400' : 'text-[#EF4444]'}`}>
                      {couponMessage}
                    </p>
                  )}
                </div>

                {/* Customer Information Form */}
                <form id="checkout-form" onSubmit={handleSubmit} className="pt-2 space-y-2.5 border-t border-[#29211B]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#A89F91] mb-1">نام مشتری:</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full bg-[#1A1512] border border-[#2E251E] text-xs text-white p-2 rounded-lg focus:border-[#F59E0B] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#A89F91] mb-1">شماره تماس (جهت پیگیری):</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="w-full bg-[#1A1512] border border-[#2E251E] text-xs text-white p-2 rounded-lg focus:border-[#F59E0B] focus:outline-none font-mono text-left"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#A89F91] mb-1">توضیحات و درخواست ویژه:</label>
                    <input
                      type="text"
                      placeholder="مثال: دستمال اضافه، نوشیدنی بدون نی پلاستیکی..."
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                      className="w-full bg-[#1A1512] border border-[#2E251E] text-xs text-white p-2 rounded-lg focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[11px] text-[#A89F91] mb-1">روش پرداخت:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('online')}
                        className={`p-2 text-xs rounded-lg border text-center transition-all ${
                          paymentMethod === 'online'
                            ? 'border-[#F59E0B] bg-[#271E17] text-[#F59E0B] font-bold'
                            : 'border-[#2E251E] bg-[#161210] text-[#A89F91]'
                        }`}
                      >
                        پرداخت آنلاین مستقیم
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash_or_card_at_counter')}
                        className={`p-2 text-xs rounded-lg border text-center transition-all ${
                          paymentMethod === 'cash_or_card_at_counter'
                            ? 'border-[#F59E0B] bg-[#271E17] text-[#F59E0B] font-bold'
                            : 'border-[#2E251E] bg-[#161210] text-[#A89F91]'
                        }`}
                      >
                        کارت‌خوان روی میز / صندوق
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Footer & Checkout Total */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-[#29211B] bg-[#14100E] space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#A89F91]">
                  <span>مجموع سفارش:</span>
                  <span className="font-mono">{subtotal.toLocaleString('fa-IR')} تومان</span>
                </div>

                {appliedDiscountPercent > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>تخفیف هوشمند ({appliedDiscountPercent}٪):</span>
                    <span className="font-mono">- {discountAmount.toLocaleString('fa-IR')} تومان</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-[#241D17]">
                  <span>مبلغ نهایی قابل پرداخت:</span>
                  <span className="text-[#F59E0B] font-mono">
                    {finalTotal.toLocaleString('fa-IR')} تومان
                  </span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                className="w-full py-3 px-4 text-sm font-bold text-[#161311] bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2"
              >
                <span>ثبت قطعی و ارسال به باریستا</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#7A7063]">
                <Clock className="w-3.5 h-3.5" />
                <span>کاهش صف انتظار · میانگین زمان آماده‌سازی: ۳ تا ۵ دقیقه</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
