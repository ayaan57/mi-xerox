import { Order } from './types';

// Use global Map pattern to survive Next.js hot reloads in development
const globalForStore = globalThis as unknown as {
  orders: Map<string, Order>;
  files: Map<string, Buffer>;
};

if (!globalForStore.orders) {
  globalForStore.orders = new Map<string, Order>();
}

if (!globalForStore.files) {
  globalForStore.files = new Map<string, Buffer>();
}

const orders = globalForStore.orders;
const files = globalForStore.files;

export function addOrder(order: Order): void {
  orders.set(order.code, order);
}

export function getOrder(code: string): Order | undefined {
  return orders.get(code);
}

export function getAllOrders(): Order[] {
  return Array.from(orders.values());
}

export function updateOrder(code: string, partial: Partial<Order>): Order | undefined {
  const existing = orders.get(code);
  if (!existing) return undefined;
  const updated = { ...existing, ...partial };
  orders.set(code, updated);
  return updated;
}

export function storeFile(id: string, buffer: Buffer): void {
  files.set(id, buffer);
}

export function getFile(id: string): Buffer | undefined {
  return files.get(id);
}

export function deleteOrder(code: string): boolean {
  const order = orders.get(code);
  if (!order) return false;
  // Delete associated files
  for (const file of order.files) {
    files.delete(file.id);
  }
  return orders.delete(code);
}
