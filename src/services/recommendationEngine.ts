import { MenuItem, QuizPreferences, RecommendationResult, CaloriePreference } from '../types';
import {
  getContextualItemTitle,
  getDiscountedPrice,
  getItemDiscountPercent
} from '../utils/menuHelpers';

export interface CalorieBracketInfo {
  id: CaloriePreference;
  title: string;
  rangeLabel: string;
  examplesLabel: string;
  minCal?: number;
  maxCal?: number;
  count: number;
}

/**
 * Checks whether a menu item is diet-friendly / low-calorie / sugar-free
 */
export function isDietMenuItem(item: MenuItem): boolean {
  if (item.calories <= 100) return true;
  if (item.nameFa.includes('رژیمی') || item.nameFa.includes('بدون شکر')) return true;
  return item.tags.some(
    t => t.includes('رژیمی') || t.includes('بدون شکر') || t.includes('کم‌کالری') || t.includes('بدون قند')
  );
}

/**
 * Dynamically computes the 3 calorie brackets + "any" option directly from the live menu items,
 * so ranges are 100% grounded in the real Passin Cafe menu (never arbitrary numbers).
 */
export function getMenuCalorieBrackets(menuItems: MenuItem[]): CalorieBracketInfo[] {
  const available = menuItems.filter(i => i.isAvailable);

  const dietItems = available.filter(i => i.calories <= 100);
  const balancedItems = available.filter(i => i.calories > 100 && i.calories <= 275);
  const highItems = available.filter(i => i.calories > 275);

  const formatNum = (n: number) => n.toLocaleString('fa-IR');

  const dietMin = dietItems.length > 0 ? Math.min(...dietItems.map(i => i.calories)) : 5;
  const dietMax = dietItems.length > 0 ? Math.max(...dietItems.map(i => i.calories)) : 95;

  const balMin = balancedItems.length > 0 ? Math.min(...balancedItems.map(i => i.calories)) : 110;
  const balMax = balancedItems.length > 0 ? Math.max(...balancedItems.map(i => i.calories)) : 270;

  const highMin = highItems.length > 0 ? Math.min(...highItems.map(i => i.calories)) : 280;
  const highMax = highItems.length > 0 ? Math.max(...highItems.map(i => i.calories)) : 500;

  return [
    {
      id: 'any',
      title: 'کالری مصرفی برام مهم نیست',
      rangeLabel: 'بدون محدودیت کالری',
      examplesLabel: `پیشنهاد از بین تمام ${formatNum(available.length)} آیتم منو بر اساس طعم`,
      count: available.length
    },
    {
      id: 'diet',
      title: 'سبک و رژیمی',
      rangeLabel: `${formatNum(dietMin)} تا ${formatNum(dietMax)} کالری`,
      examplesLabel: 'اسپرسو، آمریکانو، V60، دمنوش‌ها، گرین‌سی و کوکی رژیمی',
      minCal: dietMin,
      maxCal: dietMax,
      count: dietItems.length
    },
    {
      id: 'balanced',
      title: 'متعادل و استاندارد',
      rangeLabel: `${formatNum(balMin)} تا ${formatNum(balMax)} کالری`,
      examplesLabel: 'لاته، کاپوچینو، ماچا، اسموتی‌های میوه‌ای و ماکتیل‌ها',
      minCal: balMin,
      maxCal: balMax,
      count: balancedItems.length
    },
    {
      id: 'high',
      title: 'پرانرژی، ورزشی و دسری',
      rangeLabel: `${formatNum(highMin)} تا ${formatNum(highMax)} کالری`,
      examplesLabel: 'شیک اوت‌میل، بادام‌زمینی، میلک‌شیک‌ها، هات‌چاکلت و کیک‌ها',
      minCal: highMin,
      maxCal: highMax,
      count: highItems.length
    }
  ];
}

