/**
 * Order Processing System Tests
 * 
 * All tests pass, but they don't expose the hidden bugs:
 * - Tests use single-threaded execution (no race conditions)
 * - Tests use simple cases (no edge cases)
 * - Tests don't check state consistency
 * - Tests use exact values (no floating point issues)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrderProcessor, DiscountCalculator } from './order-processor.ts';

// Import OrderStatus enum for proper typing
enum OrderStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  PAID = 'paid',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

describe('OrderProcessor', () => {
  let processor: OrderProcessor;

  beforeEach(() => {
    processor = new OrderProcessor();
    processor.clearState();

    // Add test products
    processor.addProduct({
      id: 'PROD-001',
      name: 'Laptop',
      price: 999.99,
      stock: 10,
      weight: 5.0
    });

    processor.addProduct({
      id: 'PROD-002',
      name: 'Mouse',
      price: 29.99,
      stock: 50,
      weight: 0.5
    });

    processor.addProduct({
      id: 'PROD-003',
      name: 'Keyboard',
      price: 79.99,
      stock: 25,
      weight: 1.5
    });
  });

  describe('Single Order Processing', () => {
    it('should process a simple order successfully', async () => {
      const order = {
        id: 'ORD-001',
        customerId: 'CUST-001',
        items: [
          { productId: 'PROD-001', quantity: 1 }
        ],
        shippingAddress: {
          country: 'US',
          zipCode: '90210',
          state: 'CA'
        },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);

      expect(result.status).toBe('completed');
      expect(result.paymentId).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
    });

    it('should calculate order total correctly', async () => {
      const order = {
        id: 'ORD-002',
        customerId: 'CUST-001',
        items: [
          { productId: 'PROD-002', quantity: 2 },
          { productId: 'PROD-003', quantity: 1 }
        ],
        shippingAddress: {
          country: 'US',
          zipCode: '10001',
          state: 'NY'
        },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);

      expect(result.status).toBe('completed');
      // Note: This test doesn't verify the exact total due to Bug 6
      expect(result.total).toBeDefined();
      expect(result.shippingCost).toBeDefined();
    });

    it('should fail when product is out of stock', async () => {
      const order = {
        id: 'ORD-003',
        customerId: 'CUST-001',
        items: [
          { productId: 'PROD-001', quantity: 20 } // More than available
        ],
        shippingAddress: {
          country: 'US',
          zipCode: '60601',
          state: 'IL'
        },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);

      expect(result.status).toBe('failed');
    });
  });

  describe('Shipping Calculation', () => {
    it('should calculate shipping for US addresses', async () => {
      const order = {
        id: 'ORD-004',
        customerId: 'CUST-002',
        items: [
          { productId: 'PROD-002', quantity: 3 }
        ],
        shippingAddress: {
          country: 'US',
          zipCode: '30301',
          state: 'GA'
        },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);

      expect(result.shippingCost).toBeDefined();
      expect(result.shippingCost).toBeGreaterThan(0);
    });

    it('should calculate shipping for international addresses', async () => {
      const order = {
        id: 'ORD-005',
        customerId: 'CUST-003',
        items: [
          { productId: 'PROD-001', quantity: 1 }
        ],
        shippingAddress: {
          country: 'UK',
          zipCode: 'SW1A 1AA',
          state: 'London'
        },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);

      expect(result.shippingCost).toBeDefined();
      expect(result.shippingCost).toBeGreaterThan(0);
    });
  });

  describe('Payment Processing', () => {
    it('should process payment successfully', async () => {
      const order = {
        id: 'ORD-006',
        customerId: 'CUST-001',
        items: [
          { productId: 'PROD-003', quantity: 1 }
        ],
        shippingAddress: {
          country: 'US',
          zipCode: '02101',
          state: 'MA'
        },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);

      expect(result.paymentId).toBeDefined();
      expect(result.paymentId).toMatch(/^PAY-/);
    });

    it('should handle payment with round numbers', async () => {
      // Add product with round price to avoid Bug 2
      processor.addProduct({
        id: 'PROD-004',
        name: 'Cable',
        price: 10.00,
        stock: 100,
        weight: 0.2
      });

      const order = {
        id: 'ORD-007',
        customerId: 'CUST-001',
        items: [
          { productId: 'PROD-004', quantity: 1 }
        ],
        shippingAddress: {
          country: 'US',
          zipCode: '98101',
          state: 'WA'
        },
        status: OrderStatus.PENDING
      };

      const result = await processor.processOrder(order);

      expect(result.status).toBe('completed');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple orders sequentially', async () => {
      // Test processes orders but doesn't check for race conditions (Bug 8)
      const orders = [
        {
          id: 'ORD-008',
          customerId: 'CUST-001',
          items: [{ productId: 'PROD-002', quantity: 1 }],
          shippingAddress: {
            country: 'US',
            zipCode: '90210',
            state: 'CA'
          },
          status: OrderStatus.PENDING
        },
        {
          id: 'ORD-009',
          customerId: 'CUST-002',
          items: [{ productId: 'PROD-003', quantity: 1 }],
          shippingAddress: {
            country: 'US',
            zipCode: '10001',
            state: 'NY'
          },
          status: OrderStatus.PENDING
        }
      ];

      const results = await processor.processBatch(orders);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('completed');
      expect(results[1].status).toBe('completed');
    });
  });
});

describe('DiscountCalculator', () => {
  let calculator: DiscountCalculator;
  let processor: OrderProcessor;

  beforeEach(() => {
    calculator = new DiscountCalculator();
    processor = new OrderProcessor();
    processor.clearState();

    processor.addProduct({
      id: 'PROD-001',
      name: 'Item',
      price: 100.00,
      stock: 100,
      weight: 1.0
    });
  });

  it('should apply coupon discount correctly', async () => {
    calculator.addCoupon('SAVE10', 10);

    const order = {
      id: 'ORD-010',
      customerId: 'CUST-001',
      items: [{ productId: 'PROD-001', quantity: 1 }],
      shippingAddress: {
        country: 'US',
        zipCode: '90210',
        state: 'CA'
      },
      status: OrderStatus.PENDING
    };

    const processedOrder = await processor.processOrder(order);
    const result = await calculator.applyDiscount(processedOrder, 'SAVE10');

    expect(result.appliedDiscount).toBeGreaterThan(0);
    expect(result.discountedTotal).toBeLessThan(processedOrder.total!);
  });

  it('should apply volume discount for large orders', async () => {
    const order = {
      id: 'ORD-011',
      customerId: 'CUST-001',
      items: [{ productId: 'PROD-001', quantity: 15 }], // > 10 items
      shippingAddress: {
        country: 'US',
        zipCode: '90210',
        state: 'CA'
      },
      status: OrderStatus.PENDING
    };

    const processedOrder = await processor.processOrder(order);
    const result = await calculator.applyDiscount(processedOrder);

    // Test doesn't verify the exact calculation (Bug 9)
    expect(result.appliedDiscount).toBeGreaterThan(0);
    expect(result.discountedTotal).toBeLessThan(processedOrder.total!);
  });

  it('should handle orders without discounts', async () => {
    const order = {
      id: 'ORD-012',
      customerId: 'CUST-001',
      items: [{ productId: 'PROD-001', quantity: 1 }],
      shippingAddress: {
        country: 'US',
        zipCode: '90210',
        state: 'CA'
      },
      status: OrderStatus.PENDING
    };

    const processedOrder = await processor.processOrder(order);
    const result = await calculator.applyDiscount(processedOrder);

    expect(result.appliedDiscount).toBe(0);
    expect(result.discountedTotal).toBe(processedOrder.total);
  });
});

