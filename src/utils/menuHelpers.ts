import { CategoryId, MenuItem } from '../types';

export const CATEGORY_LABELS_FA: Record<CategoryId, string> = {
  all: 'همه آیتم‌ها',
  coffee: 'بر پایه قهوه',
  brewed: 'قهوه دمی',
  hot_drinks: 'نوشیدنی گرم',
  herbal: 'دمنوش گیاهی',
  pastry: 'کیک و میان‌وعده',
  cold_drinks: 'نوشیدنی سرد',
  smoothie: 'اسموتی میوه‌ای',
  milkshake: 'میلک‌شیک',
  mocktail: 'نوشیدنی گازدار (ماکتیل)'
};

export function getCategoryLabelFa(categoryId: CategoryId): string {
  return CATEGORY_LABELS_FA[categoryId] || categoryId;
}

/**
 * Returns an unambiguous item title when displayed outside its grouped category section
 * (e.g. turns bare "ارده و شیره خرما" in milkshake category into "میلک‌شیک ارده و شیره خرما",
 * "اسپرسو" in milkshake into "میلک‌شیک اسپرسو", "موز، انبه، آناناس" into "اسموتی موز، انبه، آناناس").
 */
export function getContextualItemTitle(item: MenuItem): string {
  const name = item.nameFa.trim();

  switch (item.categoryId) {
    case 'milkshake':
      if (!name.includes('شیک')) {
        return `میلک‌شیک ${name}`;
      }
      return name;

    case 'smoothie':
      if (!name.includes('اسموتی') && !name.startsWith('شیر')) {
        return `اسموتی ${name}`;
      }
      return name;

    case 'herbal':
      if (!name.includes('دمنوش') && !name.includes('چای')) {
        return `دمنوش ${name}`;
      }
      return name;

    case 'cold_drinks':
      if (name.startsWith('ماچا') && !name.includes('آیس') && !name.includes('سرد')) {
        return `آیس ${name}`;
      }
      return name;

    case 'hot_drinks':
      if (name.startsWith('ماچا') && !name.includes('گرم')) {
        return name.replace(/^ماچا/, 'ماچا گرم');
      }
      if (name === 'ماسالا') {
        return 'چای ماسالا';
      }
      return name;

    case 'mocktail':
      if (
        !name.includes('ماکتیل') &&
        !name.includes('لیموناد') &&
        !name.includes('موهیتو') &&
        !name.includes('آیس تی')
      ) {
        return `ماکتیل ${name}`;
      }
      return name;

    default:
      return name;
  }
}

/**
 * Returns the active owner-configured discount percentage (0 if none).
 */
export function getItemDiscountPercent(item: MenuItem): number {
  const pct = Number(item.discountPercent || 0);
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return Math.min(90, Math.round(pct));
}

/**
 * Computes discounted price in Tomans based on discountPercent.
 */
export function getDiscountedPrice(price: number, discountPercent?: number): number {
  const pct = Number(discountPercent || 0);
  if (!Number.isFinite(pct) || pct <= 0) return price;
  const clamped = Math.min(90, Math.round(pct));
  return Math.round((price * (100 - clamped)) / 100);
}