/**
 * Finds the best diet-friendly complementary item (e.g. Sugar-Free Diet Oat Cookie for diet drinks,
 * or V60 / Americano / Green Tea if the customer picked a diet snack).
 */
export function findSmartDietUpsell(
  menuItems: MenuItem[],
  excludeIds: Set<string>,
  primaryCategory?: MenuItem['categoryId']
): MenuItem | undefined {
  const available = menuItems.filter(i => i.isAvailable && i.stock > 0 && !excludeIds.has(i.id));

  if (!primaryCategory || primaryCategory !== 'pastry') {
    const dietPastries = available
      .filter(i => i.categoryId === 'pastry' && isDietMenuItem(i))
      .sort(
        (a, b) =>
          getItemDiscountPercent(b) - getItemDiscountPercent(a) ||
          a.calories - b.calories ||
          b.stock - a.stock
      );

    return dietPastries[0];
  }

  const dietDrinks = available
    .filter(
      i =>
        i.categoryId !== 'pastry' &&
        isDietMenuItem(i) &&
        (i.categoryId === 'coffee' || i.categoryId === 'brewed')
    )
    .sort(
      (a, b) =>
        getItemDiscountPercent(b) - getItemDiscountPercent(a) ||
        a.calories - b.calories ||
        b.profitMargin - a.profitMargin
    );

  return dietDrinks[0];
}

/**
 * Computes complementary upsell & combo pricing for any chosen primary item
 */
export function computeUpsellAndPricing(
  primaryItem: MenuItem,
  availableItems: MenuItem[],
  preferences: QuizPreferences
) {
  let upsellItem: MenuItem | undefined = undefined;
  // If calorie doesn't matter ('any') -> suggest cakes; if calorie matters (!== 'any') -> suggest diet cookie/pastry!
  const isDietContext = preferences.caloriePreference !== 'any';

  if (preferences.includePastry) {
    if (isDietContext) {
      upsellItem = findSmartDietUpsell(
        availableItems,
        new Set([primaryItem.id]),
        primaryItem.categoryId
      );
    } else {
      const potentialUpsells = availableItems.filter(item => {
        if (item.id === primaryItem.id) return false;
        if (primaryItem.categoryId !== 'pastry') {
          return item.categoryId === 'pastry' && !isDietMenuItem(item);
        } else {
          return (
            item.categoryId === 'coffee' ||
            item.categoryId === 'brewed' ||
            item.categoryId === 'hot_drinks'
          );
        }
      });

      potentialUpsells.sort((a, b) => {
        const aHasDiscount = getItemDiscountPercent(a) > 0 ? 1 : 0;
        const bHasDiscount = getItemDiscountPercent(b) > 0 ? 1 : 0;
        if (bHasDiscount !== aHasDiscount) return bHasDiscount - aHasDiscount;

        return b.stock * b.profitMargin - a.stock * a.profitMargin;
      });
      upsellItem = potentialUpsells[0];
    }
  }

  const primaryDiscountPct = getItemDiscountPercent(primaryItem);
  const primaryEffectivePrice = getDiscountedPrice(primaryItem.price, primaryDiscountPct);

  let comboDiscountPercent = 0;
  let totalOriginalPrice = primaryItem.price;
  let totalComboPrice = primaryEffectivePrice;
  let totalSavings = primaryItem.price - primaryEffectivePrice;
  let profitAnalysis = '';

  const primaryTitle = getContextualItemTitle(primaryItem);

  if (upsellItem) {
    comboDiscountPercent = getItemDiscountPercent(upsellItem);
    const upsellEffectivePrice = getDiscountedPrice(upsellItem.price, comboDiscountPercent);
    const upsellTitle = getContextualItemTitle(upsellItem);

    totalOriginalPrice = primaryItem.price + upsellItem.price;
    totalComboPrice = primaryEffectivePrice + upsellEffectivePrice;
    totalSavings = totalOriginalPrice - totalComboPrice;

    const netComboProfit = totalComboPrice - (primaryItem.cost + upsellItem.cost);
    const marginPct = totalComboPrice > 0 ? Math.round((netComboProfit / totalComboPrice) * 100) : 0;

    if (comboDiscountPercent > 0) {
      profitAnalysis = `این پیشنهاد با ${comboDiscountPercent.toLocaleString('fa-IR')}٪ تخفیف تعیین‌شده مدیریت روی «${upsellTitle}»، موجودی انبار (${upsellItem.stock.toLocaleString('fa-IR')} عدد) را سریع‌تر به گردش درآورده و سود خالص ${netComboProfit.toLocaleString('fa-IR')} تومانی برای کافه محقق می‌کند (حاشیه سود ${marginPct.toLocaleString('fa-IR')}٪).`;
    } else {
      profitAnalysis = `پیشنهاد «${upsellTitle}» در کنار «${primaryTitle}» میانگین مبلغ سبد را افزایش داده و سود خالص مجموع را به ${netComboProfit.toLocaleString('fa-IR')} تومان می‌رساند (حاشیه سود ${marginPct.toLocaleString('fa-IR')}٪).`;
    }
  } else {
    const netSingleProfit = primaryEffectivePrice - primaryItem.cost;
    const singleMargin =
      primaryEffectivePrice > 0 ? Math.round((netSingleProfit / primaryEffectivePrice) * 100) : 0;
    profitAnalysis = `سود خالص تک‌آیتم «${primaryTitle}» معادل ${netSingleProfit.toLocaleString('fa-IR')} تومان (حاشیه سود ${singleMargin.toLocaleString('fa-IR')}٪) است.`;
  }

  const reason = generateReasonProse(primaryItem, preferences, upsellItem, isDietContext);

  return {
    upsellItem,
    comboDiscountPercent,
    totalOriginalPrice,
    totalComboPrice,
    totalSavings,
    reason,
    profitAnalysis
  };
}

