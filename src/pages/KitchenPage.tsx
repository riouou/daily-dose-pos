import { useEffect } from 'react';
import { POSHeader } from '@/components/pos/POSHeader';
import { KitchenOrderCard } from '@/components/pos/KitchenOrderCard';
import { useOrderStore } from '@/store/orderStore';
import { ClipboardList } from 'lucide-react';

export default function KitchenPage() {
  const { orders, fetchOrders } = useOrderStore();

  // Poll for new orders every 5 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const activeOrders = orders.filter((o) => o.status === 'new' || o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <POSHeader />

      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-screen-2xl mx-auto">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ClipboardList className="w-16 h-16 mb-4 opacity-30" />
              <h2 className="text-xl font-semibold mb-1">No orders yet</h2>
              <p>Orders from the cashier will appear here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeOrders.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    Active Orders ({activeOrders.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeOrders.map((order) => (
                      <KitchenOrderCard key={order.id} order={order} />
                    ))}
                  </div>
                </section>
              )}

              {readyOrders.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Ready for Pickup ({readyOrders.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {readyOrders.map((order) => (
                      <KitchenOrderCard key={order.id} order={order} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
