import { MenuItem, FlavorSection } from '@/types/pos';
import { useOrderStore } from '@/store/orderStore';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem, flavors?: string[]) => void;
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [sectionSelections, setSectionSelections] = useState<Record<number, string[]>>({});

  // Check if item is in cart to show active state
  const { currentOrder } = useOrderStore();
  const quantityInCart = currentOrder
    .filter(i => i.menuItem.id === item.id)
    .reduce((acc, curr) => acc + curr.quantity, 0);

  const isCategorized = Array.isArray(item.flavors) && item.flavors.length > 0 && typeof item.flavors[0] !== 'string';

  const handleClick = () => {
    if (item.flavors && item.flavors.length > 0) {
      setSelectedFlavors([]); // Reset simple
      setSectionSelections({}); // Reset categorized
      setIsDialogOpen(true);
    } else {
      onAdd(item);
    }
  };

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
          // If max is 1, auto-replace
          if (max === 1) return { ...prev, [sectionIndex]: [flavor] };
          return prev; // Hit limit
        }
        return { ...prev, [sectionIndex]: [...current, flavor] };
      }
    });
  };

  const handleConfirm = () => {
    if (isCategorized) {
      // Flatten selections
      const allSelected = Object.values(sectionSelections).flat();
      onAdd(item, allSelected.length > 0 ? allSelected : undefined);
    } else {
      onAdd(item, selectedFlavors.length > 0 ? selectedFlavors : undefined);
    }
    setIsDialogOpen(false);
  };

  const isSelected = (flavor: string) => selectedFlavors.includes(flavor);
  const isSectionSelected = (sectionIdx: number, flavor: string) => sectionSelections[sectionIdx]?.includes(flavor);

  const sections = isCategorized ? (item.flavors as FlavorSection[]) : [];
  const simpleFlavors = !isCategorized ? (item.flavors as string[]) : [];

  const isValidSelection = () => {
    if (isCategorized) {
      // For categorized, checking if at least one option is selected across all sections
      // You might want to enforce "at least one per section" if required,
      // but for now, "at least one total" seems to be the baseline request.
      // If the user wants STRICT enforcement (e.g., must pick a Size AND a Sugar Level), 
      // we'd need more specific metadata from the backend (e.g. min/max per section).
      // Assuming naive "must pick something" for now:
      return Object.values(sectionSelections).some(s => s.length > 0);
    } else {
      return selectedFlavors.length > 0;
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className={cn(
          "group relative flex flex-col justify-between p-4 rounded-xl cursor-pointer transition-all duration-300",
          "bg-card/50 hover:bg-card border border-border/50 hover:border-primary/50",
          "shadow-sm hover:shadow-lg hover:-translate-y-1 hover:z-50",
          "h-[180px] overflow-hidden"
        )}
      >
        {/* Background Gradient Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Active Indicator */}
        {quantityInCart > 0 && (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-200">
            {quantityInCart}
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-3 mt-2">
          <div className="text-4xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
            {item.emoji}
          </div>

          <div className="space-y-1 w-full">
            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 min-h-[2.5em]">
              {item.name}
            </h3>
            <p className="text-primary font-bold text-lg">
              ₱{item.price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Hover Action */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isCategorized ? 'Customize Item' : 'Select Flavor'}</DialogTitle>
            <DialogDescription>
              {isCategorized
                ? `choose options for ${item.name}`
                : `Choose up to ${item.maxFlavors || 1} flavor${(item.maxFlavors || 1) > 1 ? 's' : ''}`
              }
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
                    <div className="grid grid-cols-2 gap-2">
                      {section.options.map((opt) => (
                        <Button
                          key={opt}
                          variant={isSectionSelected(idx, opt) ? "default" : "outline"}
                          className={cn(
                            "w-full h-12 text-sm justify-start px-4 transition-all focus-visible:ring-0 focus-visible:ring-offset-0",
                            isSectionSelected(idx, opt) ? "border-primary" : "hover:border-primary hover:bg-primary/5"
                          )}
                          onClick={() => toggleSectionFlavor(idx, opt, section.max)}
                        >
                          <div className="flex-1 text-left truncate">{opt}</div>
                          {isSectionSelected(idx, opt) && <div className="w-2 h-2 rounded-full bg-white ml-2" />}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-1 mb-2">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Options</h4>
                    <span className="text-xs text-muted-foreground">Max: {item.maxFlavors || 1}</span>
                  </div>
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
              </div>
            )}
          </ScrollArea>

          <Button
            onClick={handleConfirm}
            className="w-full mt-2"
            size="lg"
            disabled={!isValidSelection()}
          >
            Add to Order
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
