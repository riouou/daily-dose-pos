import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrderStore } from '@/store/orderStore';
import { toast } from 'sonner';

export function OrderPanel() {
  const { currentOrder, updateQuantity, removeFromOrder, clearOrder, submitOrder, getOrderTotal } = useOrderStore();
  const total = getOrderTotal();

  const handleSubmit = () => {
    if (currentOrder.length === 0) {
      toast.error('Add items to the order first');
      return;
    }
    submitOrder();
    toast.success('Order sent to kitchen!');
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border shadow-sm">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">Current Order</h2>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {currentOrder.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No items yet</p>
            <p className="text-sm">Tap menu items to add</p>
          </div>
        ) : (
          currentOrder.map((orderItem) => (
            <div
              key={orderItem.menuItem.id}
              className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg animate-slide-in"
            >
              <span className="text-xl">{orderItem.menuItem.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{orderItem.menuItem.name}</p>
                <p className="text-sm text-muted-foreground">
                  ₱{orderItem.menuItem.price.toFixed(2)} each
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(orderItem.menuItem.id, orderItem.quantity - 1)}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{orderItem.quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(orderItem.menuItem.id, orderItem.quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeFromOrder(orderItem.menuItem.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex justify-between items-center text-lg">
          <span className="font-medium">Total</span>
          <span className="font-bold text-xl text-primary">₱{total.toFixed(2)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={clearOrder}
            disabled={currentOrder.length === 0}
          >
            Clear
          </Button>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={currentOrder.length === 0}
          >
            Send to Kitchen
          </Button>
        </div>
      </div>
    </div>
  );
}
