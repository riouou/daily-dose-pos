import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Landmark, Banknote, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    totalAmount: number;
    onConfirm: (paymentDetails: { method: string; amountTendered?: number; change?: number }, customerName?: string) => void;
    excludePayLater?: boolean;
    isSubmitting?: boolean;
}

const PAYMENT_METHODS = [
    { id: "Cash", label: "Cash", icon: Banknote, color: "text-green-500" },
    { id: "GCash", label: "GCash", icon: Wallet, color: "text-blue-500" },
    { id: "Bank Transfer", label: "Bank Transfer", icon: Landmark, color: "text-red-500" },
    { id: "Pay Later", label: "Pay Later", icon: Clock, color: "text-yellow-500" },
];

export function PaymentDialog({ open, onOpenChange, totalAmount, onConfirm, excludePayLater, isSubmitting }: PaymentDialogProps) {
    const [method, setMethod] = useState("Cash");
    const [amountTendered, setAmountTendered] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [error, setError] = useState("");

    const change = method === "Cash" && amountTendered ? Math.max(0, parseFloat(amountTendered) - totalAmount) : 0;

    const availableMethods = excludePayLater
        ? PAYMENT_METHODS.filter(m => m.id !== "Pay Later")
        : PAYMENT_METHODS;

    // Reset default if current method is excluded
    useEffect(() => {
        if (excludePayLater && method === "Pay Later") {
            setMethod("Cash");
        }
    }, [excludePayLater, method]);

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setMethod("Cash");
            setAmountTendered("");
            setCustomerName("");
            setError("");
        }
    }, [open]);

    const isCashEnough = method === "Cash" ? (parseFloat(amountTendered || "0") >= totalAmount) : true;

    const handleConfirm = () => {
        if (method === "Cash" && !isCashEnough) {
            setError("Insufficient amount");
            return;
        }

        onConfirm({
            method,
            amountTendered: method === "Cash" ? parseFloat(amountTendered) : undefined,
            change: method === "Cash" ? change : undefined
        }, customerName);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Payment</DialogTitle>
                    <DialogDescription>
                        Select payment method. Total due: <span className="font-bold text-foreground">₱{totalAmount.toFixed(2)}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                    {availableMethods.map((m) => (
                        <div
                            key={m.id}
                            className={`
                                cursor-pointer rounded-xl border-2 p-4 transition-all hover:bg-muted/50
                                ${method === m.id ? "border-primary bg-primary/5" : "border-muted bg-transparent"}
                            `}
                            onClick={() => setMethod(m.id)}
                        >
                            <div className="flex flex-col items-center gap-3">
                                <m.icon className={`h-8 w-8 ${method === m.id ? m.color : "text-muted-foreground"}`} />
                                <span className={`font-medium ${method === m.id ? "text-primary" : "text-muted-foreground"}`}>
                                    {m.label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {method === "Cash" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <Label htmlFor="tendered">Amount Tendered</Label>
                            <Input
                                id="tendered"
                                type="number"
                                placeholder="Enter amount given"
                                value={amountTendered}
                                onChange={(e) => {
                                    setAmountTendered(e.target.value);
                                    setError("");
                                }}
                                className={cn(error && "border-destructive focus-visible:ring-destructive")}
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                className="w-full mt-2"
                                onClick={() => {
                                    setAmountTendered(totalAmount.toString());
                                    setError("");
                                }}
                            >
                                Exact Amount (₱{totalAmount.toFixed(2)})
                            </Button>
                            {error && <p className="text-xs text-destructive">{error}</p>}
                        </div>

                        <div className="p-4 rounded-lg bg-secondary/50 flex justify-between items-center">
                            <span className="text-sm font-medium">Change:</span>
                            <span className="text-xl font-bold text-green-500">₱{change.toFixed(2)}</span>
                        </div>
                    </div>
                )}
                {method === "Pay Later" && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label htmlFor="customerName">Customer Name</Label>
                        <Input
                            id="customerName"
                            placeholder="Enter customer name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                        />
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={(method === "Cash" && !amountTendered) || (method === "Pay Later" && !customerName) || isSubmitting}
                    >
                        {isSubmitting ? "Processing..." : "Confirm Payment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
