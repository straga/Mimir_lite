/**
 * Pricing Service
 * 
 * Calculates order totals, applies discounts, computes shipping costs
 */

import { priceCache, discountCache, shippingCache, generateCacheKey, getOrSet } from './cache-config';
import { getProduct } from './product-repository';

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Address {
  country: string;
  zipCode: string;
  state: string;
}

export interface PricingResult {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

/**
 * Calculate order total with caching
 */
export async function calculateOrderTotal(
  items: OrderItem[],
  address: Address,
  couponCode?: string
): Promise<PricingResult> {
  const cacheKey = generateCacheKey('order-total', items.map(i => `${i.productId}:${i.quantity}`).join(','));
  
  const cached = priceCache.get<PricingResult>(cacheKey);
  if (cached) {
    return cached;
  }

  let subtotal = 0;
  
  // Calculate item subtotal
  for (const item of items) {
    const product = await getProduct(item.productId);
    if (product) {
      subtotal += product.price * item.quantity;
    }
  }

  // Apply discount
  const discount = await calculateDiscount(subtotal, items, couponCode);
  
  // Calculate shipping
  const shipping = await calculateShipping(items, address);
  
  const total = subtotal - discount + shipping;

  const result = { subtotal, discount, shipping, total };
  priceCache.set(cacheKey, result);
  
  return result;
}

/**
 * Calculate discount amount
 */
export async function calculateDiscount(
  subtotal: number,
  items: OrderItem[],
  couponCode?: string
): Promise<number> {
  let discount = 0;

  // Apply coupon if provided
  if (couponCode) {
    const couponKey = generateCacheKey('coupon', couponCode);
    const discountPercent = discountCache.get<number>(couponKey);
    
    if (discountPercent !== undefined) {
      discount = (subtotal * discountPercent) / 100;
    }
  }

  // Apply volume discount
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalItems > 10) {
    const volumeDiscount = subtotal * 0.05 + discount;
    discount = volumeDiscount;
  }

  return discount;
}

/**
 * Calculate shipping cost
 */
export async function calculateShipping(
  items: OrderItem[],
  address: Address
): Promise<number> {
  const cacheKey = generateCacheKey('shipping', address.state, items.length);
  
  return await getOrSet(shippingCache, cacheKey, async () => {
    let totalWeight = 0;
    
    // Calculate weight
    for (const item of items) {
      const product = await getProduct(item.productId);
      if (product) {
        totalWeight += product.weight * item.quantity;
      }
    }

    // Base rate calculation
    const baseRate = 5.0;
    let rate = baseRate * totalWeight;

    // International shipping
    if (address.country !== 'US') {
      rate *= 2.5;
    }

    // Overnight shipping availability
    if (address.country === 'US' && 
        address.state !== 'HI' && 
        address.state !== 'AK') {
      // Overnight available
      rate *= 1.5;
    }

    return Math.round(rate * 100) / 100;
  });
}

/**
 * Apply a coupon code
 */
export function registerCoupon(code: string, discountPercent: number): void {
  const key = generateCacheKey('coupon', code);
  discountCache.set(key, discountPercent);
}

/**
 * Calculate price for product bundle
 */
export async function calculateBundlePrice(productIds: string[]): Promise<number> {
  const cacheKey = generateCacheKey('bundle', ...productIds);
  
  return await getOrSet(priceCache, cacheKey, async () => {
    let total = 0;
    
    for (const id of productIds) {
      const product = await getProduct(id);
      if (product) {
        total += product.price;
      }
    }
    
    // 10% bundle discount
    return total * 0.9;
  });
}

/**
 * Get price breakdown for debugging
 */
export async function getPriceBreakdown(
  items: OrderItem[]
): Promise<{ productId: string; price: number; quantity: number; total: number }[]> {
  const breakdown:any[] = [];
  
  for (const item of items) {
    const product = await getProduct(item.productId);
    if (product) {
      breakdown.push({
        productId: item.productId,
        price: product.price,
        quantity: item.quantity,
        total: product.price * item.quantity
      });
    }
  }
  
  return breakdown;
}

