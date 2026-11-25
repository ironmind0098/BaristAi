import React from 'react';
import { ShoppingBag, Sparkles, Phone, Instagram } from 'lucide-react';
import { CartItem } from '../types';

interface HeaderProps {
  activeTab: 'menu' | 'quiz';
  setActiveTab: (tab: 'menu' | 'quiz') => void;
  cart: CartItem[];
  setIsCartOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  cart,
  setIsCartOpen
}) => {
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-30 bg-[#161311]/95 backdrop-blur-md border-b border-[#2D2622] px-4 md:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        
        {/* Zone 1: Logo & Cafe Name (کافه پسین) */}
        <div 
          onClick={() => setActiveTab('menu')}
          className="flex items-center gap-3 cursor-pointer whitespace-nowrap shrink-0 group select-none"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-[#F59E0B]/70 shadow-lg shadow-[#D97706]/20 bg-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <img
              src="/images/passin_logo.png"
              alt="لوگو کافه پسین"
              className="w-full h-full object-cover scale-105"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-bold tracking-tight text-[#FAF5EB] font-serif">
              کافـه پسین
            </span>
            <span className="text-[11px] text-[#F59E0B] tracking-wider uppercase font-mono">
              Passin Cafe
            </span>
          </div>
        </div>

        {/* Zone 2: Customer Navigation Links & Contact Info */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-medium text-[#C4BDB2]">
          <button
            onClick={() => setActiveTab('menu')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-[#F3EED9] relative ${
              activeTab === 'menu' ? 'text-[#F59E0B] font-semibold' : ''
            }`}
          >
            منو و سفارش آنلاین
            {activeTab === 'menu' && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#F59E0B] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors py-1 hover:text-[#F3EED9] relative ${
              activeTab === 'quiz' ? 'text-[#F59E0B] font-semibold' : ''
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            باریستا هوشمند (سلیقه و بودجه)
            {activeTab === 'quiz' && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#F59E0B] rounded-full" />
            )}
          </button>

          <div className="h-4 w-px bg-[#2D2622]" />

          <a
            href="https://instagram.com/passincafe"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-[#C4BDB2] hover:text-[#F59E0B] transition-colors"
          >
            <Instagram className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>@passincafe</span>
          </a>

          <a
            href="tel:07136249850"
            className="flex items-center gap-1.5 text-xs font-mono text-[#C4BDB2] hover:text-[#F59E0B] transition-colors"
            dir="ltr"
          >
            <Phone className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>0713-624-9850</span>
          </a>
        </nav>

        {/* Zone 3: Primary Action Zone */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          {/* Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#161311] bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] rounded-xl transition-all shadow-md shadow-[#D97706]/15 active:scale-95 whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="font-semibold">سبد سفارش</span>
            {totalItemsCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-[11px] font-bold text-white bg-[#161311] rounded-full">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* Mobile Navigation Row */}
      <div className="lg:hidden flex items-center justify-between gap-3 overflow-x-auto pt-3 pb-0.5 text-xs text-[#A89F91] border-t border-[#25201C] mt-2.5 no-scrollbar">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('menu')}
            className={`whitespace-nowrap px-2 py-1 rounded transition-colors ${
              activeTab === 'menu' ? 'text-[#F59E0B] font-semibold bg-[#251E18]' : ''
            }`}
          >
            منوی دیجیتال
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`whitespace-nowrap px-2 py-1 rounded transition-colors flex items-center gap-1 ${
              activeTab === 'quiz' ? 'text-[#F59E0B] font-semibold bg-[#251E18]' : ''
            }`}
          >
            <Sparkles className="w-3 h-3 text-[#F59E0B]" />
            باریستا هوشمند
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
          <a
            href="https://instagram.com/passincafe"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#C4BDB2] hover:text-[#F59E0B]"
          >
            <Instagram className="w-3 h-3 text-[#F59E0B]" />
            <span>passincafe</span>
          </a>
          <a
            href="tel:07136249850"
            className="flex items-center gap-1 text-[#C4BDB2] hover:text-[#F59E0B]"
            dir="ltr"
          >
            <Phone className="w-3 h-3 text-[#F59E0B]" />
            <span>0713-624-9850</span>
          </a>
        </div>
      </div>
    </header>
  );
};
