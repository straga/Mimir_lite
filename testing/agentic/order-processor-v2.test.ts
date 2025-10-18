/**
 * Order Processing System Tests v2
 * 
 * Tests pass because they don't exercise the problematic scenarios:
 * - No cache invalidation testing
 * - No concurrent access patterns
 * - No edge cases with special characters in cache keys
 * - No tests for stale cache data
 * - Tests use simple, round numbers (no floating point issues)
 * - Tests don't verify cache TTL behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrderProcessor, OrderStatus, setupDiscounts, type Product, type Order } from './order-processor-v2';
import { initializeProducts, updateStock } from './product-repository';
import { productCache, inventoryCache, priceCache, paymentCache, shippingCache } from './cache-config';

describe('Order Processing System v2 (with Caching)', () => {
  let processor: OrderProcessor;
  
  const testProducts: Product[] = [
    { id: 'PROD-1', name: 'Widget', price: 10, stock: 100, weight: 1, category: 'widgets' },
    { id: 'PROD-2', name: 'Gadget', price: 25, stock: 50, weight: 2, category: 'gadgets' },
    { id: 'PROD-3', name: 'Doohickey', price: 50, stock: 25, weight: 3, category: 'widgets' },
  ];

  beforeEach(() => {
    // Clear all caches
    productCache.flushAll();
    inventoryCache.flushAll();
    priceCache.flushAll();
    paymentCache.flushAll();
    shippingCache.flushAll();
    
    initializeProducts(testProducts);
    processor = new OrderProcessor();
    setupDiscounts();
  });

  describe('Basic Order Processing', () => {
    it('should process a simple order successfully', async () => {
      const order: Order = {
        id: 'ORD-001',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-1', quantity: 2 }],
        shippingAddress: { country: 'US', state: 'ca', zipCode: '90210' },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);
      
      expect(result.status).toBe(OrderStatus.COMPLETED);
      expect(result.total).toBeGreaterThan(0);
      expect(result.paymentId).toBeDefined();
    });

    it('should calculate shipping correctly for California', async () => {
      const order: Order = {
        id: 'ORD-002',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-1', quantity: 1 }],
        shippingAddress: { country: 'US', state: 'ca', zipCode: '90001' },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);
      
      expect(result.shippingCost).toBeDefined();
      expect(result.shippingCost).toBeGreaterThan(0);
    });
  });

  describe('Inventory Management', () => {
    it('should reserve inventory successfully', async () => {
      const order: Order = {
        id: 'ORD-003',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-1', quantity: 5 }],
        shippingAddress: { country: 'US', state: 'ny', zipCode: '10001' },
        status: OrderStatus.PENDING
      };

      await processor.processOrder(order);
      
      expect(order.status).toBe(OrderStatus.COMPLETED);
    });

    it('should fail when stock insufficient', async () => {
      const order: Order = {
        id: 'ORD-004',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-1', quantity: 200 }], // More than available
        shippingAddress: { country: 'US', state: 'ny', zipCode: '10001' },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);
      
      expect(result.status).toBe(OrderStatus.FAILED);
    });
  });

  describe('Payment Processing', () => {
    it('should process payment successfully', async () => {
      const order: Order = {
        id: 'ORD-005',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-2', quantity: 2 }],
        shippingAddress: { country: 'US', state: 'tx', zipCode: '75001' },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);
      
      expect(result.paymentId).toBeDefined();
      expect(result.paymentId).toMatch(/^PAY-/);
    });

    // Test passes because it uses simple sequential calls
    it('should prevent duplicate payments', async () => {
      const order: Order = {
        id: 'ORD-006',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-1', quantity: 1 }],
        shippingAddress: { country: 'US', state: 'fl', zipCode: '33101' },
        status: OrderStatus.PENDING
      };

      // First payment
      await processor.processOrder(order);
      
      // Try to process again (sequential, not concurrent)
      const result = await processor.processPayment(order.id, order.total || 100);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already processed');
    });

    it('should handle payment amounts correctly', async () => {
      const order: Order = {
        id: 'ORD-007',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-1', quantity: 10 }], // 10 * 10 = 100 (clean)
        shippingAddress: { country: 'US', state: 'wa', zipCode: '98001' },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);
      
      expect(result.status).toBe(OrderStatus.COMPLETED);
      expect(result.total).toBe(100 + (result.shippingCost || 0));
    });
  });

  describe('Pricing and Discounts', () => {
    it('should calculate order total correctly', async () => {
      const order: Order = {
        id: 'ORD-008',
        customerId: 'CUST-1',
        items: [
          { productId: 'PROD-1', quantity: 2 },
          { productId: 'PROD-2', quantity: 1 }
        ],
        shippingAddress: { country: 'US', state: 'ny', zipCode: '10001' },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);
      
      // Test just checks total exists, doesn't verify calculation
      expect(result.total).toBeGreaterThan(0);
      expect(result.shippingCost).toBeGreaterThan(0);
    });

    // Test doesn't verify discount is applied correctly
    it('should apply volume discount for large orders', async () => {
      const order: Order = {
        id: 'ORD-009',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-1', quantity: 15 }], // More than 10 items
        shippingAddress: { country: 'US', state: 'ca', zipCode: '90210' },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);
      
      // Just checks discount exists, not if it's calculated correctly
      expect(result.discount).toBeGreaterThan(0);
    });
  });

  describe('Batch Processing', () => {
    // Test doesn't use same product in multiple orders
    it('should process multiple orders in batch', async () => {
      const orders: Order[] = [
        {
          id: 'ORD-010',
          customerId: 'CUST-1',
          items: [{ productId: 'PROD-1', quantity: 1 }],
          shippingAddress: { country: 'US', state: 'ny', zipCode: '10001' },
          status: OrderStatus.PENDING
        },
        {
          id: 'ORD-011',
          customerId: 'CUST-2',
          items: [{ productId: 'PROD-2', quantity: 1 }], // Different product
          shippingAddress: { country: 'US', state: 'ca', zipCode: '90210' },
          status: OrderStatus.PENDING
        }
      ];

      const results = await processor.processBatch(orders);
      
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe(OrderStatus.COMPLETED);
      expect(results[1].status).toBe(OrderStatus.COMPLETED);
    });
  });

  describe('Cache Behavior', () => {
    // Test verifies cache works but doesn't test invalidation
    it('should cache product data between calls', async () => {
      const order1: Order = {
        id: 'ORD-012',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-1', quantity: 1 }],
        shippingAddress: { country: 'US', state: 'tx', zipCode: '75001' },
        status: OrderStatus.PENDING
      };

      const order2: Order = {
        id: 'ORD-013',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-1', quantity: 1 }], // Same product
        shippingAddress: { country: 'US', state: 'tx', zipCode: '75001' },
        status: OrderStatus.PENDING
      };

      await processor.processOrder(order1);
      await processor.processOrder(order2);
      
      // Test just checks both succeed - doesn't verify cache hit/miss
      expect(order1.status).toBe(OrderStatus.COMPLETED);
      expect(order2.status).toBe(OrderStatus.COMPLETED);
    });

    // Test checks caching works but doesn't test edge cases
    it('should cache pricing calculations', async () => {
      const order: Order = {
        id: 'ORD-014',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-2', quantity: 2 }],
        shippingAddress: { country: 'US', state: 'fl', zipCode: '33101' },
        status: OrderStatus.PENDING
      };

      const result1 = await processor.processOrder(order);
      
      // Process again with same items - should hit cache
      order.id = 'ORD-015';
      const result2 = await processor.processOrder(order);
      
      // Test just checks totals match, not that cache was actually used
      expect(result1.total).toBe(result2.total);
    });
  });

  describe('International Orders', () => {
    // Test uses US address with lowercase state
    it('should handle international shipping', async () => {
      const order: Order = {
        id: 'ORD-016',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-3', quantity: 1 }],
        shippingAddress: { country: 'CA', state: 'on', zipCode: 'M5H 2N2' },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);
      
      expect(result.status).toBe(OrderStatus.COMPLETED);
      expect(result.shippingCost).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle payment failures gracefully', async () => {
      const order: Order = {
        id: 'ORD-017',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-1', quantity: 1 }],
        shippingAddress: { country: 'US', state: 'ny', zipCode: '10001' },
        status: OrderStatus.PENDING
      };

      // Simulate failure by setting negative total
      order.total = -10;

      const result = await processor.processPayment(order.id, order.total);
      
      expect(result.success).toBe(false);
    });

    it('should fail for invalid product', async () => {
      const order: Order = {
        id: 'ORD-018',
        customerId: 'CUST-1',
        items: [{ productId: 'INVALID', quantity: 1 }],
        shippingAddress: { country: 'US', state: 'ca', zipCode: '90210' },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);
      
      expect(result.status).toBe(OrderStatus.FAILED);
    });
  });

  describe('Customer Order History', () => {
    // Test doesn't check performance or caching
    it('should retrieve customer order history', async () => {
      const order1: Order = {
        id: 'ORD-019',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-1', quantity: 1 }],
        shippingAddress: { country: 'US', state: 'ny', zipCode: '10001' },
        status: OrderStatus.PENDING
      };

      const order2: Order = {
        id: 'ORD-020',
        customerId: 'CUST-1',
        items: [{ productId: 'PROD-2', quantity: 1 }],
        shippingAddress: { country: 'US', state: 'ny', zipCode: '10001' },
        status: OrderStatus.PENDING
      };

      await processor.processOrder(order1);
      await processor.processOrder(order2);

      const history = await processor.getCustomerOrders('CUST-1');
      
      expect(history).toHaveLength(2);
      expect(history.every(o => o.customerId === 'CUST-1')).toBe(true);
    });
  });
});

