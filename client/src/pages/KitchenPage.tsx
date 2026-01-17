import { useEffect, useState } from 'react';
import { POSHeader } from '@/components/pos/POSHeader';
import { KitchenOrderCard } from '@/components/pos/KitchenOrderCard';
import { useOrderStore } from '@/store/orderStore';
import { ClipboardList } from 'lucide-react';
import { socket } from '@/lib/socket';

export default function KitchenPage() {
  const { orders, fetchOrders } = useOrderStore();


  // Initial Data Fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);



  // Listen for new orders via socket to play sound
  useEffect(() => {
    const handleNewOrder = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
    };

    socket.on('order:new', handleNewOrder);

    // Polling fallback to ensure sync (every 15s)
    const pollInterval = setInterval(() => {
      fetchOrders();
    }, 15000);

    return () => {
      socket.off('order:new', handleNewOrder);
      clearInterval(pollInterval);
    };
  }, [fetchOrders]);

  // Filter: Only show orders that contain FOOD.
  // Kitchen doesn't need to see orders that are purely Drinks.
  const activeOrders = orders.filter((o) =>
    (o.status === 'new' || o.status === 'preparing') &&
    o.items.some(i => i.menuItem.type === 'food' || !i.menuItem.type)
  );

  const readyOrders = orders.filter((o) =>
    o.status === 'ready' &&
    o.items.some(i => i.menuItem.type === 'food' || !i.menuItem.type)
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950/50">
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      <POSHeader />

      <div className="flex-1 p-4 lg:p-6 overflow-auto relative z-10 w-full">
        <div className="max-w-screen-2xl mx-auto">
          {activeOrders.length === 0 && readyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in duration-500">
              <div className="w-24 h-24 bg-card/50 rounded-full flex items-center justify-center mb-6 shadow-lg border border-white/20 backdrop-blur-sm">
                <ClipboardList className="w-10 h-10 opacity-50 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-foreground tracking-tight">All caught up</h2>
              <p className="text-base font-medium opacity-60">Waiting for new orders from the cashier...</p>
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
