/**
 * Product Repository
 * 
 * Handles product data access with caching layer
 */

import { productCache, inventoryCache, generateCacheKey } from './cache-config';

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  weight: number;
  category?: string;
}

// Simulated database
const productDatabase = new Map<string, Product>();

/**
 * Initialize with sample products
 */
export function initializeProducts(products: Product[]): void {
  productDatabase.clear();
  products.forEach(p => productDatabase.set(p.id, p));
}

/**
 * Get product by ID with caching
 */
export async function getProduct(productId: string): Promise<Product | null> {
  const cacheKey = generateCacheKey('product', productId);
  const cached = productCache.get<Product>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const product = productDatabase.get(productId);
  if (product) {
    productCache.set(cacheKey, product);
    return product;
  }

  return null;
}

/**
 * Get current stock level with caching
 */
export async function getStockLevel(productId: string): Promise<number> {
  const cacheKey = generateCacheKey('stock', productId);
  const cached = inventoryCache.get<number>(cacheKey);
  
  if (cached !== undefined) {
    return cached;
  }

  const product = productDatabase.get(productId);
  const stock = product?.stock ?? 0;
  
  inventoryCache.set(cacheKey, stock);
  return stock;
}

/**
 * Update stock level
 */
export async function updateStock(productId: string, newStock: number): Promise<void> {
  const product = productDatabase.get(productId);
  if (product) {
    product.stock = newStock;
    
    // Update cache
    const cacheKey = generateCacheKey('stock', productId);
    inventoryCache.set(cacheKey, newStock);
    
  }
}

/**
 * Reserve stock (decrease available quantity)
 */
export async function reserveStock(productId: string, quantity: number): Promise<boolean> {
  const currentStock = await getStockLevel(productId);
  
  if (currentStock < quantity) {
    return false;
  }

  const newStock = currentStock - quantity;
  await updateStock(productId, newStock);
  return true;
}

/**
 * Get products by category with caching
 */
export async function getProductsByCategory(category: string): Promise<Product[]> {
  const cacheKey = generateCacheKey('category', category);
  const cached = productCache.get<Product[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const products = Array.from(productDatabase.values())
    .filter(p => p.category === category);
  
  productCache.set(cacheKey, products);
  return products;
}

/**
 * Bulk get products
 */
export async function getProducts(productIds: string[]): Promise<Product[]> {
  const results: Product[] = [];
  
  for (const id of productIds) {
    const product = await getProduct(id);
    if (product) {
      results.push(product);
    }
  }
  
  return results;
}

