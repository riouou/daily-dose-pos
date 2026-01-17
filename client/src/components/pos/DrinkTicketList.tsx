
import { Order } from '@/types/pos';
import { useOrderStore } from '@/store/orderStore';
import { Button } from '@/components/ui/button';
import { Check, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function DrinkTicketList() {
    const { drinkQueue, completeDrinkTicket } = useOrderStore();

    if (drinkQueue.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 opacity-50" />
                </div>
                <p>No active drink tickets</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 overflow-auto h-full">
            {drinkQueue.map((order) => {
                // Filter only drink items for display
                const drinkItems = order.items.filter(item => item.menuItem.type === 'drink');

                return (
                    <div key={order.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-right-4">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    {order.beeperNumber ? (
                                        <span className="text-primary">Beeper #{order.beeperNumber}</span>
                                    ) : (
                                        <span>Table #{order.tableNumber || 'N/A'}</span>
                                    )}
                                </h3>
                                <div className="flex items-center text-xs text-muted-foreground gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => completeDrinkTicket(order.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Check className="w-4 h-4 mr-1" />
                                Done
                            </Button>
                        </div>

                        <div className="space-y-2 bg-secondary/20 p-3 rounded-lg">
                            {drinkItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <div className="flex-1">
                                        <div className="font-medium flex items-center gap-2">
                                            <span>{item.quantity}x</span>
                                            <span>{item.menuItem.name}</span>
                                        </div>
                                        {item.selectedFlavors && item.selectedFlavors.length > 0 && (
                                            <div className="text-xs text-muted-foreground ml-6">
                                                + {item.selectedFlavors.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
