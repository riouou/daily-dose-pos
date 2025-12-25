import { create } from 'zustand';
import { Order, OrderItem, MenuItem } from '@/types/pos';

interface OrderState {
  currentOrder: OrderItem[];
  orders: Order[];
  addToOrder: (item: MenuItem) => void;
  removeFromOrder: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearOrder: () => void;
  submitOrder: (tableNumber?: number) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  fetchOrders: () => Promise<void>;
  getOrderTotal: () => number;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export const useOrderStore = create<OrderState>((set, get) => ({
  currentOrder: [],
  orders: [],

  addToOrder: (item: MenuItem) => {
    set((state) => {
      const existing = state.currentOrder.find(o => o.menuItem.id === item.id);
      if (existing) {
        return {
          currentOrder: state.currentOrder.map(o =>
            o.menuItem.id === item.id
              ? { ...o, quantity: o.quantity + 1 }
              : o
          ),
        };
      }
      return {
        currentOrder: [...state.currentOrder, { menuItem: item, quantity: 1 }],
      };
    });
  },

  removeFromOrder: (itemId: string) => {
    set((state) => ({
      currentOrder: state.currentOrder.filter(o => o.menuItem.id !== itemId),
    }));
  },

  updateQuantity: (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeFromOrder(itemId);
      return;
    }
    set((state) => ({
      currentOrder: state.currentOrder.map(o =>
        o.menuItem.id === itemId ? { ...o, quantity } : o
      ),
    }));
  },

  clearOrder: () => set({ currentOrder: [] }),

  fetchOrders: async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders`);
      if (response.ok) {
        const data = await response.json();
        // Convert date strings back to Date objects
        const orders = data.map((o: any) => ({
          ...o,
          createdAt: new Date(o.createdAt),
        }));
        set({ orders });
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  },

  submitOrder: async (tableNumber?: number) => {
    const { currentOrder } = get();
    if (currentOrder.length === 0) return;

    const newOrder = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      items: [...currentOrder],
      total: get().getOrderTotal(),
      status: 'new',
      createdAt: new Date(),
      tableNumber,
    };

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });

      if (response.ok) {
        set({ currentOrder: [] });
        get().fetchOrders(); // Refresh orders
      }
    } catch (error) {
      console.error('Failed to submit order:', error);
    }
  },

  updateOrderStatus: async (orderId: string, status: Order['status']) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        get().fetchOrders(); // Refresh orders
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  },

  getOrderTotal: () => {
    return get().currentOrder.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    );
  },
}));
