/**
 * E-Commerce Order Processing System v2
 * 
 * Enhanced with caching layer for improved performance
 * Processes customer orders through multiple stages with cached data access
 */

import { getProduct, reserveStock, initializeProducts, Product } from './product-repository';
import { calculateOrderTotal, registerCoupon, type OrderItem, type Address } from './pricing-service';
import { paymentCache, generateCacheKey } from './cache-config';

export { Product, OrderItem, Address };

export enum OrderStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  PAID = 'paid',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  shippingAddress: Address;
  status: OrderStatus;
  total?: number;
  paymentId?: string;
  shippingCost?: number;
  discount?: number;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

/**
 * Main Order Processor
 */
export class OrderProcessor {
  private processedPayments: Set<string> = new Set();
  private orderHistory: Map<string, Order> = new Map();

  constructor(initialProducts?: Product[]) {
    if (initialProducts) {
      initializeProducts(initialProducts);
    }
  }

  /**
   * Process a complete order
   */
  async processOrder(order: Order): Promise<Order> {
    try {
      order.status = OrderStatus.PENDING;

      // Validate inventory
      await this.validateInventory(order);
      order.status = OrderStatus.VALIDATED;

      // Calculate totals with caching
      const pricing = await calculateOrderTotal(
        order.items,
        order.shippingAddress,
        undefined // TODO: Add coupon support
      );
      order.total = pricing.total;
      order.shippingCost = pricing.shipping;
      order.discount = pricing.discount;

      // Process payment
      const paymentResult = await this.processPayment(order.id, order.total);
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }
      order.paymentId = paymentResult.paymentId;
      order.status = OrderStatus.PAID;

      // Fulfill order
      await this.fulfillOrder(order);
      order.status = OrderStatus.COMPLETED;

      this.orderHistory.set(order.id, order);
      return order;

    } catch (error) {
      order.status = OrderStatus.FAILED;
      return order;
    }
  }

  /**
   * Validate all items are in stock
   */
  private async validateInventory(order: Order): Promise<void> {
    const validationPromises = order.items.map(async (item) => {
      const canReserve = await reserveStock(item.productId, item.quantity);
      if (!canReserve) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
    });

    await Promise.all(validationPromises);
  }

  /**
   * Process payment with caching and deduplication
   */
  async processPayment(
    orderId: string,
    amount: number,
    retries: number = 3
  ): Promise<PaymentResult> {
    // Check if already processed
    if (this.processedPayments.has(orderId)) {
      return { success: false, error: 'Payment already processed' };
    }

    const cacheKey = generateCacheKey('payment', orderId);
    const cachedResult = paymentCache.get<PaymentResult>(cacheKey);
    
    if (cachedResult) {
      return cachedResult;
    }

    // Simulate payment gateway with retries
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await this.simulatePaymentGateway(orderId, amount);
        
        if (result.success) {
          this.processedPayments.add(orderId);
          
          paymentCache.set(cacheKey, result);
        }
        
        return result;
      } catch (error) {
        if (attempt === retries - 1) {
          return { success: false, error: 'Payment gateway timeout' };
        }
        await this.delay(100 * Math.pow(2, attempt));
      }
    }

    return { success: false, error: 'Payment failed after retries' };
  }

  /**
   * Simulate payment gateway call
   */
  private async simulatePaymentGateway(
    orderId: string,
    amount: number
  ): Promise<PaymentResult> {
    await this.delay(10);
    
    if (amount < 0) {
      return { success: false, error: 'Invalid amount' };
    }

    const paymentId = `PAY-${orderId}-${Date.now()}`;
    return { success: true, paymentId };
  }

  /**
   * Fulfill the order (shipping)
   */
  private async fulfillOrder(order: Order): Promise<void> {
    await this.delay(10);
    order.status = OrderStatus.SHIPPED;
  }

  /**
   * Process multiple orders in batch
   */
  async processBatch(orders: Order[]): Promise<Order[]> {
    const results = await Promise.all(
      orders.map(order => this.processOrder(order))
    );
    return results;
  }

  /**
   * Get order history for customer
   */
  async getCustomerOrders(customerId: string): Promise<Order[]> {
    return Array.from(this.orderHistory.values())
      .filter(o => o.customerId === customerId);
  }

  /**
   * Reprocess failed order
   */
  async retryOrder(orderId: string): Promise<Order | null> {
    const order = this.orderHistory.get(orderId);
    if (!order || order.status !== OrderStatus.FAILED) {
      return null;
    }

    return await this.processOrder(order);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Register discount coupons
 */
export function setupDiscounts(): void {
  registerCoupon('SAVE10', 10);
  registerCoupon('SAVE20', 20);
  registerCoupon('VIP25', 25);
}

