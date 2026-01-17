import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { fetchWithRetry } from '@/lib/api';
import { orderSchema } from '@/lib/schemas';
import { useMenuStore } from './menuStore';

import { Order, OrderItem, MenuItem, FlavorSection, FlavorOption } from '@/types/pos';

interface OrderState {
  currentOrder: OrderItem[];
  orders: Order[];
  offlineQueue: Order[];
  addToOrder: (item: MenuItem, flavors?: string[], quantity?: number) => void;
  removeFromOrder: (itemId: string, flavors?: string[]) => void;
  updateQuantity: (itemId: string, flavors: string[] | undefined, quantity: number) => void;
  clearOrder: () => void;
  submitOrder: (tableNumber?: number, beeperNumber?: number, paymentDetails?: { method: string, amountTendered?: number, change?: number }, customerName?: string) => Promise<Order | undefined>;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  markAsPaid: (orderId: string, paymentDetails?: { method: string, amountTendered?: number, change?: number }) => Promise<void>;
  fetchOrders: () => Promise<void>;
  syncOfflineOrders: () => Promise<void>;

  getOrderTotal: () => number;
  pendingUpdates: Record<string, boolean>;
  // Socket actions
  addIncomingOrder: (order: Order) => void;
  updateIncomingOrder: (order: Order) => void;
}

