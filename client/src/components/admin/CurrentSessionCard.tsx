
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banknote, Archive, AlertTriangle, Play } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface CurrentSessionCardProps {
    stats: { orders: number; sales: number };
    isLoading: boolean;
    status: 'OPEN' | 'CLOSED';
    onCloseDay: () => void;
    onOpenDay: () => void;
    onViewReceipts: () => void;
}

export function CurrentSessionCard({ stats, isLoading, status, onCloseDay, onOpenDay, onViewReceipts }: CurrentSessionCardProps) {
    const isClosed = status === 'CLOSED';

    return (
        <Card className={cn(
            "border-2 shadow-lg backdrop-blur transition-colors",
            isClosed ? "border-muted bg-muted/20" : "border-primary/20 bg-card/50"
        )}>
            <CardHeader>
                <CardTitle className={cn("flex items-center gap-2", isClosed ? "text-muted-foreground" : "text-primary")}>
                    <Banknote className="h-6 w-6" />
                    Current Session
                </CardTitle>
                <CardDescription>
                    Status: <span className={cn("font-bold tracking-wider", isClosed ? "text-muted-foreground" : "text-success")}>
                        {status}
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className={cn("grid grid-cols-2 gap-4", isClosed && "opacity-50")}>
                    <div className="space-y-1">
                        <span className="text-sm font-medium text-muted-foreground">Total Orders</span>
                        <p className="text-3xl font-bold">{stats.orders}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-sm font-medium text-muted-foreground">Total Sales</span>
                        <p className={cn("text-3xl font-bold", !isClosed && "text-success")}>
                            ₱{stats.sales.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                    {isClosed ? (
                        <Button
                            size="lg"
                            onClick={onOpenDay}
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-[0.98]"
                        >
                            <Play className="mr-2 h-5 w-5 fill-current" />
                            Open Store
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={onViewReceipts}
                                className="w-full"
                            >
                                <Banknote className="mr-2 h-5 w-5" />
                                View Receipts
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        size="lg"
                                        className="w-full relative overflow-hidden group bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                        disabled={isLoading}
                                        aria-label="Close Store"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-shimmer transition-transform" />
                                        <Archive className="mr-2 h-4 w-4 relative z-10" />
                                        <span className="relative z-10 font-semibold tracking-wide">
                                            {isLoading ? 'Closing...' : 'Close Store'}
                                        </span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                            <AlertTriangle className="h-5 w-5" />
                                            Close Store?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will close the current session, archive all orders, and reset the dashboard for a new shift.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={onCloseDay} className="bg-destructive hover:bg-destructive/90">
                                            Yes, Close Store
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                Archive current data and reset counters.
                            </p>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
