import { create } from 'zustand';
import { toast } from 'sonner';
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

    // 1. Snapshot state for rollback
    const previousOrder = [...currentOrder];

    // 2. Optimistic Update: Clear UI immediately
    set({ currentOrder: [] });
    toast.success('Order placed!'); // Immediate feedback

    // 3. Prepare payload
    const newOrderPayload = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      items: previousOrder,
      total: 0, // Will be recalculated
      status: 'new',
      createdAt: new Date(),
      tableNumber,
    };

    // Recalculate total since currentOrder is now empty
    newOrderPayload.total = previousOrder.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    );

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderPayload),
      });

      if (response.ok) {
        const createdOrder = await response.json();
        createdOrder.createdAt = new Date(createdOrder.createdAt);

        // Add the confirmed order to the history list
        set((state) => ({
          orders: [createdOrder, ...state.orders]
        }));
      } else {
        throw new Error(response.statusText);
      }
    } catch (error) {
      console.error('Failed to submit order:', error);
      // 4. Rollback on failure
      set({ currentOrder: previousOrder });
      toast.error('Failed to submit order. Please try again.');
    }
  },

  updateOrderStatus: async (orderId: string, status: Order['status']) => {
    // 1. Optimistic Update
    const previousOrders = get().orders;
    set((state) => ({
      orders: state.orders.map(o =>
        o.id === orderId ? { ...o, status } : o
      )
    }));

    if (status === 'completed') {
      toast.success('Order completed!');
    }

    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Order missing on server. Force sync source of truth.
          await get().fetchOrders();
          toast.error('Order missing on server. Syncing...');
        } else {
          // Other error, revert
          set({ orders: previousOrders });
          toast.error('Failed to update status. Reverting changes.');
        }
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      set({ orders: previousOrders });
      toast.error('Connection error. Reverting changes.');
    }
  },

  getOrderTotal: () => {
    return get().currentOrder.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    );
  },
}));
