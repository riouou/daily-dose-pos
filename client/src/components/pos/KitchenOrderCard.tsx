import { Clock, ChefHat, CheckCircle2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Order, FlavorSection } from '@/types/pos';
import { useOrderStore } from '@/store/orderStore';
import { useMenuStore } from '@/store/menuStore';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';



interface KitchenOrderCardProps {
  order: Order;
}

const statusConfig = {














  new: {
    label: 'New Order',
    icon: Clock,
    color: 'border-orange-200 dark:border-orange-800',
    iconColor: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    pulse: true,
  },
  preparing: {
    label: 'Preparing',
    icon: ChefHat,
    color: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    pulse: false,
  },
  ready: {
    label: 'Ready',
    icon: CheckCircle2,
    color: 'border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    pulse: false,
  },
};

export function KitchenOrderCard({ order }: KitchenOrderCardProps) {
  const { updateOrderStatus } = useOrderStore();
  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

  const [timeAgo, setTimeAgo] = useState('');
  const [isRecent, setIsRecent] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date(order.createdAt);
      if (isNaN(d.getTime())) {
        setTimeAgo('Invalid Date');
        return;
      }

      const diffMs = Math.max(0, Date.now() - d.getTime());
      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);

      // Hide "New" badge after 2 minutes
      if (seconds > 120) {
        setIsRecent(false);
      } else {
        setIsRecent(true);
      }

      if (minutes < 1) {
        setTimeAgo(`Just now (${seconds}s)`);
      } else if (minutes === 1) {
        setTimeAgo('1 min ago');
      } else {
        setTimeAgo(`${minutes} mins ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, [order.createdAt]); // Re-run if order time changes (unlikely but safe)

  const handleNextStatus = () => {
    if (order.status === 'new') {
      updateOrderStatus(order.id, 'preparing');
    } else if (order.status === 'preparing') {
      updateOrderStatus(order.id, 'ready');
    }
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 animate-in fade-in zoom-in-95',
        'bg-white/80 dark:bg-zinc-950/40 backdrop-blur-md',
        'hover:shadow-xl hover:-translate-y-1 hover:border-primary/20',
        config.color,
        config.pulse && 'shadow-[0_0_15px_-3px_rgba(255,171,0,0.3)] ring-1 ring-warning/50'
      )}
    >
      {/* Decorative gradient blob */}
      <div
        className={cn(
          "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none transition-colors",
          order.status === 'new' ? 'bg-orange-500' : order.status === 'preparing' ? 'bg-blue-500' : 'bg-emerald-500'
        )}
      />

      <div className="relative flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap gap-y-2">
            <div className={cn("p-1.5 rounded-lg flex items-center justify-center shadow-sm", config.iconBg)}>
              <StatusIcon className={cn('w-4 h-4', config.iconColor)} />
            </div>
            <span className="font-bold text-lg tracking-tight font-mona">{order.id}</span>
            {order.status === 'new' && isRecent && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-warning text-warning-foreground px-1.5 py-0.5 rounded-md animate-pulse transition-opacity duration-1000">
                New
              </span>
            )}
            {order.orderType === 'take-out' ? (
              <Badge className="bg-orange-600 hover:bg-orange-700 text-white border-none font-bold px-2.5 py-0.5 text-xs uppercase tracking-wide shadow-sm shadow-orange-900/20">
                Take Out
              </Badge>
            ) : (
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none font-bold px-2.5 py-0.5 text-xs uppercase tracking-wide shadow-sm shadow-blue-900/20">
                Dine In
              </Badge>
            )}
          </div>

          <div className="space-y-0.5 pl-1">
            {order.tableNumber ? (
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                Table {order.tableNumber}
              </div>
            ) : order.beeperNumber ? (
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                Beeper {order.beeperNumber}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span
            className="text-xs font-medium text-muted-foreground/80 bg-secondary/50 px-2 py-1 rounded-md border border-border/50 cursor-help whitespace-nowrap"
            title={`Order Time: ${new Date(order.createdAt).toLocaleString()} \nRaw: ${order.createdAt} \nClient Time: ${new Date().toLocaleString()}`}
          >
            {timeAgo}
          </span>
          {order.paymentMethod && (
            <Badge
              variant="outline"
              className={cn(
                "mt-2 text-xs",
                order.paymentMethod === 'GCash' && "border-blue-500 text-blue-500 bg-blue-500/10",
                order.paymentMethod === 'Bank Transfer' && "border-red-500 text-red-500 bg-red-500/10",
                order.paymentMethod === 'Cash' && "border-green-500 text-green-500 bg-green-500/10",
                order.paymentMethod === 'Pay Later' && "border-yellow-500 text-yellow-500 bg-yellow-500/10",
              )}
            >
              {order.paymentMethod}
            </Badge>
          )}
        </div>
      </div>

      <div className="py-3 space-y-3 mb-4 border-t border-b border-border/50 border-dashed">
        {order.items
          .filter(item => item.menuItem.type === 'food' || !item.menuItem.type) // Show only Food
          .map((item, index) => {
            const { globalAddons } = useMenuStore.getState();

            // Helper to find category for a flavor
            const getFlavorCategory = (flavorName: string): string => {
              // 1. Check global addons first (User said "add on is the one in the manage add on tab")
              for (const section of globalAddons) {
                const found = section.options.find(opt => (typeof opt === 'string' ? opt : opt.name) === flavorName);
                if (found) return section.name;
              }

              // 2. Check item specific flavors
              if (Array.isArray(item.menuItem.flavors)) {
                // If it's in the item's flavor list (whether string[] or FlavorSection[]), it's a "Flavor"
                // Checking simple strings
                if (item.menuItem.flavors.length > 0 && typeof item.menuItem.flavors[0] === 'string') {
                  if ((item.menuItem.flavors as string[]).includes(flavorName)) {
                    return 'Flavors';
                  }
                }

                // Checking sections
                for (const section of item.menuItem.flavors as FlavorSection[]) {
                  if (typeof section === 'object' && section.options) {
                    const found = section.options.find(opt => (typeof opt === 'string' ? opt : opt.name) === flavorName);
                    // User requested "Categorized flavors" to also say "Flavors"
                    if (found) return 'Flavors';
                  }
                }
              }

              return 'Flavors'; // Default to Flavors instead of Add-ons
            };

            // Group flavors by category
            const groupedFlavors: Record<string, string[]> = {};
            if (item.selectedFlavors) {
              item.selectedFlavors.forEach(flavor => {
                const category = getFlavorCategory(flavor);
                if (!groupedFlavors[category]) groupedFlavors[category] = [];
                groupedFlavors[category].push(flavor);
              });
            }

            return (
              <div key={`${item.menuItem.id}-${index}`} className="flex items-start gap-3 group/item">
                <span className="text-xl bg-secondary/30 w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border border-border/50">
                  {item.menuItem.emoji}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-sm text-foreground/90 group-hover/item:text-foreground transition-colors">
                        {item.menuItem.name}
                      </span>
                      {Object.entries(groupedFlavors).map(([category, flavors]) => (
                        <div key={category} className="mt-1">
                          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider block mb-0.5">
                            {category}:
                          </span>
                          <p className="text-xs text-foreground/80 font-medium pl-1 border-l-2 border-primary/20">
                            {flavors.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                    <span className="font-bold text-sm bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px] ml-2">
                      x{item.quantity}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="relative z-10">
        {order.status !== 'ready' && order.status !== 'completed' && (
          <Button
            variant="default"
            size="lg"
            className={cn(
              "w-full font-semibold shadow-lg transition-all active:scale-95 text-white border-0",
              order.status === 'new'
                ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/20"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
            )}
            onClick={handleNextStatus}
            disabled={order.id.startsWith('ORD-')}
          >
            {order.id.startsWith('ORD-') ? 'Syncing...' : (order.status === 'new' ? 'Start Preparing' : 'Mark Ready')}
          </Button>
        )}

        {order.status === 'ready' && (
          <div className="flex items-center justify-center gap-2 py-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/50 font-semibold text-sm animate-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4" />
            Ready for Pickup
          </div>
        )}
      </div>
    </div>
  );
}
