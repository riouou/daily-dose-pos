import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { fetchWithRetry } from '@/lib/api';

import { Order, OrderItem, MenuItem } from '@/types/pos';

interface OrderState {
  currentOrder: OrderItem[];
  orders: Order[];
  offlineQueue: any[]; // temporarily any to match payload structure
  addToOrder: (item: MenuItem, flavors?: string[]) => void;
  removeFromOrder: (itemId: string, flavors?: string[]) => void;
  updateQuantity: (itemId: string, flavors: string[] | undefined, quantity: number) => void;
  clearOrder: () => void;
  submitOrder: (tableNumber?: number, beeperNumber?: number, paymentDetails?: { method: string, amountTendered?: number, change?: number }) => Promise<Order | undefined>;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  markAsPaid: (orderId: string) => Promise<void>;
  fetchOrders: () => Promise<void>;
  syncOfflineOrders: () => Promise<void>;

  getOrderTotal: () => number;
  pendingUpdates: Record<string, boolean>;
  // Socket actions
  addIncomingOrder: (order: Order) => void;
  updateIncomingOrder: (order: Order) => void;
}

const API_URL = import.meta.env.VITE_API_URL || '';

// Helper to compare flavor arrays
const areFlavorsEqual = (a?: string[], b?: string[]) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
};

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      currentOrder: [],
      orders: [],
      offlineQueue: [],
      pendingUpdates: {},

      addToOrder: (item: MenuItem, flavors?: string[]) => {
        set((state) => {
          const existing = state.currentOrder.find(o =>
            o.menuItem.id === item.id && areFlavorsEqual(o.selectedFlavors, flavors)
          );
          if (existing) {
            return {
              currentOrder: state.currentOrder.map(o =>
                (o.menuItem.id === item.id && areFlavorsEqual(o.selectedFlavors, flavors))
                  ? { ...o, quantity: o.quantity + 1 }
                  : o
              ),
            };
          }
          return {
            currentOrder: [...state.currentOrder, {
              menuItem: item,
              quantity: 1,
              selectedFlavors: flavors,
              selectedFlavor: flavors?.[0] // Backward compat
            }],
          };
        });
      },

      removeFromOrder: (itemId: string, flavors?: string[]) => {
        set((state) => ({
          currentOrder: state.currentOrder.filter(o =>
            !(o.menuItem.id === itemId && areFlavorsEqual(o.selectedFlavors, flavors))
          ),
        }));
      },

      updateQuantity: (itemId: string, flavors: string[] | undefined, quantity: number) => {
        if (quantity <= 0) {
          get().removeFromOrder(itemId, flavors);
          return;
        }
        set((state) => ({
          currentOrder: state.currentOrder.map(o =>
            (o.menuItem.id === itemId && areFlavorsEqual(o.selectedFlavors, flavors)) ? { ...o, quantity } : o
          ),
        }));
      },

      clearOrder: () => set({ currentOrder: [] }),

      fetchOrders: async () => {
        try {
          // fetchWithRetry handles 5xx errors automatically
          const response = await fetchWithRetry(`${API_URL}/api/orders?t=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            const incomingOrders = data.map((o: any) => ({
              ...o,
              createdAt: new Date(o.createdAt),
              tableNumber: o.table_number || o.tableNumber,
              beeperNumber: o.beeper_number || o.beeperNumber
            }));

            set((state) => {
              const mergedOrders = incomingOrders.map((incoming: Order) => {
                if (state.pendingUpdates[incoming.id]) {
                  const localOrder = state.orders.find(o => o.id === incoming.id);
                  return localOrder || incoming;
                }
                return incoming;
              });
              return { orders: mergedOrders };
            });
          }
        } catch (error) {
          console.error('Failed to fetch orders:', error);
        }
      },

      syncOfflineOrders: async () => {
        const { offlineQueue } = get();
        if (offlineQueue.length === 0) return;

        toast.info(`Syncing ${offlineQueue.length} offline orders...`);

        const remainingQueue = [];

        for (const orderPayload of offlineQueue) {
          try {
            const response = await fetchWithRetry(`${API_URL}/api/orders`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(orderPayload),
            });

            if (response.ok) {
              const createdOrder = await response.json();
              createdOrder.createdAt = new Date(createdOrder.createdAt);
              set((state) => ({
                orders: [createdOrder, ...state.orders]
              }));
              toast.success(`Order ${orderPayload.id} synced!`);
            } else {
              remainingQueue.push(orderPayload);
            }
          } catch (e) {
            remainingQueue.push(orderPayload);
          }
        }

        set({ offlineQueue: remainingQueue });
      },

      submitOrder: async (tableNumber?: number, beeperNumber?: number, paymentDetails?: { method: string, amountTendered?: number, change?: number }, customerName?: string) => {
        const { currentOrder } = get();
        if (currentOrder.length === 0) return;

        const previousOrder = [...currentOrder];
        set({ currentOrder: [] });

        const newOrderPayload = {
          id: `ORD-${Date.now().toString(36).toUpperCase()}`,
          items: previousOrder,
          total: 0,
          status: 'new',
          createdAt: new Date(),
          tableNumber,
          beeperNumber,
          customerName: customerName || 'Guest',
          paymentMethod: paymentDetails?.method || 'Cash',
          amountTendered: paymentDetails?.amountTendered || 0,
          changeAmount: paymentDetails?.change || 0,
          isTest: false // Will be overridden by server constant if problematic, but good to have type
        };

        newOrderPayload.total = previousOrder.reduce(
          (sum, item) => sum + item.menuItem.price * item.quantity,
          0
        );

        // Optimistically add to UI immediately
        const optimisticOrder = {
          ...newOrderPayload,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: newOrderPayload.items.map((i: any) => ({
            ...i,
            id: Math.random().toString(), // temporary id
            menu_item_id: i.menuItem.id
          }))
        } as unknown as Order;

        set((state) => ({
          orders: [optimisticOrder, ...state.orders]
        }));

        toast.success("Order Placed (Saved)");

        try {
          const response = await fetchWithRetry(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrderPayload),
          });

          if (response.ok) {
            const createdOrder = await response.json();
            createdOrder.createdAt = new Date(createdOrder.createdAt);

            // Replace optimistic order with real one
            set((state) => ({
              orders: state.orders.map(o => o.id === newOrderPayload.id ? createdOrder : o)
            }));
          } else {
            if (response.status === 403) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Store is closed");
            }
            throw new Error("Server error");
          }
        } catch (error) {
          const err = error as Error;
          if (err.message.toLowerCase().includes('store is closed')) {
            // Revert optimistic update
            set((state) => ({
              orders: state.orders.filter(o => o.id !== newOrderPayload.id)
            }));
            throw err;
          }

          console.log('Online submission failed, queuing offline:', error);
          set((state) => ({
            offlineQueue: [...state.offlineQueue, newOrderPayload]
          }));
          toast.message("Offline Mode", {
            description: "Order saved locally. Will sync when online.",
          });
          return optimisticOrder;
        }
      },

      updateOrderStatus: async (orderId: string, status: Order['status']) => {
        const previousOrders = get().orders;

        set((state) => ({
          pendingUpdates: { ...state.pendingUpdates, [orderId]: true },
          orders: state.orders.map(o =>
            o.id === orderId ? { ...o, status } : o
          )
        }));

        if (status === 'completed') {
          toast.success('Order completed!');
        }

        try {
          const response = await fetchWithRetry(`${API_URL}/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          });

          if (!response.ok) {
            throw new Error(response.statusText);
          }

          set((state) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [orderId]: _, ...rest } = state.pendingUpdates;
            return { pendingUpdates: rest };
          });

        } catch (error) {
          console.error('Failed to update order status:', error);
          set((state) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [orderId]: _, ...rest } = state.pendingUpdates;
            return {
              orders: previousOrders,
              pendingUpdates: rest
            };
          });
          toast.error('Connection error. Reverting changes.');
        }
      },

      markAsPaid: async (orderId: string) => {
        try {
          const res = await fetchWithRetry(`${API_URL}/api/orders/${orderId}/pay`, {
            method: 'PATCH'
          });
          if (res.ok) {
            const updated = await res.json();
            updated.createdAt = new Date(updated.createdAt);
            set((state) => ({
              orders: state.orders.map(o => o.id === orderId ? updated : o)
            }));
            toast.success('Order marked as paid');
          } else {
            throw new Error('Failed to mark as paid');
          }
        } catch (error) {
          console.error(error);
          toast.error('Failed to mark as paid');
        }
      },

      getOrderTotal: () => {
        return get().currentOrder.reduce(
          (sum, item) => sum + item.menuItem.price * item.quantity,
          0
        );
      },

      addIncomingOrder: (order: Order) => {
        set((state) => {
          if (state.orders.some(o => o.id === order.id)) return state;
          return { orders: [order, ...state.orders] };
        });
      },

      updateIncomingOrder: (order: Order) => {
        set((state) => ({
          orders: state.orders.map(o => o.id === order.id ? order : o)
        }));
      },
    }),
    {
      name: 'daily-dose-storage',
      partialize: (state) => ({ offlineQueue: state.offlineQueue }), // Only persist the queue
    }
  )
);

// Initialize Socket Connection
import { socket } from '@/lib/socket';

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  useOrderStore.getState().syncOfflineOrders();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
socket.on('order:new', (newOrder: any) => {
  const order = { ...newOrder, createdAt: new Date(newOrder.createdAt) };
  useOrderStore.getState().addIncomingOrder(order);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
socket.on('order:update', (updatedOrder: any) => {
  const order = { ...updatedOrder, createdAt: new Date(updatedOrder.createdAt) };
  useOrderStore.getState().updateIncomingOrder(order);
});