export function generateSmartRecommendation(
  menuItems: MenuItem[],
  preferences: QuizPreferences
): RecommendationResult | null {
  const availableItems = menuItems.filter(item => item.isAvailable && item.stock > 0);
  if (availableItems.length === 0) return null;

  // Map quiz caffeine ('decaf' = ملایم چای/دمنوش) to MenuItem['caffeineLevel'] ('low')
  const targetCaffeineLevel: MenuItem['caffeineLevel'] =
    preferences.caffeine === 'decaf' ? 'low' : preferences.caffeine;

  // Score candidate items separating customer taste/constraint score from cafe business boost
  const evaluated = availableItems.map(item => {
    let tasteScore = 0;
    let passesHardCalorie = true;
    let passesHardCaffeine = true;

    const effectivePrice = getDiscountedPrice(item.price, getItemDiscountPercent(item));

    // 1. Budget match (based on effective customer price after any owner discount)
    if (effectivePrice <= preferences.budgetMax) {
      tasteScore += 30;
    } else {
      tasteScore -= Math.abs(effectivePrice - preferences.budgetMax) / 2000;
    }

    // 2. Calorie preference match
    switch (preferences.caloriePreference) {
      case 'diet':
        if (item.calories <= 100) {
          tasteScore += 50;
          if (isDietMenuItem(item)) tasteScore += 5;
        } else {
          passesHardCalorie = false;
          tasteScore -= item.calories <= 150 ? 45 : 100;
        }
        if (item.categoryId === 'pastry') tasteScore -= 12;
        break;

      case 'balanced':
        if (item.calories > 100 && item.calories <= 275) {
          tasteScore += 40;
        } else {
          passesHardCalorie = false;
          tasteScore -= 35;
        }
        break;

      case 'high':
        if (item.calories > 275) {
          tasteScore += 40;
          if (
            preferences.vibe === 'energy' &&
            (item.nameFa.includes('اوت میل') ||
              item.nameFa.includes('بادام زمینی') ||
              item.nameFa.includes('ارده'))
          ) {
            tasteScore += 15;
          }
        } else {
          passesHardCalorie = false;
          tasteScore -= 35;
        }
        break;

      case 'any':
      default:
        break;
    }

    // 3. Temperature match
    if (preferences.temperature === 'any' || item.temperature === preferences.temperature) {
      tasteScore += 25;
    } else if (item.temperature === 'room') {
      tasteScore += 5;
    }

    // 4. Caffeine match (with 'decaf' properly mapped to 'low')
    if (targetCaffeineLevel === item.caffeineLevel) {
      tasteScore += 25;
    } else if (targetCaffeineLevel === 'none' && item.caffeineLevel !== 'none') {
      passesHardCaffeine = false;
      tasteScore -= item.caffeineLevel === 'low' ? 30 : 60;
    } else if (
      targetCaffeineLevel === 'low' &&
      (item.caffeineLevel === 'none' || item.caffeineLevel === 'medium')
    ) {
      tasteScore += 8;
    }

    // 5. Vibe match
    switch (preferences.vibe) {
      case 'energy':
        if (item.caffeineLevel === 'high') tasteScore += 20;
        if (item.categoryId === 'coffee' || item.categoryId === 'brewed') tasteScore += 15;
        if (
          preferences.caloriePreference === 'high' &&
          item.categoryId === 'milkshake'
        ) {
          tasteScore += 20;
        }
        break;

      case 'relax':
        if (
          item.categoryId === 'herbal' ||
          item.categoryId === 'hot_drinks' ||
          item.flavorNotes.some(n => n.includes('آرام') || n.includes('ملایم'))
        ) {
          tasteScore += 20;
        }
        break;

      case 'focus':
        if (item.categoryId === 'coffee' || item.categoryId === 'brewed') tasteScore += 20;
        break;

      case 'sweet':
        if (
          item.categoryId === 'milkshake' ||
          item.categoryId === 'pastry' ||
          item.flavorNotes.some(
            n =>
              n.includes('شیرین') ||
              n.includes('کارامل') ||
              n.includes('شکلات') ||
              n.includes('عسل') ||
              n.includes('وانیل')
          )
        ) {
          tasteScore += 20;
        }
        break;

      case 'refresh':
        if (
          item.temperature === 'cold' ||
          item.categoryId === 'mocktail' ||
          item.categoryId === 'smoothie' ||
          item.categoryId === 'cold_drinks'
        ) {
          tasteScore += 20;
        }
        break;
    }

    // 6. Sweetness match
    if (
      preferences.sweetness === 'bitter' &&
      (item.flavorNotes.some(n => n.includes('تلخ') || n.includes('بدون شکر')) ||
        item.calories <= 35)
    ) {
      tasteScore += 15;
    } else if (
      preferences.sweetness === 'sweet' &&
      item.flavorNotes.some(
        n =>
          n.includes('شیرین') ||
          n.includes('کارامل') ||
          n.includes('شکلات') ||
          n.includes('عسل') ||
          n.includes('بستنی')
      )
    ) {
      tasteScore += 15;
    }

    // Business score only used to choose OUR #1 highlight among equally-matching items
    const cafeBoost = item.profitMargin / 5 + Math.min(item.stock, 100) / 50;
    const totalScore = tasteScore + cafeBoost;

    return {
      item,
      tasteScore,
      totalScore,
      passesHardCalorie,
      passesHardCaffeine
    };
  });

  // Sort primarily by customer tasteScore, breaking close ties by totalScore
  const bestTasteScore = Math.max(...evaluated.map(e => e.tasteScore));

  // Collect ALL items that share the same/similar match conditions (within 18 taste points of best match)
  let matchingPool = evaluated.filter(
    e =>
      e.passesHardCalorie &&
      e.passesHardCaffeine &&
      e.tasteScore >= bestTasteScore - 18
  );

  // Graceful fallback if strict filters left 0 items (e.g. rare combination of answers)
  if (matchingPool.length === 0) {
    matchingPool = evaluated.filter(
      e => e.passesHardCalorie && e.tasteScore >= bestTasteScore - 20
    );
  }
  if (matchingPool.length === 0) {
    matchingPool = evaluated.filter(e => e.tasteScore >= bestTasteScore - 20);
  }

  // Sort matchingPool so our #1 Cafe Recommendation (highest totalScore) is known,
  // while keeping all matching items accessible for the customer to choose!
  matchingPool.sort((a, b) => b.totalScore - a.totalScore);

  const primaryItem = matchingPool[0]?.item || availableItems[0];
  const matchingItems = matchingPool.map(m => m.item);

  const comboDetails = computeUpsellAndPricing(primaryItem, availableItems, preferences);

  return {
    primaryItem,
    matchingItems,
    ...comboDetails
  };
}

