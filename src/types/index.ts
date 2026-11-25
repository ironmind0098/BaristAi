export type CategoryId = 
  | 'all'
  | 'coffee'
  | 'brewed'
  | 'hot_drinks'
  | 'herbal'
  | 'pastry'
  | 'cold_drinks'
  | 'smoothie'
  | 'milkshake'
  | 'mocktail';

export interface BlendShotPrices {
  single?: number; // In Tomans (e.g. 150000)
  double?: number; // In Tomans (e.g. 200000)
  fixed?: number;  // For single-price per blend like Caramel Macchiato
}

export interface CoffeePriceMatrix {
  blend7030?: BlendShotPrices;
  blend8020?: BlendShotPrices;
  arabica100?: BlendShotPrices;
}

export interface SizeOrVariantOption {
  label: string;
  price: number; // In Tomans
}

export interface MenuItem {
  id: string;
  nameFa: string;
  nameEn: string;
  categoryId: CategoryId;
  description: string;
  price: number; // Base/default price in Iranian Tomans (e.g., 150000 for 150)
  priceLabel?: string; // Optional display range e.g. '۱۵۰ تا ۳۱۰'
  discountPercent?: number; // Cafe owner configurable discount (0 to 90%)
  coffeeMatrix?: CoffeePriceMatrix;
  variantOptions?: SizeOrVariantOption[]; // e.g., 1 Cup / 2 Cup for V60, or Matcha plain vs syrup
  flavorChoices?: string[]; // e.g., ['کارامل', 'فندق', 'وانیل', 'عسل']
  cost: number; // Cost to produce for profit calculation
  stock: number; // Available inventory count
  profitMargin: number; // percentage (e.g., 65%)
  calories: number;
  prepTimeMinutes: number;
  image: string;
  flavorNotes: string[];
  temperature: 'hot' | 'cold' | 'room';
  caffeineLevel: 'none' | 'low' | 'medium' | 'high';
  tags: string[]; // e.g., 'پرسود', 'پرفروش', 'پیشنهاد باریستا', 'بدون قند'
  isAvailable: boolean;
}

export interface CartItem {
  cartItemId: string;
  item: MenuItem;
  quantity: number;
  selectedBlend?: string; // '۷۰-۳۰' | '۸۰-۲۰' | '۱۰۰ عربیکا'
  selectedShot?: string; // 'سینگل' | 'دبل'
  selectedVariant?: string; // e.g., 'تک کاپ' | '۲ کاپ (2 Cup)' or flavor choice
  extraHotMilk?: boolean; // درخواست داغ‌تر شدن شیر
  selectedMilk?: string; // شیر معمولی، شیر کم‌چرب، شیر بادام، شیر جو دوسر
  sweetness?: string; // تلخ/بدون شکر، کم‌شیرین، معمولی، شیرین
  extraShot?: boolean;
  notes?: string;
  unitPrice?: number; // Exact price based on blend/shot/variant selection
  discountedPrice?: number; // In case of smart combo bundle
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: number;
  tableNumber: string; // 'میز ۱' تا 'میز ۱۰' یا 'بیرون‌بر'
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  profit: number;
  status: OrderStatus;
  createdAt: string;
  paymentMethod: 'online' | 'cash_or_card_at_counter';
  isPaid: boolean;
  notes?: string;
}

export type CaloriePreference = 'any' | 'diet' | 'balanced' | 'high';

export interface QuizPreferences {
  vibe: 'energy' | 'relax' | 'focus' | 'sweet' | 'refresh';
  temperature: 'hot' | 'cold' | 'any';
  sweetness: 'bitter' | 'balanced' | 'sweet';
  caffeine: 'high' | 'medium' | 'decaf' | 'none';
  caloriePreference: CaloriePreference;
  budgetMax: number; // e.g., 250000, 350000, 450000, 650000
  includePastry: boolean;
}

export interface RecommendationResult {
  primaryItem: MenuItem;
  matchingItems: MenuItem[];
  upsellItem?: MenuItem;
  comboDiscountPercent: number;
  totalOriginalPrice: number;
  totalComboPrice: number;
  totalSavings: number;
  reason: string;
  profitAnalysis: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'beans' | 'dairy' | 'syrup' | 'bakery' | 'packaging' | 'produce';
  currentStock: number;
  unit: string; // کیلوگرم، لیتر، بسته، عدد
  minThreshold: number;
  costPerUnit: number;
  lastRestocked: string;
  supplier: string;
}

export interface FinancialSummary {
  todayRevenue: number;
  todayProfit: number;
  todayOrdersCount: number;
  weeklyRevenue: number;
  weeklyProfit: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  averageOrderValue: number;
  profitMarginPercent: number;
}
