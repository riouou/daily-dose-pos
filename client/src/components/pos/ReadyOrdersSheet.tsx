import { useState } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { Order } from '@/types/pos';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentDialog } from './PaymentDialog';

export function ReadyOrdersSheet() {
    const { orders, updateOrderStatus, markAsPaid } = useOrderStore();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Filter for orders that are 'ready'
    const readyOrders = orders.filter((o) => o.status === 'ready');

    // Helper to check if order needs payment
    const needsPayment = (o: Order) => {
        if (o.paymentStatus !== 'pending') return false; // Already paid
        // GCash and Bank Transfer are considered "pre-paid" or "verified elsewhere" if not strictly pending on POS
        // But user said "make it so GCash and Bank Transfer doesn't go to needs payment"
        // implying they are treated as paid immediately or don't block.
        if (o.paymentMethod === 'GCash' || o.paymentMethod === 'Bank Transfer') return false;
        return true;
    };

    const unpaidOrders = readyOrders.filter(needsPayment);
    const paidOrders = readyOrders.filter(o => !needsPayment(o));

    const handlePaymentSettle = async (details: { method: string, amountTendered?: number, change?: number }) => {
        if (!selectedOrder) return;
        await markAsPaid(selectedOrder.id, details);
        setSelectedOrder(null);
    };

    if (readyOrders.length === 0) return null;

    const renderOrderCard = (order: Order) => (
        <div key={order.id} className="border rounded-lg p-4 bg-card shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-lg">
                        {order.tableNumber && `Table ${order.tableNumber}`}
                        {order.tableNumber && order.beeperNumber && ' | '}
                        {order.beeperNumber && `Beeper ${order.beeperNumber}`}
                        {!order.tableNumber && !order.beeperNumber && order.id}
                    </h3>
                    {order.customerName && order.customerName !== 'Guest' && (
                        <div className="text-base text-primary font-semibold mt-1">
                            {order.customerName}
                        </div>
                    )}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 mr-1" />
                    {(() => {
                        const d = new Date(order.createdAt);
                        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    })()}
                </div>
            </div>

            <div className="space-y-1 mb-4">
                {order.items.map((item, idx) => (
                    <div key={idx} className="text-sm flex justify-between">
                        <span>{item.quantity}x {item.menuItem.name}</span>
                    </div>
                ))}
            </div>

            {order.paymentStatus === 'pending' && (
                <div className="flex justify-between items-center py-2 border-t border-dashed border-border mb-4">
                    <span className="font-medium text-muted-foreground">Total to Pay</span>
                    <span className="font-bold text-lg">₱{order.total.toFixed(2)}</span>
                </div>
            )}

            {order.paymentStatus === 'pending' ? (
                <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setSelectedOrder(order)}
                >
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-destructive">Payment Pending</span>
                        <span className="text-xs text-muted-foreground">Click to Mark Paid</span>
                    </div>
                </Button>
            ) : (
                <Button
                    className="w-full bg-success hover:bg-success/90 text-white"
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Order
                </Button>
            )}
        </div>
    );

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" className="relative gap-2 border-warning text-warning hover:bg-warning/10">
                    <Bell className="w-5 h-5 animate-pulse" />
                    <span className="hidden sm:inline">Ready for Pickup</span>
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                        {readyOrders.length}
                    </Badge>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[500px]">
                <SheetHeader className="mb-4">
                    <SheetTitle>Ready for Pickup</SheetTitle>
                    <SheetDescription>
                        Manage orders ready to be served.
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all">Ready ({paidOrders.length})</TabsTrigger>
                        <TabsTrigger value="pending" className="relative">
                            Needs Payment
                            {unpaidOrders.length > 0 && (
                                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                    {unpaidOrders.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[calc(100vh-12rem)] mt-4 pr-4">
                        <TabsContent value="all" className="space-y-4 mt-0">
                            {paidOrders.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    No paid orders ready.
                                </div>
                            )}
                            {paidOrders.map(renderOrderCard)}
                        </TabsContent>

                        <TabsContent value="pending" className="space-y-4 mt-0">
                            {unpaidOrders.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    No unpaid orders ready.
                                </div>
                            )}
                            {unpaidOrders.map(renderOrderCard)}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <PaymentDialog
                    open={!!selectedOrder}
                    onOpenChange={(open) => !open && setSelectedOrder(null)}
                    totalAmount={selectedOrder?.total || 0}
                    onConfirm={(details) => handlePaymentSettle(details)}
                    excludePayLater={true}
                />
            </SheetContent>
        </Sheet>
    );
}
