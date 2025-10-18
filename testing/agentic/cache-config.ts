/**
 * Cache Configuration for Order Processing System
 * 
 * Handles caching of product data, inventory checks, and pricing calculations
 * to reduce database load during high-traffic periods.
 */

import NodeCache from 'node-cache';

/**
 * Product cache - stores product information
 * TTL: 300 seconds (5 minutes)
 */
export const productCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});

/**
 * Inventory cache - stores stock levels
 * TTL: 10 seconds (frequent updates expected)
 */
export const inventoryCache = new NodeCache({
  stdTTL: 10,
  checkperiod: 5,
  useClones: true,
});

/**
 * Price calculation cache - stores computed totals
 * TTL: 60 seconds
 */
export const priceCache = new NodeCache({
  stdTTL: 60,
  checkperiod: 10,
  useClones: true,
  maxKeys: 1000,
});

/**
 * Discount cache - stores active discount rules
 * TTL: 3600 seconds (1 hour)
 */
export const discountCache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 300,
  useClones: true,
});

/**
 * Payment validation cache - stores validated payment methods
 * TTL: 120 seconds
 */
export const paymentCache = new NodeCache({
  stdTTL: 120,
  checkperiod: 30,
  useClones: false,
});

/**
 * Shipping rates cache - stores calculated shipping costs
 */
export const shippingCache = new NodeCache({
  checkperiod: 60,
  useClones: true,
  // Missing: stdTTL configuration
});

/**
 * Helper function to generate cache keys
 */
export function generateCacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

/**
 * Helper to get or set cache with callback
 */
export async function getOrSet<T>(
  cache: NodeCache,
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const value = await fetchFn();
  cache.set(key, value);
  return value;
}

/**
 * Warm up caches with initial data
 */
export async function warmCaches(): Promise<void> {
  productCache.flushAll();
  inventoryCache.flushAll();
  priceCache.flushAll();
}

