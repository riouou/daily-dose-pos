import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInHours, differenceInMinutes, addHours } from "date-fns";
import { Banknote, Search, Clock, AlertTriangle, Receipt } from "lucide-react";
import { DetailedHistory, FlavorSection, OrderItem } from "@/types/pos";
import { useMenuStore } from "@/store/menuStore";

interface HistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: DetailedHistory | null;
}

export function HistoryDialog({ open, onOpenChange, data }: HistoryDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const { globalAddons } = useMenuStore();
    const [selectedOrder, setSelectedOrder] = useState<DetailedHistory['orders'][0] | null>(null);

    const calculateItemTotal = (item: OrderItem) => {
        let itemParamsPrice = 0;
        if (item.selectedFlavors && item.selectedFlavors.length > 0) {
            item.selectedFlavors.forEach(flavorName => {
                let priceFound = 0;
                // 1. Check Item specific flavors
                if (Array.isArray(item.menuItem.flavors) && item.menuItem.flavors.length > 0 && typeof item.menuItem.flavors[0] !== 'string') {
                    const sections = item.menuItem.flavors as FlavorSection[];
                    for (const section of sections) {
                        const option = section.options.find(opt => (typeof opt === 'string' ? opt : opt.name) === flavorName);
                        if (option && typeof option !== 'string' && option.price) {
                            priceFound = option.price;
                            break;
                        }
                    }
                }
                // 2. Check Global Addons
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
        return (item.menuItem.price + itemParamsPrice) * item.quantity;
    };

    const filteredOrders = useMemo(() => {
        if (!data) return [];
        const lowerQ = searchQuery.toLowerCase();
        return data.orders.filter(o =>
            o.id.toLowerCase().includes(lowerQ) ||
            (o.customerName || '').toLowerCase().includes(lowerQ) ||
            (o.beeperNumber?.toString() || '').includes(lowerQ) ||
            (o.tableNumber?.toString() || '').includes(lowerQ)
        );
    }, [data, searchQuery]);

    if (!data) return null;

    const closedDate = new Date(data.closedAt);
    const expiresAt = addHours(closedDate, 24);
    const hoursLeft = differenceInHours(expiresAt, new Date());
    const minutesLeft = differenceInMinutes(expiresAt, new Date()) % 60;
    const isExpiringSoon = hoursLeft < 4;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
                    {/* Header Section */}
                    <div className="p-6 border-b bg-muted/10">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <DialogTitle className="text-xl">Session Receipts</DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                    Date: {format(new Date(data.date), 'PPPP')} • Closed at {format(closedDate, 'p')}
                                </DialogDescription>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isExpiringSoon ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                                {isExpiringSoon ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                <span className="text-xs font-semibold">
                                    Receipts deleted in {hoursLeft}h {minutesLeft}m
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by Order ID, Customer, Beeper..."
                                    className="pl-9 bg-background"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-4 items-center px-4 bg-background border rounded-md shadow-sm">
                                <div className="text-center">
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Orders</p>
                                    <p className="text-lg font-bold">{data.totalOrders}</p>
                                </div>
                                <div className="h-8 w-px bg-border" />
                                <div className="text-center">
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Total Sales</p>
                                    <p className="text-lg font-bold text-success">₱{data.totalSales.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <ScrollArea className="flex-1 bg-muted/5 p-4 md:p-6">
                        {filteredOrders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 min-h-[300px]">
                                <Search className="h-12 w-12 mb-2" />
                                <p>No receipts found matching "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredOrders.map(order => (
                                    <Card
                                        key={order.id}
                                        className="overflow-hidden hover:shadow-md transition-all cursor-pointer hover:border-primary/50 active:scale-[0.99]"
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <div className="border-b px-4 py-3 flex items-center justify-between bg-muted/10">
                                            <div className="flex items-center gap-2">
                                                <Receipt className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-mono text-sm font-semibold">#{order.id.slice(-4)}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground font-medium">
                                                {format(new Date(order.createdAt || 0), 'p')}
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-lg leading-none mb-1">{order.customerName || 'Guest'}</p>
                                                    <div className="flex gap-2">
                                                        {order.beeperNumber && <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">Beeper {order.beeperNumber}</Badge>}
                                                        {order.tableNumber && <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">Table {order.tableNumber}</Badge>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg text-primary">₱{order.total.toLocaleString()}</p>
                                                    {order.amountTendered ? (
                                                        <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                                                            <div className="flex justify-end gap-2">
                                                                <span>Paid:</span>
                                                                <span className="font-medium">₱{order.amountTendered.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-end gap-2">
                                                                <span>Change:</span>
                                                                <span className="font-medium">₱{order.changeAmount?.toLocaleString() || '0'}</span>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="space-y-1 pt-2 border-t border-dashed">
                                                {order.items.map((item, i) => (
                                                    <div key={i} className="text-sm flex justify-between items-start group">
                                                        <div className="text-muted-foreground leading-snug flex-1">
                                                            <span className="text-foreground font-medium">{item.quantity}x</span> {item.menuItem.name}
                                                            {item.selectedFlavors && item.selectedFlavors.length > 0 && (
                                                                <div className="text-[10px] text-muted-foreground/70 pl-5">
                                                                    {item.selectedFlavors.join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="font-medium text-foreground ml-2">
                                                            ₱{calculateItemTotal(item).toLocaleString()}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    <div className="p-4 border-t flex justify-end bg-background">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 gap-0">
                    {selectedOrder && (
                        <>
                            <div className="p-4 border-b bg-muted/10 flex items-center justify-between">
                                <div>
                                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                        <Receipt className="h-5 w-5" />
                                        Receipt #{selectedOrder.id.slice(-4)}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs mt-1">
                                        {format(new Date(selectedOrder.createdAt), 'PPP p')}
                                    </DialogDescription>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => setSelectedOrder(null)}>
                                    <div className="h-4 w-4">✕</div>
                                </Button>
                            </div>

                            <ScrollArea className="flex-1 p-6">
                                <div className="space-y-6">
                                    {/* Header Info */}
                                    <div className="text-center space-y-1">
                                        <h3 className="text-2xl font-bold">{selectedOrder.customerName || 'Guest'}</h3>
                                        <div className="flex justify-center gap-2">
                                            {selectedOrder.beeperNumber && <Badge variant="secondary">Beeper {selectedOrder.beeperNumber}</Badge>}
                                            {selectedOrder.tableNumber && <Badge variant="secondary">Table {selectedOrder.tableNumber}</Badge>}
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="space-y-4">
                                        {selectedOrder.items.map((item, i) => (
                                            <div key={i} className="flex justify-between items-start py-2 border-b border-dashed last:border-0 border-muted-foreground/20">
                                                <div className="flex-1 pr-4">
                                                    <div className="font-medium text-lg leading-snug">
                                                        <span className="font-bold">{item.quantity}x</span> {item.menuItem.name}
                                                    </div>
                                                    {item.selectedFlavors && item.selectedFlavors.length > 0 && (
                                                        <div className="text-sm text-muted-foreground mt-1">
                                                            {item.selectedFlavors.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-bold text-lg">
                                                    ₱{calculateItemTotal(item).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Totals */}
                                    <div className="pt-4 border-t-2 border-primary/20 space-y-2">
                                        <div className="flex justify-between items-center text-lg">
                                            <span className="font-medium text-muted-foreground">Total Amount</span>
                                            <span className="font-bold text-2xl text-primary">₱{selectedOrder.total.toLocaleString()}</span>
                                        </div>

                                        {selectedOrder.amountTendered ? (
                                            <div className="bg-muted/10 p-3 rounded-md space-y-1 mt-4">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Paid ({selectedOrder.paymentMethod})</span>
                                                    <span className="font-medium">₱{selectedOrder.amountTendered.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Change</span>
                                                    <span className="font-medium">₱{selectedOrder.changeAmount?.toLocaleString() || '0'}</span>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </ScrollArea>

                            <div className="p-4 border-t bg-muted/5">
                                <Button className="w-full" size="lg" onClick={() => setSelectedOrder(null)}>
                                    Close Receipt
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
