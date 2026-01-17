import { MenuItem, FlavorSection } from '@/types/pos';
import { useMenuStore } from '@/store/menuStore';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditFlavorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: MenuItem;
    currentFlavors: string[];
    onConfirm: (newFlavors: string[]) => void;
}

export function EditFlavorDialog({ open, onOpenChange, item, currentFlavors, onConfirm }: EditFlavorDialogProps) {
    if (!item) return null;

    const { globalAddons } = useMenuStore();
    const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
    const [sectionSelections, setSectionSelections] = useState<Record<number, string[]>>({});

    // Logic to determine sections (DUPLICATED from MenuItemCard - keep in sync)
    const hasCategorizedFlavors = Array.isArray(item.flavors) && item.flavors.length > 0 && typeof item.flavors[0] !== 'string';
    const isCategorized = hasCategorizedFlavors || item.type === 'drink';

    let sections: FlavorSection[] = [];
    if (hasCategorizedFlavors) {
        sections = [...(item.flavors as FlavorSection[])];
    } else if (item.flavors && item.flavors.length > 0) {
        if (isCategorized) {
            sections = [{
                name: 'Options',
                max: item.maxFlavors || 1,
                options: item.flavors as string[]
            }];
        }
    }
    if (item.type === 'drink') {
        sections = [...sections, ...globalAddons];
    }

    const simpleFlavors = !isCategorized ? (item.flavors as string[]) : [];

    // Init state from currentFlavors when dialog opens
    useEffect(() => {
        if (open) {
            if (isCategorized) {
                // Reverse map flat flavors to sections
                const newSelections: Record<number, string[]> = {};
                sections.forEach((section, idx) => {
                    const sectionOptionNames = section.options?.map(o => typeof o === 'string' ? o : o.name) || [];
                    // Find which of the currentFlavors belong to this section
                    const matches = currentFlavors.filter(cf => sectionOptionNames.includes(cf));
                    if (matches.length > 0) {
                        newSelections[idx] = matches;
                    }
                });
                setSectionSelections(newSelections);
                setSelectedFlavors([]);
            } else {
                setSelectedFlavors(currentFlavors || []);
                setSectionSelections({});
            }
        }
    }, [open, currentFlavors, item, isCategorized, sections]); // sections is derived, careful with dep array loops. ignoring sections is semi-safe if item doesn't change.


    const isSelected = (flavor: string) => selectedFlavors.includes(flavor);
    const isSectionSelected = (sectionIdx: number, flavor: string) => sectionSelections[sectionIdx]?.includes(flavor);

    const toggleFlavor = (flavor: string) => {
        setSelectedFlavors(prev => {
            const isSelected = prev.includes(flavor);
            if (isSelected) {
                return prev.filter(f => f !== flavor);
            } else {
                const max = item.maxFlavors || 1;
                if (prev.length >= max) {
                    if (max === 1) return [flavor];
                    return prev;
                }
                return [...prev, flavor];
            }
        });
    };

    const toggleSectionFlavor = (sectionIndex: number, flavor: string, max: number = 1) => {
        setSectionSelections(prev => {
            const current = prev[sectionIndex] || [];
            const isSelected = current.includes(flavor);

            if (isSelected) {
                return { ...prev, [sectionIndex]: current.filter(f => f !== flavor) };
            } else {
                if (current.length >= max) {
                    if (max === 1) return { ...prev, [sectionIndex]: [flavor] };
                    return prev;
                }
                return { ...prev, [sectionIndex]: [...current, flavor] };
            }
        });
    };

    const handleSave = () => {
        if (isCategorized) {
            const allSelected = Object.values(sectionSelections).flat();
            onConfirm(allSelected);
        } else {
            onConfirm(selectedFlavors);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Options</DialogTitle>
                    <DialogDescription>
                        Modify options for {item.name}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    {isCategorized ? (
                        <div className="space-y-6 py-4">
                            {sections.map((section, idx) => (
                                <div key={idx} className="space-y-3">
                                    <div className="flex items-center justify-between border-b pb-1 mb-2">
                                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{section.name}</h4>
                                        <span className="text-xs text-muted-foreground">Max: {section.max || 1}</span>
                                    </div>
                                    {(!section.options) ? (
                                        <div className="text-xs text-muted-foreground py-2">No options available</div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {section.options.map((opt) => {
                                                const optName = typeof opt === 'string' ? opt : opt.name;
                                                const optPrice = typeof opt === 'string' ? 0 : opt.price;
                                                return (
                                                    <Button
                                                        key={optName}
                                                        variant={isSectionSelected(idx, optName) ? "default" : "outline"}
                                                        className={cn(
                                                            "w-full h-12 text-sm justify-start px-4 transition-all focus-visible:ring-0 focus-visible:ring-offset-0",
                                                            isSectionSelected(idx, optName) ? "border-primary" : "hover:border-primary hover:bg-primary/5"
                                                        )}
                                                        onClick={() => toggleSectionFlavor(idx, optName, section.max)}
                                                    >
                                                        <div className="flex-1 text-left truncate flex items-center justify-between">
                                                            <span>{optName}</span>
                                                            {optPrice && optPrice > 0 ? (
                                                                <span className={cn("text-xs font-semibold px-1 rounded", isSectionSelected(idx, optName) ? "bg-white/20" : "bg-primary/10 text-primary")}>
                                                                    +₱{optPrice}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        {isSectionSelected(idx, optName) && <div className="w-2 h-2 rounded-full bg-white ml-2" />}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-2">
                                {simpleFlavors?.map((flavor) => (
                                    <Button
                                        key={flavor}
                                        variant={isSelected(flavor) ? "default" : "outline"}
                                        className={cn(
                                            "w-full h-12 text-sm justify-start px-4 transition-all focus-visible:ring-0 focus-visible:ring-offset-0",
                                            isSelected(flavor) ? "border-primary" : "hover:border-primary hover:bg-primary/5"
                                        )}
                                        onClick={() => toggleFlavor(flavor)}
                                    >
                                        <div className="flex-1 text-left truncate">{flavor}</div>
                                        {isSelected(flavor) && <div className="w-2 h-2 rounded-full bg-white ml-2" />}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter>
                    <Button onClick={handleSave}>Update</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