function generateReasonProse(
  primary: MenuItem,
  prefs: QuizPreferences,
  upsell?: MenuItem,
  isDietContext?: boolean
): string {
  const parts: string[] = [];
  const primaryTitle = getContextualItemTitle(primary);

  if (prefs.vibe === 'energy') {
    parts.push(
      `با توجه به نیاز شما به انرژی و تمرکز بالا، پیشنهاد نهایی ما «${primaryTitle}» است.`
    );
  } else if (prefs.vibe === 'relax') {
    parts.push(
      `برای لحظاتی آرام و دلنشین، پیشنهاد نهایی ما «${primaryTitle}» با بالانس طعمی ملایم است.`
    );
  } else if (prefs.vibe === 'sweet') {
    parts.push(
      `طعم‌یادهای دلپذیر «${primaryTitle}» حس شیرینی جذابی را مطابق سلیقه شما فراهم می‌کند.`
    );
  } else {
    parts.push(
      `«${primaryTitle}» هماهنگی کاملی با بودجه، دما و ذائقه انتخابی شما دارد.`
    );
  }

  if (prefs.caloriePreference === 'diet') {
    parts.push(
      `این آیتم با تنها ${primary.calories.toLocaleString('fa-IR')} کالری، کاملاً منطبق با رژیم سبک و کم‌کالری شماست.`
    );
  } else if (prefs.caloriePreference === 'balanced') {
    parts.push(
      `میزان انرژی آن (${primary.calories.toLocaleString('fa-IR')} کالری) دقیقاً در بازه متعادل مدنظر شما قرار دارد.`
    );
  } else if (prefs.caloriePreference === 'high') {
    parts.push(
      `با ${primary.calories.toLocaleString('fa-IR')} کالری، یک انتخاب سیرکننده و پرانرژی محسوب می‌شود.`
    );
  }

  if (upsell) {
    const upsellTitle = getContextualItemTitle(upsell);
    const upsellDisc = getItemDiscountPercent(upsell);
    if (isDietContext) {
      parts.push(
        upsellDisc > 0
          ? `در کنار سفارشتان، «${upsellTitle}» (${upsell.calories.toLocaleString('fa-IR')} کالری، بدون شکر افزوده) با ${upsellDisc.toLocaleString('fa-IR')}٪ تخفیف ویژه پیشنهاد شده است.`
          : `کنار سفارشتان، «${upsellTitle}» (${upsell.calories.toLocaleString('fa-IR')} کالری، بدون شکر افزوده) یک همراه رژیمی ایده‌آل است.`
      );
    } else {
      parts.push(
        upsellDisc > 0
          ? `همچنین در کنار سفارشتان می‌توانید «${upsellTitle}» را با ${upsellDisc.toLocaleString('fa-IR')}٪ تخفیف ویژه امتحان کنید.`
          : `همچنین کنار سفارشتان «${upsellTitle}» بسیار می‌چسبد.`
      );
    }
  }

  return parts.join(' ');
}
