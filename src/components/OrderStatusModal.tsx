import React from 'react';
import { CheckCircle2, Clock, Coffee, Sparkles, X, MapPin, Receipt, PhoneCall } from 'lucide-react';
import { Order } from '../types';

interface OrderStatusModalProps {
  order: Order | null;
  onClose: () => void;
  onCallWaiter?: () => void;
}

export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({
  order,
  onClose,
  onCallWaiter
}) => {
  if (!order) return null;

  const steps = [
    { key: 'pending', label: 'ثبت سفارش در سامانه', desc: 'سفارش در سیستم دریافت شد' },
    { key: 'preparing', label: 'در حال آماده‌سازی توسط باریستا', desc: 'عصاره‌گیری قهوه و پخت نان' },
    { key: 'ready', label: 'آماده تحویل / سرو', desc: 'آماده انتقال به میز شما' },
    { key: 'served', label: 'تحویل داده شد', desc: 'نوش جان!' }
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'preparing': return 1;
      case 'ready': return 2;
      case 'served': return 3;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#1B1613] border border-[#3A3026] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-[#FAF5EB] max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2C231D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif">رهگیری زنده سفارش #{order.orderNumber}</h3>
              <p className="text-xs text-[#9E9385]">تحویل به {order.tableNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9E9385] hover:text-white p-1 rounded-lg hover:bg-[#28201A]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Timeline Tracker */}
        <div className="py-6 space-y-4">
          <div className="p-4 bg-[#231A14] border border-[#3B2D22] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center animate-pulse">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-[#A89F91] block">وضعیت لحظه‌ای سفارش:</span>
                <span className="text-sm font-bold text-[#F59E0B]">
                  {steps[currentStepIdx].label}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#8C8173] block">زمان ثبت:</span>
              <span className="text-xs font-mono text-white">{order.createdAt}</span>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="relative pt-2 pb-2">
            <div className="flex items-center justify-between">
              {steps.map((st, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div key={st.key} className="flex flex-col items-center flex-1 text-center relative z-10">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPassed
                        ? 'bg-[#F59E0B] text-[#161311] shadow-md shadow-[#D97706]/30'
                        : 'bg-[#29221C] text-[#696055] border border-[#3E332B]'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`text-[11px] mt-2 font-medium max-w-[85px] leading-tight ${
                      isCurrent ? 'text-[#F59E0B] font-bold' : isPassed ? 'text-white' : 'text-[#6A6054]'
                    }`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Receipt Breakdown */}
          <div className="p-4 bg-[#14100E] border border-[#261E18] rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-[#231A14] pb-2 text-[#8C8275]">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                فاکتور دیجیتال سفارش
              </span>
              <span>شماره میز: {order.tableNumber}</span>
            </div>

            <div className="space-y-1.5 pt-1">
              {order.items.map(item => (
                <div key={item.cartItemId} className="flex justify-between items-center text-[#D8CFBF]">
                  <span>
                    {item.quantity} × {item.item.nameFa}
                    {item.discountedPrice && <span className="text-emerald-400 text-[10px] mr-1">(پکیج هوشمند)</span>}
                  </span>
                  <span className="font-mono">
                    {((item.discountedPrice ?? item.item.price) * item.quantity).toLocaleString('fa-IR')} ت
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#231A14] pt-2 flex justify-between font-bold text-white text-sm">
              <span>مبلغ نهایی پرداختی:</span>
              <span className="text-[#F59E0B] font-mono">
                {order.total.toLocaleString('fa-IR')} تومان
              </span>
            </div>
          </div>

          {/* Call Waiter / Help button */}
          <div className="flex items-center justify-between p-3 bg-[#221A15] border border-[#3A2D23] rounded-xl text-xs text-[#A89F91]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#F59E0B]" />
              <span>سفارش مستقیماً روی {order.tableNumber} تحویل داده می‌شود.</span>
            </div>
            {onCallWaiter && (
              <button
                type="button"
                onClick={onCallWaiter}
                className="flex items-center gap-1 text-[11px] text-[#F59E0B] hover:underline"
              >
                <PhoneCall className="w-3 h-3" />
                <span>فراخوانی ویتر</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#2C231D] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 text-xs font-semibold text-[#161311] bg-[#F59E0B] hover:bg-[#D97706] rounded-xl transition-all"
          >
            متشکرم، بازگشت به منو
          </button>
        </div>
      </div>
    </div>
  );
};
