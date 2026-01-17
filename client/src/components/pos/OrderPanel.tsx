import { Minus, Plus, Trash2, ShoppingCart, AlertCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditFlavorDialog } from './EditFlavorDialog';
import { Input } from '@/components/ui/input';
import { useOrderStore } from '@/store/orderStore';
import { useMenuStore } from '@/store/menuStore';
import { FlavorSection } from '@/types/pos';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PaymentDialog } from './PaymentDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DrinkTicketList } from './DrinkTicketList';


export function OrderPanel() {
  const { currentOrder, updateQuantity, removeFromOrder, clearOrder, submitOrder, getOrderTotal } = useOrderStore();

  const [beeperNumber, setBeeperNumber] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [orderType, setOrderType] = useState<'dine-in' | 'take-out'>('dine-in');

  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingItem, setEditingItem] = useState<{ item: any, flavors: string[], quantity: number } | null>(null);

  const handleFlavorUpdate = (newFlavors: string[]) => {
    if (!editingItem) return;
    removeFromOrder(editingItem.item.id, editingItem.flavors);
    const { quantity, item } = editingItem;
    useOrderStore.getState().addToOrder(item, newFlavors, quantity);
    setEditingItem(null);
  };

  const total = getOrderTotal();


  const handleProceed = () => {
    if (currentOrder.length === 0) {
      toast.error('Add items to the order first');
      return;
    }
    setPaymentDialogOpen(true);
  };

  const handlePaymentConfirm = async (paymentDetails: { method: string, amountTendered?: number, change?: number }, customerName?: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await submitOrder(parseInt(tableNumber) || undefined, parseInt(beeperNumber) || undefined, paymentDetails, customerName, orderType);

      setBeeperNumber('');
      setTableNumber('');
      setOrderType('dine-in'); // Reset to default
      setPaymentDialogOpen(false); // Close dialog on success
      toast.success('Order sent to kitchen!');
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message || 'Failed to submit order');
      setErrorDialogOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Socket listener moved to CashierPage to prevent double notifications


  return (
    <div className="flex flex-col h-full bg-background/60 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden ring-1 ring-black/5">


      <Tabs defaultValue="new" className="flex flex-col h-full">
        <div className="p-3 border-b border-border/10 bg-white/5">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              New Order
            </TabsTrigger>
            <TabsTrigger value="drinks" className="gap-2">
              Drinks
              {/* Badge could go here */}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="new" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden mt-0">
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {currentOrder.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-10 h-10 opacity-30" />
                </div>
                <p className="font-medium mb-1">Items will appear here</p>
                <p className="text-sm opacity-70">Tap items to add to cart</p>
              </div>
            ) : (
              currentOrder.map((orderItem) => (
                <div
                  key={`${orderItem.menuItem.id}-${orderItem.selectedFlavors?.join('-') || 'default'}`}
                  className="group flex items-center gap-3 p-3 bg-card/40 hover:bg-card/80 border border-transparent hover:border-border/50 rounded-xl transition-all duration-200 animate-in slide-in-from-right-4 fade-in duration-300"
                >
                  <span className="text-xl">{orderItem.menuItem.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{orderItem.menuItem.name}</p>
                    {orderItem.selectedFlavors && orderItem.selectedFlavors.length > 0 && (

                          return (
                            <span key={idx} className="after:content-[','] last:after:content-['']">
                              {flavor} {price > 0 && `(+₱${price})`}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      ₱{orderItem.menuItem.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-800"
                      onClick={() => setEditingItem({ item: orderItem.menuItem, flavors: orderItem.selectedFlavors || [], quantity: orderItem.quantity })}
                    >
                      <Pencil className="w-3.5 h-3.5 opacity-70" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(orderItem.menuItem.id, orderItem.selectedFlavors, orderItem.quantity - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{orderItem.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(orderItem.menuItem.id, orderItem.selectedFlavors, orderItem.quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeFromOrder(orderItem.menuItem.id, orderItem.selectedFlavors)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <span className="text-sm font-medium min-w-[50px]">Table:</span>
          <Input
            type="number"
            placeholder="#"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="text-right font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium min-w-[50px]">Beeper:</span>
          <Input
            type="number"
            placeholder="#"
            value={beeperNumber}
            onChange={(e) => setBeeperNumber(e.target.value)}
            className="text-right font-medium"
          />
        </div>
    </div >


            </div >

    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        size="lg"
        onClick={() => { clearOrder(); setBeeperNumber(''); setTableNumber(''); }}
        disabled={currentOrder.length === 0}
      >
        Clear
      </Button>
      <div className="flex gap-2">
        <Button
          size="lg"
          className="flex-1"
          onClick={handleProceed}
          disabled={currentOrder.length === 0}
        >
          Proceed
        </Button>
      </div>
    </div>
          </div >
        </TabsContent >

    <TabsContent value="drinks" className="flex-1 min-h-0 data-[state=inactive]:hidden mt-0">
      <DrinkTicketList />
    </TabsContent>
      </Tabs >

      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Order Failed
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-foreground">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialogOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditFlavorDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem?.item}
        currentFlavors={editingItem?.flavors || []}
        onConfirm={handleFlavorUpdate}
      />

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        totalAmount={total}
        onConfirm={handlePaymentConfirm}
        isSubmitting={isSubmitting}
      />
    </div >
  );
}
