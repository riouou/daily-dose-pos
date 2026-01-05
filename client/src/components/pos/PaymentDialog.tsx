import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, Landmark, Banknote, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    totalAmount: number;
    onConfirm: (paymentDetails: { method: string; amountTendered?: number; change?: number }, customerName?: string) => void;
}

const PAYMENT_METHODS = [
    { id: "Cash", label: "Cash", icon: Banknote, color: "text-green-500" },
    { id: "GCash", label: "GCash", icon: Wallet, color: "text-blue-500" },
    { id: "Bank Transfer", label: "Bank Transfer", icon: Landmark, color: "text-red-500" },
    { id: "Pay Later", label: "Pay Later", icon: Clock, color: "text-yellow-500" },
];

export function PaymentDialog({ open, onOpenChange, totalAmount, onConfirm }: PaymentDialogProps) {
    const [method, setMethod] = useState("Cash");
    const [amountTendered, setAmountTendered] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [error, setError] = useState("");

    const change = method === "Cash" && amountTendered ? Math.max(0, parseFloat(amountTendered) - totalAmount) : 0;
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

        // Reset state
        setMethod("Cash");
        setAmountTendered("");
        setCustomerName("");
        setError("");
        onOpenChange(false);
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

                <div className="grid gap-6 py-4">
                    <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-2 gap-4">
                        {PAYMENT_METHODS.map((pm) => (
                            <Label
                                key={pm.id}
                                htmlFor={pm.id}
                                className={cn(
                                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all",
                                    method === pm.id && "border-primary bg-accent"
                                )}
                            >
                                <RadioGroupItem value={pm.id} id={pm.id} className="sr-only" />
                                <pm.icon className={cn("mb-3 h-6 w-6", pm.color)} />
                                {pm.label}
                            </Label>
                        ))}
                    </RadioGroup>

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
                                    autoFocus
                                />
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
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={(method === "Cash" && !amountTendered) || (method === "Pay Later" && !customerName)}>
                        Confirm Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
