import { useOrderStore } from '@/store/orderStore';
import { Card, CardContent } from '@/components/ui/card';
import { Banknote, ShoppingBag, Coffee } from 'lucide-react';

export function DailyStats() {
    const { orders } = useOrderStore();

    // Filter for orders created today
    const today = new Date().toLocaleDateString();
    const todayOrders = orders.filter(o =>
        new Date(o.createdAt).toLocaleDateString() === today
    );

    const totalSales = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const totalCount = todayOrders.length;
    const totalCups = todayOrders.reduce((acc, order) => {
        return acc + order.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Daily Orders</p>
                        <p className="text-2xl font-bold">{totalCount}</p>
                    </div>
                    <ShoppingBag className="h-8 w-8 text-primary opacity-50" />
                </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Cups Sold</p>
                        <p className="text-2xl font-bold">{totalCups}</p>
                    </div>
                    <Coffee className="h-8 w-8 text-primary opacity-50" />
                </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20 col-span-2 lg:col-span-1">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Daily Sales</p>
                        <p className="text-2xl font-bold">₱{totalSales.toFixed(2)}</p>
                    </div>
                    <Banknote className="h-8 w-8 text-primary opacity-50" />
                </CardContent>
            </Card>
        </div>
    );
}