import { API_URL } from '../lib/config';


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

      addToOrder: (item: MenuItem, flavors?: string[], quantity: number = 1) => {
        set((state) => {
          const existing = state.currentOrder.find(o =>
            o.menuItem.id === item.id && areFlavorsEqual(o.selectedFlavors, flavors)
          );
          if (existing) {
            return {
              currentOrder: state.currentOrder.map(o =>
                (o.menuItem.id === item.id && areFlavorsEqual(o.selectedFlavors, flavors))
                  ? { ...o, quantity: o.quantity + quantity }
                  : o
              ),
            };
          }
          return {
            currentOrder: [...state.currentOrder, {
              menuItem: item,
              quantity: quantity,
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
            const incomingOrders = (data as Array<{ [key: string]: unknown }>).map((o) => ({
              ...o,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              createdAt: new Date((o as any).createdAt),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tableNumber: (o as any).table_number || (o as any).tableNumber,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              beeperNumber: (o as any).beeper_number || (o as any).beeperNumber
            })) as unknown as Order[];

            set((state) => {
              const mergedOrders = incomingOrders.map((incoming: Order) => {
                if (state.pendingUpdates[incoming.id]) {
                  const localOrder = state.orders.find(o => o.id === incoming.id);
                  return localOrder || incoming;
                }
                return incoming;
              });

              // Preserve optimistic orders (those starting with ORD-) that aren't in the incoming list
              const optimisticOrders = state.orders.filter(o =>
                o.id.startsWith('ORD-') && !mergedOrders.some(existing => existing.id === o.id)
              );

              return { orders: [...optimisticOrders, ...mergedOrders] };
            });
          }
        } catch (error) {
          console.error('Failed to fetch orders:', error);
        }
      },

      syncOfflineOrders: async () => {
        const { offlineQueue, orders } = get();
        if (offlineQueue.length === 0) return;

        toast.info(`Syncing ${offlineQueue.length} offline orders...`);

        const remainingQueue: Order[] = [];

        for (const orderPayload of offlineQueue) {
          try {
            // Fuzzy duplicate check
            const isDuplicate = orders.some(existing =>
              existing.customerName === orderPayload.customerName &&
              Math.abs(existing.total - orderPayload.total) < 0.01 &&
              existing.items.length === orderPayload.items.length &&
              new Date(existing.createdAt).getTime() > new Date(orderPayload.createdAt).getTime() // Existing is newer or same
            );

            if (isDuplicate) {
              console.log('Skipping duplicate offline order:', orderPayload.id);
              // Don't add to remainingQueue, effectively removing it
              continue;
            }

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
              toast.success(`Order synced!`);
            } else {
              // If validation error (400), don't retry.
              if (response.status === 400 || response.status === 500) {
                console.error('Offline order rejected permanently:', response.status);
                // Drop it
              } else {
                remainingQueue.push(orderPayload);
              }
            }
          } catch (e) {
            const err = e as Error;
            // If store is closed or network error, keep it.
            // If validation error, drop it.
            if (err.message.toLowerCase().includes('validation')) {
              console.error('Dropping invalid offline order');
            } else {
              remainingQueue.push(orderPayload);
            }
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
          items: newOrderPayload.items.map((i) => ({
            ...i,
            id: Math.random().toString(), // temporary id
            menu_item_id: i.menuItem.id
          }))
        } as unknown as Order;

        set((state) => ({
          orders: [optimisticOrder, ...state.orders]
        }));



        try {
          // Validate Payload
          const orderValidation = orderSchema.safeParse(newOrderPayload);
          if (!orderValidation.success) {
            const errorMsg = orderValidation.error.errors.map(e => e.message).join(', ');
            toast.error(`Validation Error: ${errorMsg}`);
            throw new Error(`Validation Error: ${errorMsg}`);
          }

          const response = await fetchWithRetry(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrderPayload),
          });

          if (response.ok) {
            const createdOrder = await response.json();
            createdOrder.createdAt = new Date(createdOrder.createdAt);

            // Replace optimistic order with real one, OR remove optimistic if real one already exists (race condition fix)
            set((state) => {
              const alreadyExists = state.orders.some(o => o.id === createdOrder.id);
              if (alreadyExists) {
                // Socket beat us to it. Just remove the optimistic placeholder.
                return { orders: state.orders.filter(o => o.id !== newOrderPayload.id) };
              }
              // Normal case: replace optimistic with real
              return {
                orders: state.orders.map(o => o.id === newOrderPayload.id ? createdOrder : o)
              };
            });
          } else {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 403) {
              throw new Error(errorData.error || "Store is closed");
            }
            if (response.status === 400 || response.status === 500) {
              // Validation or Server Error: Do not queue offline.
              throw new Error(errorData.error || `Server Error: ${response.status}`);
            }
            throw new Error("Network response was not ok");
          }
        } catch (error) {
          const err = error as Error;
          const msg = err.message.toLowerCase();

          if (msg.includes('store is closed') || msg.includes('validation') || msg.includes('server error')) {
            // Revert optimistic update for permanent errors
            set((state) => ({
              orders: state.orders.filter(o => o.id !== newOrderPayload.id)
            }));
            toast.error(err.message);
            // Don't rethrow if we handled it, but maybe UI needs to know? 
            // OrderPanel catches it to show Alert Dialog. So rethrow is good.
            throw err;
          }

          console.log('Online submission failed, queuing offline:', error);
          set((state) => ({
            offlineQueue: [...state.offlineQueue, newOrderPayload as unknown as Order]
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

        const orderToUpdate = previousOrders.find(o => o.id === orderId);
        const customerText = (orderToUpdate?.customerName && orderToUpdate.customerName !== 'Guest')
          ? ` for ${orderToUpdate.customerName}`
          : '';

        if (status === 'completed') {
          toast.success(`Order${customerText} completed!`);
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
            const { [orderId]: _, ...rest } = state.pendingUpdates;
            return { pendingUpdates: rest };
          });

        } catch (error) {
          console.error('Failed to update order status:', error);
          set((state) => {
            const { [orderId]: _, ...rest } = state.pendingUpdates;
            return {
              orders: previousOrders,
              pendingUpdates: rest
            };
          });
          toast.error('Connection error. Reverting changes.');
        }
      },

      markAsPaid: async (orderId: string, paymentDetails?: { method: string, amountTendered?: number, change?: number }) => {
        try {
          const res = await fetchWithRetry(`${API_URL}/api/orders/${orderId}/pay`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentMethod: paymentDetails?.method,
              amountTendered: paymentDetails?.amountTendered,
              changeAmount: paymentDetails?.change
            })
          });
          if (res.ok) {
            const updated = await res.json();
            updated.createdAt = new Date(updated.createdAt);
            set((state) => ({
              orders: state.orders.map(o => o.id === orderId ? updated : o)
            }));

            const customerText = (updated.customerName && updated.customerName !== 'Guest')
              ? ` for ${updated.customerName}`
              : '';
            toast.success(`Order${customerText} marked as paid`);
          } else {
            throw new Error('Failed to mark as paid');
          }
        } catch (error) {
          console.error(error);
          toast.error('Failed to mark as paid');
        }
      },

      getOrderTotal: () => {
        const { currentOrder } = get();
        const { globalAddons } = useMenuStore.getState();

        return currentOrder.reduce((sum, item) => {
          let itemParamsPrice = 0;

          if (item.selectedFlavors && item.selectedFlavors.length > 0) {
            // Find price for each selected flavor
            item.selectedFlavors.forEach(flavorName => {
              let priceFound = 0;

              // 1. Check Item specific flavors
              if (Array.isArray(item.menuItem.flavors) && typeof item.menuItem.flavors[0] !== 'string') {
                const sections = item.menuItem.flavors as FlavorSection[];
                for (const section of sections) {
                  const option = section.options.find(opt => (typeof opt === 'string' ? opt : opt.name) === flavorName);
                  if (option && typeof option !== 'string' && option.price) {
                    priceFound = option.price;
                    break;
                  }
                }
              }

              // 2. Check Global Addons (if drink and not found yet)
              if (priceFound === 0 && item.menuItem.type === 'drink') {
                for (const section of globalAddons) {
                  const option = section.options.find(opt => (typeof opt === 'string' ? opt : opt.name) === flavorName);
                  if (option && typeof option !== 'string' && option.price) {
                    priceFound = option.price;
                    break;
                  }
                }
              }

              itemParamsPrice += priceFound;
            });
          }

          return sum + (item.menuItem.price + itemParamsPrice) * item.quantity;
        }, 0);
      },

      addIncomingOrder: (order: Order) => {
        set((state) => {
          if (state.orders.some(o => o.id === order.id)) return state;
          return { orders: [order, ...state.orders] };
        });
      },

      updateIncomingOrder: (order: Order) => {
        set((state) => {
          if (state.pendingUpdates[order.id]) {
            return state;
          }

          // Check for status changes to trigger notifications
          const existingOrder = state.orders.find(o => o.id === order.id);
          console.log(`[Socket] Received update for ${order.id}: ${existingOrder?.status} -> ${order.status}`);

          if (existingOrder && existingOrder.status !== order.status) {
            const customerText = (order.customerName && order.customerName !== 'Guest')
              ? ` for ${order.customerName}`
              : '';

            if (order.status === 'ready') {
              toast.success(`Order #${order.beeperNumber || order.tableNumber || order.id.slice(-4)} is Ready${customerText}!`, {
                duration: 5000,
                className: "bg-emerald-50 border-emerald-200 text-emerald-800"
              });

              // Play a sound for ready orders
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.log('Audio play failed:', e));
            } else if (order.status === 'completed') {
              // Optional: toast.info(`Order #${order.id} completed`);
            }
          }

          return {
            orders: state.orders.map(o => o.id === order.id ? order : o)
          };
        });
      },
    }),
    {
      name: 'order-storage-v2', // Renamed to clear old cache
      partialize: (state) => ({
        currentOrder: state.currentOrder, // Keep cart
        offlineQueue: state.offlineQueue  // Keep offline queue
      }),
    }
  )
);

// Initialize Socket Connection
import { socket } from '@/lib/socket';

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  useOrderStore.getState().syncOfflineOrders();
  useOrderStore.getState().fetchOrders();
});

socket.on('order:new', (newOrder: Order) => {
  const order = { ...newOrder, createdAt: new Date(newOrder.createdAt) };
  useOrderStore.getState().addIncomingOrder(order);
});

socket.on('order:update', (updatedOrder: Order) => {
  const order = { ...updatedOrder, createdAt: new Date(updatedOrder.createdAt) };
  useOrderStore.getState().updateIncomingOrder(order);
});
