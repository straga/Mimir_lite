/**
 * E-Commerce Order Processing System
 * 
 * This system processes customer orders through multiple stages:
 * - Inventory validation
 * - Payment processing
 * - Shipping calculation
 * - Order fulfillment
 * 
 * All tests pass, but there are subtle bugs in production scenarios.
 */

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  weight: number;
}

interface OrderItem {
  productId: string;
  quantity: number;
}

interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  shippingAddress: Address;
  status: OrderStatus;
  total?: number;
  paymentId?: string;
  shippingCost?: number;
}

interface Address {
  country: string;
  zipCode: string;
  state: string;
}

enum OrderStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  PAID = 'paid',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

interface ShippingRate {
  carrier: string;
  cost: number;
  estimatedDays: number;
}

// In-memory product catalog
const productCatalog: Map<string, Product> = new Map();

// Inventory management
class InventoryManager {
  private reservations: Map<string, number> = new Map();

  async checkAvailability(productId: string, quantity: number): Promise<boolean> {
    const product = productCatalog.get(productId);
    if (!product) return false;

    const reserved = this.reservations.get(productId) || 0;
    const available = product.stock - reserved;
    
    return available >= quantity;
  }

  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    const isAvailable = await this.checkAvailability(productId, quantity);
    if (!isAvailable) return false;

    const currentReservation = this.reservations.get(productId) || 0;
    this.reservations.set(productId, currentReservation + quantity);
    
    return true;
  }

  async commitReservation(productId: string, quantity: number): Promise<void> {
    const product = productCatalog.get(productId);
    if (!product) throw new Error('Product not found');

    product.stock -= quantity;
    
    const reserved = this.reservations.get(productId) || 0;
    this.reservations.set(productId, Math.max(0, reserved - quantity));
  }

  async releaseReservation(productId: string, quantity: number): Promise<void> {
    const reserved = this.reservations.get(productId) || 0;
    this.reservations.set(productId, Math.max(0, reserved - quantity));
  }

  clearReservations(): void {
    this.reservations.clear();
  }
}

// Payment processor with retry logic
class PaymentProcessor {
  private processedPayments: Set<string> = new Set();

  async processPayment(
    orderId: string,
    amount: number,
    retries: number = 3
  ): Promise<PaymentResult> {
    if (this.processedPayments.has(orderId)) {
      return { success: false, error: 'Payment already processed' };
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Simulate payment gateway call
        await this.simulatePaymentGateway(amount);
        
        const paymentId = `PAY-${orderId}-${Date.now()}`;
        this.processedPayments.add(orderId);
        
        return { success: true, paymentId };
      } catch (error) {
        if (attempt === retries - 1) {
          return { success: false, error: 'Payment failed after retries' };
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }

    return { success: false, error: 'Payment processing failed' };
  }

  private async simulatePaymentGateway(amount: number): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    if (amount < 0.01) {
      throw new Error('Invalid amount');
    }
  }

  clearProcessedPayments(): void {
    this.processedPayments.clear();
  }
}

// Shipping calculator with complex rules
class ShippingCalculator {
  private internationalRates: Map<string, number> = new Map([
    ['US', 0.50],
    ['CA', 0.65],
    ['MX', 0.55],
    ['UK', 0.80],
    ['FR', 0.85],
    ['DE', 0.80]
  ]);

  async calculateShipping(
    items: OrderItem[],
    address: Address
  ): Promise<ShippingRate[]> {
    const totalWeight = await this.calculateTotalWeight(items);
    const baseRate = this.getBaseRate(address.country);

    const rates: ShippingRate[] = [];

    // Standard shipping
    rates.push({
      carrier: 'Standard',
      cost: Math.round((baseRate * totalWeight) * 100) / 100,
      estimatedDays: address.country === 'US' ? 5 : 10
    });

    // Express shipping
    rates.push({
      carrier: 'Express',
      cost: Math.round((baseRate * totalWeight * 2.5) * 100) / 100,
      estimatedDays: address.country === 'US' ? 2 : 5
    });

    if (address.country === 'US' && address.state !== 'HI' && address.state !== 'AK') {
      rates.push({
        carrier: 'Overnight',
        cost: Math.round((baseRate * totalWeight * 4) * 100) / 100,
        estimatedDays: 1
      });
    }

    return rates;
  }

