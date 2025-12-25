import { Clock, ChefHat, CheckCircle2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Order } from '@/types/pos';
import { useOrderStore } from '@/store/orderStore';
import { cn } from '@/lib/utils';

interface KitchenOrderCardProps {
  order: Order;
}

const statusConfig = {
  new: {
    label: 'New Order',
    icon: Clock,
    color: 'border-warning bg-warning/10',
    iconColor: 'text-warning',
    pulse: true,
  },
  preparing: {
    label: 'Preparing',
    icon: ChefHat,
    color: 'border-primary bg-primary/10',
    iconColor: 'text-primary',
    pulse: false,
  },
  ready: {
    label: 'Ready',
    icon: CheckCircle2,
    color: 'border-success bg-success/10',
    iconColor: 'text-success',
    pulse: false,
  },
};

export function KitchenOrderCard({ order }: KitchenOrderCardProps) {
  const { updateOrderStatus } = useOrderStore();
  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    return `${minutes} mins ago`;
  };

  const handleNextStatus = () => {
    if (order.status === 'new') {
      updateOrderStatus(order.id, 'preparing');
    } else if (order.status === 'preparing') {
      updateOrderStatus(order.id, 'ready');
    } else if (order.status === 'ready') {
      updateOrderStatus(order.id, 'completed');
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border-2 p-4 transition-all animate-slide-in',
        config.color,
        config.pulse && 'animate-pulse-soft'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('w-5 h-5', config.iconColor)} />
            <span className="font-bold text-lg">{order.id}</span>
          </div>
          {order.tableNumber && (
            <span className="text-sm text-muted-foreground">Table {order.tableNumber}</span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{getTimeAgo(order.createdAt)}</span>
      </div>

      <div className="space-y-2 mb-4">
        {order.items.map((item) => (
          <div key={item.menuItem.id} className="flex items-center gap-2">
            <span className="text-lg">{item.menuItem.emoji}</span>
            <span className="font-medium">
              {item.quantity}× {item.menuItem.name}
            </span>
          </div>
        ))}
      </div>

      {order.status !== 'ready' && order.status !== 'completed' && (
        <Button
          variant={order.status === 'new' ? 'warning' : 'success'}
          size="lg"
          className="w-full"
          onClick={handleNextStatus}
        >
          {order.status === 'new' ? 'Start Preparing' : 'Mark Ready'}
        </Button>
      )}

      {order.status === 'ready' && (
        <Button
          variant="outline"
          size="lg"
          className="w-full border-success text-success hover:bg-success hover:text-white"
          onClick={handleNextStatus}
        >
          Complete Order
        </Button>
      )}

      {order.status === 'completed' && (
        <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground font-semibold">
          <Archive className="w-5 h-5" />
          Order Completed
        </div>
      )}
    </div>
  );
}