  private async calculateTotalWeight(items: OrderItem[]): Promise<number> {
    let totalWeight = 0;
    
    for (const item in items) {
      const product = productCatalog.get(items[item].productId);
      if (product) {
        totalWeight += product.weight * items[item].quantity;
      }
    }

    return totalWeight;
  }

  private getBaseRate(country: string): number {
    return this.internationalRates.get(country) || 1.00;
  }
}

// Main order processor orchestrating the workflow
export class OrderProcessor {
  private inventory = new InventoryManager();
  private payment = new PaymentProcessor();
  private shipping = new ShippingCalculator();
  private pendingOrders: Map<string, Order> = new Map();

  async processOrder(order: Order): Promise<Order> {
    try {
      // Stage 1: Validate inventory
      order = await this.validateInventory(order);
      
      // Stage 2: Calculate total and shipping
      order = await this.calculateOrderTotal(order);
      
      // Stage 3: Process payment
      order = await this.processPayment(order);
      
      // Stage 4: Commit inventory and fulfill
      order = await this.fulfillOrder(order);
      
      return order;
    } catch (error) {
      order.status = OrderStatus.FAILED;
      return order;
    }
  }

  private async validateInventory(order: Order): Promise<Order> {
    const validationPromises = order.items.map(async (item) => {
      const available = await this.inventory.checkAvailability(
        item.productId,
        item.quantity
      );
      
      if (!available) {
        throw new Error(`Product ${item.productId} not available`);
      }
      
      return this.inventory.reserveStock(item.productId, item.quantity);
    });

    await Promise.all(validationPromises);
    order.status = OrderStatus.VALIDATED;
    
    return order;
  }

  private async calculateOrderTotal(order: Order): Promise<Order> {
    // Calculate items total
    let itemsTotal = 0;
    
    order.items.forEach(async (item) => {
      const product = productCatalog.get(item.productId);
      if (product) {
        itemsTotal += product.price * item.quantity;
      }
    });

    // Get shipping rates
    const rates = await this.shipping.calculateShipping(
      order.items,
      order.shippingAddress
    );

    // Select cheapest shipping
    const selectedRate = rates.reduce((min, rate) => 
      rate.cost < min.cost ? rate : min
    );

    order.shippingCost = selectedRate.cost;
    order.total = itemsTotal + order.shippingCost;

    return order;
  }

  private async processPayment(order: Order): Promise<Order> {
    if (!order.total) {
      throw new Error('Order total not calculated');
    }

    const result = await this.payment.processPayment(order.id, order.total);

    if (!result.success) {
      throw new Error(result.error || 'Payment failed');
    }

    order.paymentId = result.paymentId;
    order.status = OrderStatus.PAID;

    return order;
  }

  private async fulfillOrder(order: Order): Promise<Order> {
    // Commit inventory reservations
    const commitPromises = order.items.map((item) =>
      this.inventory.commitReservation(item.productId, item.quantity)
    );

    await Promise.all(commitPromises);
    
    order.status = OrderStatus.COMPLETED;
    
    return order;
  }

  // Batch processing with parallel execution
  async processBatch(orders: Order[]): Promise<Order[]> {
    const results = await Promise.all(
      orders.map(order => this.processOrder(order))
    );

    return results;
  }

  // Helper method to add products to catalog
  addProduct(product: Product): void {
    productCatalog.set(product.id, product);
  }

  // Clear all state for testing
  clearState(): void {
    productCatalog.clear();
    this.inventory.clearReservations();
    this.payment.clearProcessedPayments();
    this.pendingOrders.clear();
  }
}

// Discount calculator with promotional rules
export class DiscountCalculator {
  private activeCoupons: Map<string, number> = new Map();

  addCoupon(code: string, discountPercent: number): void {
    this.activeCoupons.set(code, discountPercent);
  }

  async applyDiscount(
    order: Order,
    couponCode?: string
  ): Promise<{ discountedTotal: number; appliedDiscount: number }> {
    if (!order.total) {
      throw new Error('Order total not calculated');
    }

    let discount = 0;

    // Apply coupon discount
    if (couponCode && this.activeCoupons.has(couponCode)) {
      const discountPercent = this.activeCoupons.get(couponCode)!;
      discount += (order.total * discountPercent) / 100;
    }

    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 10) {
      discount = order.total * 0.05 + discount;
    }

    const discountedTotal = Math.max(0, order.total - discount);

    return {
      discountedTotal: Math.round(discountedTotal * 100) / 100,
      appliedDiscount: Math.round(discount * 100) / 100
    };
  }
}

